import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../user/schemas/user.schema';

export enum ReservationStatus {
  PENDING = 'pending',
  PENDING_APPROVAL = 'pending_approval', // Chờ phê duyệt (đơn hàng lớn)
  CONFIRMED = 'confirmed',
  ARRIVED = 'arrived',      // Khách đã đến
  SEATED = 'seated',        // Khách đã ngồi vào bàn
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum ApprovalStatus {
  NOT_APPLICABLE = 'not_applicable',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum BookingType {
  TABLE_ONLY = 'TABLE_ONLY', // Chỉ đặt bàn
  FULL_BOOKING = 'FULL_BOOKING', // Đặt bàn + món
}

export enum RefundStatus {
  NOT_APPLICABLE = 'not_applicable',
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  NOT_REQUESTED = 'not_requested',
}

@Schema({ timestamps: true })
export class Reservation extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  user?: User;

  @Prop({ required: true })
  customerName: string;

  @Prop({ required: true })
  customerPhone: string;

  @Prop({ required: false })
  customerEmail?: string;

  @Prop({ required: true })
  reservationDate: Date;

  @Prop({ required: true })
  reservationTime: string; // Thời gian đặt: "19:00"

  @Prop({ required: true })
  numberOfGuests: number;

  @Prop()
  specialRequests?: string;

  @Prop({ type: String, enum: ReservationStatus, default: ReservationStatus.PENDING })
  status: ReservationStatus;

  /** Thời điểm khách đến (markArrived) — cũng là lúc trừ stock */
  @Prop({ type: Date })
  arrivedAt?: Date;

  /** Thời điểm khách ngồi vào bàn (markSeated) */
  @Prop({ type: Date })
  seatedAt?: Date;

  /** Thời điểm hoàn thành (markCompleted) */
  @Prop({ type: Date })
  completedAt?: Date;

  @Prop()
  tableNumber?: string;

  @Prop({ type: Types.ObjectId, ref: 'Table' })
  table?: Types.ObjectId;

  @Prop()
  notes?: string; // Ghi chú từ nhân viên

  // ========== Integrated Booking Fields ==========
  @Prop({ type: String, enum: BookingType, default: BookingType.TABLE_ONLY })
  bookingType: BookingType;

  @Prop({ type: [
    {
      item: { type: Types.ObjectId, ref: 'MenuItem', required: true },
      quantity: { type: Number, required: true, min: 1 },
      unitPrice: { type: Number, required: true },
      subtotal: { type: Number, required: true },
      note: { type: String, default: '' },
    }
  ], default: [] })
  items: Array<{
    item: Types.ObjectId;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    note?: string;
  }>;

  @Prop({ type: Number, default: 0 })
  totalAmount: number;

  @Prop({ type: Number, default: 0 })
  depositAmount: number;

  @Prop({ type: Number, default: 0 })
  depositPaid: number;

  @Prop({ type: Boolean, default: false })
  isDepositPaid: boolean;

  @Prop()
  depositPaymentMethod?: string;

  @Prop()
  depositPaidAt?: Date;

  // Link to Order if created from reservation
  @Prop({ type: Types.ObjectId, ref: 'Order' })
  order?: Types.ObjectId;

  // For D-Day inventory management
  @Prop({ type: Date })
  usageDate: Date; // Ngày sử dụng (có thể khác ngày đặt)

  @Prop({ type: Boolean, default: false })
  inventoryChecked: boolean;

  // ========== Bulk Order Approval Fields ==========
  @Prop({ type: Boolean, default: false })
  requiresApproval: boolean; // Tự động set dựa trên ngưỡng

  @Prop({ type: String, enum: ApprovalStatus, default: ApprovalStatus.NOT_APPLICABLE })
  approvalStatus: ApprovalStatus;

  @Prop()
  approvalRequestedAt?: Date;

  @Prop()
  approvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop()
  rejectedAt?: Date;

  @Prop()
  rejectedReason?: string;

  @Prop({ type: Object })
  approvalNotes?: {
    adminNotes?: string;
    kitchenNotes?: string;
  };

  @Prop({ type: Date })
  approvalExpiresAt?: Date; // Hết hạn phê duyệt (mặc định 48h)

  // ========== Refund Fields ==========
  @Prop({ type: String, enum: RefundStatus, default: RefundStatus.NOT_APPLICABLE })
  refundStatus: RefundStatus;

  @Prop({ type: Number, default: 0 })
  refundAmount: number;

  @Prop({ type: Date })
  refundRequestedAt?: Date;

  @Prop({ type: Date })
  refundProcessedAt?: Date;

  @Prop()
  refundReason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  refundProcessedBy?: Types.ObjectId;

  @Prop()
  refundNotes?: string;

  @Prop()
  refundTransactionId?: string;

  // ========== Audit Trail ==========
  @Prop({ type: [
    {
      status: { type: String, required: true },
      changedBy: { type: String },
      changedByUserId: { type: Types.ObjectId, ref: 'User' },
      changedByName: { type: String },
      reason: { type: String },
      note: { type: String },
      timestamp: { type: Date, default: Date.now },
    }
  ], default: [] })
  statusHistory: Array<{
    status: string;
    changedBy?: string;
    changedByUserId?: Types.ObjectId;
    changedByName?: string;
    reason?: string;
    note?: string;
    timestamp: Date;
  }>;

  @Prop({ type: Object })
  createdBy?: {
    _id: Types.ObjectId;
    email: string;
  };
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);

export interface IReservation {
  _id: string;
  user: Types.ObjectId;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  reservationDate: Date;
  reservationTime: string;
  numberOfGuests: number;
  specialRequests?: string;
  status: ReservationStatus;
  arrivedAt?: Date;
  seatedAt?: Date;
  completedAt?: Date;
  tableNumber?: string;
  table?: Types.ObjectId;
  notes?: string;
  bookingType: BookingType;
  items: Array<{
    item: Types.ObjectId;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    note?: string;
  }>;
  totalAmount: number;
  depositAmount: number;
  depositPaid: number;
  isDepositPaid: boolean;
  depositPaymentMethod?: string;
  depositPaidAt?: Date;
  order?: Types.ObjectId;
  usageDate?: Date;
  inventoryChecked: boolean;
  // Bulk Order Approval
  requiresApproval?: boolean;
  approvalStatus?: ApprovalStatus;
  approvalRequestedAt?: Date;
  approvedAt?: Date;
  approvedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectedReason?: string;
  approvalNotes?: {
    adminNotes?: string;
    kitchenNotes?: string;
  };
  approvalExpiresAt?: Date;
  // Refund
  refundStatus?: RefundStatus;
  refundAmount?: number;
  refundRequestedAt?: Date;
  refundProcessedAt?: Date;
  refundReason?: string;
  refundProcessedBy?: Types.ObjectId;
  refundNotes?: string;
  refundTransactionId?: string;
  // Audit Trail
  statusHistory?: Array<{
    status: string;
    changedBy?: string;
    changedByUserId?: Types.ObjectId;
    changedByName?: string;
    reason?: string;
    note?: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
