import { IsMongoId, IsArray, IsNumber, Min, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsMongoId()
  item: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsMongoId()
  guest: string;
  @IsMongoId()
  user:String

  @IsArray()
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsNumber()
  totalPrice: number;
}