/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
        address,
        role: role || 'User',
        createdBy: {
          email: user.email,
        },
      });
      return newUser;
    }
  }

  async findAll(currentPage: number, limit: number, qs: string = '') {
    // Xử lý input
    const page = Math.max(1, currentPage); // Đảm bảo page không âm
    const defaultLimit = Math.max(1, Math.min(+limit || 10, 100)); // Giới hạn 1-100, mặc định 10

    // Tính offset
    const offset = (page - 1) * defaultLimit;

    // Phân tích qs thành filter
    const filter = this.parseQuery(qs);

    // Tính tổng số mục
    const totalItems = await this.userModel.countDocuments(filter);

    // Thực thi truy vấn
    const result = await this.userModel
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
      const conditions = qs.split(',').map((part) => part.trim().split(':'));
      conditions.forEach(([key, value]) => {
        if (key && value) {
          // Chỉ xử lý bộ lọc, bỏ qua sort
          filter[key] = { $regex: value, $options: 'i' }; // Không phân biệt hoa thường
        }
      });
    }

    return filter;
  }

  findOneID(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    const user = this.userModel.findById(id).exec();
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, user: IUser) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    const userExist = await this.userModel.findById(id).exec();
    if (!userExist) {
      throw new BadRequestException('User not found');
    } else {
      const updatedUser = {
        ...updateUserDto,
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      };
      const updated = await this.userModel
        .findByIdAndUpdate(id, updatedUser, { new: true })
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
