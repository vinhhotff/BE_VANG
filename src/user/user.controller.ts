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
  User,
  Permission,
} from 'src/auth/decoration/setMetadata';
import { IUser } from './user.interface';

// import { User } from '../decorate/setMetadata';
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @CustomMessage('Create new user')
  @Permission('user:create')
  @Post()
  create(@Body() createUserDto: CreateUserDto, @User() user: IUser) {
    return this.userService.createUser(createUserDto, user);
  }

  @Permission('user:findAll')
  @CustomMessage('Fetch List user with Paginate')
  @Get()
  async findAll(
    @Query('page') currentPage: string = '1', // Default to page 1
    @Query('limit') limit: string = '10', // Default to 10 items per page
    @Query('qs') qs: string = '' // Default to empty query string
  ) {
    return this.userService.findAll(+currentPage, +limit, qs);
  }

  @Permission('user:findOne')
  @CustomMessage('Fetch user by ID')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOneID(id);
  }

  @Permission('user:update')
  @CustomMessage('Update user by ID')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @User() user: IUser
  ) {
    return this.userService.update(id, updateUserDto, user);
  }

  @Permission('user:remove')
  @CustomMessage('Delete user by ID')
  @Delete(':id')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.userService.remove(id, user);
  }
}
