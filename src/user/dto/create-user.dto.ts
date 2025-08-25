import {
  IsEmail,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import mongoose from 'mongoose';

export class CreateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid Emails' }) // mai mot sua tieng viet sau pc chua cai unikey....
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  avatar?: string; // File ObjectId

  @IsOptional()
  @IsMongoId({ message: 'role phải là một Mongo ObjectId hợp lệ' })

  role?: string; // có thể là ObjectId dưới dạng string
}
export class RegisterUserDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsNotEmpty({ message: 'Name is required' })
  name: string;
}
