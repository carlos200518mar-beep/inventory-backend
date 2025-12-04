import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto, ReceivePurchaseOrderDto } from './dto/purchase-order.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationMetaDto, StandardResponseDto } from '../common/dto/response.dto';
import { Auth } from '../common/decorators/auth.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole, PurchaseOrderStatus } from '@prisma/client';

@ApiTags('Purchase Orders')
@Controller('purchase-orders')
@Auth()
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create purchase order (DRAFT)' })
  async create(@Body() dto: CreatePurchaseOrderDto) {
    return new StandardResponseDto(await this.service.create(dto));
  }

  @Get()
  @ApiOperation({ summary: 'Get all purchase orders' })
  async findAll(@Query() pagination: PaginationDto) {
    const { orders, total } = await this.service.findAll(pagination);
    return new StandardResponseDto(orders, new PaginationMetaDto(pagination.page!, pagination.limit!, total));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return new StandardResponseDto(await this.service.findOne(id));
  }

  @Post(':id/order')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Change status to ORDERED' })
  async markOrdered(@Param('id') id: string) {
    return new StandardResponseDto(await this.service.changeStatus(id, PurchaseOrderStatus.ORDERED));
  }

  @Post(':id/receive')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Receive items (creates stock movements IN)' })
  async receive(
    @Param('id') id: string,
    @Body() dto?: ReceivePurchaseOrderDto,
    @CurrentUser('sub') userId?: string,
  ) {
    return new StandardResponseDto(await this.service.receive(id, dto || {} as ReceivePurchaseOrderDto, userId));
  }
}
