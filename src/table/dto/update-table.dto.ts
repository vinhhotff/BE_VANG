import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class UpdateTableDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(['available', 'occupied', 'reserved'])
  @IsOptional()
  status?: string;

  @IsOptional()
  currentOrder?: Types.ObjectId;
}

