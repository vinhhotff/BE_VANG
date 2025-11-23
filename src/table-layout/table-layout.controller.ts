import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { TableLayoutService } from './table-layout.service';
import { CreateTableLayoutDto, UpdateTableLayoutDto } from './dto/create-table-layout.dto';
import { Permission, Public } from '../auth/decoration/setMetadata';

@Controller('table-layouts')
export class TableLayoutController {
  constructor(private readonly tableLayoutService: TableLayoutService) {}

  @Public()
  @Get('active')
  async getActiveLayout() {
    const layout = await this.tableLayoutService.getActiveLayout();
    // Return layout directly (or null) - ResponseInterceptor will wrap it
    return layout;
  }

  @Permission('table-layout:create')
  @Post()
  create(@Body() createTableLayoutDto: CreateTableLayoutDto) {
    return this.tableLayoutService.create(createTableLayoutDto);
  }

  @Permission('table-layout:read')
  @Get()
  findAll() {
    return this.tableLayoutService.findAll();
  }

  @Permission('table-layout:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tableLayoutService.findOne(id);
  }

  @Permission('table-layout:update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTableLayoutDto: UpdateTableLayoutDto) {
    return this.tableLayoutService.update(id, updateTableLayoutDto);
  }

  @Permission('table-layout:activate')
  @Patch(':id/activate')
  setActive(@Param('id') id: string) {
    return this.tableLayoutService.setActive(id);
  }

  @Permission('table-layout:delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tableLayoutService.remove(id);
  }
}


