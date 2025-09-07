import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Voucher, VoucherDocument, VoucherStatus, VoucherType } from './schemas/voucher.schema';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { ValidateVoucherDto } from './dto/validate-voucher.dto';

@Injectable()
export class VoucherService {
  constructor(
    @InjectModel(Voucher.name) private voucherModel: Model<VoucherDocument>,
  ) {}

  async create(createVoucherDto: CreateVoucherDto, userId?: string): Promise<Voucher> {
    // Check if voucher code already exists
    const existingVoucher = await this.voucherModel.findOne({ code: createVoucherDto.code });
    if (existingVoucher) {
      throw new ConflictException('Voucher code already exists');
    }

    // Validate dates
    const startDate = new Date(createVoucherDto.startDate);
    const endDate = new Date(createVoucherDto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Validate percentage values
    if (createVoucherDto.type === VoucherType.PERCENTAGE) {
      if (createVoucherDto.value < 1 || createVoucherDto.value > 100) {
        throw new BadRequestException('Percentage value must be between 1 and 100');
      }
    }

    const voucher = new this.voucherModel({
      ...createVoucherDto,
      startDate,
      endDate,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
      usageLimitPerUser: createVoucherDto.usageLimitPerUser || 1,
    });

    return voucher.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: VoucherStatus,
    search?: string
  ): Promise<{ vouchers: Voucher[]; total: number; page: number; totalPages: number }> {
    const filter: any = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await this.voucherModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const vouchers = await this.voucherModel
      .find(filter)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return { vouchers, total, page, totalPages };
  }

  async findById(id: string): Promise<Voucher> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid voucher ID format');
    }

    const voucher = await this.voucherModel
      .findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .exec();

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    return voucher;
  }

  async findByCode(code: string): Promise<Voucher> {
    const voucher = await this.voucherModel.findOne({ code }).exec();
    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }
    return voucher;
  }

  async update(id: string, updateVoucherDto: UpdateVoucherDto, userId?: string): Promise<Voucher> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid voucher ID format');
    }

    const existingVoucher = await this.voucherModel.findById(id);
    if (!existingVoucher) {
      throw new NotFoundException('Voucher not found');
    }

    // If updating code, check for conflicts
    if (updateVoucherDto.code && updateVoucherDto.code !== existingVoucher.code) {
      const codeExists = await this.voucherModel.findOne({
        code: updateVoucherDto.code,
        _id: { $ne: id }
      });
      if (codeExists) {
        throw new ConflictException('Voucher code already exists');
      }
    }

    // Validate dates if provided
    if (updateVoucherDto.startDate || updateVoucherDto.endDate) {
      const startDate = updateVoucherDto.startDate 
        ? new Date(updateVoucherDto.startDate) 
        : existingVoucher.startDate;
      const endDate = updateVoucherDto.endDate 
        ? new Date(updateVoucherDto.endDate) 
        : existingVoucher.endDate;

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    // Validate percentage if updating type or value
    if (updateVoucherDto.type === VoucherType.PERCENTAGE || 
        (existingVoucher.type === VoucherType.PERCENTAGE && updateVoucherDto.value)) {
      const value = updateVoucherDto.value || existingVoucher.value;
      if (value < 1 || value > 100) {
        throw new BadRequestException('Percentage value must be between 1 and 100');
      }
    }

    const updatedVoucher = await this.voucherModel
      .findByIdAndUpdate(
        id, 
        {
          ...updateVoucherDto,
          startDate: updateVoucherDto.startDate ? new Date(updateVoucherDto.startDate) : undefined,
          endDate: updateVoucherDto.endDate ? new Date(updateVoucherDto.endDate) : undefined,
          updatedBy: userId ? new Types.ObjectId(userId) : undefined,
        },
        { new: true }
      )
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .exec();

    return updatedVoucher!;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid voucher ID format');
    }

    const voucher = await this.voucherModel.findById(id);
    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    await this.voucherModel.findByIdAndDelete(id);
  }

  async validateVoucher(validateVoucherDto: ValidateVoucherDto): Promise<{
    valid: boolean;
    voucher?: Voucher;
    discount?: number;
    message?: string;
  }> {
    const { code, orderValue = 0, userId } = validateVoucherDto;

    try {
      const voucher = await this.findByCode(code);
      const now = new Date();

      // Check if voucher is active
      if (voucher.status !== VoucherStatus.ACTIVE || !voucher.isActive) {
        return { valid: false, message: 'Voucher is not active' };
      }

      // Check date validity
      if (now < voucher.startDate) {
        return { valid: false, message: 'Voucher is not yet valid' };
      }

      if (now > voucher.endDate) {
        return { valid: false, message: 'Voucher has expired' };
      }

      // Check usage limits
      if (voucher.usedCount >= voucher.usageLimit) {
        return { valid: false, message: 'Voucher usage limit exceeded' };
      }

      // Check minimum order value
      if (voucher.minOrderValue && orderValue < voucher.minOrderValue) {
        return {
          valid: false,
          message: `Minimum order value is ${voucher.minOrderValue}`
        };
      }

      // Check user restrictions
      if (voucher.allowedUsers && voucher.allowedUsers.length > 0 && userId) {
        const isAllowedUser = voucher.allowedUsers.some(
          allowedUserId => allowedUserId.toString() === userId
        );
        if (!isAllowedUser) {
          return { valid: false, message: 'Voucher is not available for this user' };
        }
      }

      // Calculate discount
      let discount = 0;
      if (voucher.type === VoucherType.PERCENTAGE) {
        discount = (orderValue * voucher.value) / 100;
        if (voucher.maxDiscount && discount > voucher.maxDiscount) {
          discount = voucher.maxDiscount;
        }
      } else if (voucher.type === VoucherType.FIXED_AMOUNT) {
        discount = voucher.value;
      } else if (voucher.type === VoucherType.FREE_SHIPPING) {
        // Free shipping logic would be handled in the order processing
        discount = 0;
      }

      return {
        valid: true,
        voucher,
        discount,
        message: 'Voucher is valid'
      };

    } catch (error) {
      return { valid: false, message: 'Voucher not found' };
    }
  }

  async useVoucher(code: string, userId?: string): Promise<Voucher> {
    const voucher = await this.findByCode(code);
    
    const validation = await this.validateVoucher({ code, userId });
    if (!validation.valid) {
      throw new BadRequestException(validation.message);
    }

    // Increment usage count and update status if needed
    const updatedVoucher = await this.voucherModel.findByIdAndUpdate(
      (voucher as any)._id,
      {
        $inc: { usedCount: 1 },
        $set: voucher.usedCount + 1 >= voucher.usageLimit 
          ? { status: VoucherStatus.USED_UP } 
          : {}
      },
      { new: true }
    ).exec();

    return updatedVoucher!;
  }

  async getActiveVouchers(): Promise<Voucher[]> {
    const now = new Date();
    return this.voucherModel
      .find({
        status: VoucherStatus.ACTIVE,
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
        $expr: { $lt: ['$usedCount', '$usageLimit'] }
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateExpiredVouchers(): Promise<void> {
    const now = new Date();
    await this.voucherModel.updateMany(
      {
        endDate: { $lt: now },
        status: { $ne: VoucherStatus.EXPIRED }
      },
      { status: VoucherStatus.EXPIRED }
    );
  }

  async getVoucherStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    usedUp: number;
    inactive: number;
  }> {
    const stats = await this.voucherModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      total: 0,
      active: 0,
      expired: 0,
      usedUp: 0,
      inactive: 0,
    };

    stats.forEach(stat => {
      result.total += stat.count;
      switch (stat._id) {
        case VoucherStatus.ACTIVE:
          result.active = stat.count;
          break;
        case VoucherStatus.EXPIRED:
          result.expired = stat.count;
          break;
        case VoucherStatus.USED_UP:
          result.usedUp = stat.count;
          break;
        case VoucherStatus.INACTIVE:
          result.inactive = stat.count;
          break;
      }
    });

    return result;
  }
}
