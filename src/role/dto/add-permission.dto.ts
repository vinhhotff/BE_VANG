import { IsArray, IsMongoId, ArrayNotEmpty } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true }) // Kiểm tra mỗi phần tử là ObjectId hợp lệ
  permissionIds: string[];
}
