import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { MarkOrderPaidDto, UpdateOrderStatusDto } from './dto/update-order.dto';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.orderService.create(dto);
  }

  @Get()
  findAll() {
    return this.orderService.findAll();
  }

  @Get('guest/:guestId')
  findByGuest(@Param('guestId') guestId: string) {
    return this.orderService.findByGuest(guestId);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orderService.updateStatus(id, dto);
  }

  @Patch(':id/paid')
  markAsPaid(@Param('id') id: string, @Body() dto: MarkOrderPaidDto) {
    return this.orderService.markAsPaid(id, dto);
  }
}
