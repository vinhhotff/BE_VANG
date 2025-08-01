// create-role.dto.ts
import {
  ArrayUnique,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'Role name is required' })
  readonly name: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique({ message: 'Permissions must be unique' })
  @IsMongoId({ each: true })
  readonly permissions?: string[];
}
