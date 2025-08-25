// dto/update-menu-item.dto.ts
import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateMenuItemDto } from './create-menu-item.dto';
import { IsOptional, IsArray, IsString } from 'class-validator';

export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
