import { IsString, IsNumber } from 'class-validator';

export class ConfirmPayOSPaymentDto {
  @IsString()
  orderId: string;

  @IsNumber()
  orderCode: number;

  @IsNumber()
  amount: number;
}

