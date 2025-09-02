import { Transform } from 'class-transformer';
import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsBoolean, 
  IsArray, 
  Min 
} from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })   // đảm bảo từng phần tử là string (ObjectId)
  images?: string[]; // File ObjectIds

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  price: number;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean()
  available: boolean;

  @IsString()
  category: string; // VD: Món chính, Tráng miệng

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  preparationTime?: number; // minutes

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tag?: string[];

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean()
  isVegetarian?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean()
  isVegan?: boolean;
}
