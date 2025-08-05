import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { Permission } from '../auth/decoration/setMetadata';
import { PaymentService } from './pay-ment.service';
import { CreatePaymentDto } from './dto/create-pay-ment.dto';
import { UpdatePaymentDto } from './dto/update-pay-ment.dto';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Permission('payment:create')
  @Post()
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentService.create(createPaymentDto);
  }

  @Permission('payment:findAll')
  @Get()
  findAll() {
    return this.paymentService.findAll();
  }

  @Permission('payment:findOne')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentService.findById(id);
  }

  @Permission('payment:update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentService.update(id, updatePaymentDto);
  }

  @Permission('payment:remove')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentService.remove(id);
  }
}

