import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancesService } from '../finances/finances.service';
import { CreatePurchaseOrderDto, ReceivePurchaseOrderDto } from './dto/purchase-order.dto';
import { PurchaseOrderStatus, StockMovementType, Prisma } from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class PurchaseOrdersService {
  // Store pending warehouse allocations temporarily
  private _pendingAllocations = new Map<string, Map<string, any[]>>();

  constructor(
    private prisma: PrismaService,
    private financesService: FinancesService,
  ) {}

  async create(dto: CreatePurchaseOrderDto) {
    // Verify supplier exists
    await this.prisma.supplier.findUniqueOrThrow({ where: { id: dto.supplierId } });

    // Verify all products exist
    const productIds = dto.items.map(item => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    // Store allocations temporarily for this order session
    const orderAllocations = new Map<string, any[]>();
    
    const order = await this.prisma.purchaseOrder.create({
      data: {
        supplierId: dto.supplierId,
        expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : null,
        status: PurchaseOrderStatus.DRAFT,
        items: {
          create: dto.items.map(item => ({
            productId: item.productId,
            qtyOrdered: item.qtyOrdered,
            unitPrice: item.unitPrice,
            qtyReceived: 0,
          })),
        },
      },
      include: {
        supplier: true,
        items: {
          include: { product: true },
        },
      },
    });

    // Store allocations for later receipt if provided
    if (dto.items.some(item => item.warehouseAllocations?.length)) {
      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];
        const createdItem = order.items[i];
        if (item.warehouseAllocations?.length) {
          orderAllocations.set(createdItem.id, item.warehouseAllocations);
        }
      }
      // Store in class-level Map for persistence during server session
      this._pendingAllocations.set(order.id, orderAllocations);
    }

    return order;
  }

  async findAll(pagination: PaginationDto) {
    const where = { deletedAt: null };

    const [orders, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: pagination.getSortObject(),
        include: {
          supplier: true,
          items: { include: { product: true } },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return { orders, total };
  }

  async findOne(id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });

    if (!order) throw new NotFoundException('Purchase order not found');
    return order;
  }

  async changeStatus(id: string, status: PurchaseOrderStatus, receiptData?: any) {
    const order = await this.findOne(id);

    // If confirming/ordering with allocations, auto-receive
    if (status === PurchaseOrderStatus.ORDERED) {
      const allocations = receiptData?.allocations || (order as any)._pendingAllocations;

      if (allocations && allocations.size > 0) {
        // Validate allocations match quantities
        for (const item of order.items) {
          const itemAllocations = allocations.get(item.id);
          if (itemAllocations && itemAllocations.length > 0) {
            const allocatedTotal = itemAllocations.reduce(
              (sum: number, alloc: any) => sum + Number(alloc.qty),
              0
            );
            if (Math.abs(allocatedTotal - Number(item.qtyOrdered)) > 0.01) {
              throw new BadRequestException(
                `Item ${item.productId}: allocated quantity (${allocatedTotal}) doesn't match order quantity (${item.qtyOrdered})`
              );
            }

            // Verify warehouses exist
            for (const alloc of itemAllocations) {
              await this.prisma.warehouse.findUniqueOrThrow({ 
                where: { id: alloc.warehouseId } 
              });
            }
          }
        }

        // Process allocations and receive automatically
        return this.prisma.$transaction(async (tx) => {
          for (const item of order.items) {
            const itemAllocations = allocations.get(item.id);
            if (itemAllocations && itemAllocations.length > 0) {
              for (const alloc of itemAllocations) {
                // Create stock movement IN with order reference
                await tx.stockMovement.create({
                  data: {
                    productId: item.productId,
                    warehouseId: alloc.warehouseId,
                    type: StockMovementType.IN,
                    quantity: Number(alloc.qty),
                    reason: 'Purchase order receipt',
                    refDocument: `PO-${order.id.slice(0, 8)}`,
                    purchaseOrderId: order.id,
                  },
                });

                // Update inventory level
                const existing = await tx.inventoryLevel.findUnique({
                  where: {
                    productId_warehouseId: {
                      productId: item.productId,
                      warehouseId: alloc.warehouseId,
                    },
                  },
                });

                if (existing) {
                  await tx.inventoryLevel.update({
                    where: {
                      productId_warehouseId: {
                        productId: item.productId,
                        warehouseId: alloc.warehouseId,
                      },
                    },
                    data: { quantity: { increment: Number(alloc.qty) } },
                  });
                } else {
                  await tx.inventoryLevel.create({
                    data: {
                      productId: item.productId,
                      warehouseId: alloc.warehouseId,
                      quantity: Number(alloc.qty),
                    },
                  });
                }
              }

              // Update item as fully received
              await tx.purchaseOrderItem.update({
                where: { id: item.id },
                data: { qtyReceived: item.qtyOrdered },
              });
            }
          }

          // Update order status to RECEIVED
          return tx.purchaseOrder.update({
            where: { id },
            data: { status: PurchaseOrderStatus.RECEIVED },
            include: {
              supplier: true,
              items: { include: { product: true } },
            },
          });
        });
      }
    }

    // If no allocations, just change status
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });
  }

  private async createPurchaseFinancialTransaction(
    tx: Prisma.TransactionClient,
    order: any,
    userId: string,
  ) {
    try {
      // Find "Inventory Purchases" category
      const purchaseCategory = await tx.financialCategory.findFirst({
        where: { name: 'Inventory Purchases', type: 'EXPENSE' },
      });

      if (!purchaseCategory) {
        console.error('Inventory Purchases category not found');
        return;
      }

      // Calculate total amount from items
      const totalAmount = order.items.reduce((sum: number, item: any) => {
        return sum + (Number(item.qtyOrdered) * Number(item.unitPrice));
      }, 0);

      // Create financial transaction
      await tx.transaction.create({
        data: {
          type: 'EXPENSE',
          categoryId: purchaseCategory.id,
          amount: totalAmount,
          description: `Compra ${order.supplier.name} - PO-${order.id.slice(0, 8)}`,
          transactionDate: new Date(),
          reference: `PO-${order.id.slice(0, 8)}`,
          purchaseOrderId: order.id,
          createdBy: userId,
        },
      });
    } catch (error) {
      console.error('Error creating financial transaction:', error);
      // Don't fail the receive operation if transaction creation fails
    }
  }

  async receive(id: string, dto?: ReceivePurchaseOrderDto, userId?: string) {
    const order = await this.findOne(id);

    if (order.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('Order already fully received');
    }

    // Check if there are pending allocations from create()
    const allocations = this._pendingAllocations.get(order.id);
    if (allocations && allocations.size > 0) {
      // Use stored allocations (multi-warehouse receive)
      return this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          const itemAllocations = allocations.get(item.id);
          if (itemAllocations && itemAllocations.length > 0) {
            for (const alloc of itemAllocations) {
              // Create stock movement IN with order reference
              await tx.stockMovement.create({
                data: {
                  productId: item.productId,
                  warehouseId: alloc.warehouseId,
                  type: StockMovementType.IN,
                  quantity: Number(alloc.qty),
                  reason: 'Purchase order receipt',
                  refDocument: `PO-${order.id.slice(0, 8)}`,
                  purchaseOrderId: order.id,
                },
              });

              // Update or create inventory level
              await tx.inventoryLevel.upsert({
                where: {
                  productId_warehouseId: {
                    productId: item.productId,
                    warehouseId: alloc.warehouseId,
                  },
                },
                update: {
                  quantity: { increment: Number(alloc.qty) },
                },
                create: {
                  productId: item.productId,
                  warehouseId: alloc.warehouseId,
                  quantity: Number(alloc.qty),
                },
              });
            }
          }

          // Update item as fully received
          await tx.purchaseOrderItem.update({
            where: { id: item.id },
            data: { qtyReceived: item.qtyOrdered },
          });
        }

        // Clear allocations after processing
        this._pendingAllocations.delete(order.id);

        const updatedOrder = await tx.purchaseOrder.update({
          where: { id },
          data: { status: PurchaseOrderStatus.RECEIVED },
          include: {
            supplier: true,
            items: { include: { product: true } },
          },
        });

        // Create financial transaction for purchase
        if (userId) {
          await this.createPurchaseFinancialTransaction(tx, updatedOrder, userId);
        }

        return updatedOrder;
      });
    }

    // Legacy: Single warehouse receive
    if (!dto || !dto.warehouseId || !dto.receivedQuantities) {
      throw new BadRequestException('No stored allocations found. Provide warehouseId and receivedQuantities for manual receive.');
    }

    // Verify warehouse exists
    await this.prisma.warehouse.findUniqueOrThrow({ where: { id: dto.warehouseId } });

    const warehouseId = dto.warehouseId;
    const receivedQuantities = dto.receivedQuantities;

    console.log('Received quantities:', receivedQuantities);
    console.log('Number of items to receive:', Object.keys(receivedQuantities).length);

    return this.prisma.$transaction(async (tx) => {
      // Update items with received quantities
      for (const [itemId, receivedQty] of Object.entries(receivedQuantities)) {
        const item = order.items.find(i => i.id === itemId);
        if (!item) continue;

        const newQtyReceived = Number(item.qtyReceived) + receivedQty;

        await tx.purchaseOrderItem.update({
          where: { id: itemId },
          data: { qtyReceived: newQtyReceived },
        });

        // Create stock movement IN with order reference
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            warehouseId: warehouseId,
            type: StockMovementType.IN,
            quantity: receivedQty,
            reason: `PO received`,
            refDocument: `PO-${order.id.slice(0, 8)}`,
            purchaseOrderId: order.id,
          },
        });

        // Update inventory level
        const existing = await tx.inventoryLevel.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: warehouseId,
            },
          },
        });

        if (existing) {
          await tx.inventoryLevel.update({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: warehouseId,
              },
            },
            data: { quantity: { increment: receivedQty } },
          });
        } else {
          await tx.inventoryLevel.create({
            data: {
              productId: item.productId,
              warehouseId: warehouseId,
              quantity: receivedQty,
            },
          });
        }
      }

      // Check if all items fully received
      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      });

      const allReceived = updatedItems.every(
        item => Number(item.qtyReceived) >= Number(item.qtyOrdered),
      );

      const updatedOrder = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: allReceived ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.ORDERED,
        },
        include: {
          supplier: true,
          items: { include: { product: true } },
        },
      });

      // Create financial transaction when fully received
      if (allReceived && userId) {
        await this.createPurchaseFinancialTransaction(tx, updatedOrder, userId);
      }

      return updatedOrder;
    });
  }
}
