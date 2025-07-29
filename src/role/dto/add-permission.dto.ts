// update-role-permissions.dto.ts
import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true }) // là name chứ không phải ObjectId
  permissionNames: string[];
}
