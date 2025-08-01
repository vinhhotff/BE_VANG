import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MenuItem, MenuItemDocument } from './schemas/menu-item.schema';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuItemService {
  constructor(
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
  ) {}

  async create(createMenuItemDto: CreateMenuItemDto): Promise<MenuItem> {
    const menuItem = new this.menuItemModel({
      ...createMenuItemDto,
      available: createMenuItemDto.isAvailable ?? true,
    });
    return menuItem.save();
  }

  async findAll(category?: string, available?: boolean): Promise<MenuItem[]> {
    const filter: any = {};
    if (category) filter.category = { $regex: category, $options: 'i' };
    if (available !== undefined) filter.available = available;
    
    return this.menuItemModel.find(filter).exec();
  }

  async findById(id: string): Promise<MenuItem> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid menu item ID format');
    }
    
    const menuItem = await this.menuItemModel.findById(id).exec();
    if (!menuItem) throw new NotFoundException('Menu item not found');
    return menuItem;
  }

  async findByCategory(category: string): Promise<MenuItem[]> {
    return this.menuItemModel
      .find({ category: { $regex: category, $options: 'i' }, available: true })
      .exec();
  }

  async update(id: string, updateMenuItemDto: UpdateMenuItemDto): Promise<MenuItem> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid menu item ID format');
    }

    const updateData = {
      ...updateMenuItemDto,
      ...(updateMenuItemDto.isAvailable !== undefined && {
        available: updateMenuItemDto.isAvailable,
      }),
    };

    const menuItem = await this.menuItemModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    if (!menuItem) throw new NotFoundException('Menu item not found');
    return menuItem;
  }

  async updateAvailability(id: string, available: boolean): Promise<MenuItem> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid menu item ID format');
    }

    const menuItem = await this.menuItemModel
      .findByIdAndUpdate(id, { available }, { new: true })
      .exec();
    if (!menuItem) throw new NotFoundException('Menu item not found');
    return menuItem;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid menu item ID format');
    }

    const menuItem = await this.menuItemModel.findByIdAndDelete(id).exec();
    if (!menuItem) throw new NotFoundException('Menu item not found');
  }

  async getCategories(): Promise<string[]> {
    const categories = await this.menuItemModel.distinct('category').exec();
    return categories.filter(cat => cat); // Remove null/undefined categories
  }
}
