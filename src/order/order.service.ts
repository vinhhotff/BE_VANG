import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { MarkOrderPaidDto, UpdateOrderStatusDto } from './dto/update-order.dto';

@Injectable()
export class OrderService {
  constructor(@InjectModel(Order.name) private orderModel: Model<OrderDocument>) {}

  async create(dto: CreateOrderDto): Promise<Order> {
    if ((dto.guest && dto.user) || (!dto.guest && !dto.user)) {
    throw new BadRequestException('Either guest or user must be provided, but not both.');
    }
    const order = new this.orderModel(dto);
    return order.save();
  }

  async findAll(): Promise<Order[]> {
    return this.orderModel.find().populate('guest').populate('items.item').exec();
  }

  async findByGuest(guestId: string): Promise<Order[]> {
    return this.orderModel.find({ guest: guestId }).populate('items.item').exec();
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto): Promise<Order> {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    order.status = dto.status;
    return order.save();
  }

  async markAsPaid(id: string, dto: MarkOrderPaidDto): Promise<Order> {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    order.isPaid = dto.isPaid;
    return order.save();
  }
}
