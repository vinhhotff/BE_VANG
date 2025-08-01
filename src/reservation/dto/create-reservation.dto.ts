import { 
  IsNotEmpty, 
  IsString, 
  IsEmail, 
  IsDateString, 
  IsNumber, 
  Min, 
  Max, 
  IsOptional,
  IsEnum
} from 'class-validator';
import { ReservationStatus } from '../schemas/reservation.schema';

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

  @IsNumber()
  @Min(1)
  @Max(20)
  numberOfGuests: number;

  @IsOptional()
  @IsString()
  specialRequests?: string;
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
