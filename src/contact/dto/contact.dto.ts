import { IsString, IsEmail, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ContactStatus } from '../schemas/contact.schema';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}

export class UpdateContactDto {
  @IsEnum(ContactStatus)
  @IsOptional()
  status?: ContactStatus;

  @IsString()
  @IsOptional()
  replyMessage?: string;
}

export class ReplyContactDto {
  @IsString()
  @IsNotEmpty()
  replyMessage: string;
}
