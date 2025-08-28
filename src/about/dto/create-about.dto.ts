import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TeamMemberDto {
  @IsString()
  name: string;

  @IsString()
  role: string;

  @IsOptional()
  @IsString()
  photo?: string;
}

export class CreateSectionDto {
  @IsIn(['text', 'image', 'video', 'team', 'quote'])
  type: 'text' | 'image' | 'video' | 'team' | 'quote';

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  teamMembers?: TeamMemberDto[];

  @IsOptional()
  @IsString()
  quote?: string;

  @IsNumber()
  order: number;
}
