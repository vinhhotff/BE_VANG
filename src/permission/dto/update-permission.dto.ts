import { PartialType } from '@nestjs/mapped-types';
import { CreatePermissionDto } from './create-permission.dto';
import { IsString, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdatePermissionDto extends PartialType(CreatePermissionDto) { }


export class UpdateRolePermissionsByNameDto {
  @Transform(({ value }) => {
    // Nếu value là string => chuyển thành array 1 phần tử
    if (typeof value === 'string') {
      return [value];
    }
    return value; // giữ nguyên nếu đã là array
  })
  @IsArray()
  @IsString({ each: true })
  permissionNames: string[];
}
