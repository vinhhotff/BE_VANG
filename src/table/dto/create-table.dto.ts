import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class CreateTableDto {
  @IsString()
  @IsNotEmpty()
  tableName: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsEnum(['available', 'occupied', 'reserved'])
  @IsOptional()
  status?: string = 'available';

  @IsOptional()
  currentOrder?: Types.ObjectId;
}

