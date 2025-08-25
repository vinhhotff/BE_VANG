import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PermissionService } from './permission.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto, UpdateRolePermissionsByNameDto } from './dto/update-permission.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User, CustomMessage, Permission, Public } from '../auth/decoration/setMetadata';
import { IUser } from '../user/user.interface';

@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) { }

  @CustomMessage('Tạo mới permission')
  @Permission('permission:create')
  @Post()
  create(
    @Body() createPermissionDto: CreatePermissionDto,
    @User() user: IUser
  ) {
    return this.permissionService.create(createPermissionDto, user);
  }

  @Permission('permission:findAll')
  @CustomMessage('Lấy danh sách permissions với phân trang')
  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string
  ) {
    return this.permissionService.findAll(+page, +limit, search);
  }

  @Permission('permission:findOne')
  @CustomMessage('Lấy permission theo ID')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.permissionService.findById(id);
  }

  @Permission('permission:update')
  @CustomMessage('Cập nhật permission')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
    @User() user: IUser
  ) {
    return this.permissionService.update(id, updatePermissionDto, user);
  }

  @Permission('permission:remove')
  @CustomMessage('Xóa permission (soft delete)')
  @Delete(':id')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.permissionService.remove(id, user);
  }

  @Permission('permission:getDeleted')
  @CustomMessage('Lấy danh sách permissions đã xóa')
  @Get('deleted/list')
  getDeleted() {
    return this.permissionService.getDeletedPermissions();
  }

  @Permission('permission:restore')
  @CustomMessage('Khôi phục permission đã xóa')
  @Patch('restore/:id')
  restore(@Param('id') id: string) {
    return this.permissionService.restore(id);
  }

  @Permission('permission:getAllPermissions')
  @CustomMessage('Lấy tất cả permissions (không phân trang)')
  @Get('list/all')
  getAllPermissions() {
    return this.permissionService.getAllPermissions();
  }


  @CustomMessage('Thêm permissions vào role bằng tên')
  @Patch(':id/permissions/by-name')
  addPermissionsByName(
    @Param('id') id: string,
    @Body() updateRolePermissionsByNameDto: UpdateRolePermissionsByNameDto,
    @User() user: IUser
  ) {
    return this.permissionService.addPermissionsToRoleByName(
      id,
      updateRolePermissionsByNameDto,
      user
    );
  }

}
  // @Permission('role:addPermissions')
