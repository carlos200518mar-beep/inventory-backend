import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNextPage: boolean;

  @ApiProperty()
  hasPreviousPage: boolean;

  constructor(page: number, limit: number, total: number) {
    this.page = page;
    this.limit = limit;
    this.total = total;
    this.totalPages = Math.ceil(total / limit);
    this.hasNextPage = page < this.totalPages;
    this.hasPreviousPage = page > 1;
  }
}

export class StandardResponseDto<T> {
  @ApiProperty()
  data: T;

  @ApiPropertyOptional()
  meta?: PaginationMetaDto;

  @ApiPropertyOptional()
  error?: {
    message: string;
    code?: string;
    details?: any;
  };

  constructor(data: T, meta?: PaginationMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
