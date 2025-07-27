import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { CustomMessage, User } from 'src/auth/decoration/setMetadata';
import { IUser } from 'src/user/user.interface';

@Controller('permission')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) { }

  @Post()
  create(@Body() createPermissionDto: CreatePermissionDto, @User() user: IUser) {
    return this.permissionService.create(createPermissionDto, user);
  }

  @CustomMessage('Fetch List permission with Paginate')
  @Get()
  async findAll(
    @Query('page') currentPage: string = '1', // Default to page 1
    @Query('limit') limit: string = '10', // Default to 10 items per page
    @Query('qs') qs: string = '' // Default to empty query string
  ) {
    return this.permissionService.findAll(+currentPage, +limit, qs);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.permissionService.findOne(id);
  }


  @Delete(':id')
  remove(@Param('id') id: string,@User() user: IUser) {
    return this.permissionService.remove(id,user);
  }
}
