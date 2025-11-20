import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ZoneService } from './zone.service';
import { Permission } from '../auth/decoration/setMetadata';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { CustomMessage, User } from 'src/auth/decoration/setMetadata';
import { IUser } from 'src/user/user.interface';

@Controller('zones')
export class ZoneController {
  constructor(private readonly zoneService: ZoneService) {}

  @Permission('zone:create')
  @Post()
  @CustomMessage('Create zone')
  create(@Body() createZoneDto: CreateZoneDto) {
    return this.zoneService.create(createZoneDto);
  }

  @Permission('zone:findAll')
  @Get()
  @CustomMessage('Get all zones')
  findAll() {
    return this.zoneService.findAll();
  }

  @Permission('zone:findOne')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.zoneService.findOne(id);
  }

  @Permission('zone:findByName')
  @Get('name/:name')
  findByName(@Param('name') name: string) {
    return this.zoneService.findByName(name);
  }

  @Permission('zone:update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateZoneDto: UpdateZoneDto) {
    return this.zoneService.update(id, updateZoneDto);
  }

  @Permission('zone:remove')
  @Delete(':id')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.zoneService.remove(id, user);
  }
}

