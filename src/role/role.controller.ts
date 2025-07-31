import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { IUser } from 'src/user/user.interface';
import { CustomMessage, User } from 'src/auth/decoration/setMetadata';
import { UpdateRolePermissionsDto } from './dto/add-permission.dto';

@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @CustomMessage('Create new role')
  @Post()
  create(@Body() createRoleDto: CreateRoleDto, @User() user: IUser) {
    return this.roleService.create(createRoleDto, user);
  }

  @CustomMessage('Fetch List role with Paginate')
  @Get()
  async findAll(
    @Query('page') currentPage: string = '1', // Default to page 1
    @Query('limit') limit: string = '10', // Default to 10 items per page
    @Query('qs') qs: string = '' // Default to empty query string
  ) {
    return this.roleService.findAll(+currentPage, +limit, qs);
  }

  @CustomMessage('Fetch role by ID')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  @Delete(':id')
  @CustomMessage('Delete role')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.roleService.remove(id, user);
  }

  // role.controller.ts
  @Patch(':id/add-permissions')
  @CustomMessage('Add permissions to role')
  async addPermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
    @User() user: IUser
  ) {
    return await this.roleService.addPermissionsToRole(
      id,
      dto,
      user
    );
  }

  @Patch(':id/remove-permissions')
  @CustomMessage('Remove permissions from role')
  async removePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
    @User() user: IUser
  ) {
    return this.roleService.removePermissionsByName(
      id,
      dto.permissionIds,
      user
    );
  }
}
