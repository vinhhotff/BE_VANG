import { IsArray, IsNotEmpty, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckStockItemDto {
  @IsNotEmpty()
  item: string; // MenuItem ID

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CheckStockDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckStockItemDto)
  items: CheckStockItemDto[];
}

export class CheckStockResultItemDto {
  itemId: string;
  itemName: string;
  requestedQuantity: number;
  availableStock: number | null; // null = unlimited
  isAvailable: boolean;
  message: string;
}

export class CheckStockResultDto {
  success: boolean;
  available: boolean;
  items: CheckStockResultItemDto[];
  message: string;
}
