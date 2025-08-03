import { Guest } from 'src/guest/schemas/guest.schema';
import { TableService } from './../table/table.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';

@Injectable()
export class GuestService {
  constructor(
    @InjectModel(Guest.name) private guestModel: Model<Guest>,
    private tableService: TableService
  ) {}

  async create(createGuestDto: CreateGuestDto): Promise<Guest> {
    const { tableName, guestName } = createGuestDto;

    // Tìm bàn theo tableName
    const table = await this.tableService.findByTableName(tableName);

    if (!table) {
      throw new NotFoundException(`Table with name "${tableName}" not found`);
    }

    // Check table availability
    if (table.status !== 'available') {
      throw new Error(`Table "${tableName}" is currently ${table.status}. Please choose another table.`);
    }

    // Update table status to "occupied"
    table.status = 'occupied';
    await table.save();

    // Tạo guest và gán bàn
    const guest = new this.guestModel({
      guestName,
      tableName,
      table: table._id,
    });

    return guest.save();
  }

  async findAll(): Promise<Guest[]> {
    return this.guestModel.find().populate('orders payment').exec();
  }

  async findById(id: string): Promise<Guest> {
    const guest = await this.guestModel
      .findById(id)
      .populate('orders payment')
      .exec();
    if (!guest) throw new NotFoundException('Guest not found');
    return guest;
  }

  async findByTableName(tableName: string): Promise<Guest | null> {
    return this.guestModel
      .findOne({ tableName })
      .populate('orders payment')
      .exec();
  }

  async update(id: string, updateGuestDto: UpdateGuestDto): Promise<Guest> {
    const guest = await this.guestModel.findByIdAndUpdate(id, updateGuestDto, {
      new: true,
    });
    if (!guest) throw new NotFoundException('Guest not found');
    return guest;
  }

  async remove(id: string): Promise<void> {
    await this.guestModel.findByIdAndDelete(id);
  }
}
