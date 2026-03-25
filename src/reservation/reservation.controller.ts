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
import {
  CreateReservationDto,
  UpdateReservationStatusDto,
  CreateFullBookingDto,
  ConfirmDepositDto,
  CheckTableAvailabilityDto,
} from './dto/create-reservation.dto';
import { ApproveReservationDto, RejectReservationDto, CancelConfirmedDto, UpdateApprovalSettingsDto } from './dto/approval.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  User,
  CustomMessage,
  Permission,
  Public,
} from '../auth/decoration/setMetadata';
import { IUser } from '../user/user.interface';
import { ReservationStatus } from './schemas/reservation.schema';

@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  // Public endpoint - không cần authentication
  @Post('public')
  @Public()
  createPublic(@Body() createReservationDto: CreateReservationDto) {
    return this.reservationService.createPublic(createReservationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Permission('reservation:create')
  @CustomMessage('Tạo đặt bàn mới')
  @Post()
  create(
    @Body() createReservationDto: CreateReservationDto,
    @User() user: IUser
  ) {
    return this.reservationService.create(createReservationDto, user);
  }

  @Public() // Public endpoint - cho phép guest check availability
  @Get()
  @CustomMessage('Lấy danh sách đặt bàn với phân trang')
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: ReservationStatus,
    @Query('date') date?: string
  ) {
    return this.reservationService.findAll(+page, +limit, status, date);
  }

  @UseGuards(JwtAuthGuard)
  @Permission('reservation:getTodayReservations')
  @CustomMessage('Lấy danh sách đặt bàn hôm nay')
  @Get('today')
  getTodayReservations() {
    return this.reservationService.getTodayReservations();
  }

  @UseGuards(JwtAuthGuard)
  @Permission('reservation:getUpcomingReservations')
  @CustomMessage('Lấy danh sách đặt bàn sắp tới')
  @Get('upcoming')
  getUpcomingReservations(@Query('days') days: string = '7') {
    return this.reservationService.getUpcomingReservations(+days);
  }

  @UseGuards(JwtAuthGuard)
  @Permission('reservation:getReservationStats')
  @CustomMessage('Lấy thống kê đặt bàn')
  @Get('stats')
  getReservationStats() {
    return this.reservationService.getReservationStats();
  }

  @UseGuards(JwtAuthGuard)
  @Permission('reservation:getMyReservations')
  @CustomMessage('Lấy đặt bàn của tôi')
  @Get('my/reservations')
  getMyReservations(@User() user: IUser) {
    return this.reservationService.findByUser(user._id.toString());
  }

  @UseGuards(JwtAuthGuard)
  @Permission('reservation:findByPhone')
  @CustomMessage('Lấy đặt bàn theo số điện thoại')
  @Get('phone/:phone')
  findByPhone(@Param('phone') phone: string) {
    return this.reservationService.findByPhone(phone);
  }

  @UseGuards(JwtAuthGuard)
  @Permission('reservation:findOne')
  @CustomMessage('Lấy đặt bàn theo ID')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reservationService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Permission('reservation:updateStatus')
  @CustomMessage('Cập nhật trạng thái đặt bàn')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateReservationStatusDto
  ) {
    return this.reservationService.updateStatus(id, updateStatusDto);
  }

  @UseGuards(JwtAuthGuard)
  @Permission('reservation:cancel')
  @CustomMessage('Hủy đặt bàn')
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @User() user: IUser) {
    return this.reservationService.cancel(id, user._id.toString());
  }

  @UseGuards(JwtAuthGuard)
  @Permission('reservation:adminCancel')
  @CustomMessage('Hủy đặt bàn (admin)')
  @Delete(':id')
  adminCancel(@Param('id') id: string) {
    return this.reservationService.cancel(id);
  }

  // ========== Integrated Booking Endpoints ==========

  /**
   * Check available tables for date/time
   */
  @Public()
  @Get('available-tables')
  checkTableAvailability(
    @Query('date') date: string,
    @Query('time') time: string,
    @Query('guests') guests: string,
  ) {
    return this.reservationService.checkTableAvailability(date, time, +guests);
  }

  /**
   * Get available time slots for a date
   */
  @Public()
  @Get('time-slots')
  getAvailableTimeSlots(
    @Query('date') date: string,
    @Query('guests') guests: string,
  ) {
    return this.reservationService.getAvailableTimeSlots(date, +guests);
  }

  /**
   * Create full booking (table + menu items + deposit)
   */
  @Public()
  @Post('full-booking')
  createFullBooking(@Body() createFullBookingDto: CreateFullBookingDto) {
    return this.reservationService.createFullBooking(createFullBookingDto);
  }

  /**
   * Confirm deposit payment
   */
  @Public()
  @Post(':id/confirm-deposit')
  confirmDeposit(
    @Param('id') id: string,
    @Body() confirmDepositDto: ConfirmDepositDto,
  ) {
    return this.reservationService.confirmDeposit(id, confirmDepositDto);
  }

  /**
   * Get customer's bookings by phone
   */
  @Public()
  @Get('my-bookings')
  getMyBookings(@Query('phone') phone: string) {
    return this.reservationService.getMyBookings(phone);
  }

  /**
   * Cancel full booking
   */
  @Public()
  @Patch(':id/cancel-full')
  cancelFullBooking(@Param('id') id: string) {
    return this.reservationService.cancelFullBooking(id);
  }

  // ========== Bulk Order Approval Endpoints ==========

  /**
   * Get pending approval requests (admin only)
   */
  @UseGuards(JwtAuthGuard)
  @Permission('reservation:getPendingApprovals')
  @CustomMessage('Lấy danh sách chờ phê duyệt')
  @Get('pending-approvals')
  getPendingApprovals(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.reservationService.getPendingApprovals(+page, +limit);
  }

  /**
   * Get approval statistics (admin only)
   */
  @UseGuards(JwtAuthGuard)
  @Permission('reservation:getApprovalStats')
  @CustomMessage('Lấy thống kê phê duyệt')
  @Get('approval-stats')
  getApprovalStats() {
    return this.reservationService.getApprovalStats();
  }

  /**
   * Approve a reservation (admin only)
   */
  @UseGuards(JwtAuthGuard)
  @Permission('reservation:approve')
  @CustomMessage('Phê duyệt đơn hàng')
  @Post(':id/approve')
  approveReservation(
    @Param('id') id: string,
    @Body() approveDto: ApproveReservationDto,
    @User() user: IUser,
  ) {
    return this.reservationService.approveReservation(id, approveDto, user);
  }

  /**
   * Reject a reservation (admin only)
   */
  @UseGuards(JwtAuthGuard)
  @Permission('reservation:reject')
  @CustomMessage('Từ chối đơn hàng')
  @Post(':id/reject')
  rejectReservation(
    @Param('id') id: string,
    @Body() rejectDto: RejectReservationDto,
    @User() user: IUser,
  ) {
    return this.reservationService.rejectReservation(id, rejectDto, user);
  }

  /**
   * Get approval settings (admin only)
   */
  @UseGuards(JwtAuthGuard)
  @Permission('reservation:getApprovalSettings')
  @CustomMessage('Lấy cấu hình phê duyệt')
  @Get('approval-settings')
  getApprovalSettings() {
    return this.reservationService.getApprovalSettings();
  }

  /**
   * Update approval settings (admin only)
   */
  @UseGuards(JwtAuthGuard)
  @Permission('reservation:updateApprovalSettings')
  @CustomMessage('Cập nhật cấu hình phê duyệt')
  @Patch('approval-settings')
  updateApprovalSettings(@Body() dto: UpdateApprovalSettingsDto) {
    return this.reservationService.updateApprovalSettings(dto);
  }

  /**
   * Admin cancel a confirmed reservation (after deposit was paid).
   * Handles refund flow, inventory release, and customer notification.
   */
  @UseGuards(JwtAuthGuard)
  @Permission('reservation:cancelConfirmed')
  @CustomMessage('Hủy đặt bàn đã xác nhận (sau đặt cọc)')
  @Post(':id/cancel-confirmed')
  cancelConfirmedReservation(
    @Param('id') id: string,
    @Body() dto: CancelConfirmedDto,
    @User() user: IUser,
  ) {
    return this.reservationService.cancelConfirmedReservation(id, dto, user);
  }
}
