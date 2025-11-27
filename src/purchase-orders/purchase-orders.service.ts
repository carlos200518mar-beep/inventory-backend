import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto, ReceivePurchaseOrderDto } from './dto/purchase-order.dto';
import { PurchaseOrderStatus, StockMovementType } from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class PurchaseOrdersService {
  // Store pending warehouse allocations temporarily
  private _pendingAllocations = new Map<string, Map<string, any[]>>();

  constructor(private prisma: PrismaService) {}

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
      (order as any)._pendingAllocations = orderAllocations;
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

  async receive(id: string, dto: ReceivePurchaseOrderDto) {
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

    // Legacy: Single warehouse receive
    if (!dto.warehouseId) {
      throw new BadRequestException('Either use stored allocations or provide warehouseId');
    }

    // Verify warehouse exists
    await this.prisma.warehouse.findUniqueOrThrow({ where: { id: dto.warehouseId } });

    console.log('Received quantities:', dto.receivedQuantities);
    console.log('Number of items to receive:', Object.keys(dto.receivedQuantities || {}).length);

    return this.prisma.$transaction(async (tx) => {
      // Update items with received quantities
      for (const [itemId, receivedQty] of Object.entries(dto.receivedQuantities)) {
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
            warehouseId: dto.warehouseId,
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
              warehouseId: dto.warehouseId,
            },
          },
        });

        if (existing) {
          await tx.inventoryLevel.update({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: dto.warehouseId,
              },
            },
            data: { quantity: { increment: receivedQty } },
          });
        } else {
          await tx.inventoryLevel.create({
            data: {
              productId: item.productId,
              warehouseId: dto.warehouseId,
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

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          status: allReceived ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.ORDERED,
        },
        include: {
          supplier: true,
          items: { include: { product: true } },
        },
      });
    });
  }
}
