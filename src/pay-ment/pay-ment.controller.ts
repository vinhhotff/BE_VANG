import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PaymentService } from './pay-ment.service';
import { CreatePaymentDto } from './dto/create-pay-ment.dto';
import { UpdatePaymentDto } from './dto/update-pay-ment.dto';

@Controller('pay-ment')
export class PayMentController {
  constructor(private readonly payMentService: PaymentService) {}

  @Post()
  create(@Body() createPayMentDto: CreatePaymentDto) {
    return this.payMentService.create(createPayMentDto);
  }

  @Get()
  findAll() {
    return this.payMentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.payMentService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePayMentDto: UpdatePaymentDto) {
    return this.payMentService.update(id, updatePayMentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.payMentService.remove(id);
  }
}
