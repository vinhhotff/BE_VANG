import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MenuItem, MenuItemDocument } from './schemas/menu-item.schema';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuItemService {
  constructor(
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
  ) {}

  create(dto: CreateMenuItemDto) {
    return this.menuItemModel.create(dto);
  }

  findAll() {
    return this.menuItemModel.find().exec();
  }

  async findOne(id: string) {
    const item = await this.menuItemModel.findById(id).exec();
    if (!item) throw new NotFoundException('Menu item not found');
    return item;
  }

  async update(id: string, dto: UpdateMenuItemDto) {
    const item = await this.menuItemModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!item) throw new NotFoundException('Menu item not found');
    return item;
  }

  async remove(id: string) {
    const item = await this.menuItemModel.findByIdAndDelete(id).exec();
    if (!item) throw new NotFoundException('Menu item not found');
    return item;
  }
}
