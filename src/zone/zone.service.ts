import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Model, Types } from 'mongoose';
import { Zone, ZoneDocument } from './schemas/zone.schema';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { IUser } from 'src/user/user.interface';

@Injectable()
export class ZoneService {
  constructor(
    @InjectModel(Zone.name) private zoneModel: SoftDeleteModel<ZoneDocument>
  ) {}

  async create(createZoneDto: CreateZoneDto): Promise<Zone> {
    // Kiểm tra xem zone name đã tồn tại chưa
    const existingZone = await this.zoneModel.findOne({
      name: createZoneDto.name,
    });
    if (existingZone) {
      throw new BadRequestException(`Zone "${createZoneDto.name}" already exists`);
    }

    const createdZone = new this.zoneModel(createZoneDto);
    return createdZone.save();
  }

  async findAll(): Promise<Zone[]> {
    return this.zoneModel.find().exec();
  }

  async findOne(id: string): Promise<ZoneDocument> {
    const zone = await this.zoneModel.findById(id).exec();
    if (!zone) {
      throw new NotFoundException(`Zone #${id} not found`);
    }
    return zone;
  }

  async findByName(name: string): Promise<ZoneDocument> {
    const zone = await this.zoneModel.findOne({ name }).exec();
    if (!zone) {
      throw new NotFoundException(`Zone "${name}" not found`);
    }
    return zone;
  }

  async update(id: string, updateZoneDto: UpdateZoneDto): Promise<Zone> {
    // Nếu cập nhật name, kiểm tra trùng
    if (updateZoneDto.name) {
      const existingZone = await this.zoneModel.findOne({
        name: updateZoneDto.name,
        _id: { $ne: id },
      });
      if (existingZone) {
        throw new BadRequestException(
          `Zone "${updateZoneDto.name}" already exists`
        );
      }
    }

    const existingZone = await this.zoneModel
      .findByIdAndUpdate(id, updateZoneDto, { new: true })
      .exec();
    if (!existingZone) {
      throw new NotFoundException(`Zone #${id} not found`);
    }
    return existingZone;
  }

  async remove(id: string, user: IUser): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID zone không hợp lệ');
    }

    const zone = await this.zoneModel.findById(id).exec();
    if (!zone) {
      throw new NotFoundException('Không tìm thấy zone');
    }

    await this.zoneModel.findByIdAndUpdate(id, {
      deletedBy: {
        _id: user._id,
        email: user.email,
      },
    });

    await this.zoneModel.softDelete({ _id: id });

    return {
      message: 'Đã xóa zone thành công',
    };
  }
}

