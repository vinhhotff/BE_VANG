import { Controller, Get, Post, Param, Body, Patch, Delete, Query } from '@nestjs/common';
import { GuestService } from './guest.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';

@Controller('guests')
export class GuestController {
  constructor(private readonly guestService: GuestService) {}

  @Post()
  create(@Body() dto: CreateGuestDto) {
    return this.guestService.create(dto);
  }

  @Get()
  findAll() {
    return this.guestService.findAll();
  }

  @Get('table')
  findByTableCode(@Query('code') code: string) {
    return this.guestService.findByTableCode(code);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.guestService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGuestDto) {
    return this.guestService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.guestService.remove(id);
  }
}
