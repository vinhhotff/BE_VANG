// dto/add-permissions.dto.ts
import { IsArray, IsMongoId, ArrayNotEmpty } from 'class-validator';

export class AddPermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  permissionIds: string[];
}
