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
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  CustomMessage,
  Permission,
  User,
} from 'src/auth/decoration/setMetadata';
import { IUser } from './user.interface';

// import { User } from '../decorate/setMetadata';
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @CustomMessage('Create new user')
  @Post()
  create(@Body() createUserDto: CreateUserDto, @User() user: IUser) {
    return this.userService.createUser(createUserDto, user);
  }

  // @Permission(PermissionEnum.USER_READ)
  @CustomMessage('Fetch List user with Paginate')
  @Get()
  async findAll(
    @Query('page') currentPage: string = '1', // Default to page 1
    @Query('limit') limit: string = '10', // Default to 10 items per page
    @Query('qs') qs: string = '' // Default to empty query string
  ) {
    return this.userService.findAll(+currentPage, +limit, qs);
  }

  // @Permission(PermissionEnum.USER_READ_ID)
  @CustomMessage('Fetch user by ID')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOneID(id);
  }

  // @Permission(PermissionEnum.USER_UPDATE)
  @CustomMessage('Update user by ID')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @User() user: IUser
  ) {
    return this.userService.update(id, updateUserDto, user);
  }

  // @Permission(PermissionEnum.USER_DELETE)
  @CustomMessage('Delete user by ID')
  @Delete(':id')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.userService.remove(id, user);
  }
}
