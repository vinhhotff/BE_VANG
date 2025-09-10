/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/**
 * User Service - Đã cập nhật hỗ trợ query string filtering
 *
 * Query string format: ?qs=key=value,key2=value2
 *
 * Các key hỗ trợ:
 * - search: Tìm kiếm trong name hoặc email (?qs=search=vinh)
 * - name: Tìm kiếm theo tên (?qs=name=vinh)
 * - email: Tìm kiếm theo email (?qs=email=vinh@example.com)
 * - role: Tìm kiếm theo tên role (?qs=role=admin)
 * - phone: Tìm kiếm theo số điện thoại (?qs=phone=123456)
 *
 * Ví dụ: http://localhost:8083/api/v1/user?page=1&limit=3&qs=name=vinh
 *         http://localhost:8083/api/v1/user?page=1&limit=10&qs=search=admin,role=admin
 *
 * Role được populate với tên và permissions, password/refreshToken được loại bỏ khỏi response.
 */
import { JwtService } from '@nestjs/jwt';
import { compare, genSaltSync, hash } from 'bcrypt';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto, RegisterUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { IUser } from './user.interface';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import mongoose, { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Role } from 'src/role/schemas/role.schema';
import path from 'path';
@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: SoftDeleteModel<UserDocument>, // 👈 CHÚ Ý
    private readonly JwtService: JwtService, // Thêm JwtService nếu cần
    private readonly configService: ConfigService // Thêm ConfigService nếu cần
  ) {}

  //hashPassword function to hash the password
  hashedSomething = async (something: string): Promise<string> => {
    const salt = genSaltSync(10);
    const hashedSomething = await hash(something, salt);
    return hashedSomething;
  };

  //findbyEmail function to find user by email
  findByEmail = async (email: string) => {
    return this.userModel.findOne({ email }).exec();
  };

  //create function to create user
  async createUser(createUserDto: CreateUserDto, user: IUser) {
    const { name, email, password, phone, address, role } = createUserDto;
    const hashedPassword = await this.hashedSomething(password);
    const existedEmail = await this.findByEmail(email);
    if (existedEmail) {
      throw new BadRequestException('Email already exists');
    } else {
      const newUser = await this.userModel.create({
        name,
        email,
        password: hashedPassword,
        phone,
        avatar: createUserDto.avatar,
        address,
        role: role || 'User',
        createdBy: {
          email: user.email,
        },
      });

      // Trả về user với role đã populate và loại bỏ password
      const populatedUser = await this.userModel
        .findById(newUser._id)
        .populate({
          path: 'role',
          select: 'name permissions', // Chỉ lấy tên và quyền của role
        })
        .select('-password -refreshToken') // Loại bỏ các trường nhạy cảm
        .exec();

      return populatedUser;
    }
  }

  async findAll(currentPage: number, limit: number, qs: string = '') {
    const page = Math.max(1, currentPage);
    const defaultLimit = Math.max(1, Math.min(+limit || 10, 100));
    const skip = (page - 1) * defaultLimit;

    const filters = new URLSearchParams(qs);
    const query: any = {};
    const sort: any = { createdAt: -1 }; // mặc định mới nhất

    // 🔎 Search theo name/email
    if (filters.has('search')) {
      const search = filters.get('search');
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }

    // 🔎 Lọc theo role name → convert sang roleId
    if (filters.has('role')) {
      const roleName = filters.get('role');
      const role = await this.roleModel.findOne({ name: roleName }).exec();
      if (role) {
        query.role = role._id;
      } else {
        query.role = null; // đảm bảo không trả kết quả nếu role không tồn tại
      }
    }

    // 🔎 Các filter khác (ví dụ phone, status, ...)
    if (filters.has('phone')) {
      query.phone = new RegExp(filters.get('phone'), 'i');
    }
    if (filters.has('status')) {
      query.status = filters.get('status');
    }

    // 🔎 Sort
    if (filters.has('sortBy')) {
      const sortBy = filters.get('sortBy');
      const sortOrder = filters.get('sortOrder') === 'desc' ? -1 : 1;
      sort[sortBy] = sortOrder;
    }

    // 📊 Query song song
    const [results, total] = await Promise.all([
      this.userModel
        .find(query)
        .populate({
          path: 'role',
          select: 'name permissions', // lấy đúng name + permissions
        })
        .select('-password -refreshToken') // loại bỏ field nhạy cảm
        .sort(sort)
        .skip(skip)
        .limit(defaultLimit)
        .exec(),
      this.userModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / defaultLimit);

    return {
      results,
      meta: {
        total,
        page,
        limit: defaultLimit,
        totalPages,
      },
    };
  }

  async findOneID(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const user = await this.userModel
      .findById(id)
      .populate({
        path: 'role',
        select: 'name permissions', // Chỉ lấy tên và quyền của role
      })
      .select('-password -refreshToken') // Loại bỏ các trường nhạy cảm
      .exec();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }
  async countUsers(): Promise<number> {
    return this.userModel.countDocuments();
  }

  async update(id: string, updateUserDto: UpdateUserDto, user?: IUser) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    const userExist = await this.userModel.findById(id).exec();
    if (!userExist) {
      throw new BadRequestException('User not found');
    } else {
      const updatedUser = {
        ...updateUserDto,
        updatedBy: user
          ? {
              _id: user._id,
              email: user.email,
            }
          : undefined,
      };
      const updated = await this.userModel
        .findByIdAndUpdate(id, updatedUser, { new: true })
        .populate({
          path: 'role',
          select: 'name permissions', // Chỉ lấy tên và quyền của role
        })
        .select('-password -refreshToken') // Loại bỏ các trường nhạy cảm
        .exec();
      return updated;
    }
  }

  async remove(id: string, user: IUser) {
    if (id === user._id.toString()) {
      throw new BadRequestException('Cannot remove yourself');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID');
    }

    const userExist = await this.userModel.findById(id).exec();

    if (!userExist) {
      throw new BadRequestException('User not found');
    }

    // Cập nhật thông tin người xóa
    await this.userModel.findByIdAndUpdate(id, {
      deletedBy: {
        _id: user._id,
        email: user.email,
      },
    });

    // Soft delete user
    await this.userModel.softDelete({ _id: id });

    return {
      message: 'User deleted successfully',
      deletedBy: {
        _id: user._id,
        email: user.email,
      },
    };
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await compare(plainPassword, hashedPassword);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email });
  }

  async findUserWithRoleAndPermissions(userId: string): Promise<User | null> {
    return this.userModel
      .findById(userId)
      .populate({
        path: 'role',
        populate: {
          path: 'permissions',
        },
      })
      .exec();
  }

  async register(user: RegisterUserDto) {
    const { name, email, password } = user;
    const hashedPassword = await this.hashedSomething(password);
    const existedEmail = await this.findByEmail(email);
    if (existedEmail) {
      throw new BadRequestException('Email already exists');
    } else {
      const newUser = await this.userModel.create({
        name,
        email,
        password: hashedPassword,
      });
      return newUser;
    }
  }
  async updateRefreshToken(userId: string, refreshToken: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new BadRequestException('User not found');
    }
    user.refreshToken = refreshToken;
    await user.save();
  }
  async findUserByAccessToken(accessToken: string): Promise<User> {
    try {
      const payload = await this.JwtService.verifyAsync(accessToken, {
        secret: this.configService.get<string>('JWT_SECRET_TOKEN_SECRET'),
      });

      const user = await this.userModel.findById(payload._id).exec();
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      return user;
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
