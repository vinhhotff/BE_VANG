import { IsNotEmpty, IsString, IsNumber, IsOptional, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

export class ApplyVoucherDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNumber()
  @Min(0)
  orderTotal: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];

  @IsOptional()
  @IsString()
  userId?: string;
}

export class ApplyVoucherResponseDto {
  code: string;
  discountAmount: number;
  finalTotal: number;
  voucherId: string;
  message?: string;
}
