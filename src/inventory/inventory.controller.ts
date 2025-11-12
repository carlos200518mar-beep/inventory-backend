import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AdjustInventoryDto, InventoryQueryDto } from './dto/inventory.dto';
import { StandardResponseDto } from '../common/dto/response.dto';
import { Auth } from '../common/decorators/auth.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Inventory')
@Controller('inventory')
@Auth()
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get('levels')
  @ApiOperation({ summary: 'Get inventory levels with optional filters' })
  async getLevels(@Query() query: InventoryQueryDto) {
    const levels = await this.service.getInventoryLevels(query);
    return new StandardResponseDto(levels);
  }

  @Post('adjust')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Adjust inventory level (creates ADJUST stock movement)' })
  async adjust(@Body() dto: AdjustInventoryDto) {
    const result = await this.service.adjustInventory(dto);
    return new StandardResponseDto(result);
  }
}
