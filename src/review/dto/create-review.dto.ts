import { IsString, IsNumber, IsOptional, IsEnum, IsArray, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ReviewStatus } from '../schemas/review.schema';

export class CreateReviewDto {
  @IsString()
  menuItem: string;

  @IsString()
  @IsOptional()
  user?: string;

  @IsString()
  @IsOptional()
  guestName?: string;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}

export class UpdateReviewDto {
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsEnum(ReviewStatus)
  @IsOptional()
  status?: ReviewStatus;
}

export class ReplyReviewDto {
  @IsString()
  reply: string;
}

