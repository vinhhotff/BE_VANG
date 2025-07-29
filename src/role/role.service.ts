import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { IUser } from 'src/user/user.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Role } from './schemas/role.schema';
import { SoftDeleteModel } from 'soft-delete-mongoose-plugin';
import mongoose, { Types } from 'mongoose';
import { Permission } from 'src/permission/schemas/permission.schema';

@Injectable()
export class RoleService {
  constructor(
    @InjectModel(Role.name)
    private roleModel: SoftDeleteModel<Role>,
    @InjectModel(Permission.name)
    private readonly permissionModel: SoftDeleteModel<Permission>,
  ) { }
  async create(createRoleDto: CreateRoleDto, user: IUser) {
    const { name } = createRoleDto;
    const existingRole = await this.roleModel.findOne({ name }).exec();
    if (existingRole) {
      throw new BadRequestException(`Role with name ${name} already exists`);
    }
    const role = await this.roleModel.create({
      ...createRoleDto,
      createdBy: user._id,
    });

    return role;
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
    const totalItems = await this.roleModel.countDocuments(filter);

    // Thực thi truy vấn
    const result = await this.roleModel.find(filter)
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
    const role = this.roleModel.findById(id).exec();
    if (!role) {
      throw new Error(`Role with id ${id} not found`);
    }
    return role;
  }

  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('can not found ID ');
    } else {
      const userExist = await this.roleModel.findById(id).exec();
      const updateUserDelete = await this.roleModel.findByIdAndUpdate({ id }, {
        deletedBy: {
          _id: user._id.toString(),
          email: user.email,
        }
      })
      if (!userExist) {
        throw new BadRequestException('User not found');
      }
      await this.roleModel.softDeleteOne({ _id: id });
      return {
        deletedBy: {
          _id: user._id,
          email: user.email,
        },
      };
    }
  }

  async addPermissionsByName(roleId: string, names: string[], user: IUser) {
    const role = await this.roleModel.findById(roleId);
    if (!role) throw new NotFoundException('Role not found');

    const permissions = await this.permissionModel.find({ name: { $in: names } }).select('_id');
    if (permissions.length !== names.length) {
      throw new BadRequestException('Some permissions are invalid');
    }

    const current = role.permissions.map(id => id.toString());
    const added = permissions.map(p => p._id.toString());

    const merged = Array.from(new Set([...current, ...added]));

    role.permissions = merged.map(id => new Types.ObjectId(id));
    role.updatedBy = {
      _id: user._id, // đảm bảo đây là ObjectId
      email: user.email,
    };

    return role.save();
  }

  async removePermissionsByName(roleId: string, names: string[], user: IUser) {
    const role = await this.roleModel.findById(roleId);
    if (!role) throw new NotFoundException('Role not found');

    const permissions = await this.permissionModel.find({ name: { $in: names } }).select('_id');
    const removeIds = permissions.map(p => p._id.toString());

    const filtered = role.permissions.filter(id => !removeIds.includes(id.toString()));
    role.permissions = filtered;
    role.updatedBy = { _id: user._id, email: user.email };
    return role.save();
  }

}
