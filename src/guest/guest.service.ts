import { TableService } from './../table/table.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Guest } from './schemas/guest.schema';
import { Model } from 'mongoose';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { Table } from 'src/table/schemas/table.schema';

@Injectable()
export class GuestService {
  constructor(
    @InjectModel(Guest.name) private guestModel: Model<Guest>,
    private tableService: TableService,
  ) {}

  async create(createGuestDto: CreateGuestDto): Promise<Guest> {
    const guest = new this.guestModel(createGuestDto);
    if (!guest.tableName) {
      throw new NotFoundException('Table name is required');
    }
    else{
      const table = await this.tableService.updateTableStatus(guest.tableName);
      if (!table) {
        throw new NotFoundException('Table not found');
      }
      guest.table = table._id; // Assuming table._id is the reference to the Table schema
    }
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

  async findByTableName(tableName: string): Promise<Guest | null> {
    return this.guestModel.findOne({ tableName, isPaid: false }).populate('orders payment').exec();
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
