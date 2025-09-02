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
import { Permission, Public } from '../auth/decoration/setMetadata';
import { OrderService } from './order.service';
import { CreateOrderDto, CreateOnlineOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { MarkOrderPaidDto } from './dto/update-order.dto';
import { OrderStatus } from './schemas/order.schema';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) { }

  @Permission('order:create')
  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(createOrderDto);
  }

  @Post('online')
  @Public()
  createOnlineOrder(@Body() createOnlineOrderDto: CreateOnlineOrderDto) {
    return this.orderService.createOnlineOrder(createOnlineOrderDto);
  }
  @Get('count')
  async countOrders() {
    const total = await this.orderService.countOrders();
    return { total };
  }
  @Permission('order:findAll')
  @Get()
  findAll(
    @Query('status') status?: OrderStatus,
    @Query('guest') guest?: string,
    @Query('user') user?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.orderService.findAll(status, guest, user, page, limit);
  }

  @Permission('order:findOne')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findById(id);
  }

  @Permission('order:findByGuest')
  @Get('guest/:guestId')
  findByGuest(@Param('guestId') guestId: string) {
    return this.orderService.findByGuest(guestId);
  }

  @Permission('order:updateStatus')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto
  ) {
    const statusEnum =
      OrderStatus[updateOrderStatusDto.status as keyof typeof OrderStatus];
    return this.orderService.updateStatus(id, statusEnum);
  }

  @Permission('order:markAsPaid')
  @Patch(':id/paid')
  markAsPaid(
    @Param('id') id: string,
    @Body() markOrderPaidDto: MarkOrderPaidDto
  ) {
    return this.orderService.markAsPaid(id, markOrderPaidDto);
  }

  @Permission('order:remove')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderService.remove(id);
  }

}
