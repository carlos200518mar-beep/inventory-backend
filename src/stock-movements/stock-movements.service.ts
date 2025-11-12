import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockInDto, StockOutDto, StockMovementQueryDto } from './dto/stock-movement.dto';
import { StockMovementType } from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class StockMovementsService {
  constructor(private prisma: PrismaService) {}

  async stockIn(dto: StockInDto) {
    // Verify product and warehouse exist
    const [product, warehouse] = await Promise.all([
      this.prisma.product.findUnique({ where: { id: dto.productId } }),
      this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } }),
    ]);

    if (!product) throw new NotFoundException('Product not found');
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    // Transaction: create movement and update inventory
    return this.prisma.$transaction(async (tx) => {
      // Create stock movement
      const movement = await tx.stockMovement.create({
        data: {
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          type: StockMovementType.IN,
          quantity: dto.quantity,
          reason: dto.reason,
          refDocument: dto.refDocument,
        },
      });

      // Update or create inventory level
      const existing = await tx.inventoryLevel.findUnique({
        where: {
          productId_warehouseId: {
            productId: dto.productId,
            warehouseId: dto.warehouseId,
          },
        },
      });

      if (existing) {
        await tx.inventoryLevel.update({
          where: {
            productId_warehouseId: {
              productId: dto.productId,
              warehouseId: dto.warehouseId,
            },
          },
          data: {
            quantity: {
              increment: dto.quantity,
            },
          },
        });
      } else {
        await tx.inventoryLevel.create({
          data: {
            productId: dto.productId,
            warehouseId: dto.warehouseId,
            quantity: dto.quantity,
          },
        });
      }

      return movement;
    });
  }

  async stockOut(dto: StockOutDto) {
    // Verify product and warehouse exist
    const [product, warehouse] = await Promise.all([
      this.prisma.product.findUnique({ where: { id: dto.productId } }),
      this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } }),
    ]);

    if (!product) throw new NotFoundException('Product not found');
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    // Check if sufficient inventory exists
    const inventory = await this.prisma.inventoryLevel.findUnique({
      where: {
        productId_warehouseId: {
          productId: dto.productId,
          warehouseId: dto.warehouseId,
        },
      },
    });

    if (!inventory || Number(inventory.quantity) < dto.quantity) {
      throw new BadRequestException('Insufficient inventory');
    }

    // Transaction: create movement and update inventory
    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          type: StockMovementType.OUT,
          quantity: dto.quantity,
          reason: dto.reason,
          refDocument: dto.refDocument,
        },
      });

      await tx.inventoryLevel.update({
        where: {
          productId_warehouseId: {
            productId: dto.productId,
            warehouseId: dto.warehouseId,
          },
        },
        data: {
          quantity: {
            decrement: dto.quantity,
          },
        },
      });

      return movement;
    });
  }

  async findAll(pagination: PaginationDto, query: StockMovementQueryDto) {
    const where: any = {};

    if (query.productId) where.productId = query.productId;
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.type) where.type = query.type;

    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: pagination.getSortObject(),
        include: {
          product: true,
          warehouse: true,
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { movements, total };
  }
}
