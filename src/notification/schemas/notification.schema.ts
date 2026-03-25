import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export enum NotificationType {
  ORDER_NEW = 'order_new',
  ORDER_STATUS_CHANGED = 'order_status_changed',
  ORDER_CANCELLED = 'order_cancelled',
  RESERVATION_NEW = 'reservation_new',
  RESERVATION_CONFIRMED = 'reservation_confirmed',
  RESERVATION_CANCELLED = 'reservation_cancelled',
  RESERVATION_DEPOSIT_PAID = 'reservation_deposit_paid',
  RESERVATION_REFUND_REQUESTED = 'reservation_refund_requested',
  RESERVATION_REFUND_COMPLETED = 'reservation_refund_completed',
  RESERVATION_ADMIN_CANCELLED = 'reservation_admin_cancelled',
  RESERVATION_REFUND_FAILED = 'reservation_refund_failed',
  REVIEW_NEW = 'review_new',
  REVIEW_APPROVED = 'review_approved',
  SYSTEM = 'system',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  user?: Types.ObjectId; // Target user (null for guest notifications)

  @Prop({ type: String, required: false })
  guestId?: string; // For guest notifications

  @Prop({
    type: String,
    enum: NotificationType,
    required: true,
  })
  type: NotificationType;

  @Prop({
    type: String,
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Object })
  data?: {
    orderId?: string;
    reservationId?: string;
    reviewId?: string;
    [key: string]: any;
  };

  @Prop({ type: Boolean, default: false })
  read: boolean;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: String })
  actionUrl?: string; // URL to navigate when clicked

  @Prop({ type: Object })
  createdBy?: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  // Timestamps are automatically handled by Mongoose when timestamps: true
  createdAt: Date;
  updatedAt: Date;

  // Soft delete fields are handled by the plugin
  isDeleted?: boolean;
  deletedAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.plugin(softDeletePlugin);

// Indexes for better query performance
NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ guestId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });

