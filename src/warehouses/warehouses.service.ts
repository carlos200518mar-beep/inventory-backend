import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateWarehouseDto) {
    return this.prisma.warehouse.create({ data: dto });
  }

  async findAll(pagination: PaginationDto) {
    const where: any = {
      deletedAt: null, // Solo almacenes no eliminados
    };
    if (pagination.search) {
      where.OR = [{ name: { contains: pagination.search } }, { location: { contains: pagination.search } }];
    }

    const [warehouses, total] = await Promise.all([
      this.prisma.warehouse.findMany({ where, skip: pagination.skip, take: pagination.take, orderBy: pagination.getSortObject() }),
      this.prisma.warehouse.count({ where }),
    ]);

    return { warehouses, total };
  }

  async findOne(id: string) {
    const warehouse = await this.prisma.warehouse.findFirst({ where: { id, deletedAt: null } });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  async update(id: string, dto: UpdateWarehouseDto) {
    await this.findOne(id);
    return this.prisma.warehouse.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.warehouse.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
