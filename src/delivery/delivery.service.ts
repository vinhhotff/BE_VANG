import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Delivery } from './schemas/delivery.schema';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';

@Injectable()
export class DeliveryService {
  constructor(@InjectModel(Delivery.name) private deliveryModel: Model<Delivery>) {}

  async create(createDeliveryDto: CreateDeliveryDto): Promise<Delivery> {
    const newDelivery = new this.deliveryModel(createDeliveryDto);
    return newDelivery.save();
  }

  async findByOrderId(orderId: string): Promise<Delivery> {
    const delivery = await this.deliveryModel.findOne({ order: orderId }).exec();
    if (!delivery) {
      throw new NotFoundException(`Delivery for order ${orderId} not found`);
    }
    return delivery;
  }

  async update(id: string, updateDeliveryDto: UpdateDeliveryDto): Promise<Delivery> {
    const updatedDelivery = await this.deliveryModel.findByIdAndUpdate(id, updateDeliveryDto, { new: true }).exec();
    if (!updatedDelivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }
    return updatedDelivery;
  }
}
