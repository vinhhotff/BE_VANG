import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreatePayOSLinkDto {
  @IsString()
  orderId: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  returnUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

