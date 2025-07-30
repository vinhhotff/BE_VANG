import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Guest } from './schemas/guest.schema';
import { Model } from 'mongoose';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';

@Injectable()
export class GuestService {
  constructor(
    @InjectModel(Guest.name) private guestModel: Model<Guest>,
  ) {}

  async create(createGuestDto: CreateGuestDto): Promise<Guest> {
    const guest = new this.guestModel(createGuestDto);
    return guest.save();
  }

  async findAll(): Promise<Guest[]> {
    return this.guestModel.find().populate('orders payment').exec();
  }

  async findById(id: string): Promise<Guest> {
    const guest = await this.guestModel.findById(id).populate('orders payment').exec();
    if (!guest) throw new NotFoundException('Guest not found');
    return guest;
  }

  async findByTableCode(tableCode: string): Promise<Guest | null> {
    return this.guestModel.findOne({ tableCode, isPaid: false }).populate('orders payment').exec();
  }

  async update(id: string, updateGuestDto: UpdateGuestDto): Promise<Guest> {
    const guest = await this.guestModel.findByIdAndUpdate(id, updateGuestDto, { new: true });
    if (!guest) throw new NotFoundException('Guest not found');
    return guest;
  }

  async remove(id: string): Promise<void> {
    await this.guestModel.findByIdAndDelete(id);
  }
}
