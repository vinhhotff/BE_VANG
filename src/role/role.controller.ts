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
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User, CustomMessage, Permission } from '../auth/decoration/setMetadata';
import { IUser } from '../user/user.interface';
import { UpdateRolePermissionsDto } from './dto/add-permission.dto';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Permission('role:create')
  @CustomMessage('Tạo mới role')
  @Post()
  create(@Body() createRoleDto: CreateRoleDto, @User() user: IUser) {
    return this.roleService.create(createRoleDto, user);
  }

  @Permission('role:findAll')
  @CustomMessage('Lấy danh sách roles với phân trang')
  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string
  ) {
    return this.roleService.findAll(+page, +limit, search);
  }

  @Permission('role:findOne')
  @CustomMessage('Lấy role theo ID')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roleService.findById(id);
  }

  @Permission('role:update')
  @CustomMessage('Cập nhật role')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @User() user: IUser
  ) {
    return this.roleService.update(id, updateRoleDto, user);
  }

  @Permission('role:remove')
  @CustomMessage('Xóa role (soft delete)')
  @Delete(':id')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.roleService.remove(id, user);
  }

  @Permission('role:getDeleted')
  @CustomMessage('Lấy danh sách roles đã xóa')
  @Get('deleted/list')
  getDeleted() {
    return this.roleService.getDeletedRoles();
  }

  @Permission('role:restore')
  @CustomMessage('Khôi phục role đã xóa')
  @Patch('restore/:id')
  restore(@Param('id') id: string) {
    return this.roleService.restore(id);
  }

  @Permission('role:getAllRoles')
  @CustomMessage('Lấy tất cả roles (không phân trang)')
  @Get('list/all')
  getAllRoles() {
    return this.roleService.getAllRoles();
  }

  @Permission('role:addPermissions')
  @CustomMessage('Thêm permissions vào role')
  @Patch(':id/permissions')
  addPermissions(
    @Param('id') id: string,
    @Body() updateRolePermissionsDto: UpdateRolePermissionsDto,
    @User() user: IUser
  ) {
    return this.roleService.addPermissionsToRole(
      id,
      updateRolePermissionsDto,
      user
    );
  }

  @Permission('role:removePermissions')
  @CustomMessage('Xóa permissions khỏi role theo tên')
  @Patch(':id/remove-permissions')
  removePermissions(
    @Param('id') id: string,
    @Body('names') names: string[],
    @User() user: IUser
  ) {
    return this.roleService.removePermissionsByName(id, names, user);
  }
}
