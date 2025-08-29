// menu-item.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MenuItem, MenuItemDocument } from './schemas/menu-item.schema';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { IUser } from '../user/user.interface';

@Injectable()
export class MenuItemService {
  constructor(
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>
  ) {}

  async create(
    createMenuItemDto: CreateMenuItemDto,
    user: IUser
  ): Promise<MenuItemDocument> {
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
  async findAll(): Promise<MenuItemDocument[]> {
    return await this.menuItemModel
      .find()
      .populate('images')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .exec();
  }
  async findPaginate(currentPage: number, limit: number, qs: string = '') {
    // Xử lý input
    const page = Math.max(1, currentPage); // Đảm bảo page không âm
    const defaultLimit = Math.max(1, Math.min(+limit || 10, 100)); // Giới hạn 1-100, mặc định 10

    // Tính offset
    const offset = (page - 1) * defaultLimit;

    // Phân tích qs thành filter
    const filter = this.parseQuery(qs);

    // Tính tổng số mục
    const totalItems = await this.menuItemModel.countDocuments(filter);

    // Thực thi truy vấn
    const result = await this.menuItemModel
      .find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .exec();

    const totalPages = Math.ceil(totalItems / defaultLimit);

    return {
      results: result,
      meta: {
        total: totalItems,
        page,
        limit: defaultLimit,
        totalPages,
      },
    };
  }

  // Hàm phân tích qs chỉ cho bộ lọc
  private parseQuery(qs: string) {
    const filter: any = {};

    if (qs) {
      // Tách điều kiện theo dấu ,
      const conditions = qs.split(',').map((part) => part.trim().split('='));

      conditions.forEach(([key, value]) => {
        if (key && value) {
          const decodedValue = decodeURIComponent(value);

          // ✅ 1. Xử lý boolean
          if (key === 'isVegan' || key === 'isVegetarian') {
            filter[key] = decodedValue === 'true';
          }

          // ✅ 3. Xử lý tìm kiếm text (regex, ignoreCase)
          else if (key === 'search') {
            filter['name'] = { $regex: decodedValue, $options: 'i' };
          }

          // ✅ 4. Các field khác (ví dụ category, allergens, v.v…)
          else {
            filter[key] = { $regex: decodedValue, $options: 'i' };
          }
        }
      });
    }

    return filter;
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
    files?: Express.Multer.File[] // nhận thêm files
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

  async updateAvailability(
    id: string,
    isAvailable: boolean
  ): Promise<MenuItemDocument> {
    const menuItem = await this.menuItemModel
      .findByIdAndUpdate(id, { isAvailable }, { new: true })
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
  async addImages(
    id: string,
    filenames: string[],
    user: IUser
  ): Promise<MenuItemDocument> {
    const menuItem = await this.findById(id);
    const existingImages = menuItem.images ?? [];
    const updatedImages = [...existingImages, ...filenames];

    return await this.update(id, { images: updatedImages }, user);
  }

  // Xóa image (filename) khỏi menu item
  async removeImage(
    id: string,
    filename: string,
    user: IUser
  ): Promise<MenuItemDocument> {
    const menuItem = await this.findById(id);
    const updatedImages = (menuItem.images ?? []).filter(
      (img) => img !== filename
    );

    return await this.update(id, { images: updatedImages }, user);
  }
}
