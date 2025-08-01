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
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User, CustomMessage } from '../auth/decoration/setMetadata';
import { IUser } from '../user/user.interface';

@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @CustomMessage('Tạo mới permission')
  @Post()
  create(
    @Body() createPermissionDto: CreatePermissionDto,
    @User() user: IUser
  ) {
    return this.permissionService.create(createPermissionDto, user);
  }

  @CustomMessage('Lấy danh sách permissions với phân trang')
  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string
  ) {
    return this.permissionService.findAll(+page, +limit, search);
  }

  @CustomMessage('Lấy permission theo ID')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.permissionService.findById(id);
  }

  @CustomMessage('Cập nhật permission')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
    @User() user: IUser
  ) {
    return this.permissionService.update(id, updatePermissionDto, user);
  }

  @CustomMessage('Xóa permission (soft delete)')
  @Delete(':id')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.permissionService.remove(id, user);
  }

  @CustomMessage('Lấy danh sách permissions đã xóa')
  @Get('deleted/list')
  getDeleted() {
    return this.permissionService.getDeletedPermissions();
  }

  @CustomMessage('Khôi phục permission đã xóa')
  @Patch('restore/:id')
  restore(@Param('id') id: string) {
    return this.permissionService.restore(id);
  }

  @CustomMessage('Lấy tất cả permissions (không phân trang)')
  @Get('list/all')
  getAllPermissions() {
    return this.permissionService.getAllPermissions();
  }
}
