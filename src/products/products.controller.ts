import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductFilterDto } from './dto/product.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationMetaDto, StandardResponseDto } from '../common/dto/response.dto';
import { Auth } from '../common/decorators/auth.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Products')
@Controller('products')
@Auth()
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create product' })
  async create(@Body() dto: CreateProductDto) {
    return new StandardResponseDto(await this.service.create(dto));
  }

  @Get()
  @ApiOperation({ summary: 'Get all products with filters' })
  async findAll(@Query() pagination: PaginationDto, @Query() filters: ProductFilterDto) {
    const { products, total } = await this.service.findAll(pagination, filters);
    return new StandardResponseDto(products, new PaginationMetaDto(pagination.page!, pagination.limit!, total));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return new StandardResponseDto(await this.service.findOne(id));
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return new StandardResponseDto(await this.service.update(id, dto));
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return new StandardResponseDto(await this.service.remove(id));
  }
}
