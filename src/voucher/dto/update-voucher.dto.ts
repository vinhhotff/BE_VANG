import { PartialType } from '@nestjs/mapped-types';
import { CreateVoucherDto } from './create-voucher.dto';
import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { VoucherStatus } from '../schemas/voucher.schema';

export class UpdateVoucherDto extends PartialType(CreateVoucherDto) {
  @IsOptional()
  @IsEnum(VoucherStatus)
  status?: VoucherStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
