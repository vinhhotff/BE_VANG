import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ApprovalAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class ApproveReservationDto {
  @IsOptional()
  @IsString()
  adminNotes?: string;

  @IsOptional()
  @IsString()
  kitchenNotes?: string;
}

export class RejectReservationDto {
  @IsString()
  reason: string;
}

export class ApprovalQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(ApprovalAction)
  action?: ApprovalAction;
}

export class UpdateApprovalSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minItemsThreshold?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minValueThreshold?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  autoExpireHours?: number;
}

export class ApprovalSettingsResponseDto {
  minItemsThreshold: number;
  minValueThreshold: number;
  autoExpireHours: number;
}
