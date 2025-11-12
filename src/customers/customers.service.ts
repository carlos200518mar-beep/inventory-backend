import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: dto });
  }

  async findAll(pagination: PaginationDto) {
    const where: any = {
      deletedAt: null, // Solo clientes no eliminados
    };
    if (pagination.search) {
      where.OR = [
        { name: { contains: pagination.search } },
        { email: { contains: pagination.search } },
        { phone: { contains: pagination.search } },
      ];
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({ where, skip: pagination.skip, take: pagination.take, orderBy: pagination.getSortObject() }),
      this.prisma.customer.count({ where }),
    ]);

    return { customers, total };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
