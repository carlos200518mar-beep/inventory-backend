import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancesService } from '../finances/finances.service';
import { CreateSalesOrderDto, FulfillSalesOrderDto } from './dto/sales-order.dto';
import { SalesOrderStatus, StockMovementType, Prisma } from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class SalesOrdersService {
  // Store pending warehouse allocations temporarily
  private _pendingAllocations = new Map<string, Map<string, any[]>>();

  constructor(
    private prisma: PrismaService,
    private financesService: FinancesService,
  ) {}

  async create(dto: CreateSalesOrderDto) {
    // Verify customer exists
    await this.prisma.customer.findUniqueOrThrow({ where: { id: dto.customerId } });

    // Verify all products exist
    const productIds = dto.items.map(item => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    const order = await this.prisma.salesOrder.create({
      data: {
        customerId: dto.customerId,
        status: SalesOrderStatus.DRAFT,
        items: {
          create: dto.items.map(item => ({
            productId: item.productId,
            qty: item.qty,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
          })),
        },
      },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });

    // Store allocations for later fulfillment if provided
    if (dto.items.some(item => item.warehouseAllocations?.length)) {
      const orderAllocations = new Map<string, any[]>();
      
      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];
        const createdItem = order.items[i];
        if (item.warehouseAllocations?.length) {
          orderAllocations.set(createdItem.id, item.warehouseAllocations);
        }
      }
      
      // Store in service instance memory
      this._pendingAllocations.set(order.id, orderAllocations);
    }

    return order;
  }

  async findAll(pagination: PaginationDto) {
    const where = { deletedAt: null };

    const [orders, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: pagination.getSortObject(),
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    return { orders, total };
  }

  async findOne(id: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });

    if (!order) throw new NotFoundException('Sales order not found');
    return order;
  }

  async confirm(id: string, fulfillmentData?: any) {
    const order = await this.findOne(id);

    // Check if fulfillment data includes allocations (from create or from confirm call)
    const allocations = fulfillmentData?.allocations || (order as any)._pendingAllocations;

    if (allocations && allocations.size > 0) {
      // Validate allocations match quantities
      for (const item of order.items) {
        const itemAllocations = allocations.get(item.id);
        if (itemAllocations && itemAllocations.length > 0) {
          const allocatedTotal = itemAllocations.reduce(
            (sum: number, alloc: any) => sum + Number(alloc.qty),
            0
          );
          if (Math.abs(allocatedTotal - Number(item.qty)) > 0.01) {
            throw new BadRequestException(
              `Item ${item.productId}: allocated quantity (${allocatedTotal}) doesn't match order quantity (${item.qty})`
            );
          }

          // Check inventory availability for each allocation
          for (const alloc of itemAllocations) {
            const inventory = await this.prisma.inventoryLevel.findUnique({
              where: {
                productId_warehouseId: {
                  productId: item.productId,
                  warehouseId: alloc.warehouseId,
                },
              },
            });

            if (!inventory || Number(inventory.quantity) < Number(alloc.qty)) {
              throw new BadRequestException(
                `Insufficient inventory for product ${item.productId} in warehouse ${alloc.warehouseId}`
              );
            }
          }
        }
      }

      // Process allocations and fulfill
      return this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          const itemAllocations = allocations.get(item.id);
          if (itemAllocations && itemAllocations.length > 0) {
            for (const alloc of itemAllocations) {
              // Create stock movement OUT with order reference
              await tx.stockMovement.create({
                data: {
                  productId: item.productId,
                  warehouseId: alloc.warehouseId,
                  type: StockMovementType.OUT,
                  quantity: Number(alloc.qty),
                  reason: 'Sales order fulfillment',
                  refDocument: `SO-${order.id.slice(0, 8)}`,
                  salesOrderId: order.id,
                },
              });

              // Update inventory level
              await tx.inventoryLevel.update({
                where: {
                  productId_warehouseId: {
                    productId: item.productId,
                    warehouseId: alloc.warehouseId,
                  },
                },
                data: {
                  quantity: { decrement: Number(alloc.qty) },
                },
              });
            }
          }
        }

        // Update order status to FULFILLED
        return tx.salesOrder.update({
          where: { id },
          data: { status: SalesOrderStatus.FULFILLED },
          include: {
            customer: true,
            items: { include: { product: true } },
          },
        });
      });
    }

    // If no allocations, just confirm (needs manual fulfillment later)
    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: SalesOrderStatus.CONFIRMED },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });
  }

  async fulfill(id: string, dto: FulfillSalesOrderDto, userId?: string) {
    const order = await this.findOne(id);

    if (order.status === SalesOrderStatus.FULFILLED) {
      throw new BadRequestException('Order already fulfilled');
    }

    // Support multi-warehouse fulfillment
    if (dto.items && dto.items.length > 0) {
      // Validate all items are in the order
      for (const fulfillItem of dto.items) {
        const orderItem = order.items.find(i => i.id === fulfillItem.itemId);
        if (!orderItem) {
          throw new BadRequestException(`Item ${fulfillItem.itemId} not found in order`);
        }

        // Validate allocations sum matches order quantity
        const totalAllocated = fulfillItem.allocations.reduce(
          (sum, alloc) => sum + Number(alloc.qty), 0
        );
        if (Math.abs(totalAllocated - Number(orderItem.qty)) > 0.01) {
          throw new BadRequestException(
            `Item allocations (${totalAllocated}) don't match order quantity (${orderItem.qty})`
          );
        }

        // Check inventory availability for each allocation
        for (const alloc of fulfillItem.allocations) {
          await this.prisma.warehouse.findUniqueOrThrow({ where: { id: alloc.warehouseId } });
          
          const inventory = await this.prisma.inventoryLevel.findUnique({
            where: {
              productId_warehouseId: {
                productId: orderItem.productId,
                warehouseId: alloc.warehouseId,
              },
            },
          });

          if (!inventory || Number(inventory.quantity) < Number(alloc.qty)) {
            throw new BadRequestException(
              `Insufficient inventory for product ${orderItem.productId} in warehouse ${alloc.warehouseId}`
            );
          }
        }
      }

      // Process multi-warehouse fulfillment
      return this.prisma.$transaction(async (tx) => {
        for (const fulfillItem of dto.items!) {
          const orderItem = order.items.find(i => i.id === fulfillItem.itemId)!;
          
          for (const alloc of fulfillItem.allocations) {
            // Create stock movement OUT with order reference
            await tx.stockMovement.create({
              data: {
                productId: orderItem.productId,
                warehouseId: alloc.warehouseId,
                type: StockMovementType.OUT,
                quantity: Number(alloc.qty),
                reason: 'Sales order fulfillment',
                refDocument: `SO-${order.id.slice(0, 8)}`,
                salesOrderId: order.id,
              },
            });

            // Update inventory level
            await tx.inventoryLevel.update({
              where: {
                productId_warehouseId: {
                  productId: orderItem.productId,
                  warehouseId: alloc.warehouseId,
                },
              },
              data: {
                quantity: { decrement: Number(alloc.qty) },
              },
            });
          }
        }

        const updatedOrder = await tx.salesOrder.update({
          where: { id },
          data: { status: SalesOrderStatus.FULFILLED },
          include: {
            customer: true,
            items: { include: { product: true } },
          },
        });

        // Create financial transaction for the sale
        if (userId) {
          await this.createFinancialTransaction(tx, updatedOrder, userId);
        }

        return updatedOrder;
      });
    }

    // Check if there are pending allocations from create()
    const allocations = this._pendingAllocations.get(order.id);
    if (allocations && allocations.size > 0) {
      // Use stored allocations (same logic as confirm with allocations)
      return this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          const itemAllocations = allocations.get(item.id);
          if (itemAllocations && itemAllocations.length > 0) {
            for (const alloc of itemAllocations) {
              // Create stock movement OUT with order reference
              await tx.stockMovement.create({
                data: {
                  productId: item.productId,
                  warehouseId: alloc.warehouseId,
                  type: StockMovementType.OUT,
                  quantity: Number(alloc.qty),
                  reason: 'Sales order fulfillment',
                  refDocument: `SO-${order.id.slice(0, 8)}`,
                  salesOrderId: order.id,
                },
              });

              // Update inventory level
              await tx.inventoryLevel.update({
                where: {
                  productId_warehouseId: {
                    productId: item.productId,
                    warehouseId: alloc.warehouseId,
                  },
                },
                data: {
                  quantity: { decrement: Number(alloc.qty) },
                },
              });
            }
          }
        }

        // Clear allocations after processing
        this._pendingAllocations.delete(order.id);

        const updatedOrder = await tx.salesOrder.update({
          where: { id },
          data: { status: SalesOrderStatus.FULFILLED },
          include: {
            customer: true,
            items: { include: { product: true } },
          },
        });

        // Create financial transaction for the sale
        if (userId) {
          await this.createFinancialTransaction(tx, updatedOrder, userId);
        }

        return updatedOrder;
      });
    }

    // Legacy: Single warehouse fulfillment
    if (!dto.warehouseId) {
      throw new BadRequestException('Either warehouseId or items with allocations must be provided');
    }

    await this.prisma.warehouse.findUniqueOrThrow({ where: { id: dto.warehouseId } });

    // Check inventory availability
    for (const item of order.items) {
      const inventory = await this.prisma.inventoryLevel.findUnique({
        where: {
          productId_warehouseId: {
            productId: item.productId,
            warehouseId: dto.warehouseId,
          },
        },
      });

      if (!inventory || Number(inventory.quantity) < Number(item.qty)) {
        throw new BadRequestException(`Insufficient inventory for product ${item.productId}`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Process each item from single warehouse
      for (const item of order.items) {
        // Create stock movement OUT with order reference
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            warehouseId: dto.warehouseId!,
            type: StockMovementType.OUT,
            quantity: Number(item.qty),
            reason: 'Sales order fulfillment',
            refDocument: `SO-${order.id.slice(0, 8)}`,
            salesOrderId: order.id,
          },
        });

        // Update inventory level
        await tx.inventoryLevel.update({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: dto.warehouseId!,
            },
          },
          data: {
            quantity: { decrement: Number(item.qty) },
          },
        });
      }

      const updatedOrder = await tx.salesOrder.update({
        where: { id },
        data: { status: SalesOrderStatus.FULFILLED },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      // Create financial transaction for the sale
      if (userId) {
        await this.createFinancialTransaction(tx, updatedOrder, userId);
      }

      return updatedOrder;
    });
  }

  private async createFinancialTransaction(tx: any, order: any, userId: string) {
    try {
      // Get "Sales Revenue" category
      const salesCategory = await tx.financialCategory.findFirst({
        where: { name: 'Sales Revenue', type: 'INCOME' },
      });

      if (!salesCategory) {
        console.warn('Sales Revenue category not found, skipping transaction creation');
        return;
      }

      // Calculate total amount
      const totalAmount = order.items.reduce((sum: number, item: any) => {
        const itemTotal = Number(item.qty) * Number(item.unitPrice) - Number(item.discount || 0);
        return sum + itemTotal;
      }, 0);

      // Create income transaction
      await tx.transaction.create({
        data: {
          type: 'INCOME',
          categoryId: salesCategory.id,
          amount: new Prisma.Decimal(totalAmount),
          description: `Venta ${order.customer.name} - SO-${order.id.slice(0, 8)}`,
          transactionDate: new Date(),
          reference: `SO-${order.id.slice(0, 8)}`,
          salesOrderId: order.id,
          createdBy: userId,
        },
      });
    } catch (error) {
      console.error('Error creating financial transaction:', error);
      // Don't fail the fulfillment if transaction creation fails
    }
  }
}
