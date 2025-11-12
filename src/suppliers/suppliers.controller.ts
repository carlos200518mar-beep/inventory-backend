import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationMetaDto, StandardResponseDto } from '../common/dto/response.dto';
import { Auth } from '../common/decorators/auth.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Suppliers')
@Controller('suppliers')
@Auth()
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create supplier' })
  async create(@Body() createSupplierDto: CreateSupplierDto) {
    return new StandardResponseDto(await this.suppliersService.create(createSupplierDto));
  }

  @Get()
  @ApiOperation({ summary: 'Get all suppliers' })
  async findAll(@Query() pagination: PaginationDto) {
    const { suppliers, total } = await this.suppliersService.findAll(pagination);
    return new StandardResponseDto(suppliers, new PaginationMetaDto(pagination.page!, pagination.limit!, total));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return new StandardResponseDto(await this.suppliersService.findOne(id));
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async update(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto) {
    return new StandardResponseDto(await this.suppliersService.update(id, updateSupplierDto));
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return new StandardResponseDto(await this.suppliersService.remove(id));
  }
}
