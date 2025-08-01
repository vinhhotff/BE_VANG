import { IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateLoyaltyDto {
  @IsNotEmpty()
  user: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  points?: number;
}

export class AddPointsDto {
  @IsNumber()
  @Min(1)
  points: number;
}

export class RedeemPointsDto {
  @IsNumber()
  @Min(1)
  points: number;
}
