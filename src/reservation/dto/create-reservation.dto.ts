import { 
  IsNotEmpty, 
  IsString, 
  IsEmail, 
  IsDateString, 
  IsNumber, 
  Min, 
  Max, 
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReservationStatus, BookingType } from '../schemas/reservation.schema';

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsDateString()
  reservationDate: string;

  @IsOptional()
  @IsString()
  reservationTime?: string;

  @IsNumber()
  @Min(1)
  @Max(20)
  numberOfGuests: number;

  @IsOptional()
  @IsString()
  specialRequests?: string;

  @IsOptional()
  @IsString()
  tableNumber?: string;
}

export class UpdateReservationStatusDto {
  @IsEnum(ReservationStatus)
  status: ReservationStatus;

  @IsOptional()
  @IsString()
  tableNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ========== Integrated Booking DTOs ==========

export class ReservationItemDto {
  @IsString()
  @IsNotEmpty()
  menuItemId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateFullBookingDto {
  // Customer Info
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  // Booking Details
  @IsDateString()
  reservationDate: string;

  @IsString()
  @IsNotEmpty()
  reservationTime: string;

  @IsNumber()
  @Min(1)
  @Max(50)
  numberOfGuests: number;

  @IsOptional()
  @IsString()
  specialRequests?: string;

  // Table Selection
  @IsOptional()
  @IsString()
  tableId?: string;

  // Menu Items (for full booking)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReservationItemDto)
  items?: ReservationItemDto[];

  // For D-Day inventory
  @IsOptional()
  @IsDateString()
  usageDate?: string;

  // Force approval (admin only, skips threshold check)
  @IsOptional()
  @IsBoolean()
  forceApproval?: boolean;
}

export class ConfirmDepositDto {
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CheckTableAvailabilityDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  time: string;

  @IsNumber()
  @Min(1)
  numberOfGuests: number;
}

export class ReservationItemResponseDto {
  @IsString()
  menuItemId: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  menuItemName?: string;

  @IsNumber()
  unitPrice: number;

  @IsNumber()
  subtotal: number;

  @IsOptional()
  @IsString()
  note?: string;
}
