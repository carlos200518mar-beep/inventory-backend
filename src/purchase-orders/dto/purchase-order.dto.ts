import { IsUUID, IsArray, ValidateNested, IsOptional, IsDateString, IsNumber, Min, ArrayMinSize, IsObject, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WarehouseAllocationDto {
  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  qty: number;
}

export class PurchaseOrderItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  qtyOrdered: number;

  @ApiProperty({ example: 25.50 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ type: [WarehouseAllocationDto], description: 'Distribution across warehouses' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WarehouseAllocationDto)
  warehouseAllocations?: WarehouseAllocationDto[];
}

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsUUID()
  supplierId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedAt?: string;

  @ApiProperty({ type: [PurchaseOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}

export class ReceivePurchaseOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ 
    example: { 'item-id-1': 50, 'item-id-2': 25 },
    description: 'Map of item IDs to quantities received (for single-warehouse mode)'
  })
  @IsOptional()
  @IsObject()
  receivedQuantities?: Record<string, number>;
}
