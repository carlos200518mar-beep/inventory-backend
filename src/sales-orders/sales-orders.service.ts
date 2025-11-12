import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalesOrderDto, FulfillSalesOrderDto } from './dto/sales-order.dto';
import { SalesOrderStatus, StockMovementType } from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class SalesOrdersService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.salesOrder.create({
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

  async confirm(id: string) {
    await this.findOne(id);
    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: SalesOrderStatus.CONFIRMED },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });
  }

  async fulfill(id: string, dto: FulfillSalesOrderDto) {
    const order = await this.findOne(id);

    if (order.status === SalesOrderStatus.FULFILLED) {
      throw new BadRequestException('Order already fulfilled');
    }

    // Verify warehouse exists
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
      // Process each item
      for (const item of order.items) {
        // Create stock movement OUT
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            warehouseId: dto.warehouseId,
            type: StockMovementType.OUT,
            quantity: Number(item.qty),
            reason: 'Sales order fulfillment',
            refDocument: `SO-${order.id.slice(0, 8)}`,
          },
        });

        // Update inventory level
        await tx.inventoryLevel.update({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: dto.warehouseId,
            },
          },
          data: {
            quantity: { decrement: Number(item.qty) },
          },
        });
      }

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
}
