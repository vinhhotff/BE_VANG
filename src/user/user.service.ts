/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/**
 * User Service - Hỗ trợ query string filtering và sorting
 *
 * API Endpoint: GET /api/v1/user
 *
 * Query Parameters:
 * - page: Số trang (mặc định: 1)
 * - limit: Số item trên 1 trang (mặc định: 10)
 * - qs: Query string filtering (format: key=value,key2=value2)
 * - sortBy: Trường để sắp xếp (mặc định: createdAt)
 * - sortOrder: Thứ tự sắp xếp asc/desc (mặc định: desc)
 *
 * Các key hỗ trợ trong qs:
 * - search: Tìm kiếm tổng hợp trong name và email
 * - name: Tìm kiếm theo tên cụ thể
 * - email: Tìm kiếm theo email cụ thể
 * - role: Tìm kiếm theo tên role (không phải ID)
 * - phone: Tìm kiếm theo số điện thoại
 *
 * Ví dụ sử dụng:
 * - http://localhost:8083/api/v1/user?page=1&limit=10&qs=role=admin&sortBy=name&sortOrder=desc
 * - http://localhost:8083/api/v1/user?page=1&limit=5&qs=search=vinh,role=admin
 * - http://localhost:8083/api/v1/user?page=2&limit=20&sortBy=createdAt&sortOrder=asc
 * - http://localhost:8083/api/v1/user?qs=name=john,email=john@example.com
 *
 * Response:
 * - Role được populate với tên và permissions
 * - Password và refreshToken được loại bỏ khỏi response
 * - Trả về role.name thay vì role ObjectId
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
import { PaginationResult, SearchUserDto } from './dto/user.dto';
import {
  PaginationQueryDto,
  PaginationResponseDto,
  buildSortObject,
  buildSearchFilter,
} from '../common/dto/pagination.dto';
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
          select: 'name', // Chỉ lấy tên của role
        })
        .select('-password -refreshToken') // Loại bỏ các trường nhạy cảm
        .exec();

      return populatedUser;
    }
  }

  // Chuẩn hóa search users theo format mới
  async searchUsers(
    query: SearchUserDto
  ): Promise<PaginationResponseDto<User>> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      role,
      status,
    } = query;

    // Build base filter
    let filter: any = {};

    // Xử lý search parameter
    if (search && search.trim()) {
      const searchFilter = buildSearchFilter(search, ['name', 'email']);
      filter = { ...filter, ...searchFilter };
    }

    // Xử lý role filter - tìm role theo tên và lấy ObjectId
    if (role && role !== 'all') {
      try {
        const roleModel = this.userModel.db.model('Role');
        const matchingRoles = await roleModel
          .find({
            name: { $regex: new RegExp(`^${role}$`, 'i') }, // Exact match (case-insensitive)
          })
          .select('_id name')
          .exec();

        if (matchingRoles.length > 0) {
          // Use ObjectId for filtering
          const roleIds = matchingRoles.map((r) => r._id);
          filter.role = { $in: roleIds };
        } else {
          // Return empty result if role not found
          filter.role = { $in: [] };
        }
      } catch (error) {
        // Fallback: try to use role as ObjectId if it's a valid ObjectId
        if (Types.ObjectId.isValid(role)) {
          filter.role = new Types.ObjectId(role);
        } else {
          // Return empty result if role is invalid
          filter.role = { $in: [] };
        }
      }
    }

    // Xử lý status filter (nếu có)
    if (status && status !== 'all') {
      // Implement status filter logic here if needed
      // filter.status = status;
    }

    // Tạo sort object
    const sort = buildSortObject(sortBy, sortOrder);

    // Đếm tổng số documents
    const total = await this.userModel.countDocuments(filter);

    // Tính toán pagination
    const skip = (page - 1) * limit;

    // Thực hiện query
    const data = await this.userModel
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'role',
        select: 'name', // Chỉ lấy tên của role
      })
      .select('-password -refreshToken') // Loại bỏ password và refreshToken
      .lean() // Convert to plain JavaScript objects for better performance
      .exec();

    // Normalize role từ object sang string
    // Role có thể là: { _id: '...', name: 'user' } hoặc string
    const normalizedUsers = data.map((user: any) => ({
      ...user,
      role:
        typeof user.role === 'string' ? user.role : user.role?.name || 'user',
    }));

    // Trả về theo format chuẩn với normalized users
    const result = new PaginationResponseDto(
      normalizedUsers,
      total,
      page,
      limit
    );

    return result;
  }

  private parseQueryString(qs: string): Record<string, string> {
    const conditions: Record<string, string> = {};

    // Auto-detect delimiter: & (URL encoded) or , (comma separated)
    const decodedQs = decodeURIComponent(qs);
    let pairs: string[];

    if (decodedQs.includes('&')) {
      // URL encoded format: "role=staff&sortBy=name&sortOrder=desc"
      pairs = decodedQs.split('&').map((pair) => pair.trim());
    } else {
      // Comma separated format: "role=admin,name=vinh,email=test@example.com"
      pairs = decodedQs.split(',').map((pair) => pair.trim());
    }

    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        const cleanKey = key.trim();
        const cleanValue = value.trim();
        conditions[cleanKey] = cleanValue;
      }
    }

    return conditions;
  }

  private async buildMongoFilter(
    conditions: Record<string, string>
  ): Promise<any> {
    const filter: any = {};

    // Danh sách field được phép search (bao gồm sort parameters)
    const validFields = [
      'role',
      'status',
      'name',
      'email',
      'phone',
      'search',
      'sortBy',
      'sortOrder',
    ];

    for (const [key, value] of Object.entries(conditions)) {
      if (validFields.includes(key)) {
        if (key === 'sortBy' || key === 'sortOrder') {
          // Bỏ qua sort parameters - đã được xử lý ở searchUsers
        } else if (key === 'role') {
          // Tìm role theo tên thay vì ObjectId
          const roleModel = this.userModel.db.model('Role');

          const allRoles = await roleModel.find({}).select('_id name').exec();
          const matchingRoles = await roleModel
            .find({
              name: { $regex: value, $options: 'i' },
            })
            .select('_id name');

          if (matchingRoles.length > 0) {
            // Handle both ObjectId and string types for role field
            const roleIds = matchingRoles.map((role) => role._id);
            const roleStrings = matchingRoles.map((role) =>
              role._id.toString()
            );

            filter.role = {
              $in: [...roleIds, ...roleStrings],
            };
          } else {
            // Nếu không tìm thấy role, đặt điều kiện không thể match
            filter.role = null;
          }
        } else if (key === 'search') {
          // Tìm kiếm tổng hợp trong name và email
          filter.$or = [
            { name: { $regex: value, $options: 'i' } },
            { email: { $regex: value, $options: 'i' } },
          ];
        } else if (key === 'name' || key === 'email' || key === 'phone') {
          // Text fields sử dụng regex để partial search (case-insensitive)
          filter[key] = { $regex: value, $options: 'i' };
        } else {
          // Exact match cho các field khác
          filter[key] = value;
        }
      }
    }

    return filter;
  }

  // Method để search by role name thay vì ID (DEPRECATED - Sử dụng searchUsers instead)
  async searchUsersByRoleName(
    query: SearchUserDto
  ): Promise<PaginationResult<User>> {
    const { page = 1, limit = 10, qs, sortBy, sortOrder } = query;

    const aggregationPipeline: any[] = [];

    // Nếu có search conditions
    if (qs) {
      const searchConditions = this.parseQueryString(qs);

      // Lookup role để có thể search by role name
      aggregationPipeline.push({
        $lookup: {
          from: 'roles', // collection name của roles
          localField: 'role',
          foreignField: '_id',
          as: 'roleDetails',
        },
      });

      // Match stage
      const matchConditions: any = {};

      Object.entries(searchConditions).forEach(([key, value]) => {
        if (key === 'role') {
          // Search by role name thay vì ID
          matchConditions['roleDetails.name'] = {
            $regex: value,
            $options: 'i',
          };
        } else if (key === 'name' || key === 'email') {
          matchConditions[key] = { $regex: value, $options: 'i' };
        } else if (['status', 'phone'].includes(key)) {
          matchConditions[key] = value;
        }
      });

      if (Object.keys(matchConditions).length > 0) {
        aggregationPipeline.push({ $match: matchConditions });
      }
    }

    // Add sorting
    if (sortBy) {
      const sortObj: any = {};
      sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
      aggregationPipeline.push({ $sort: sortObj });
    }

    // Count total for pagination
    const countPipeline = [...aggregationPipeline, { $count: 'total' }];
    const countResult = await this.userModel.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add pagination - Đảm bảo page và limit không undefined
    const safePage = page || 1;
    const safeLimit = limit || 10;
    const skip = (safePage - 1) * safeLimit;
    aggregationPipeline.push({ $skip: skip }, { $limit: safeLimit });

    // Execute aggregation
    const data = await this.userModel.aggregate(aggregationPipeline);

    // Tính toán pagination info
    const totalPages = Math.ceil(total / safeLimit);
    const hasNext = safePage < totalPages;
    const hasPrev = safePage > 1;

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
      hasNext,
      hasPrev,
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
        select: 'name', // Chỉ lấy tên của role
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
          select: 'name', // Chỉ lấy tên của role
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
