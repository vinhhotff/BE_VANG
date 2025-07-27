import { Permission } from './schemas/permission.schema';
import { Injectable, Controller, BadRequestException } from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { IUser } from 'src/user/user.interface';
import { Injector } from '@nestjs/core/injector/injector';
import { InjectModel } from '@nestjs/mongoose';
import { Role } from 'src/role/schemas/role.schema';
import { SoftDeleteModel } from 'soft-delete-mongoose-plugin';
import mongoose from 'mongoose';

@Injectable()
export class PermissionService {
  constructor(
    @InjectModel(Role.name)
    private permissionModel: SoftDeleteModel<Permission>,
  ) {

  }
 async create(createPermissionDto: CreatePermissionDto, user: IUser) {
    const permissionExists = await this.permissionModel.findOne({ name: createPermissionDto.name }).exec();
    if (permissionExists) {
      throw new BadRequestException('Permission already exists');
    } else{
      const newPermission = this.permissionModel.create({
        ...createPermissionDto,
        createdBy: {
          _id: user._id,
          email: user.email,
        },
      });
      return newPermission;
    }
  }

   //find with numberpage and limit with query
  async findAll(currentPage: number, limit: number, qs: string = '') {
    // Xử lý input
    const page = Math.max(1, currentPage); // Đảm bảo page không âm
    const defaultLimit = Math.max(1, Math.min(+limit || 10, 100)); // Giới hạn 1-100, mặc định 10

    // Tính offset
    const offset = (page - 1) * defaultLimit;

    // Phân tích qs thành filter
    const filter = this.parseQuery(qs);

    // Tính tổng số mục
    const totalItems = await this.permissionModel.countDocuments(filter);

    // Thực thi truy vấn
    const result = await this.permissionModel.find(filter)
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
      const conditions = qs.split(',').map((part) => part.trim().split(':'));
      conditions.forEach(([key, value]) => {
        if (key && value) {
          // Chỉ xử lý bộ lọc, bỏ qua sort
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          filter[key] = { $regex: value, $options: 'i' }; // Không phân biệt hoa thường
        }
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return filter;
  }


  findOne(id: string) {
    const permission = this.permissionModel.findById(id).exec();
    if (!permission) {
      throw new BadRequestException(`Permission with ID ${id} not found`);
    }
    return permission;
  }

  async remove(id: string, user: IUser) {
     if (!mongoose.Types.ObjectId.isValid(id)) {
       throw new BadRequestException('can not found ID ');
     } else {
       const userExist = await this.permissionModel.findById(id).exec();
       const updateUserDelete = await this.permissionModel.findByIdAndUpdate({id},{
         deletedBy: {
           _id: user._id,
           email: user.email,
         }
       })
       if (!userExist) {
         throw new BadRequestException('User not found');
       }
       await this.permissionModel.softDeleteOne({ _id: id });
       return {
         deletedBy: {
           _id: user._id,
           email: user.email,
         },
       };
     }
   }
}