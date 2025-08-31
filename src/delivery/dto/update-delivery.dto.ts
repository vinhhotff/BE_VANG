import { IsString, IsOptional, IsEnum } from 'class-validator';
import { DeliveryStatus } from '../schemas/delivery.schema';

export class UpdateDeliveryDto {
  @IsEnum(DeliveryStatus)
  @IsOptional()
  status?: DeliveryStatus;

  @IsString()
  @IsOptional()
  trackingNumber?: string;
}
