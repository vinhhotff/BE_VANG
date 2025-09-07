import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
  ) {}

  async create(createPaymentData: Partial<Payment>): Promise<Payment> {
    const payment = new this.paymentModel(createPaymentData);
    return payment.save();
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentModel.find().populate('orderId').exec();
  }

  async findOne(id: string): Promise<Payment | null> {
    return this.paymentModel.findById(id).populate('orderId').exec();
  }

  async findByOrderId(orderId: string): Promise<Payment[]> {
    return this.paymentModel.find({ orderId }).populate('orderId').exec();
  }

  async update(id: string, updatePaymentData: Partial<Payment>): Promise<Payment | null> {
    return this.paymentModel
      .findByIdAndUpdate(id, updatePaymentData, { new: true })
      .populate('orderId')
      .exec();
  }

  async remove(id: string): Promise<Payment | null> {
    return this.paymentModel.findByIdAndDelete(id).exec();
  }
}
