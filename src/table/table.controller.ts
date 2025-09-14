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
import { TableService } from './table.service';
import { Permission } from '../auth/decoration/setMetadata';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { CustomMessage, User } from 'src/auth/decoration/setMetadata';
import { IUser } from 'src/user/user.interface';

@Controller('tables')
export class TableController {
  constructor(private readonly tableService: TableService) {}

  @Permission('table:create')
  @Post()
  create(@Body() createTableDto: CreateTableDto) {
    return this.tableService.create(createTableDto);
  }
  @Permission('table:findAll')
  @Get()
  @CustomMessage('Get all tables')
  async findAll(
    @Query('page') currentPage: string = '1', // Default to page 1
    @Query('limit') limit: string = '10', // Default to 10 items per page
    @Query('qs') qs: string = '' // Default to empty query string
  ) {
    return this.tableService.findAll(+currentPage, +limit, qs);
  }

  @Permission('table:findByStatus')
  @Get('status/:status')
  findByStatus(@Param('status') status: 'available' | 'occupied' | 'reserved') {
    return this.tableService.findByStatus(status);
  }

  @Permission('table:findByLocation')
  @Get('location/:location')
  findByLocation(@Param('location') location: string) {
    return this.tableService.findByLocation(location);
  }

  @Permission('table:findOne')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tableService.findOne(id);
  }

  @Permission('table:checkAvailability')
  @Get(':id/availability')
  checkAvailability(@Param('id') id: string) {
    return this.tableService.checkTableAvailability(id);
  }

  @Permission('table:update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTableDto: UpdateTableDto) {
    return this.tableService.update(id, updateTableDto);
  }

  @Permission('table:assignOrder')
  @Patch(':id/assign-order')
  assignOrder(@Param('id') id: string, @Body('orderId') orderId: string) {
    return this.tableService.assignOrderToTable(id, orderId);
  }

  @Permission('table:releaseTable')
  @Patch(':id/release')
  releaseTable(@Param('id') id: string) {
    return this.tableService.releaseTable(id);
  }

  @Permission('table:remove')
  @Delete(':id')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.tableService.remove(id, user);
  }
}
