import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'Main Warehouse' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: '789 Warehouse Blvd, Industrial Zone' })
  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdateWarehouseDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
