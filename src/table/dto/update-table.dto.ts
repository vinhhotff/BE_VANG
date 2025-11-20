import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
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

  @IsInt()
  @Min(1)
  @IsOptional()
  width?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  height?: number;
}

