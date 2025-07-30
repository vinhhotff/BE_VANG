import { IsBoolean, IsEnum } from "class-validator";

export class UpdateOrderStatusDto {
  @IsEnum(['pending', 'preparing', 'served', 'cancelled'])
  status: string;
}
export class MarkOrderPaidDto {
  @IsBoolean()
  isPaid: boolean;
}