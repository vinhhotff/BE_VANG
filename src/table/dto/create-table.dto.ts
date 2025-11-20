import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Types } from 'mongoose';

export class CreateTableDto {
  @IsString()
  @IsNotEmpty()
  tableName: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(['available', 'occupied', 'reserved'])
  @IsOptional()
  status?: string = 'available';

  @IsOptional()
  currentOrder?: Types.ObjectId;

  @IsInt()
  @Min(1)
  @IsOptional()
  width?: number = 1;

  @IsInt()
  @Min(1)
  @IsOptional()
  height?: number = 1;
}

