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
import { QROrderService } from './qr-order.service';
import {
  CreateQRSessionDto,
  UpdateQRSessionDto,
  QROrderDto,
} from './dto/create-qr-session.dto';

@Controller('qr-orders')
export class QROrderController {
  constructor(private readonly qrOrderService: QROrderService) {}

  @Post('create-session')
  createSession(@Body() dto: CreateQRSessionDto) {
    return this.qrOrderService.createQRSession(dto);
  }

  @Post('add-order')
  addOrder(@Body() orderDto: QROrderDto) {
    return this.qrOrderService.addOrderToQRSession(orderDto);
  }

  @Get(':qrCode')
  getSession(@Param('qrCode') qrCode: string) {
    return this.qrOrderService.validateQR(qrCode);
  }

  @Patch(':qrCode')
  updateSession(
    @Param('qrCode') qrCode: string,
    @Body() updateDto: UpdateQRSessionDto,
  ) {
    return this.qrOrderService.updateQRSession(qrCode, updateDto);
  }
}
