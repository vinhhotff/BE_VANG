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

  async searchUsers(query: SearchUserDto): Promise<PaginationResult<User>> {
    const {
      page = 1,
      limit = 10,
      qs,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    console.log('🔍 SearchUsers called with query:', query);

    // Tạo MongoDB filter object và xử lý sort parameters
    let filter: any = {};
    let finalSortBy = sortBy;
    let finalSortOrder = sortOrder;

    // Xử lý điều kiện search từ qs parameter
    if (qs && qs.trim()) {
      console.log('🔍 Processing query string:', qs);
      const searchConditions = this.parseQueryString(qs);

      // Tách sort parameters khỏi search conditions
      if (searchConditions.sortBy) {
        finalSortBy = searchConditions.sortBy;
        delete searchConditions.sortBy;
        console.log('🔍 Override sortBy from qs:', finalSortBy);
      }

      if (searchConditions.sortOrder) {
        finalSortOrder = searchConditions.sortOrder as 'asc' | 'desc';
        delete searchConditions.sortOrder;
        console.log('🔍 Override sortOrder from qs:', finalSortOrder);
      }

      filter = await this.buildMongoFilter(searchConditions);
    }

    console.log('🔍 Final filter applied:', filter);

    // Tạo sort object cho MongoDB
    const sort: any = {};
    if (finalSortBy) {
      sort[finalSortBy] = finalSortOrder === 'asc' ? 1 : -1;
      console.log('🔍 Sort applied:', sort);
    }

    // Đếm tổng số documents với filter
    const total = await this.userModel.countDocuments(filter);
    console.log('🔍 Total documents found with filter:', total);

    // Tính toán pagination - Đảm bảo page và limit không undefined
    const safePage = page || 1;
    const safeLimit = limit || 10;
    const skip = (safePage - 1) * safeLimit;

    // Thực hiện query với pagination và sorting
    const data = await this.userModel
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(safeLimit)
      .populate({
        path: 'role',
        select: 'name', // Chỉ lấy tên của role
      })
      .select('-password -refreshToken') // Loại bỏ password và refreshToken
      .exec();

    console.log(`✅ Found ${data.length} users on page ${safePage}`);
    console.log('🔍 First user sample:', {
      name: data[0]?.name,
      email: data[0]?.email,
      role: data[0]?.role,
    });

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

  private parseQueryString(qs: string): Record<string, string> {
    const conditions: Record<string, string> = {};

    console.log('🔍 Parsing query string:', qs);
    console.log('🔍 Decoded query string:', decodeURIComponent(qs));

    // Auto-detect delimiter: & (URL encoded) or , (comma separated)
    const decodedQs = decodeURIComponent(qs);
    let pairs: string[];

    if (decodedQs.includes('&')) {
      // URL encoded format: "role=staff&sortBy=name&sortOrder=desc"
      pairs = decodedQs.split('&').map((pair) => pair.trim());
      console.log('🔍 Detected URL encoded format (&)');
    } else {
      // Comma separated format: "role=admin,name=vinh,email=test@example.com"
      pairs = decodedQs.split(',').map((pair) => pair.trim());
      console.log('🔍 Detected comma separated format (,)');
    }

    console.log('🔍 Split pairs:', pairs);

    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        const cleanKey = key.trim();
        const cleanValue = value.trim();
        conditions[cleanKey] = cleanValue;
        console.log(`✅ Parsed condition: ${cleanKey} = ${cleanValue}`);
      }
    }

    console.log('🔍 Final parsed conditions:', conditions);
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

    console.log('🔍 Building MongoDB filter for conditions:', conditions);

    for (const [key, value] of Object.entries(conditions)) {
      if (validFields.includes(key)) {
        if (key === 'sortBy' || key === 'sortOrder') {
          // Bỏ qua sort parameters - đã được xử lý ở searchUsers
          console.log(`ℹ️ Skipping sort parameter: ${key}`);
        } else if (key === 'role') {
          // Tìm role theo tên thay vì ObjectId
          console.log(`🔍 Searching for role with name: ${value}`);

          const roleModel = this.userModel.db.model('Role');

          // Debug: Kiểm tra tất cả roles trong DB
          const allRoles = await roleModel.find({}).select('_id name').exec();
          console.log('🔍 All roles in DB:', allRoles);

          const matchingRoles = await roleModel
            .find({
              name: { $regex: value, $options: 'i' },
            })
            .select('_id name');

          console.log(
            '🔍 Found matching roles for "' + value + '":',
            matchingRoles
          );

          if (matchingRoles.length > 0) {
            // Handle both ObjectId and string types for role field
            const roleIds = matchingRoles.map((role) => role._id);
            const roleStrings = matchingRoles.map((role) =>
              role._id.toString()
            );

            filter.role = {
              $in: [...roleIds, ...roleStrings],
            };

            console.log(
              '✅ Role filter applied with both ObjectId and string:',
              filter.role
            );
          } else {
            // Nếu không tìm thấy role, đặt điều kiện không thể match
            filter.role = null;
            console.log(
              '❌ No matching roles found, setting role filter to null'
            );
          }
        } else if (key === 'search') {
          // Tìm kiếm tổng hợp trong name và email
          filter.$or = [
            { name: { $regex: value, $options: 'i' } },
            { email: { $regex: value, $options: 'i' } },
          ];
          console.log('✅ Search filter applied:', filter.$or);
        } else if (key === 'name' || key === 'email' || key === 'phone') {
          // Text fields sử dụng regex để partial search (case-insensitive)
          filter[key] = { $regex: value, $options: 'i' };
          console.log(`✅ ${key} filter applied:`, filter[key]);
        } else {
          // Exact match cho các field khác
          filter[key] = value;
          console.log(`✅ ${key} exact match filter applied:`, value);
        }
      } else {
        console.log(`⚠️ Skipping invalid field: ${key}`);
      }
    }

    console.log('🔍 Final MongoDB filter:', filter);
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
