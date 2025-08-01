import { Transform } from 'class-transformer';
import { IsArray, IsMongoId, ArrayNotEmpty } from 'class-validator';

export class UpdateRolePermissionsDto {
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true }) // Kiểm tra mỗi phần tử là ObjectId hợp lệ
  permissionIds: string[];
}
