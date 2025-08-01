import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Permission, PermissionDocument } from './schemas/permission.schema';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from '../user/user.interface';

@Injectable()
export class PermissionService {
  constructor(
    @InjectModel(Permission.name)
    private permissionModel: SoftDeleteModel<PermissionDocument>
  ) {}

  async create(
    createPermissionDto: CreatePermissionDto,
    user: IUser
  ): Promise<Permission> {
    // Kiểm tra xem permission đã tồn tại chưa
    const existingPermission = await this.permissionModel
      .findOne({
        name: createPermissionDto.name,
      })
      .exec();

    if (existingPermission) {
      throw new ConflictException(
        `Quyền '${createPermissionDto.name}' đã tồn tại`
      );
    }

    const permission = new this.permissionModel({
      ...createPermissionDto,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    return permission.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<{ permissions: Permission[]; total: number; totalPages: number }> {
    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await this.permissionModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const permissions = await this.permissionModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return { permissions, total, totalPages };
  }

  async findById(id: string): Promise<Permission> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID permission không hợp lệ');
    }

    const permission = await this.permissionModel.findById(id).exec();
    if (!permission) {
      throw new NotFoundException('Không tìm thấy permission');
    }

    if (!permission) {
      throw new NotFoundException('Không tìm thấy permission');
    }
    return permission;
  }

  async findByName(name: string): Promise<Permission | null> {
    return this.permissionModel.findOne({ name }).exec();
  }

  async update(
    id: string,
    updatePermissionDto: UpdatePermissionDto,
    user: IUser
  ): Promise<Permission> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID permission không hợp lệ');
    }

    const existingPermission = await this.permissionModel.findById(id).exec();
    if (!existingPermission) {
      throw new NotFoundException('Không tìm thấy permission');
    }

    // Kiểm tra trùng tên nếu có thay đổi tên
    if (
      updatePermissionDto.name &&
      updatePermissionDto.name !== existingPermission.name
    ) {
      const duplicateName = await this.permissionModel
        .findOne({
          name: updatePermissionDto.name,
          _id: { $ne: id },
        })
        .exec();

      if (duplicateName) {
        throw new ConflictException(
          `Quyền '${updatePermissionDto.name}' đã tồn tại`
        );
      }
    }

    const permission = await this.permissionModel
      .findByIdAndUpdate(
        id,
        {
          ...updatePermissionDto,
          updatedBy: {
            _id: user._id,
            email: user.email,
          },
        },
        { new: true }
      )
      .exec();

    if (!permission) {
      throw new NotFoundException('Không tìm thấy permission sau khi cập nhật');
    }

    return permission;
  }

  async remove(id: string, user: IUser): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID permission không hợp lệ');
    }

    const permission = await this.permissionModel.findById(id).exec();
    if (!permission) {
      throw new NotFoundException('Không tìm thấy permission');
    }

    // Cập nhật thông tin người xóa trước khi soft delete
    await this.permissionModel.findByIdAndUpdate(id, {
      deletedBy: {
        _id: user._id,
        email: user.email,
      },
    });

    // Soft delete permission
    await this.permissionModel.softDelete({ _id: id });

    return {
      message: 'Xóa permission thành công',
    };
  }

  async getDeletedPermissions(): Promise<Permission[]> {
    return this.permissionModel.findDeleted();
  }

  async restore(id: string): Promise<Permission> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID permission không hợp lệ');
    }

    const restoreResult = await this.permissionModel.restore({ _id: id });
    if (!restoreResult) {
      throw new NotFoundException('Không tìm thấy permission đã xóa');
    }

    const permission = await this.permissionModel.findById(id).exec();
    if (!permission) {
      throw new NotFoundException(
        'Không tìm thấy permission sau khi khôi phục'
      );
    }
    return permission;
  }

  // Utility methods cho các module khác sử dụng
  async getPermissionsByNames(names: string[]): Promise<Permission[]> {
    return this.permissionModel.find({ name: { $in: names } }).exec();
  }

  async getAllPermissions(): Promise<Permission[]> {
    return this.permissionModel.find().exec();
  }
}

export default PermissionService;
