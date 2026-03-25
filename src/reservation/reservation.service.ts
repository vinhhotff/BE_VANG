import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reservation, ReservationStatus, BookingType, ApprovalStatus, RefundStatus } from './schemas/reservation.schema';
import { CreateReservationDto, UpdateReservationStatusDto, CreateFullBookingDto, ConfirmDepositDto, CheckTableAvailabilityDto, ReservationItemDto } from './dto/create-reservation.dto';
import { ApproveReservationDto, RejectReservationDto, CancelConfirmedDto, UpdateApprovalSettingsDto, ApprovalSettingsResponseDto } from './dto/approval.dto';
import { IUser } from '../user/user.interface';
import { Table } from '../table/schemas/table.schema';
import { MenuItem } from '../menu-item/schemas/menu-item.schema';
import { InventoryService } from '../inventory/inventory.service';
import { ApprovalConfig, BULK_ORDER_CONFIG } from './config/approval.config';
import { NotificationService } from '../notification/notification.service';
import { TableService } from '../table/table.service';

@Injectable()
export class ReservationService {
  private readonly approvalConfig: ApprovalConfig;
  // Consistent time window for table reservations (2 hours before and after)
  private readonly TABLE_TIME_WINDOW_HOURS = 2;

  constructor(
    @InjectModel(Reservation.name) private reservationModel: Model<Reservation>,
    @InjectModel(Table.name) private tableModel: Model<Table>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItem>,
    private readonly inventoryService: InventoryService,
    private readonly notificationService: NotificationService,
    private readonly tableService: TableService,
  ) {
    this.approvalConfig = ApprovalConfig.getInstance();
  }

  // Helper method to calculate time window
  private getTimeWindow(reservationDate: Date): { start: Date; end: Date } {
    const start = new Date(reservationDate.getTime() - this.TABLE_TIME_WINDOW_HOURS * 60 * 60 * 1000);
    const end = new Date(reservationDate.getTime() + this.TABLE_TIME_WINDOW_HOURS * 60 * 60 * 1000);
    return { start, end };
  }

  async create(createReservationDto: CreateReservationDto, user: IUser): Promise<Reservation> {
    const reservationDate = new Date(createReservationDto.reservationDate);

    // Kiểm tra ngày đặt bàn không được trong quá khứ
    if (reservationDate < new Date()) {
      throw new BadRequestException('Ngày đặt bàn không thể trong quá khứ');
    }

    const { start, end } = this.getTimeWindow(reservationDate);

    // Kiểm tra xem có đặt trùng giờ không (có thể mở rộng logic này)
    const existingReservation = await this.reservationModel
      .findOne({
        customerPhone: createReservationDto.customerPhone,
        reservationDate: {
          $gte: start,
          $lte: end,
        },
        status: { $in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] }
      })
      .exec();

    if (existingReservation) {
      throw new ConflictException('Bạn đã có đặt bàn trong khoảng thời gian này');
    }

    // Kiểm tra nếu có chọn bàn, check xem bàn đã được đặt chưa
    if (createReservationDto.tableNumber) {
      const tableReservation = await this.reservationModel
        .findOne({
          tableNumber: createReservationDto.tableNumber,
          reservationDate: {
            $gte: start,
            $lte: end,
          },
          status: { $in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] }
        })
        .exec();

      if (tableReservation) {
        throw new ConflictException(
          `Bàn ${createReservationDto.tableNumber} đã được đặt trong khoảng thời gian này. Vui lòng chọn bàn khác.`
        );
      }
    }

    const reservation = new this.reservationModel({
      ...createReservationDto,
      user: user._id,
      reservationDate,
    });

    return reservation.save();
  }

  async createPublic(createReservationDto: CreateReservationDto): Promise<Reservation> {
    const reservationDate = new Date(createReservationDto.reservationDate);

    // Kiểm tra ngày đặt bàn không được trong quá khứ
    if (reservationDate < new Date()) {
      throw new BadRequestException('Ngày đặt bàn không thể trong quá khứ');
    }

    const { start, end } = this.getTimeWindow(reservationDate);

    // Kiểm tra xem có đặt trùng giờ không (có thể mở rộng logic này)
    const existingReservation = await this.reservationModel
      .findOne({
        customerPhone: createReservationDto.customerPhone,
        reservationDate: {
          $gte: start,
          $lte: end,
        },
        status: { $in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] }
      })
      .exec();

    if (existingReservation) {
      throw new ConflictException('Bạn đã có đặt bàn trong khoảng thời gian này');
    }

    // Kiểm tra nếu có chọn bàn, check xem bàn đã được đặt chưa
    if (createReservationDto.tableNumber) {
      const tableReservation = await this.reservationModel
        .findOne({
          tableNumber: createReservationDto.tableNumber,
          reservationDate: {
            $gte: start,
            $lte: end,
          },
          status: { $in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] }
        })
        .exec();

      if (tableReservation) {
        throw new ConflictException(
          `Bàn ${createReservationDto.tableNumber} đã được đặt trong khoảng thời gian này. Vui lòng chọn bàn khác.`
        );
      }
    }

    const reservation = new this.reservationModel({
      ...createReservationDto,
      reservationDate,
      // user field is optional, không cần set cho public reservations
    });

    return reservation.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: ReservationStatus,
    date?: string
  ): Promise<{ reservations: Reservation[]; total: number; totalPages: number }> {
    const filter: any = {};
    
    if (status) filter.status = status;
    if (date) {
      const searchDate = new Date(date);
      filter.reservationDate = {
        $gte: new Date(searchDate.setHours(0, 0, 0, 0)),
        $lt: new Date(searchDate.setHours(23, 59, 59, 999)),
      };
    }

    const skip = (page - 1) * limit;
    const total = await this.reservationModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const reservations = await this.reservationModel
      .find(filter)
      .populate('user', 'name email')
      .sort({ reservationDate: 1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return { reservations, total, totalPages };
  }

  async findById(id: string): Promise<Reservation> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID đặt bàn không hợp lệ');
    }

    const reservation = await this.reservationModel
      .findById(id)
      .populate('user', 'name email')
      .exec();

    if (!reservation) {
      throw new NotFoundException('Không tìm thấy đặt bàn');
    }

    return reservation;
  }

  async findByUser(userId: string): Promise<Reservation[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID user không hợp lệ');
    }

    return this.reservationModel
      .find({ user: userId })
      .sort({ reservationDate: -1 })
      .exec();
  }

  async findByPhone(phone: string): Promise<Reservation[]> {
    return this.reservationModel
      .find({ customerPhone: phone })
      .populate('user', 'name email')
      .sort({ reservationDate: -1 })
      .exec();
  }

  async updateStatus(id: string, updateStatusDto: UpdateReservationStatusDto): Promise<Reservation> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID đặt bàn không hợp lệ');
    }

    const reservation = await this.reservationModel
      .findByIdAndUpdate(id, updateStatusDto, { new: true })
      .populate('user', 'name email')
      .exec();

    if (!reservation) {
      throw new NotFoundException('Không tìm thấy đặt bàn');
    }

    return reservation;
  }

  async cancel(id: string, userId?: string): Promise<Reservation> {
    const reservation = await this.findById(id);

    // Kiểm tra quyền hủy (chỉ user tạo hoặc admin mới được hủy)
    if (userId && reservation.user) {
      const user = reservation.user;
      const reservationUserId = typeof user === 'object' && '_id' in user
        ? String(user._id)
        : String(user);
      if (reservationUserId !== userId) {
        throw new BadRequestException('Bạn không có quyền hủy đặt bàn này');
      }
    }

    // Chỉ có thể hủy khi còn pending hoặc confirmed
    if (![ReservationStatus.PENDING, ReservationStatus.CONFIRMED].includes(reservation.status)) {
      throw new BadRequestException('Không thể hủy đặt bàn với trạng thái hiện tại');
    }

    return this.updateStatus(id, { status: ReservationStatus.CANCELLED });
  }

  async getTodayReservations(): Promise<Reservation[]> {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    return this.reservationModel
      .find({
        reservationDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] }
      })
      .populate('user', 'name email')
      .sort({ reservationDate: 1 })
      .exec();
  }

  async getUpcomingReservations(days: number = 7): Promise<Reservation[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.reservationModel
      .find({
        reservationDate: { $gte: now, $lte: futureDate },
        status: { $in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] }
      })
      .populate('user', 'name email')
      .sort({ reservationDate: 1 })
      .exec();
  }

  async getReservationStats(): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  }> {
    const [stats] = await this.reservationModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', ReservationStatus.PENDING] }, 1, 0] }
          },
          confirmed: {
            $sum: { $cond: [{ $eq: ['$status', ReservationStatus.CONFIRMED] }, 1, 0] }
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', ReservationStatus.COMPLETED] }, 1, 0] }
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', ReservationStatus.CANCELLED] }, 1, 0] }
          }
        }
      }
    ]);

    return stats || {
      total: 0,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };
  }

  // ========== Integrated Booking Methods ==========

  /**
   * Check table availability for a specific date/time
   */
  async checkTableAvailability(date: string, time: string, numberOfGuests: number): Promise<{
    available: boolean;
    availableTables: any[];
    message: string;
  }> {
    const reservationDate = new Date(date);
    const [hours, minutes] = time.split(':').map(Number);
    reservationDate.setHours(hours, minutes, 0, 0);

    // Use consistent time window
    const { start, end } = this.getTimeWindow(reservationDate);

    // Find all reserved tables in this time window
    const reservedTables = await this.reservationModel
      .find({
        reservationDate: { $gte: start, $lte: end },
        status: { $in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] },
      })
      .populate('table')
      .exec();

    const reservedTableIds = reservedTables
      .map(r => r.table)
      .filter(t => t)
      .map(t => t instanceof Types.ObjectId ? t.toString() : (t as any)._id.toString());

    // Get all tables that can accommodate the number of guests
    const allTables = await this.tableModel.find({
      isDeleted: { $ne: true },
    }).exec();

    // Filter available tables (simplified - could be enhanced with actual capacity logic)
    const availableTables = allTables.filter(table => {
      const tableId = table._id.toString();
      return !reservedTableIds.includes(tableId);
    });

    return {
      available: availableTables.length > 0,
      availableTables: availableTables.map(t => ({
        _id: t._id,
        tableName: t.tableName,
        location: t.location,
        status: t.status,
      })),
      message: availableTables.length > 0
        ? `Còn ${availableTables.length} bàn trống`
        : 'Tất cả bàn đã được đặt trong khung giờ này',
    };
  }

  /**
   * Create full booking (table + menu items + deposit)
   * Auto-checks threshold and sets PENDING_APPROVAL if needed
   */
  async createFullBooking(dto: CreateFullBookingDto, user?: IUser): Promise<{
    success: boolean;
    reservation?: Reservation;
    message: string;
    requiresDeposit?: boolean;
    depositAmount?: number;
    requiresApproval?: boolean;
    approvalExpiresAt?: Date;
  }> {
    const reservationDate = new Date(dto.reservationDate);
    const [hours, minutes] = dto.reservationTime.split(':').map(Number);
    reservationDate.setHours(hours, minutes, 0, 0);

    // Check if reservation date is in the past
    if (reservationDate < new Date()) {
      throw new BadRequestException('Ngày đặt bàn không thể trong quá khứ');
    }

    // Determine booking type
    const hasItems = dto.items && dto.items.length > 0;
    const bookingType = hasItems ? BookingType.FULL_BOOKING : BookingType.TABLE_ONLY;

    // Process menu items if provided
    let validatedItems: any[] = [];
    let totalAmount = 0;
    let totalItems = 0;
    let hasSpecialItems = false;
    let usageDate = dto.usageDate ? new Date(dto.usageDate) : reservationDate;

    if (hasItems && dto.items) {
      // Validate menu items and calculate total
      for (const item of dto.items) {
        const menuItem = await this.menuItemModel.findById(item.menuItemId).exec();
        if (!menuItem) {
          throw new NotFoundException(`Menu item with ID ${item.menuItemId} not found`);
        }
        if (!menuItem.available) {
          throw new BadRequestException(`Món ${menuItem.name} hiện không có sẵn`);
        }

        const subtotal = menuItem.price * item.quantity;
        validatedItems.push({
          item: menuItem._id,
          quantity: item.quantity,
          unitPrice: menuItem.price,
          subtotal,
          note: item.note || '',
        });
        totalAmount += subtotal;
        totalItems += item.quantity;

        // Check if this is a special item
        if (menuItem.isSpecialItem) {
          hasSpecialItems = true;
        }
      }

      // Check D-Day inventory availability
      for (const item of dto.items!) {
        const availability = await this.inventoryService.checkAvailability(
          item.menuItemId,
          usageDate.toISOString().split('T')[0],
          item.quantity
        );
        if (!availability.available) {
          return {
            success: false,
            message: `Món ăn không đủ số lượng: ${availability.message}`,
          };
        }
      }
    }

    // Calculate deposit (30% for full booking)
    const depositAmount = hasItems ? Math.round(totalAmount * 0.3) : 0;

    // Check if approval is required (unless forced by admin)
    let requiresApproval = false;
    let approvalExpiresAt: Date | undefined;

    if (!dto.forceApproval && hasItems) {
      requiresApproval = this.approvalConfig.requiresApproval(totalItems, totalAmount, hasSpecialItems);
      if (requiresApproval) {
        approvalExpiresAt = this.approvalConfig.getExpirationTime();
      }
    }

    // Determine initial status
    const initialStatus = requiresApproval
      ? ReservationStatus.PENDING_APPROVAL
      : (hasItems ? ReservationStatus.PENDING : ReservationStatus.PENDING);

    // Check table availability if table is selected (with atomic check)
    if (dto.tableId) {
      const { start, end } = this.getTimeWindow(reservationDate);
      const tableReservation = await this.reservationModel
        .findOne({
          table: dto.tableId,
          reservationDate: {
            $gte: start,
            $lte: end,
          },
          status: { $in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.PENDING_APPROVAL] }
        })
        .exec();

      if (tableReservation) {
        throw new ConflictException('Bàn đã được đặt trong khoảng thời gian này');
      }
    }

    // Create reservation
    const reservation = new this.reservationModel({
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail,
      reservationDate,
      reservationTime: dto.reservationTime,
      numberOfGuests: dto.numberOfGuests,
      specialRequests: dto.specialRequests,
      table: dto.tableId ? new Types.ObjectId(dto.tableId) : undefined,
      bookingType,
      items: validatedItems,
      totalAmount,
      depositAmount,
      isDepositPaid: false,
      usageDate,
      inventoryChecked: hasItems,
      // Approval fields
      requiresApproval,
      approvalStatus: requiresApproval ? ApprovalStatus.PENDING : ApprovalStatus.NOT_APPLICABLE,
      approvalRequestedAt: requiresApproval ? new Date() : undefined,
      approvalExpiresAt,
      status: initialStatus,
      createdBy: user ? { _id: user._id, email: user.email } : undefined,
    });

    const savedReservation = await reservation.save();

    // NOTE: Table is NOT locked here. It will be locked only when deposit is confirmed.
    // This prevents the "full table but no payment" bug.

    // Reserve inventory if there are items (and not requiring approval)
    if (hasItems && !requiresApproval && dto.items) {
      try {
        const dateStr = usageDate.toISOString().split('T')[0];
        const bulkItems = dto.items.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
        }));
        const inventoryResult = await this.inventoryService.bulkReserveInventory(bulkItems, dateStr, savedReservation._id.toString());
        
        // If inventory reservation failed, delete reservation and throw error
        if (!inventoryResult.success) {
          await this.reservationModel.findByIdAndDelete(savedReservation._id);
          const failedItems = inventoryResult.results.filter(r => !r.success);
          throw new BadRequestException(
            `Không thể đặt món: ${failedItems.map(r => r.message).join(', ')}`
          );
        }
      } catch (error) {
        // If inventory reservation fails, delete the reservation
        await this.reservationModel.findByIdAndDelete(savedReservation._id);
        throw new BadRequestException(`Không thể đặt món: ${error.message}`);
      }
    }

    // Send notification to admin if approval is required
    if (requiresApproval) {
      try {
        await this.notificationService.sendToAdmins({
          type: 'BULK_ORDER_PENDING',
          title: 'Yêu cầu phê duyệt đơn hàng lớn',
          message: `Khách hàng ${dto.customerName} đã đặt đơn hàng trị giá ${totalAmount.toLocaleString('vi-VN')} VNĐ cần phê duyệt.`,
          data: {
            reservationId: savedReservation._id.toString(),
            totalAmount,
            totalItems,
          },
        });
      } catch (error) {
        console.error('Failed to send approval notification:', error);
      }
    }

    // Build response message
    let message: string;
    if (requiresApproval) {
      message = `Đơn hàng của bạn đã được ghi nhận và đang chờ phê duyệt từ quản lý. Chúng tôi sẽ thông báo cho bạn sau khi được duyệt.`;
    } else if (hasItems) {
      message = 'Đặt bàn thành công! Vui lòng đặt cọc để xác nhận.';
    } else {
      message = 'Đặt bàn thành công!';
    }

    return {
      success: true,
      reservation: savedReservation,
      message,
      requiresDeposit: hasItems && !requiresApproval,
      depositAmount: hasItems && !requiresApproval ? depositAmount : undefined,
      requiresApproval,
      approvalExpiresAt,
    };
  }

  /**
   * Confirm deposit payment.
   * Locks table atomically and confirms inventory.
   * Idempotent: calling again on already-confirmed reservation returns success.
   */
  async confirmDeposit(id: string, confirmDepositDto: ConfirmDepositDto): Promise<Reservation> {
    // Idempotency check: if already confirmed, just return
    const existing = await this.reservationModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('Không tìm thấy đặt bàn');
    }

    if (existing.isDepositPaid) {
      // Already confirmed - return as success (idempotent)
      return existing;
    }

    // Atomic table lock: only lock table if not already locked by another confirmed reservation
    if (existing.table) {
      const tableId = existing.table instanceof Types.ObjectId
        ? existing.table.toString()
        : (existing.table as any)._id?.toString() || String(existing.table);

      const { start, end } = this.getTimeWindow(existing.reservationDate);

      // Check if table is already confirmed by another reservation in this window
      const conflictingReservation = await this.reservationModel.findOne({
        _id: { $ne: existing._id },
        table: existing.table,
        reservationDate: { $gte: start, $lte: end },
        status: ReservationStatus.CONFIRMED,
        isDepositPaid: true,
      }).exec();

      if (conflictingReservation) {
        throw new ConflictException(
          `Bàn này đã được xác nhận bởi đặt bàn khác trong khung giờ này. Vui lòng liên hệ nhà hàng.`,
        );
      }

      // Lock the table
      try {
        await this.tableService.updateTableStatus(tableId, 'reserved');
      } catch (error) {
        console.error('Failed to lock table:', error);
        throw new ConflictException(`Bàn không còn khả dụng. Vui lòng chọn bàn khác.`);
      }
    }

    // Update reservation with deposit info
    existing.isDepositPaid = true;
    existing.depositPaid = existing.depositAmount;
    existing.depositPaymentMethod = confirmDepositDto.paymentMethod;
    existing.depositPaidAt = new Date();
    existing.status = ReservationStatus.CONFIRMED;

    // Record audit trail
    this.addStatusHistory(existing, ReservationStatus.CONFIRMED, 'customer', undefined, 'Đặt cọc thành công');

    // Confirm inventory reservations (pending → confirmed → deduct actual stock)
    const inventoryErrors: string[] = [];
    if (existing.items && existing.items.length > 0 && existing.usageDate) {
      for (const item of existing.items) {
        try {
          await this.inventoryService.confirmIngredientReservation(
            item.item.toString(),
            item.quantity, // menuItemQuantity: how many of this menu item are ordered
            existing.usageDate,
            existing._id.toString(),
          );
        } catch (error) {
          console.error('Failed to confirm inventory:', error);
          inventoryErrors.push(`${item.item}: ${error.message}`);
        }
      }
    }

    // Send confirmation notification
    try {
      await this.notificationService.sendToUser(existing.customerPhone, {
        type: 'RESERVATION_DEPOSIT_PAID',
        title: 'Đặt bàn xác nhận thành công',
        message: `Bạn đã đặt cọc thành công ${existing.depositPaid.toLocaleString('vi-VN')} VNĐ cho đặt bàn ngày ${this.formatDate(existing.reservationDate)} lúc ${existing.reservationTime}. Cảm ơn bạn!`,
        data: {
          reservationId: existing._id.toString(),
          depositAmount: existing.depositPaid,
        },
      });
    } catch (error) {
      console.error('Failed to send deposit confirmation notification:', error);
    }

    return existing.save();
  }

  /**
   * Get my bookings (for customer)
   */
  async getMyBookings(phone: string): Promise<Reservation[]> {
    return this.reservationModel
      .find({ customerPhone: phone })
      .populate('table', 'tableName location')
      .populate('items.item', 'name price category')
      .sort({ reservationDate: -1 })
      .exec();
  }

  /**
   * Cancel full booking and release inventory + table
   */
  async cancelFullBooking(id: string): Promise<Reservation> {
    const reservation = await this.findById(id);

    // Check if can cancel
    if (![ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.PENDING_APPROVAL].includes(reservation.status)) {
      throw new BadRequestException('Không thể hủy đặt bàn với trạng thái hiện tại');
    }

    // Release inventory if items were reserved
    if (reservation.items && reservation.items.length > 0 && reservation.usageDate) {
      const dateStr = reservation.usageDate.toISOString().split('T')[0];
      for (const item of reservation.items) {
        try {
          await this.inventoryService.releaseInventory(
            item.item.toString(),
            dateStr,
            item.quantity,
            reservation._id.toString()
          );
        } catch (error) {
          console.error('Error releasing inventory:', error);
        }
      }
    }

    // Release table if table was reserved
    if (reservation.table) {
      try {
        const tableId = reservation.table instanceof Types.ObjectId 
          ? reservation.table.toString() 
          : (reservation.table as any)._id?.toString() || String(reservation.table);
        await this.tableService.updateTableStatus(tableId, 'available');
      } catch (error) {
        console.error('Error releasing table:', error);
      }
    }

    // Update status
    reservation.status = ReservationStatus.CANCELLED;
    if (reservation.approvalStatus === ApprovalStatus.PENDING) {
      reservation.approvalStatus = ApprovalStatus.EXPIRED;
    }
    return reservation.save();
  }

  /**
   * Get available time slots for a date
   */
  async getAvailableTimeSlots(date: string, numberOfGuests: number): Promise<{
    date: string;
    timeSlots: string[];
    message: string;
  }> {
    const targetDate = new Date(date);
    const timeSlots: string[] = [];
    
    // Generate time slots from 10:00 to 21:00 (last order at 21:00)
    const startHour = 10;
    const endHour = 21;

    for (let hour = startHour; hour <= endHour; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      const availability = await this.checkTableAvailability(date, timeStr, numberOfGuests);
      
      if (availability.available) {
        timeSlots.push(timeStr);
      }
    }

    return {
      date,
      timeSlots,
      message: timeSlots.length > 0 
        ? `Còn ${timeSlots.length} khung giờ trống`
        : 'Không có khung giờ nào trống trong ngày này',
    };
  }

  // ========== Bulk Order Approval Methods ==========

  /**
   * Get all pending approval requests (for admin)
   */
  async getPendingApprovals(page: number = 1, limit: number = 10): Promise<{
    reservations: Reservation[];
    total: number;
    totalPages: number;
    stats: {
      pending: number;
      expiringSoon: number; // Within 24 hours
    };
  }> {
    const now = new Date();
    const expiringThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const filter = {
      status: ReservationStatus.PENDING_APPROVAL,
      approvalStatus: ApprovalStatus.PENDING,
    };

    const skip = (page - 1) * limit;
    const [reservations, total, expiringCount] = await Promise.all([
      this.reservationModel
        .find(filter)
        .populate('table', 'tableName location')
        .populate('items.item', 'name price category isSpecialItem')
        .sort({ approvalRequestedAt: 1 }) // Oldest first
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reservationModel.countDocuments(filter).exec(),
      this.reservationModel.countDocuments({
        ...filter,
        approvalExpiresAt: { $lte: expiringThreshold, $gt: now },
      }).exec(),
    ]);

    return {
      reservations,
      total,
      totalPages: Math.ceil(total / limit),
      stats: {
        pending: total,
        expiringSoon: expiringCount,
      },
    };
  }

  /**
   * Approve a reservation
   * If inventory reservation fails, the approval fails and customer is notified
   */
  async approveReservation(reservationId: string, dto: ApproveReservationDto, user: IUser): Promise<Reservation> {
    const reservation = await this.findById(reservationId);

    // Validate status
    if (reservation.status !== ReservationStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Đơn hàng này không ở trạng thái chờ phê duyệt');
    }

    if (reservation.approvalStatus !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Đơn hàng này đã được xử lý trước đó');
    }

    // Check if expired
    if (reservation.approvalExpiresAt && new Date() > reservation.approvalExpiresAt) {
      throw new BadRequestException('Yêu cầu phê duyệt đã hết hạn');
    }

    // Reserve inventory for approved order BEFORE updating status
    // If this fails, the approval should fail
    let inventoryReserved = false;
    if (reservation.items && reservation.items.length > 0 && reservation.usageDate) {
      try {
        const dateStr = reservation.usageDate.toISOString().split('T')[0];
        const bulkItems = reservation.items.map(item => ({
          menuItemId: item.item.toString(),
          quantity: item.quantity,
        }));
        const inventoryResult = await this.inventoryService.bulkReserveInventory(
          bulkItems, 
          dateStr, 
          reservation._id.toString()
        );
        
        if (!inventoryResult.success) {
          const failedItems = inventoryResult.results.filter(r => !r.success);
          const errorMessage = failedItems.map(r => r.message).join(', ');
          
          // Send notification to customer about inventory issue
          try {
            await this.notificationService.sendToUser(reservation.customerPhone, {
              type: 'BULK_ORDER_APPROVAL_FAILED',
              title: 'Đơn hàng không thể xác nhận',
              message: `Rất tiếc, đơn hàng của bạn không thể xác nhận do: ${errorMessage}. Vui lòng liên hệ nhà hàng.`,
              data: { reservationId: reservation._id.toString() },
            });
          } catch (notifError) {
            console.error('Failed to send inventory failure notification:', notifError);
          }
          
          throw new BadRequestException(
            `Không thể xác nhận đơn hàng do: ${errorMessage}`
          );
        }
        inventoryReserved = true;
      } catch (error) {
        // If inventory reservation fails, the approval fails
        throw error;
      }
    }

    // Update approval status
    reservation.approvalStatus = ApprovalStatus.APPROVED;
    reservation.approvedAt = new Date();
    reservation.approvedBy = new Types.ObjectId(user._id.toString());
    reservation.approvalNotes = {
      adminNotes: dto.adminNotes,
      kitchenNotes: dto.kitchenNotes,
    };
    reservation.status = ReservationStatus.PENDING; // Now waiting for deposit

    // Record audit trail
    this.addStatusHistory(reservation, ReservationStatus.PENDING, 'admin', user, undefined, dto.adminNotes || 'Phê duyệt đơn hàng, chờ đặt cọc');

    const savedReservation = await reservation.save();

    // Send notification to customer
    try {
      await this.notificationService.sendToUser(reservation.customerPhone, {
        type: 'BULK_ORDER_APPROVED',
        title: 'Đơn hàng đã được phê duyệt',
        message: `Đơn hàng của bạn đã được phê duyệt. Vui lòng đặt cọc ${reservation.depositAmount?.toLocaleString('vi-VN')} VNĐ để xác nhận.`,
        data: {
          reservationId: reservation._id.toString(),
          depositAmount: reservation.depositAmount,
        },
      });
    } catch (error) {
      console.error('Failed to send approval notification:', error);
    }

    return savedReservation;
  }

  /**
   * Reject a reservation
   */
  async rejectReservation(reservationId: string, dto: RejectReservationDto, user: IUser): Promise<Reservation> {
    const reservation = await this.findById(reservationId);

    // Validate status
    if (reservation.status !== ReservationStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Đơn hàng này không ở trạng thái chờ phê duyệt');
    }

    if (reservation.approvalStatus !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Đơn hàng này đã được xử lý trước đó');
    }

    // Update rejection status
    reservation.approvalStatus = ApprovalStatus.REJECTED;
    reservation.rejectedAt = new Date();
    reservation.rejectedReason = dto.reason;
    reservation.status = ReservationStatus.CANCELLED;

    // Record audit trail
    this.addStatusHistory(reservation, ReservationStatus.CANCELLED, 'admin', user, dto.reason, 'Từ chối phê duyệt');

    // Release inventory that was reserved during the approval step
    // (inventory was reserved in approveReservation before approvalStatus was set to APPROVED)
    if (reservation.items && reservation.items.length > 0 && reservation.usageDate) {
      const dateStr = reservation.usageDate.toISOString().split('T')[0];
      for (const item of reservation.items) {
        try {
          await this.inventoryService.releaseInventory(
            item.item.toString(),
            dateStr,
            item.quantity,
            reservation._id.toString(),
          );
        } catch (error) {
          console.error('Failed to release inventory after rejection:', error);
        }
      }
    }

    const savedReservation = await reservation.save();

    // Send notification to customer
    try {
      await this.notificationService.sendToUser(reservation.customerPhone, {
        type: 'BULK_ORDER_REJECTED',
        title: 'Đơn hàng bị từ chối',
        message: `Rất tiếc, đơn hàng của bạn đã bị từ chối. Lý do: ${dto.reason}`,
        data: {
          reservationId: reservation._id.toString(),
          reason: dto.reason,
        },
      });
    } catch (error) {
      console.error('Failed to send rejection notification:', error);
    }

    return savedReservation;
  }

  /**
   * Auto-expire pending approvals (called by cron job)
   * Also releases inventory reservations
   */
  async autoExpirePendingApprovals(): Promise<{
    expired: number;
    notifications: number;
    inventoryReleased: number;
  }> {
    const now = new Date();

    // Find expired reservations
    const expiredReservations = await this.reservationModel.find({
      status: ReservationStatus.PENDING_APPROVAL,
      approvalStatus: ApprovalStatus.PENDING,
      approvalExpiresAt: { $lte: now },
    }).exec();

    let notifications = 0;
    let inventoryReleased = 0;

    for (const reservation of expiredReservations) {
      // Release inventory first
      if (reservation.items && reservation.items.length > 0 && reservation.usageDate) {
        const dateStr = reservation.usageDate.toISOString().split('T')[0];
        for (const item of reservation.items) {
          try {
            await this.inventoryService.releaseInventory(
              item.item.toString(),
              dateStr,
              item.quantity,
              reservation._id.toString()
            );
            inventoryReleased++;
          } catch (error) {
            console.error('Failed to release inventory:', error);
          }
        }
      }

      // Update status
      reservation.approvalStatus = ApprovalStatus.EXPIRED;
      reservation.status = ReservationStatus.CANCELLED;
      await reservation.save();

      // Send notification
      try {
        await this.notificationService.sendToUser(reservation.customerPhone, {
          type: 'BULK_ORDER_EXPIRED',
          title: 'Yêu cầu phê duyệt đã hết hạn',
          message: 'Yêu cầu phê duyệt đơn hàng của bạn đã hết hạn. Vui lòng đặt lại nếu cần.',
          data: {
            reservationId: reservation._id.toString(),
          },
        });
        notifications++;
      } catch (error) {
        console.error('Failed to send expiration notification:', error);
      }
    }

    return {
      expired: expiredReservations.length,
      notifications,
      inventoryReleased,
    };
  }

  /**
   * Auto-expire pending reservations (not yet approved) that have been waiting too long
   * This releases inventory back for other customers
   */
  async autoExpirePendingReservations(maxPendingHours: number = 24): Promise<{
    expired: number;
    inventoryReleased: number;
  }> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - maxPendingHours);

    // Find pending reservations older than cutoff that were never approved
    const expiredReservations = await this.reservationModel.find({
      status: ReservationStatus.PENDING, // Regular pending, not confirmed
      isDepositPaid: false,
      createdAt: { $lte: cutoffTime },
      approvalStatus: { $ne: ApprovalStatus.APPROVED }, // Not approved
    }).exec();

    let inventoryReleased = 0;

    for (const reservation of expiredReservations) {
      // Release inventory
      if (reservation.items && reservation.items.length > 0 && reservation.usageDate) {
        const dateStr = reservation.usageDate.toISOString().split('T')[0];
        for (const item of reservation.items) {
          try {
            await this.inventoryService.releaseInventory(
              item.item.toString(),
              dateStr,
              item.quantity,
              reservation._id.toString()
            );
            inventoryReleased++;
          } catch (error) {
            console.error('Failed to release inventory:', error);
          }
        }
      }

      // Cancel the reservation
      reservation.status = ReservationStatus.CANCELLED;
      reservation.approvalStatus = ApprovalStatus.EXPIRED;
      await reservation.save();
    }

    return {
      expired: expiredReservations.length,
      inventoryReleased,
    };
  }

  /**
   * Get approval statistics
   */
  async getApprovalStats(): Promise<{
    pending: number;
    approvedToday: number;
    rejectedToday: number;
    expiredToday: number;
    totalValuePending: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const stats = await this.reservationModel.aggregate([
      {
        $match: {
          status: ReservationStatus.PENDING_APPROVAL,
        },
      },
      {
        $group: {
          _id: '$approvalStatus',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' },
        },
      },
    ]).exec();

    // Query for today's approvals/rejections/expirations using the correct timestamp fields
    const [approvedTodayCount] = await this.reservationModel.aggregate([
      {
        $match: {
          approvedAt: { $gte: today, $lt: tomorrow },
          status: ReservationStatus.PENDING_APPROVAL,
        },
      },
      {
        $group: { _id: '$approvalStatus', count: { $sum: 1 } },
      },
    ]).exec();

    const [rejectedTodayCount] = await this.reservationModel.aggregate([
      {
        $match: {
          rejectedAt: { $gte: today, $lt: tomorrow },
          status: ReservationStatus.CANCELLED,
        },
      },
      {
        $group: { _id: '$approvalStatus', count: { $sum: 1 } },
      },
    ]).exec();

    const [expiredTodayCount] = await this.reservationModel.aggregate([
      {
        $match: {
          updatedAt: { $gte: today, $lt: tomorrow },
          status: ReservationStatus.CANCELLED,
          approvalStatus: ApprovalStatus.EXPIRED,
        },
      },
      {
        $group: { _id: '$approvalStatus', count: { $sum: 1 } },
      },
    ]).exec();

    const result = {
      pending: 0,
      approvedToday: 0,
      rejectedToday: 0,
      expiredToday: 0,
      totalValuePending: 0,
    };

    for (const stat of stats) {
      if (stat._id === ApprovalStatus.PENDING) {
        result.pending = stat.count;
        result.totalValuePending = stat.totalValue;
      }
    }

    // Process today's activity using the correct timestamp fields
    if (approvedTodayCount && approvedTodayCount._id === ApprovalStatus.APPROVED) {
      result.approvedToday = approvedTodayCount.count;
    }
    if (rejectedTodayCount && rejectedTodayCount._id === ApprovalStatus.REJECTED) {
      result.rejectedToday = rejectedTodayCount.count;
    }
    if (expiredTodayCount && expiredTodayCount._id === ApprovalStatus.EXPIRED) {
      result.expiredToday = expiredTodayCount.count;
    }

    return result;
  }

  /**
   * Get or update approval settings
   */
  getApprovalSettings(): ApprovalSettingsResponseDto {
    const config = this.approvalConfig.getConfig();
    return {
      minItemsThreshold: config.THRESHOLD.MIN_ITEMS,
      minValueThreshold: config.THRESHOLD.MIN_VALUE,
      autoExpireHours: config.AUTO_EXPIRE_HOURS,
    };
  }

  /**
   * Update approval settings (admin only)
   * Validates input to prevent disabling approval requirements unintentionally
   */
  updateApprovalSettings(dto: UpdateApprovalSettingsDto): ApprovalSettingsResponseDto {
    // Validate input values
    if (dto.minItemsThreshold !== undefined && dto.minItemsThreshold < 1) {
      throw new BadRequestException('Số lượng món tối thiểu phải >= 1');
    }
    if (dto.minValueThreshold !== undefined && dto.minValueThreshold < 0) {
      throw new BadRequestException('Giá trị tối thiểu không được âm');
    }
    if (dto.autoExpireHours !== undefined && (dto.autoExpireHours < 1 || dto.autoExpireHours > 168)) {
      throw new BadRequestException('Thời gian hết hạn phải từ 1 đến 168 giờ (1 tuần)');
    }

    const updateData: any = {};

    if (dto.minItemsThreshold !== undefined || dto.minValueThreshold !== undefined) {
      updateData.THRESHOLD = {
        MIN_ITEMS: dto.minItemsThreshold ?? BULK_ORDER_CONFIG.THRESHOLD.MIN_ITEMS,
        MIN_VALUE: dto.minValueThreshold ?? BULK_ORDER_CONFIG.THRESHOLD.MIN_VALUE,
      };
    }

    if (dto.autoExpireHours !== undefined) {
      updateData.AUTO_EXPIRE_HOURS = dto.autoExpireHours;
    }

    this.approvalConfig.updateConfig(updateData);

    return this.getApprovalSettings();
  }

  // ========== Refund & Cancel After Deposit ==========

  /**
   * Admin cancel a CONFIRMED reservation (after deposit was paid).
   * Handles refund flow, inventory release, and customer notification.
   */
  async cancelConfirmedReservation(
    reservationId: string,
    dto: CancelConfirmedDto,
    user: IUser,
  ): Promise<Reservation> {
    const reservation = await this.findById(reservationId);

    // Business rule: only confirmed reservations can be cancelled by admin with refund
    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException(
        'Chỉ có thể hủy đặt bàn đã xác nhận (đã đặt cọc). Vui lòng sử dụng chức năng từ chối cho đơn đang chờ phê duyệt.',
      );
    }

    if (!reservation.isDepositPaid) {
      throw new BadRequestException('Đặt bàn này chưa được đặt cọc. Không thể yêu cầu hoàn tiền.');
    }

    const requestRefund = dto.requestRefund !== false; // default: true

    // Record audit trail BEFORE changing anything
    this.addStatusHistory(reservation, ReservationStatus.CANCELLED, 'admin', user, dto.reason);

    // Update reservation cancellation fields
    reservation.status = ReservationStatus.CANCELLED;

    // Handle refund
    if (requestRefund && reservation.depositPaid > 0) {
      reservation.refundStatus = RefundStatus.PENDING;
      reservation.refundAmount = reservation.depositPaid;
      reservation.refundRequestedAt = new Date();
      reservation.refundReason = dto.reason;

      // TODO: Call PayOS refund API here when PayOS refund integration is ready
      // For now, mark as completed and note it needs manual processing
      try {
        // Simulate PayOS refund call - replace with actual PayOS refund integration
        // await payosService.refundDeposit(reservation._id.toString(), reservation.depositPaid);
        reservation.refundStatus = RefundStatus.PROCESSING;
        reservation.refundNotes = `Yêu cầu hoàn tiền đã được ghi nhận. Cần xử lý hoàn tiền qua PayOS.`;
        // When PayOS refund is implemented:
        // reservation.refundStatus = RefundStatus.COMPLETED;
        // reservation.refundProcessedAt = new Date();
        // reservation.refundTransactionId = 'PAYOS_REFUND_ID';
      } catch (error) {
        reservation.refundStatus = RefundStatus.FAILED;
        reservation.refundNotes = `Lỗi khi yêu cầu hoàn tiền: ${error.message}`;
      }
    } else {
      // Customer gave up deposit (no refund requested)
      reservation.refundStatus = RefundStatus.NOT_REQUESTED;
      reservation.refundReason = dto.reason;
    }

    reservation.refundProcessedBy = new Types.ObjectId(user._id.toString());

    // Release inventory (confirmed inventory → return to actual stock)
    if (reservation.items && reservation.items.length > 0 && reservation.usageDate) {
      const usageDate = new Date(reservation.usageDate);
      for (const item of reservation.items) {
        try {
          await this.inventoryService.cancelConfirmedIngredientReservation(
            item.item.toString(),
            item.quantity,
            usageDate,
            reservation._id.toString(),
          );
        } catch (error) {
          console.error('Failed to cancel confirmed inventory:', error);
        }
      }
    }

    // Release table back to available
    if (reservation.table) {
      try {
        const tableId = reservation.table instanceof Types.ObjectId
          ? reservation.table.toString()
          : (reservation.table as any)._id?.toString() || String(reservation.table);
        await this.tableService.updateTableStatus(tableId, 'available');
      } catch (error) {
        console.error('Failed to release table:', error);
      }
    }

    const savedReservation = await reservation.save();

    // Send notification to customer about cancellation
    const notificationType = requestRefund && reservation.depositPaid > 0
      ? 'RESERVATION_ADMIN_CANCELLED' : 'RESERVATION_CANCELLED';

    const refundMsg = requestRefund && reservation.depositPaid > 0
      ? ` Yêu cầu hoàn tiền ${reservation.depositPaid.toLocaleString('vi-VN')} VNĐ đang được xử lý.`
      : '';

    const noRefundMsg = !requestRefund && reservation.depositPaid > 0
      ? ` Tiền đặt cọc sẽ không được hoàn lại theo yêu cầu của nhà hàng.`
      : '';

    try {
      await this.notificationService.sendToUser(reservation.customerPhone, {
        type: notificationType,
        title: 'Đặt bàn bị hủy bởi nhà hàng',
        message: `Rất tiếc, đặt bàn ngày ${this.formatDate(reservation.reservationDate)} lúc ${reservation.reservationTime} đã bị hủy. Lý do: ${dto.reason}.${refundMsg}${noRefundMsg}`,
        data: {
          reservationId: reservation._id.toString(),
          reason: dto.reason,
          depositAmount: reservation.depositPaid,
          refundStatus: reservation.refundStatus,
        },
      });

      // Also notify all admins about this cancellation
      await this.notificationService.sendToAdmins({
        type: 'RESERVATION_ADMIN_CANCELLED',
        title: 'Admin hủy đặt bàn đã xác nhận',
        message: `Admin đã hủy đặt bàn của ${reservation.customerName} (${reservation.customerPhone}) ngày ${this.formatDate(reservation.reservationDate)}.${refundMsg}`,
        data: {
          reservationId: reservation._id.toString(),
          refundAmount: reservation.depositPaid,
          refundStatus: reservation.refundStatus,
        },
        priority: 'medium',
      });
    } catch (error) {
      console.error('Failed to send cancellation notification:', error);
    }

    return savedReservation;
  }

  /**
   * Add entry to status history audit trail
   */
  private addStatusHistory(
    reservation: Reservation,
    status: ReservationStatus,
    changedBy: 'admin' | 'customer' | 'system',
    user?: IUser,
    reason?: string,
    note?: string,
  ): void {
    const historyEntry = {
      status,
      changedBy,
      changedByUserId: user ? new Types.ObjectId(user._id.toString()) : undefined,
      changedByName: user?.email || (changedBy === 'system' ? 'Hệ thống' : changedBy),
      reason,
      note,
      timestamp: new Date(),
    };
    if (!reservation.statusHistory) {
      (reservation as any).statusHistory = [];
    }
    reservation.statusHistory.push(historyEntry as any);
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  // ========== Admin Direct Confirm (No Deposit) ==========

  /**
   * Admin directly confirms a reservation without requiring PayOS deposit.
   * Used for walk-in or VIP reservations where deposit is waived.
   */
  async confirmWithoutDeposit(
    reservationId: string,
    dto: { adminNotes?: string },
    user: IUser,
  ): Promise<Reservation> {
    const reservation = await this.findById(reservationId);

    // Only PENDING or PENDING_APPROVAL (already approved) reservations can be confirmed this way
    if (
      reservation.status !== ReservationStatus.PENDING &&
      reservation.status !== ReservationStatus.PENDING_APPROVAL
    ) {
      throw new BadRequestException(
        `Không thể xác nhận đặt bàn ở trạng thái "${reservation.status}". Chỉ đặt bàn đang chờ xác nhận mới có thể xác nhận trực tiếp.`,
      );
    }

    if (reservation.isDepositPaid) {
      throw new BadRequestException('Đặt bàn này đã được xác nhận đặt cọc trước đó.');
    }

    // Atomic table lock check
    if (reservation.table) {
      const tableId =
        reservation.table instanceof Types.ObjectId
          ? reservation.table.toString()
          : (reservation.table as any)._id?.toString() || String(reservation.table);

      const { start, end } = this.getTimeWindow(reservation.reservationDate);

      const conflicting = await this.reservationModel
        .findOne({
          _id: { $ne: reservation._id },
          table: reservation.table,
          reservationDate: { $gte: start, $lte: end },
          status: ReservationStatus.CONFIRMED,
          isDepositPaid: true,
        })
        .exec();

      if (conflicting) {
        throw new ConflictException(
          'Bàn này đã được xác nhận bởi đặt bàn khác trong khung giờ này.',
        );
      }

      try {
        await this.tableService.updateTableStatus(tableId, 'reserved');
      } catch (error) {
        throw new ConflictException('Bàn không còn khả dụng.');
      }
    }

    // Confirm inventory if there are items
    if (reservation.items && reservation.items.length > 0 && reservation.usageDate) {
      for (const item of reservation.items) {
        try {
          await this.inventoryService.confirmIngredientReservation(
            item.item.toString(),
            item.quantity,
            reservation.usageDate,
            reservation._id.toString(),
          );
        } catch (error) {
          console.error('Failed to confirm inventory:', error);
        }
      }
    }

    // Record audit trail
    this.addStatusHistory(
      reservation,
      ReservationStatus.CONFIRMED,
      'admin',
      user,
      'Xác nhận trực tiếp (không đặt cọc)',
      dto.adminNotes,
    );

    // Capture original status before updating
    const wasPendingApproval = reservation.status === ReservationStatus.PENDING_APPROVAL;

    // Update reservation
    reservation.isDepositPaid = true;
    reservation.depositPaid = 0;
    reservation.depositPaymentMethod = 'ADMIN_DIRECT';
    reservation.depositPaidAt = new Date();
    reservation.status = ReservationStatus.CONFIRMED;

    if (wasPendingApproval) {
      reservation.approvalStatus = ApprovalStatus.APPROVED;
      reservation.approvedAt = new Date();
      reservation.approvedBy = new Types.ObjectId(user._id.toString());
    }

    const savedReservation = await reservation.save();

    // Notify customer
    try {
      await this.notificationService.sendToUser(reservation.customerPhone, {
        type: 'RESERVATION_CONFIRMED',
        title: 'Đặt bàn xác nhận thành công',
        message: `Đặt bàn ngày ${this.formatDate(reservation.reservationDate)} lúc ${reservation.reservationTime} đã được xác nhận bởi nhà hàng. Không cần đặt cọc. Cảm ơn bạn!`,
        data: {
          reservationId: reservation._id.toString(),
          depositAmount: 0,
        },
      });
    } catch (error) {
      console.error('Failed to send confirmation notification:', error);
    }

    return savedReservation;
  }
}
