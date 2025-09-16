import { IsOptional, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { VoucherStatus } from '../schemas/voucher.schema';

export class VoucherQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(VoucherStatus)
  status?: VoucherStatus;
}
