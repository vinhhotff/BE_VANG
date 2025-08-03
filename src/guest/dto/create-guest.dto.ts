import { IsNotEmpty, IsString } from 'class-validator';

export class CreateGuestDto {
  @IsString()
  @IsNotEmpty()
  tableName: string;
  @IsString()
  @IsNotEmpty()
  guestName: string;
}
