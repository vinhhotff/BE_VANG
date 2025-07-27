// create-role.dto.ts
import { IsNotEmpty, IsString, IsArray, IsMongoId, ArrayUnique } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'Role name is required' })
  readonly name: string; // ví dụ: 'admin', 'staff'

  @IsArray()
  @ArrayUnique()
  @IsMongoId({ each: true })
  readonly permissions: string[]; // danh sách ID của permission
}
