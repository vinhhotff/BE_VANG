import { IsNotEmpty, IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class ValidateVoucherDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  orderValue?: number;

  @IsOptional()
  @IsString()
  userId?: string;
}
