import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, ProductFilterDto } from './dto/product.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    // Verify category exists
    await this.prisma.category.findUniqueOrThrow({
      where: { id: dto.categoryId },
    });

    return this.prisma.product.create({
      data: dto,
      include: { category: true },
    });
  }

  async findAll(pagination: PaginationDto, filters?: ProductFilterDto) {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null, // Solo productos no eliminados
    };

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.sku) {
      where.sku = { contains: filters.sku };
    }

    if (filters?.name) {
      where.name = { contains: filters.name };
    }

    if (pagination.search) {
      where.OR = [
        { name: { contains: pagination.search } },
        { sku: { contains: pagination.search } },
        { description: { contains: pagination.search } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: pagination.getSortObject(),
        include: {
          category: true,
          inventoryLevels: {
            include: { warehouse: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Filter by minStockAlert if requested
    let filteredProducts = products;
    if (filters?.minStockAlert) {
      filteredProducts = products.filter((p) => {
        if (!p.minStock) return false;
        const totalStock = p.inventoryLevels.reduce(
          (sum, level) => sum + Number(level.quantity),
          0,
        );
        return totalStock < Number(p.minStock);
      });
    }

    return { products: filteredProducts, total: filters?.minStockAlert ? filteredProducts.length : total };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { 
        id,
        deletedAt: null, // Solo productos no eliminados
      },
      include: {
        category: true,
        inventoryLevels: {
          include: { warehouse: true },
        },
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);

    if (dto.categoryId) {
      await this.prisma.category.findUniqueOrThrow({
        where: { id: dto.categoryId },
      });
    }

    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
