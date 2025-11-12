import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto, ReceivePurchaseOrderDto } from './dto/purchase-order.dto';
import { PurchaseOrderStatus, StockMovementType } from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class PurchaseOrdersService {
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

    return this.prisma.purchaseOrder.create({
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

  async changeStatus(id: string, status: PurchaseOrderStatus) {
    await this.findOne(id);
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
    console.log('Receiving order:', id);
    console.log('DTO received:', JSON.stringify(dto, null, 2));
    
    const order = await this.findOne(id);
    console.log('Order found:', order.id, 'Status:', order.status);

    if (order.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('Order already fully received');
    }

    // Verify warehouse exists
    console.log('Looking for warehouse:', dto.warehouseId);
    try {
      await this.prisma.warehouse.findUniqueOrThrow({ where: { id: dto.warehouseId } });
      console.log('Warehouse found');
    } catch (error) {
      console.error('Warehouse not found:', error);
      throw new BadRequestException(`Warehouse ${dto.warehouseId} not found`);
    }

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

        // Create stock movement IN
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            warehouseId: dto.warehouseId,
            type: StockMovementType.IN,
            quantity: receivedQty,
            reason: `PO received`,
            refDocument: `PO-${order.id.slice(0, 8)}`,
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
