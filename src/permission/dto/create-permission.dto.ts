// create-permission.dto.ts
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty({ message: 'Permission name is required' })
  readonly name: string; // ví dụ: 'user:create'

  @IsString()
  @IsOptional()
  readonly description?: string;
}
