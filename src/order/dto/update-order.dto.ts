import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { OrderType } from "../schemas/order.schema";

export class UpdateOrderStatusDto {
  @IsEnum(['pending', 'preparing', 'served', 'cancelled'])
  status: string;
}
export class MarkOrderPaidDto {
  @IsBoolean()
  isPaid: boolean;
}

export class UpdateOrderDto {
    @IsEnum(OrderType)
    @IsOptional()
    orderType?: OrderType;

    @IsString()
    @IsOptional()
    deliveryAddress?: string;

    @IsString()
    @IsOptional()
    customerPhone?: string;

    @IsEnum(['pending', 'preparing', 'served', 'cancelled'])
    @IsOptional()
    status?: string;
}
