import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PayMentService } from './pay-ment.service';
import { CreatePayMentDto } from './dto/create-pay-ment.dto';
import { UpdatePayMentDto } from './dto/update-pay-ment.dto';

@Controller('pay-ment')
export class PayMentController {
  constructor(private readonly payMentService: PayMentService) {}

  @Post()
  create(@Body() createPayMentDto: CreatePayMentDto) {
    return this.payMentService.create(createPayMentDto);
  }

  @Get()
  findAll() {
    return this.payMentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.payMentService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePayMentDto: UpdatePayMentDto) {
    return this.payMentService.update(+id, updatePayMentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.payMentService.remove(+id);
  }
}
