import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SalesOrdersService } from './sales-orders.service';
import { CreateSalesOrderDto, FulfillSalesOrderDto } from './dto/sales-order.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationMetaDto, StandardResponseDto } from '../common/dto/response.dto';
import { Auth } from '../common/decorators/auth.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Sales Orders')
@Controller('sales-orders')
@Auth()
export class SalesOrdersController {
  constructor(private readonly service: SalesOrdersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create sales order (DRAFT)' })
  async create(@Body() dto: CreateSalesOrderDto) {
    return new StandardResponseDto(await this.service.create(dto));
  }

  @Get()
  @ApiOperation({ summary: 'Get all sales orders' })
  async findAll(@Query() pagination: PaginationDto) {
    const { orders, total } = await this.service.findAll(pagination);
    return new StandardResponseDto(orders, new PaginationMetaDto(pagination.page!, pagination.limit!, total));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return new StandardResponseDto(await this.service.findOne(id));
  }

  @Post(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Confirm sales order' })
  async confirm(@Param('id') id: string) {
    return new StandardResponseDto(await this.service.confirm(id));
  }

  @Post(':id/fulfill')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Fulfill order (creates stock movements OUT)' })
  async fulfill(
    @Param('id') id: string,
    @Body() dto: FulfillSalesOrderDto,
    @CurrentUser('sub') userId: string,
  ) {
    return new StandardResponseDto(await this.service.fulfill(id, dto, userId));
  }
}
