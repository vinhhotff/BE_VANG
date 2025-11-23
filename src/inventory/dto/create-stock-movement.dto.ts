import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { MovementType, MovementReason } from '../schemas/stock-movement.schema';

export class CreateStockMovementDto {
  @IsString()
  ingredient: string;

  @IsEnum(MovementType)
  type: MovementType;

  @IsEnum(MovementReason)
  reason: MovementReason;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  quantity: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalCost?: number;

  @IsString()
  @IsOptional()
  order?: string; // Order ID if movement is due to order

  @IsString()
  @IsOptional()
  notes?: string;
}

