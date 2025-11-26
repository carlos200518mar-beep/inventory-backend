import { IsUUID, IsArray, ValidateNested, IsNumber, Min, ArrayMinSize, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WarehouseAllocationDto {
  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  qty: number;
}

export class SalesOrderItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  qty: number;

  @ApiProperty({ example: 50.00 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ example: 5.00 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ 
    type: [WarehouseAllocationDto], 
    description: 'Warehouse distribution for fulfillment (processed when confirming order)' 
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WarehouseAllocationDto)
  warehouseAllocations?: WarehouseAllocationDto[];
}

export class CreateSalesOrderDto {
  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty({ type: [SalesOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => SalesOrderItemDto)
  items: SalesOrderItemDto[];
}

export class ItemFulfillmentDto {
  @ApiProperty()
  @IsUUID()
  itemId: string;

  @ApiProperty({ type: [WarehouseAllocationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WarehouseAllocationDto)
  allocations: WarehouseAllocationDto[];
}

export class FulfillSalesOrderDto {
  @ApiPropertyOptional({ 
    description: 'Warehouse ID for single-warehouse fulfillment (legacy)',
    deprecated: true 
  })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ 
    type: [ItemFulfillmentDto],
    description: 'Multi-warehouse fulfillment per item' 
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemFulfillmentDto)
  items?: ItemFulfillmentDto[];
}
