import { IsString, IsUUID, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AdjustInventoryDto {
  @ApiProperty({ example: 'uuid-of-product' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 'uuid-of-warehouse' })
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ example: 'Annual inventory count adjustment' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class InventoryQueryDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;
}
