import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { CreateReservationDto, UpdateReservationStatusDto } from './dto/create-reservation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User, CustomMessage } from '../auth/decoration/setMetadata';
import { IUser } from '../user/user.interface';
import { ReservationStatus } from './schemas/reservation.schema';

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @CustomMessage('Tạo đặt bàn mới')
  @Post()
  create(@Body() createReservationDto: CreateReservationDto, @User() user: IUser) {
    return this.reservationService.create(createReservationDto, user);
  }

  @CustomMessage('Lấy danh sách đặt bàn với phân trang')
  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: ReservationStatus,
    @Query('date') date?: string,
  ) {
    return this.reservationService.findAll(+page, +limit, status, date);
  }

  @CustomMessage('Lấy danh sách đặt bàn hôm nay')
  @Get('today')
  getTodayReservations() {
    return this.reservationService.getTodayReservations();
  }

  @CustomMessage('Lấy danh sách đặt bàn sắp tới')
  @Get('upcoming')
  getUpcomingReservations(@Query('days') days: string = '7') {
    return this.reservationService.getUpcomingReservations(+days);
  }

  @CustomMessage('Lấy thống kê đặt bàn')
  @Get('stats')
  getReservationStats() {
    return this.reservationService.getReservationStats();
  }

  @CustomMessage('Lấy đặt bàn theo ID')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reservationService.findById(id);
  }

  @CustomMessage('Lấy đặt bàn của tôi')
  @Get('my/reservations')
  getMyReservations(@User() user: IUser) {
    return this.reservationService.findByUser(user._id.toString());
  }

  @CustomMessage('Lấy đặt bàn theo số điện thoại')
  @Get('phone/:phone')
  findByPhone(@Param('phone') phone: string) {
    return this.reservationService.findByPhone(phone);
  }

  @CustomMessage('Cập nhật trạng thái đặt bàn')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateReservationStatusDto,
  ) {
    return this.reservationService.updateStatus(id, updateStatusDto);
  }

  @CustomMessage('Hủy đặt bàn')
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @User() user: IUser) {
    return this.reservationService.cancel(id, user._id.toString());
  }

  @CustomMessage('Hủy đặt bàn (admin)')
  @Delete(':id')
  adminCancel(@Param('id') id: string) {
    return this.reservationService.cancel(id);
  }
}
