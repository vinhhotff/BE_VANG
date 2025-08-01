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
import { User, CustomMessage } from '../auth/decoration/setMetadata';
import { IUser } from '../user/user.interface';
import { UpdateRolePermissionsDto } from './dto/add-permission.dto';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @CustomMessage('Tạo mới role')
  @Post()
  create(@Body() createRoleDto: CreateRoleDto, @User() user: IUser) {
    return this.roleService.create(createRoleDto, user);
  }

  @CustomMessage('Lấy danh sách roles với phân trang')
  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.roleService.findAll(+page, +limit, search);
  }

  @CustomMessage('Lấy role theo ID')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roleService.findById(id);
  }

  @CustomMessage('Cập nhật role')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @User() user: IUser,
  ) {
    return this.roleService.update(id, updateRoleDto, user);
  }

  @CustomMessage('Xóa role (soft delete)')
  @Delete(':id')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.roleService.remove(id, user);
  }

  @CustomMessage('Lấy danh sách roles đã xóa')
  @Get('deleted/list')
  getDeleted() {
    return this.roleService.getDeletedRoles();
  }

  @CustomMessage('Khôi phục role đã xóa')
  @Patch('restore/:id')
  restore(@Param('id') id: string) {
    return this.roleService.restore(id);
  }

  @CustomMessage('Lấy tất cả roles (không phân trang)')
  @Get('list/all')
  getAllRoles() {
    return this.roleService.getAllRoles();
  }

  @CustomMessage('Thêm permissions vào role')
  @Patch(':id/permissions')
  addPermissions(
    @Param('id') id: string,
    @Body() updateRolePermissionsDto: UpdateRolePermissionsDto,
    @User() user: IUser,
  ) {
    return this.roleService.addPermissionsToRole(id, updateRolePermissionsDto, user);
  }

  @CustomMessage('Xóa permissions khỏi role theo tên')
  @Patch(':id/remove-permissions')
  removePermissions(
    @Param('id') id: string,
    @Body('names') names: string[],
    @User() user: IUser,
  ) {
    return this.roleService.removePermissionsByName(id, names, user);
  }
}

