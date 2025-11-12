import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StockMovementsService } from './stock-movements.service';
import { StockInDto, StockOutDto, StockMovementQueryDto } from './dto/stock-movement.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationMetaDto, StandardResponseDto } from '../common/dto/response.dto';
import { Auth } from '../common/decorators/auth.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Stock Movements')
@Controller('stock-movements')
@Auth()
export class StockMovementsController {
  constructor(private readonly service: StockMovementsService) {}

  @Post('in')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Stock IN - add inventory to warehouse' })
  async stockIn(@Body() dto: StockInDto) {
    return new StandardResponseDto(await this.service.stockIn(dto));
  }

  @Post('out')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Stock OUT - remove inventory from warehouse' })
  async stockOut(@Body() dto: StockOutDto) {
    return new StandardResponseDto(await this.service.stockOut(dto));
  }

  @Get()
  @ApiOperation({ summary: 'Get stock movements history' })
  async findAll(@Query() pagination: PaginationDto, @Query() query: StockMovementQueryDto) {
    const { movements, total } = await this.service.findAll(pagination, query);
    return new StandardResponseDto(movements, new PaginationMetaDto(pagination.page!, pagination.limit!, total));
  }
}
