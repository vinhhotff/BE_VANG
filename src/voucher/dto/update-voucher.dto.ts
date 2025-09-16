import { PartialType } from '@nestjs/mapped-types';
import { CreateVoucherDto } from './create-voucher.dto';
import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsString,
  IsNumber,
  IsDateString,
  IsArray,
  Min,
  Max
} from 'class-validator';
import { VoucherType, VoucherStatus } from '../schemas/voucher.schema';

export class UpdateVoucherDto extends PartialType(CreateVoucherDto) {
  // Explicitly define all properties for better TypeScript support
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(VoucherType)
  type?: VoucherType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  usageLimitPerUser?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedUsers?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedCategories?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(VoucherStatus)
  status?: VoucherStatus;
}
