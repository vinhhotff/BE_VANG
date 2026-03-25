import { IsMongoId, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ProcessFreeOrderDto {
  @IsMongoId()
  orderId: string;

  @IsBoolean()
  @IsOptional()
  autoServe?: boolean;
}
