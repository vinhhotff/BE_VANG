import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateMenuItemIngredientDto {
  @IsString()
  menuItem: string;

  @IsString()
  ingredient: string;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  @IsOptional()
  unit?: string;
}

export class UpdateMenuItemIngredientDto {
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  unit?: string;
}

