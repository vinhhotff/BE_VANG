// menu-item.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MenuItem, MenuItemDocument } from './schemas/menu-item.schema';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { IUser } from '../user/user.interface';

@Injectable()
export class MenuItemService {
  constructor(
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
  ) { }

  async create(createMenuItemDto: CreateMenuItemDto, user: IUser): Promise<MenuItemDocument> {
    const menuItem = new this.menuItemModel({
      ...createMenuItemDto,
      createdBy: user._id,
      updatedBy: user._id,
    });

    const savedMenuItem = await menuItem.save();
    const foundMenuItem = await this.menuItemModel
      .findById(savedMenuItem._id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .exec();
    if (!foundMenuItem) {
      throw new NotFoundException('Menu item not found');
    }
    return foundMenuItem;
  }

  async findAll(category?: string, isAvailable?: boolean): Promise<MenuItemDocument[]> {
    const filter: any = {};
    if (category) filter.category = category;
    if (isAvailable !== undefined) filter.isAvailable = isAvailable;

    return await this.menuItemModel
      .find(filter)
      .populate('images')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<MenuItemDocument> {
    const menuItem = await this.menuItemModel
      .findById(id)
      .populate('images')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .exec();

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }
    return menuItem;
  }

  async findByCategory(category: string): Promise<MenuItemDocument[]> {
    return await this.menuItemModel
      .find({ category, isAvailable: true })
      .populate('images')
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(
    id: string,
    updateMenuItemDto: UpdateMenuItemDto,
    user: IUser,
    files?: Express.Multer.File[], // nhận thêm files
  ): Promise<MenuItemDocument> {
    const updateData: any = {
      ...updateMenuItemDto,
      updatedBy: user._id,
    };

    // Nếu có upload ảnh mới thì lưu và thay thế images
    if (files && files.length > 0) {
      // Ở đây tuỳ bạn: hoặc chỉ lưu filename, hoặc lưu sang collection File rồi lấy ObjectId
      const imageIds = files.map((file) => file.filename);
      updateData.images = imageIds;
    }

    const updatedMenuItem = await this.menuItemModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('images')
      .exec();

    if (!updatedMenuItem) {
      throw new NotFoundException('Menu item not found');
    }
    return updatedMenuItem;
  }


  async updateAvailability(id: string, isAvailable: boolean): Promise<MenuItemDocument> {
    const menuItem = await this.menuItemModel
      .findByIdAndUpdate(
        id,
        { isAvailable },
        { new: true }
      )
      .populate('images')
      .exec();

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }
    return menuItem;
  }

  async remove(id: string): Promise<{ message: string }> {
    const result = await this.menuItemModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Menu item not found');
    }
    return { message: 'Menu item deleted successfully' };
  }

  async getCategories(): Promise<{ categories: string[] }> {
    const categories = await this.menuItemModel.distinct('category').exec();
    return { categories: categories.sort() };
  }
  // Thêm image (filename) vào menu item
  async addImages(id: string, filenames: string[], user: IUser): Promise<MenuItemDocument> {
    const menuItem = await this.findById(id);
    const existingImages = menuItem.images ?? [];
    const updatedImages = [...existingImages, ...filenames];

    return await this.update(id, { images: updatedImages }, user);
  }

  // Xóa image (filename) khỏi menu item
  async removeImage(id: string, filename: string, user: IUser): Promise<MenuItemDocument> {
    const menuItem = await this.findById(id);
    const updatedImages = (menuItem.images ?? []).filter(img => img !== filename);

    return await this.update(id, { images: updatedImages }, user);
  }

}