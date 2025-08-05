import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { Permission } from '../auth/decoration/setMetadata';
import { GuestService } from './guest.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';

@Controller('guests')
export class GuestController {
  constructor(private readonly guestService: GuestService) {}

  @Permission('guest:create')
  @Post()
  create(@Body() dto: CreateGuestDto) {
    return this.guestService.create(dto);
  }

  @Permission('guest:findByTableName')
  @Get('table')
  findByTableName(@Query('tableName') tableName: string) {
    return this.guestService.findGuestByTableName(tableName);
  }

  @Permission('guest:findOne')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.guestService.findbyId(id);
  }

  @Permission('guest:update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGuestDto) {
    return this.guestService.update(id, dto);
  }

  @Permission('guest:remove')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.guestService.remove(id);
  }
}
