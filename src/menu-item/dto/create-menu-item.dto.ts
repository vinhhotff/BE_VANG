import { IsString, IsNumber, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  images?: string[]; // File ObjectIds

  @IsNumber()
  price: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsString()
  category?: string;
}