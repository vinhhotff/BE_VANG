import { IsNotEmpty, IsString } from 'class-validator';

export class CreateGuestDto {
  @IsString()
  @IsNotEmpty()
  tableCode: string;
}
