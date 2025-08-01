import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, RoleDocument } from './schemas/role.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from '../user/user.interface';
import { Permission } from '../permission/schemas/permission.schema';

@Injectable()
export class RoleService {
  constructor(
    @InjectModel(Role.name) private roleModel: SoftDeleteModel<RoleDocument>,
    @InjectModel(Permission.name) private permissionModel: Model<Permission>
  ) {}

  async create(createRoleDto: CreateRoleDto, user: IUser): Promise<Role> {
    const existingRole = await this.roleModel
      .findOne({ name: createRoleDto.name })
      .exec();
    if (existingRole) {
      throw new ConflictException(`Role '${createRoleDto.name}' đã tồn tại`);
    }

    const role = new this.roleModel({
      ...createRoleDto,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    return role.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<{ roles: Role[]; total: number; totalPages: number }> {
    const filter: any = {};

    if (search) {
      filter.$or = [{ name: { $regex: search, $options: 'i' } }];
    }

    const skip = (page - 1) * limit;
    const total = await this.roleModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const roles = await this.roleModel
      .find(filter)
      .populate({ path: 'permissions', select: '_id name description' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return { roles, total, totalPages };
  }

  async findById(id: string): Promise<Role> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID role không hợp lệ');
    }

    const role = await this.roleModel
      .findById(id)
      .populate({
        path: 'permissions',
        select: '_id name description',
      })
      .exec();
    if (!role) {
      throw new NotFoundException('Không tìm thấy role');
    }

    return role;
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleModel.findOne({ name }).exec();
  }

  async update(
    id: string,
    updateRoleDto: UpdateRoleDto,
    user: IUser
  ): Promise<Role> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID role không hợp lệ');
    }

    const existingRole = await this.roleModel.findById(id).exec();
    if (!existingRole) {
      throw new NotFoundException('Không tìm thấy role');
    }

    if (updateRoleDto.name && updateRoleDto.name !== existingRole.name) {
      const duplicateName = await this.roleModel
        .findOne({
          name: updateRoleDto.name,
          _id: { $ne: id },
        })
        .exec();

      if (duplicateName) {
        throw new ConflictException(`Role '${updateRoleDto.name}' đã tồn tại`);
      }
    }

    const role = await this.roleModel
      .findByIdAndUpdate(
        id,
        {
          ...updateRoleDto,
          updatedBy: {
            _id: user._id,
            email: user.email,
          },
        },
        { new: true }
      )
      .populate('permissions')
      .exec();

    if (!role) {
      throw new NotFoundException('Không tìm thấy role');
    }

    return role;
  }

  async remove(id: string, user: IUser): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID role không hợp lệ');
    }

    const role = await this.roleModel.findById(id).exec();
    if (!role) {
      throw new NotFoundException('Không tìm thấy role');
    }

    await this.roleModel.findByIdAndUpdate(id, {
      deletedBy: {
        _id: user._id,
        email: user.email,
      },
    });

    await this.roleModel.softDelete({ _id: id });

    return {
      message: 'Đã xóa role thành công',
    };
  }

  async getDeletedRoles(): Promise<Role[]> {
    return this.roleModel.findDeleted();
  }

  async restore(id: string): Promise<Role> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID role không hợp lệ');
    }

    const restored = await this.roleModel.restore({ _id: id });
    if (!restored) {
      throw new NotFoundException('Không tìm thấy role đã xóa');
    }

    const role = await this.roleModel.findById(id).exec();
    if (!role) {
      throw new NotFoundException('Không tìm thấy role');
    }
    return role;
  }

  async getAllRoles(): Promise<Role[]> {
    return this.roleModel.find().populate('permissions').exec();
  }

  async addPermissionsToRole(
    roleId: string,
    updateRolePermissionsDto: { permissionIds: string[] },
    user: IUser
  ): Promise<Role> {
    if (!Types.ObjectId.isValid(roleId)) {
      throw new BadRequestException('ID role không hợp lệ');
    }

    const { permissionIds } = updateRolePermissionsDto;

    // Tìm role theo ID
    const role = await this.roleModel.findById(roleId).exec();
    if (!role) {
      throw new NotFoundException(`Role với ID ${roleId} không tồn tại`);
    }

    // Kiểm tra xem tất cả permissionIds có hợp lệ không
    const validPermissions: string[] = [];
    for (const permissionId of permissionIds) {
      if (!Types.ObjectId.isValid(permissionId)) {
        throw new BadRequestException(
          `Permission ID ${permissionId} không hợp lệ`
        );
      }

      const permission = await this.permissionModel
        .findById(permissionId)
        .exec();
      if (!permission) {
        throw new NotFoundException(
          `Permission với ID ${permissionId} không tồn tại`
        );
      }
      validPermissions.push(permissionId);
    }

    // Thêm permissions vào role (tránh trùng lặp)
    const existingPermissions = role.permissions?.map((p) => p.toString());
    const newPermissions = validPermissions.filter(
      (permId) => !existingPermissions?.includes(permId)
    );

    if (newPermissions.length === 0) {
      throw new BadRequestException('Tất cả permissions đã có trong role này');
    }

    // Cập nhật role với permissions mới
    const updatedRole = await this.roleModel
      .findByIdAndUpdate(
        roleId,
        {
          $addToSet: { permissions: { $each: newPermissions } },
          updatedBy: {
            _id: user._id,
            email: user.email,
          },
        },
        { new: true }
      )
      .populate({
        path: 'permissions',
        select: '_id name description',
      })

      .exec();

    if (!updatedRole) {
      throw new NotFoundException(`Không tìm thấy role với ID ${roleId}`);
    }

    return updatedRole;
  }

  async removePermissionsByName(
    roleId: string,
    permissionNames: string[],
    user: IUser
  ): Promise<Role> {
    if (!Types.ObjectId.isValid(roleId)) {
      throw new BadRequestException('ID role không hợp lệ');
    }

    const role = await this.roleModel
      .findById(roleId)
      .populate('permissions')
      .exec();
    if (!role) {
      throw new NotFoundException(`Role với ID ${roleId} không tồn tại`);
    }

    // Tìm permissions theo tên
    const permissionsToRemove = await this.permissionModel
      .find({ name: { $in: permissionNames } })
      .select('_id name')
      .exec();

    if (permissionsToRemove.length === 0) {
      throw new NotFoundException(
        'Không tìm thấy permission nào với tên đã cung cấp'
      );
    }

    const removeIds = permissionsToRemove.map((p) => p._id);

    // Lọc ra những permissions không bị xóa
    const updatedPermissions = role.permissions?.filter(
      (permission) => !removeIds.includes(permission._id.toString())
    );

    // Cập nhật role
    const updatedRole = await this.roleModel
      .findByIdAndUpdate(
        roleId,
        {
          permissions: updatedPermissions?.map((p) => p._id),
          updatedBy: {
            _id: user._id,
            email: user.email,
          },
        },
        { new: true }
      )
      .populate({ path: 'permissions', select: '_id name description' })
      .exec();

    if (!updatedRole) {
      throw new NotFoundException(`Không tìm thấy role với ID ${roleId}`);
    }

    return updatedRole;
  }
}
