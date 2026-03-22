import { IsString, IsNumber, IsOptional, IsDateString, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckInventoryAvailabilityDto {
  @IsString()
  menuItemId: string;

  @IsDateString()
  date: string; // Usage date (D-Day)

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CheckMultipleItemsAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemAvailabilityRequest)
  items: ItemAvailabilityRequest[];
}

export class ItemAvailabilityRequest {
  @IsString()
  menuItemId: string;

  @IsDateString()
  date: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class ReserveInventoryDto {
  @IsString()
  menuItemId: string;

  @IsDateString()
  date: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  orderId?: string;
}

export class ReleaseInventoryDto {
  @IsString()
  menuItemId: string;

  @IsDateString()
  date: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  orderId?: string;
}

export class BulkReserveInventoryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkReserveItem)
  items: BulkReserveItem[];

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  orderId?: string;
}

export class BulkReserveItem {
  @IsString()
  menuItemId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}
