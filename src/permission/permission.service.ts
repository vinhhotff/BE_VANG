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
import { UpdatePermissionDto, UpdateRolePermissionsByNameDto } from './dto/update-permission.dto';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from '../user/user.interface';
import { RoleModule } from 'src/role/role.module';
import { Role } from 'src/role/schemas/role.schema';

@Injectable()
export class PermissionService {
  constructor(
    @InjectModel(Permission.name)
    private permissionModel: SoftDeleteModel<PermissionDocument>,
    @InjectModel(Role.name)
    private readonly roleModel: Model<Role>, // Sử dụng đúng interface/schema cho Role
  ) {}

  async create(
    createPermissionDto: CreatePermissionDto,
    user: IUser
  ): Promise<Permission> {
    // Kiểm tra user
    if (!user || !user._id) {
      throw new BadRequestException('User information is missing');
    }

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

 async addPermissionsToRoleByName(
  roleId: string,
  dto: { permissionNames: string[] },
  user: IUser,
): Promise<Role> {
  if (!Types.ObjectId.isValid(roleId)) {
    throw new BadRequestException('ID role không hợp lệ');
  }

  const { permissionNames } = dto;

  // Tìm role theo ID
  const role = await this.roleModel.findById(roleId).exec();
  if (!role) {
    throw new NotFoundException(`Role với ID ${roleId} không tồn tại`);
  }

  // Tìm tất cả permissions theo tên
  const permissions = await this.permissionModel.find({
    name: { $in: permissionNames },
  });

  if (permissions.length !== permissionNames.length) {
    const foundNames = permissions.map((p) => p.name);
    const missing = permissionNames.filter((n) => !foundNames.includes(n));
    throw new BadRequestException(
      `Các permission sau không tồn tại: ${missing.join(', ')}`
    );
  }

  const validPermissionIds = permissions.map((p) => p._id.toString());

  // Lấy danh sách permission hiện tại
  const existingPermissions = role.permissions?.map((p) => p.toString()) ?? [];

  // Lọc những permission mới chưa có
  const newPermissions = validPermissionIds.filter(
    (permId) => !existingPermissions.includes(permId)
  );

  if (newPermissions.length === 0) {
    throw new BadRequestException('Tất cả permissions đã có trong role này');
  }

  // Cập nhật role
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

}

export default PermissionService;
