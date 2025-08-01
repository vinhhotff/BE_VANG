import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/pay-ment.schema';
import { CreatePaymentDto } from './dto/create-pay-ment.dto';
import { UpdatePaymentDto } from './dto/update-pay-ment.dto';
import { Order, OrderDocument } from '../order/schemas/order.schema';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const { guest, user, orders } = createPaymentDto;

    if ((guest && user) || (!guest && !user)) {
      throw new BadRequestException('Must provide either guest or user, not both or neither');
    }

    const orderDocuments = await this.orderModel.find({ _id: { $in: orders } }).exec();
    if (orderDocuments.length !== orders.length) {
      throw new NotFoundException('One or more orders not found');
    }

    const payment = new this.paymentModel(createPaymentDto);
    const savedPayment = await payment.save();

    for (const order of orderDocuments) {
      order.isPaid = true;
      await order.save();
    }

    return savedPayment;
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentModel.find().populate('orders').exec();
  }

  async findById(id: string): Promise<Payment> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid payment ID format');
    }

    const payment = await this.paymentModel.findById(id).populate('orders').exec();
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid payment ID format');
    }

    const payment = await this.paymentModel.findByIdAndUpdate(id, updatePaymentDto, { new: true }).exec();
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid payment ID format');
    }

    const payment = await this.paymentModel.findById(id).exec();
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    await this.paymentModel.findByIdAndDelete(id).exec();
  }
}

