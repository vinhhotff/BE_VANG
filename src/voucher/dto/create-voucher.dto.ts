import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsArray, Min, Max } from 'class-validator';
import { VoucherType } from '../schemas/voucher.schema';

export class CreateVoucherDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum(VoucherType)
  type: VoucherType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  usageLimit: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  usageLimitPerUser?: number;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedUsers?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedCategories?: string[];
}
