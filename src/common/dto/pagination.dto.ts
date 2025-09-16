import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  search?: string;

  // Additional filters can be added by extending this class
}

export class PaginationMetaDto {
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  constructor(total: number, page: number, limit: number) {
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
  }
}

export class PaginationResponseDto<T> {
  data: T[];
  meta: PaginationMetaDto;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.meta = new PaginationMetaDto(total, page, limit);
  }
}

// Helper function để build MongoDB sort object
export function buildSortObject(sortBy: string, sortOrder: 'asc' | 'desc' = 'desc'): Record<string, 1 | -1> {
  const sort: Record<string, 1 | -1> = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
  return sort;
}

// Helper function để build search filter cho MongoDB
export function buildSearchFilter(search: string, searchFields: string[]): Record<string, any> {
  if (!search || !searchFields.length) return {};

  const searchRegex = new RegExp(search, 'i');
  return {
    $or: searchFields.map(field => ({
      [field]: { $regex: searchRegex }
    }))
  };
}
