import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Loyalty } from './schemas/loyalty.schema';
import { CreateLoyaltyDto, AddPointsDto, RedeemPointsDto } from './dto/create-loyalty.dto';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectModel(Loyalty.name) private loyaltyModel: Model<Loyalty>,
  ) {}

  async createLoyaltyAccount(createLoyaltyDto: CreateLoyaltyDto): Promise<Loyalty> {
    const existingAccount = await this.loyaltyModel.findOne({ user: createLoyaltyDto.user }).exec();
    if (existingAccount) {
      throw new BadRequestException('Tài khoản loyalty đã tồn tại cho user này');
    }

    const loyalty = new this.loyaltyModel({
      ...createLoyaltyDto,
      points: createLoyaltyDto.points || 0,
    });
    return loyalty.save();
  }

  async findByUserId(userId: string): Promise<Loyalty> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID user không hợp lệ');
    }

    const loyalty = await this.loyaltyModel.findOne({ user: userId }).populate('user', 'name email').exec();
    if (!loyalty) {
      throw new NotFoundException('Không tìm thấy tài khoản loyalty');
    }
    return loyalty;
  }

  async findAll(): Promise<Loyalty[]> {
    return this.loyaltyModel.find().populate('user', 'name email').exec();
  }

  async addPoints(userId: string, addPointsDto: AddPointsDto): Promise<Loyalty> {
    const loyalty = await this.findByUserId(userId);
    loyalty.points += addPointsDto.points;
    return loyalty.save();
  }

  async redeemPoints(userId: string, redeemPointsDto: RedeemPointsDto): Promise<Loyalty> {
    const loyalty = await this.findByUserId(userId);
    
    if (loyalty.points < redeemPointsDto.points) {
      throw new BadRequestException('Số điểm không đủ để quy đổi');
    }

    loyalty.points -= redeemPointsDto.points;
    return loyalty.save();
  }

  async calculatePointsFromOrder(orderAmount: number) {
    // Quy tắc: 1000 VND = 1 điểm
    return Math.floor(orderAmount / 1000);
  }

  async autoAddPointsFromOrder(userId: string, orderAmount: number): Promise<Loyalty> {
    const points = this.calculatePointsFromOrder(orderAmount);
    
    // Tìm hoặc tạo tài khoản loyalty
    let loyalty = await this.loyaltyModel.findOne({ user: userId }).exec();
    if (!loyalty) {
      loyalty = new this.loyaltyModel({ user: userId, points: 0 });
    }

     loyalty.points += await points;
    return loyalty.save();
  }

  async getPointsHistory(userId: string): Promise<any[]> {
    // Có thể mở rộng để lưu lịch sử tích điểm
    // Hiện tại chỉ trả về thông tin cơ bản
    const loyalty = await this.findByUserId(userId);
    return [
      {
        type: 'current_balance',
        points: loyalty.points,
        date: loyalty.createdAt,
      }
    ];
  }
}
