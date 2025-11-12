import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  create(createSupplierDto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: createSupplierDto });
  }

  async findAll(pagination: PaginationDto) {
    const where: any = {
      deletedAt: null, // Solo proveedores no eliminados
    };
    if (pagination.search) {
      where.OR = [
        { name: { contains: pagination.search } },
        { contactName: { contains: pagination.search } },
        { email: { contains: pagination.search } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: pagination.getSortObject(),
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return { suppliers, total };
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, deletedAt: null } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: updateSupplierDto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
