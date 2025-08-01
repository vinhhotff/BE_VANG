import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { CreateLoyaltyDto, AddPointsDto, RedeemPointsDto } from './dto/create-loyalty.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User, CustomMessage } from '../auth/decoration/setMetadata';
import { IUser } from '../user/user.interface';

@Controller('loyalty')
@UseGuards(JwtAuthGuard)
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @CustomMessage('Tạo tài khoản loyalty mới')
  @Post()
  create(@Body() createLoyaltyDto: CreateLoyaltyDto) {
    return this.loyaltyService.createLoyaltyAccount(createLoyaltyDto);
  }

  @CustomMessage('Lấy danh sách tất cả tài khoản loyalty')
  @Get()
  findAll() {
    return this.loyaltyService.findAll();
  }

  @CustomMessage('Lấy thông tin loyalty theo user ID')
  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.loyaltyService.findByUserId(userId);
  }

  @CustomMessage('Lấy thông tin loyalty của tôi')
  @Get('my-points')
  getMyPoints(@User() user: IUser) {
    return this.loyaltyService.findByUserId(user._id.toString());
  }

  @CustomMessage('Thêm điểm cho user')
  @Patch('user/:userId/add-points')
  addPoints(@Param('userId') userId: string, @Body() addPointsDto: AddPointsDto) {
    return this.loyaltyService.addPoints(userId, addPointsDto);
  }

  @CustomMessage('Quy đổi điểm')
  @Patch('user/:userId/redeem-points')
  redeemPoints(@Param('userId') userId: string, @Body() redeemPointsDto: RedeemPointsDto) {
    return this.loyaltyService.redeemPoints(userId, redeemPointsDto);
  }

  @CustomMessage('Quy đổi điểm của tôi')
  @Patch('my-points/redeem')
  redeemMyPoints(@Body() redeemPointsDto: RedeemPointsDto, @User() user: IUser) {
    return this.loyaltyService.redeemPoints(user._id.toString(), redeemPointsDto);
  }

  @CustomMessage('Lấy lịch sử điểm')
  @Get('user/:userId/history')
  getPointsHistory(@Param('userId') userId: string) {
    return this.loyaltyService.getPointsHistory(userId);
  }

  @CustomMessage('Lấy lịch sử điểm của tôi')
  @Get('my-points/history')
  getMyPointsHistory(@User() user: IUser) {
    return this.loyaltyService.getPointsHistory(user._id.toString());
  }
}
