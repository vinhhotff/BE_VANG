import { IsString, IsNotEmpty, IsMongoId } from 'class-validator';

export class CreateDeliveryDto {
  @IsMongoId()
  @IsNotEmpty()
  order: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @IsString()
  @IsNotEmpty()
  deliveryAddress: string;
}
