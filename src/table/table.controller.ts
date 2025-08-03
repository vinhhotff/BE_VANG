import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { TableService } from './table.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { CustomMessage, User } from 'src/auth/decoration/setMetadata';
import { IUser } from 'src/user/user.interface';

@Controller('tables')
export class TableController {
  constructor(private readonly tableService: TableService) { }

  @Post()
  create(@Body() createTableDto: CreateTableDto,@User() user: IUser) {
    return this.tableService.create(createTableDto);
  }
  @Get()
  @CustomMessage('Get all tables')
  async findAll(
    @Query('page') currentPage: string = '1', // Default to page 1
    @Query('limit') limit: string = '10', // Default to 10 items per page
    @Query('qs') qs: string = '' // Default to empty query string
  ) {
    return this.tableService.findAll(+currentPage, +limit, qs);
  }

  @Get('status/:status')
  findByStatus(@Param('status') status: 'available' | 'occupied' | 'reserved') {
    return this.tableService.findByStatus(status);
  }

  @Get('location/:location')
  findByLocation(@Param('location') location: string) {
    return this.tableService.findByLocation(location);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tableService.findOne(id);
  }

  @Get(':id/availability')
  checkAvailability(@Param('id') id: string) {
    return this.tableService.checkTableAvailability(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTableDto: UpdateTableDto) {
    return this.tableService.update(id, updateTableDto);
  }

  @Patch(':id/assign-order')
  assignOrder(@Param('id') id: string, @Body('orderId') orderId: string) {
    return this.tableService.assignOrderToTable(id, orderId);
  }

  @Patch(':id/release')
  releaseTable(@Param('id') id: string) {
    return this.tableService.releaseTable(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string,@User() user: IUser) {
    return this.tableService.remove(id,user);
  }
}

