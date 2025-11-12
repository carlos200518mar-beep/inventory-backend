import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustInventoryDto, InventoryQueryDto } from './dto/inventory.dto';
import { StockMovementType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getInventoryLevels(query: InventoryQueryDto) {
    const where: any = {};

    if (query.warehouseId) {
      where.warehouseId = query.warehouseId;
    }

    if (query.productId) {
      where.productId = query.productId;
    }

    return this.prisma.inventoryLevel.findMany({
      where,
      include: {
        product: {
          include: { category: true },
        },
        warehouse: true,
      },
      orderBy: [{ warehouse: { name: 'asc' } }, { product: { name: 'asc' } }],
    });
  }

  async adjustInventory(dto: AdjustInventoryDto) {
    // Verify product and warehouse exist
    const [product, warehouse] = await Promise.all([
      this.prisma.product.findUnique({ where: { id: dto.productId } }),
      this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } }),
    ]);

    if (!product) throw new NotFoundException('Product not found');
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    // Execute in transaction
    return this.prisma.$transaction(async (tx) => {
      // Find or create inventory level
      let inventoryLevel = await tx.inventoryLevel.findUnique({
        where: {
          productId_warehouseId: {
            productId: dto.productId,
            warehouseId: dto.warehouseId,
          },
        },
      });

      const newQuantity = dto.quantity;

      if (!inventoryLevel) {
        // Create new inventory level
        inventoryLevel = await tx.inventoryLevel.create({
          data: {
            productId: dto.productId,
            warehouseId: dto.warehouseId,
            quantity: newQuantity,
          },
        });
      } else {
        // Update existing inventory level
        inventoryLevel = await tx.inventoryLevel.update({
          where: {
            productId_warehouseId: {
              productId: dto.productId,
              warehouseId: dto.warehouseId,
            },
          },
          data: {
            quantity: newQuantity,
          },
        });
      }

      // Create stock movement record
      await tx.stockMovement.create({
        data: {
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          type: StockMovementType.ADJUST,
          quantity: newQuantity,
          reason: dto.reason || 'Manual adjustment',
        },
      });

      return inventoryLevel;
    });
  }

  async getInventoryByProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.inventoryLevel.findMany({
      where: { productId },
      include: { warehouse: true },
    });
  }

  async getInventoryByWarehouse(warehouseId: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouse) throw new NotFoundException('Warehouse not found');

    return this.prisma.inventoryLevel.findMany({
      where: { warehouseId },
      include: {
        product: {
          include: { category: true },
        },
      },
    });
  }
}
