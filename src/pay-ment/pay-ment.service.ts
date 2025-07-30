// payment.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/pay-ment.schema';
import { CreatePaymentDto } from './dto/create-pay-ment.dto';
import { UpdatePaymentDto } from './dto/update-pay-ment.dto';

@Injectable()
export class PaymentService {
  constructor(@InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>) { }

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    if ((createPaymentDto.guest && createPaymentDto.user) || (!createPaymentDto.guest && !createPaymentDto.user)) {
      throw new BadRequestException('Either guest or user must be provided, but not both.');
    }
    const created = new this.paymentModel(createPaymentDto);
    return created.save();
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentModel.find().populate('guest orders').exec();
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentModel.findById(id).populate('guest orders').exec();
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async update(id: string, dto: UpdatePaymentDto): Promise<Payment> {
    const updated = await this.paymentModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!updated) throw new NotFoundException('Payment not found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.paymentModel.findByIdAndDelete(id).exec();
  }
}
