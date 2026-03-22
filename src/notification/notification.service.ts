import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationType, NotificationPriority } from './schemas/notification.schema';
import { CreateNotificationDto, UpdateNotificationDto } from './dto/create-notification.dto';
import { IUser } from '../user/user.interface';
import { User, UserDocument } from '../user/schemas/user.schema';

interface BulkOrderNotificationData {
  reservationId: string;
  totalAmount?: number;
  totalItems?: number;
  depositAmount?: number;
  reason?: string;
}

interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  data?: BulkOrderNotificationData;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto, createdBy?: IUser): Promise<NotificationDocument> {
    const notification = new this.notificationModel({
      ...createNotificationDto,
      createdBy: createdBy ? { _id: createdBy._id, email: createdBy.email } : undefined,
    });
    return notification.save();
  }

  async findAll(
    userId?: string,
    guestId?: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
  ) {
    const skip = (page - 1) * limit;
    const query: any = { isDeleted: { $ne: true } };

    if (userId) {
      query.user = new Types.ObjectId(userId);
    } else if (guestId) {
      query.guestId = guestId;
    } else {
      // If no user or guest, return empty
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    if (unreadOnly) {
      query.read = false;
    }

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(query).exec(),
    ]);

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel.findById(id).exec();
    if (!notification || notification.isDeleted) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return notification;
  }

  async markAsRead(id: string): Promise<NotificationDocument> {
    const notification = await this.findOne(id);
    notification.read = true;
    notification.readAt = new Date();
    return notification.save();
  }

  async markAllAsRead(userId?: string, guestId?: string): Promise<void> {
    const query: any = { isDeleted: { $ne: true }, read: false };

    if (userId) {
      query.user = new Types.ObjectId(userId);
    } else if (guestId) {
      query.guestId = guestId;
    } else {
      return;
    }

    await this.notificationModel.updateMany(query, {
      read: true,
      readAt: new Date(),
    }).exec();
  }

  async getUnreadCount(userId?: string, guestId?: string): Promise<number> {
    const query: any = { isDeleted: { $ne: true }, read: false };

    if (userId) {
      query.user = new Types.ObjectId(userId);
    } else if (guestId) {
      query.guestId = guestId;
    } else {
      return 0;
    }

    return this.notificationModel.countDocuments(query).exec();
  }

  async delete(id: string): Promise<void> {
    await this.notificationModel.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date(),
    }).exec();
  }

  // Helper methods for creating specific notification types
  async createOrderNotification(
    type: NotificationType.ORDER_NEW | NotificationType.ORDER_STATUS_CHANGED | NotificationType.ORDER_CANCELLED,
    orderId: string,
    userId?: string,
    guestId?: string,
    status?: string,
  ): Promise<NotificationDocument> {
    const titles = {
      [NotificationType.ORDER_NEW]: 'New Order',
      [NotificationType.ORDER_STATUS_CHANGED]: 'Order Status Updated',
      [NotificationType.ORDER_CANCELLED]: 'Order Cancelled',
    };

    const messages = {
      [NotificationType.ORDER_NEW]: 'You have a new order',
      [NotificationType.ORDER_STATUS_CHANGED]: `Your order status has been updated to ${status}`,
      [NotificationType.ORDER_CANCELLED]: 'Your order has been cancelled',
    };

    return this.create({
      user: userId,
      guestId,
      type,
      priority: type === NotificationType.ORDER_NEW ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
      title: titles[type],
      message: messages[type],
      data: { orderId },
      actionUrl: `/admin/orders/${orderId}`,
    });
  }

  async createReservationNotification(
    type: NotificationType.RESERVATION_NEW | NotificationType.RESERVATION_CONFIRMED | NotificationType.RESERVATION_CANCELLED,
    reservationId: string,
    userId?: string,
    guestId?: string,
  ): Promise<NotificationDocument> {
    const titles = {
      [NotificationType.RESERVATION_NEW]: 'New Reservation',
      [NotificationType.RESERVATION_CONFIRMED]: 'Reservation Confirmed',
      [NotificationType.RESERVATION_CANCELLED]: 'Reservation Cancelled',
    };

    const messages = {
      [NotificationType.RESERVATION_NEW]: 'You have a new reservation request',
      [NotificationType.RESERVATION_CONFIRMED]: 'Your reservation has been confirmed',
      [NotificationType.RESERVATION_CANCELLED]: 'Your reservation has been cancelled',
    };

    return this.create({
      user: userId,
      guestId,
      type,
      priority: type === NotificationType.RESERVATION_NEW ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
      title: titles[type],
      message: messages[type],
      data: { reservationId },
      actionUrl: `/admin/reservations/${reservationId}`,
    });
  }

  async createReviewNotification(
    type: NotificationType.REVIEW_NEW | NotificationType.REVIEW_APPROVED,
    reviewId: string,
    userId?: string,
    guestId?: string,
  ): Promise<NotificationDocument> {
    const titles = {
      [NotificationType.REVIEW_NEW]: 'New Review',
      [NotificationType.REVIEW_APPROVED]: 'Review Approved',
    };

    const messages = {
      [NotificationType.REVIEW_NEW]: 'You have a new review to moderate',
      [NotificationType.REVIEW_APPROVED]: 'Your review has been approved and published',
    };

    return this.create({
      user: userId,
      guestId,
      type,
      priority: NotificationPriority.MEDIUM,
      title: titles[type],
      message: messages[type],
      data: { reviewId },
      actionUrl: type === NotificationType.REVIEW_NEW ? `/admin/reviews` : undefined,
    });
  }

  // ========== Bulk Order Approval Notifications ==========

  /**
   * Send notification to all admins about pending bulk order
   */
  async sendToAdmins(payload: NotificationPayload): Promise<void> {
    // Find all admin users
    const admins = await this.userModel.find({
      isDeleted: { $ne: true },
      role: { $in: ['admin', 'manager'] },
    }).exec();

    // Create notification for each admin
    const notifications = admins.map(admin => ({
      user: admin._id,
      type: NotificationType.RESERVATION_NEW,
      priority: NotificationPriority.HIGH,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      actionUrl: `/admin/reservations/${payload.data?.reservationId}`,
    }));

    if (notifications.length > 0) {
      await this.notificationModel.insertMany(notifications);
    }
  }

  /**
   * Send notification to a specific user by phone (guest)
   */
  async sendToUser(phone: string, payload: NotificationPayload): Promise<NotificationDocument | null> {
    // Find user by phone or create guest notification
    const user = await this.userModel.findOne({
      phone,
      isDeleted: { $ne: true },
    }).exec();

    const typeMap: Record<string, NotificationType> = {
      'BULK_ORDER_PENDING': NotificationType.RESERVATION_NEW,
      'BULK_ORDER_APPROVED': NotificationType.RESERVATION_CONFIRMED,
      'BULK_ORDER_REJECTED': NotificationType.RESERVATION_CANCELLED,
      'BULK_ORDER_EXPIRED': NotificationType.RESERVATION_CANCELLED,
    };

    return this.create({
      user: user?._id,
      guestId: user ? undefined : phone,
      type: typeMap[payload.type] || NotificationType.RESERVATION_NEW,
      priority: NotificationPriority.MEDIUM,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      actionUrl: user ? `/admin/reservations/${payload.data?.reservationId}` : `/my-bookings/${payload.data?.reservationId}`,
    });
  }
}

