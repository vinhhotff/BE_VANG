import { IsNotEmpty, IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateQRSessionDto {
  @IsString()
  @IsNotEmpty()
  tableCode: string;

  @IsOptional()
  @IsNumber()
  expirationHours?: number; // Số giờ hết hạn (default: 2 giờ)
}

export class QROrderDto {
  @IsString()
  @IsNotEmpty()
  qrCode: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  items: {
    item: string;
    quantity: number;
  }[];
}

export class UpdateQRSessionDto {
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  status?: string;
}
