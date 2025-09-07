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
import { PaymentService } from './payment.service';
import { Payment } from './schemas/payment.schema';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  create(@Body() createPaymentData: Partial<Payment>) {
    return this.paymentService.create(createPaymentData);
  }

  @Get()
  findAll(@Query('orderId') orderId?: string) {
    if (orderId) {
      return this.paymentService.findByOrderId(orderId);
    }
    return this.paymentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePaymentData: Partial<Payment>) {
    return this.paymentService.update(id, updatePaymentData);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentService.remove(id);
  }
}
