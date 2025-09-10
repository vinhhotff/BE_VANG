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
import { FileService } from 'src/file/file.service';
import { SupabaseConfig } from 'src/config/supabase.config';

@Injectable()
export class MenuItemService {
  private readonly bucketName = 'MenuItemImages';

  constructor(
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    private readonly fileService: FileService,
    private supabaseConfig: SupabaseConfig
  ) {}

  async create(
    createMenuItemDto: CreateMenuItemDto,
    user: IUser,
    files: Express.Multer.File[]
  ): Promise<MenuItemDocument> {
    const imageUrls: string[] = [];
    if (files && files.length > 0) {
      const uploadResults = await this.fileService.uploadFiles(
        files,
        this.bucketName
      );
      imageUrls.push(...uploadResults.map((result) => result.url));
    }

    const menuItem = new this.menuItemModel({
      ...createMenuItemDto,
      images: imageUrls,
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

          // ✅ 4. Các field khác (ví dụ category, tag, v.v…)
          else {
            filter[key] = { $regex: decodedValue, $options: 'i' };
          }
        }
      });
    }

    return filter;
  }
  async countMenuItems(): Promise<number> {
    return this.menuItemModel.countDocuments();
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
      .find({ category, available: true })
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

    if (files && files.length > 0) {
      const uploadResults = await this.fileService.uploadFiles(
        files,
        this.bucketName
      );
      updateData.images = uploadResults.map((result) => result.url);
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
    available: boolean
  ): Promise<MenuItemDocument> {
    const menuItem = await this.menuItemModel
      .findByIdAndUpdate(id, { available }, { new: true })
      .populate('images')
      .exec();

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }
    return menuItem;
  }

  async remove(id: string): Promise<{ message: string }> {
    const menuItem = await this.menuItemModel.findById(id);
    if (!menuItem) throw new NotFoundException('Menu item not found');

    // Xóa tất cả file trên Supabase (nếu có)
    if (menuItem.images?.length) {
      const supabase = this.supabaseConfig.getClient();
      for (const url of menuItem.images) {
        const fileName = (url as string).split('/').pop(); // url phải là string
        if (fileName) {
          await supabase.storage.from('bucketName').remove([fileName]);
        }
      }
    }

    // Xóa record trong MongoDB
    await this.menuItemModel.findByIdAndDelete(id);
    return { message: 'Menu item deleted successfully' };
  }

  async getCategories(): Promise<{ categories: string[] }> {
    const categories = await this.menuItemModel.distinct('category').exec();
    return { categories: categories.sort() };
  }
  // Thêm image (filename) vào menu item
  async addImages(
    id: string,
    files: Express.Multer.File[],
    user: IUser
  ): Promise<MenuItemDocument> {
    const menuItem = await this.findById(id);
    const existingImages = menuItem.images ?? [];

    const uploadResults = await this.fileService.uploadFiles(
      files,
      this.bucketName
    );
    const newImageUrls = uploadResults.map((result) => result.url);

    const updatedImages = [...existingImages, ...newImageUrls];

    return await this.update(id, { images: updatedImages }, user);
  }

  // Xóa image (filename) khỏi menu item
  async removeImage(
    id: string,
    imageUrl: string,
    user: IUser
  ): Promise<MenuItemDocument> {
    const menuItem = await this.findById(id);
    const updatedImages = (menuItem.images ?? []).filter(
      (img) => img !== imageUrl
    );

    // Optional: Delete from Supabase storage
    const filename = imageUrl.split('/').pop();
    if (filename) {
      await this.fileService.remove(filename, this.bucketName);
    }

    return await this.update(id, { images: updatedImages }, user);
  }
}
