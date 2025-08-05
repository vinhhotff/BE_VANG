import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Guest } from 'src/guest/schemas/guest.schema';
import { TableService } from './../table/table.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';

@Injectable()
export class GuestService {
  constructor(
    @InjectModel(Guest.name) private guestModel: SoftDeleteModel<Guest>,
    private tableService: TableService,
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
      throw new BadRequestException(`Table "${tableName}" is currently ${table.status}. Please choose another table.`);
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
 async findGuestByTableName(tableName: string): Promise<Guest | null> {
  return this.guestModel
    .findOne({ tableName})
    .exec();
}


   findbyId(id: string) {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid ID format');
      }
      const guest = this.guestModel.findById(id).exec();
      if (!guest) {
        throw new BadRequestException('User not found');
      }
      return guest;
    }

  async update(id: string, updateGuestDto: UpdateGuestDto): Promise<Guest> {
    const guest = await this.guestModel.findByIdAndUpdate(id, updateGuestDto, {
      new: true,
    });
    if (!guest) throw new NotFoundException('Guest not found');
    return guest;
  }

  async remove(id: string): Promise<void> {
    await this.guestModel.softDelete({id});
  }
}
