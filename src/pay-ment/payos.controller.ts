import { Controller, Post, Body } from '@nestjs/common';
import { Public } from '../auth/decoration/setMetadata';
import { PayMentService } from './pay-ment.service';
import { CreatePayOSLinkDto } from './dto/create-payos-link.dto';
import { ConfirmPayOSPaymentDto } from './dto/confirm-payos-payment.dto';
import { ProcessFreeOrderDto } from './dto/process-free-order.dto';

@Controller('payment')
export class PayOSController {
  constructor(private readonly paymentService: PayMentService) {}

  @Public()
  @Post('payos/create-link')
  async createPayOSLink(@Body() createPayOSLinkDto: CreatePayOSLinkDto) {
    return this.paymentService.createPayOSPaymentLink(createPayOSLinkDto);
  }

  @Public()
  @Post('payos/confirm-payment')
  async confirmPayOSPayment(@Body() confirmDto: ConfirmPayOSPaymentDto) {
    return this.paymentService.confirmPayOSPayment(confirmDto);
  }

  @Public()
  @Post('payos/process-free-order')
  async processFreeOrder(@Body() processFreeOrderDto: ProcessFreeOrderDto) {
    return this.paymentService.processFreeOrder(processFreeOrderDto);
  }
}

