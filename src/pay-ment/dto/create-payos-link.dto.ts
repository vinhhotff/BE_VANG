import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreatePayOSLinkDto {
  @IsString()
  orderId: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}

