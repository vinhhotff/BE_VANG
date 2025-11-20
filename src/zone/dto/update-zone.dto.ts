import { IsOptional, IsString } from 'class-validator';

export class UpdateZoneDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

