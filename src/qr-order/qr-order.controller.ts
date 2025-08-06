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
import { CustomMessage, Permission } from '../auth/decoration/setMetadata';
import { QROrderService } from './qr-order.service';
import {
  CreateQRSessionDto,
  UpdateQRSessionDto,
  QROrderDto,
} from './dto/create-qr-session.dto';

@Controller('qr-orders')
export class QROrderController {
  constructor(private readonly qrOrderService: QROrderService) {}

  @Permission('qrOrder:createSession')
  @CustomMessage('Create QR Session')
  @Post('create-session')
  createSession(@Body() dto: CreateQRSessionDto) {
    return this.qrOrderService.createQRSession(dto);
  }

  @Permission('qrOrder:addOrder')
  @CustomMessage('Add Order to QR Session')
  @Post('add-order')
  addOrder(@Body() orderDto: QROrderDto) {
    return this.qrOrderService.addOrderToQRSession(orderDto);
  }

  @Permission('qrOrder:getSession')
  @CustomMessage('Get QR Session by QR Code')
  @Get(':qrCode')
  getSession(@Param('qrCode') qrCode: string) {
    return this.qrOrderService.validateQR(qrCode);
  }

  @Permission('qrOrder:updateSession')
  @CustomMessage('Update QR Session')
  @Patch(':qrCode')
  updateSession(
    @Param('qrCode') qrCode: string,
    @Body() updateDto: UpdateQRSessionDto,
  ) {
    return this.qrOrderService.updateQRSession(qrCode, updateDto);
  }
}
