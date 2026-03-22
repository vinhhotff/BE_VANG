import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types, Document } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';
export type OrderDocument = Order & Document;

export enum OrderType {
  DINE_IN = 'DINE_IN',
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP',
}

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Guest' })
  guest?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user?: Types.ObjectId;
  @Prop({
    type: [
      {
        item: { type: Types.ObjectId, ref: 'MenuItem', required: true },
        quantity: { type: Number, required: true, min: 1 },
        note: { type: String, default: '' },
        unitPrice: { type: Number, required: true, min: 0 },
        subtotal: { type: Number, required: true, min: 0 },
      },
    ],
    required: true,
  })
  items: {
    item: Types.ObjectId;
    quantity: number;
    note?: string;
    unitPrice: number;
    subtotal: number;
  }[];

  @Prop({
    type: String,
    enum: {
      pending: 'pending',
      pending_approval: 'pending_approval',
      confirmed: 'confirmed',
      preparing: 'preparing',
      served: 'served',
      cancelled: 'cancelled',
    },
    default: 'pending',
  })
  status: 'pending' | 'pending_approval' | 'confirmed' | 'preparing' | 'served' | 'cancelled';

  @Prop({ required: true, min: 0 })
  totalPrice: number; // Tổng tiền của order

  @Prop({ default: false })
  isPaid: boolean;

  @Prop()
  specialInstructions?: string; // Ghi chú đặc biệt cho đơn hàng

  @Prop()
  estimatedReadyTime?: Date; // Thời gian dự kiến hoàn thành

  @Prop({ type: Types.ObjectId, ref: 'Table', required: false })
  table?: Types.ObjectId; // Bàn phục vụ

  @Prop({
    type: String,
    enum: OrderType,
    default: OrderType.DINE_IN,
  })
  orderType: OrderType;

  @Prop({ required: false })
  deliveryAddress?: string;

  @Prop({ required: false })
  customerPhone?: string;

  @Prop({ type: Object })
  createdBy?: {
    _id: Types.ObjectId;
    email: string;
  };

  @Prop({ type: Object })
  updatedBy?: {
    _id: Types.ObjectId;
    email: string;
  };

  // ========== Bulk Order Approval Fields ==========
  @Prop({ type: Boolean, default: false })
  isBulkOrder: boolean; // Đánh dấu đơn hàng lớn

  @Prop({ type: String, enum: ['auto', 'manual'], default: 'auto' })
  approvalType: 'auto' | 'manual';

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy: mongoose.Types.ObjectId;

  @Prop()
  approvedAt: Date;

  @Prop()
  approvalNote: string; // Ghi chú khi phê duyệt/từ chối

  // For D-Day inventory management
  @Prop({ type: Date })
  reservationDate: Date; // Ngày sử dụng/đặt bàn

  @Prop({ type: Boolean, default: false })
  inventoryReserved: boolean; // Đã reserve tồn kho

  // Timestamps are automatically handled by Mongoose when timestamps: true
  createdAt: Date;
  updatedAt: Date;

  // Soft delete fields are handled by the plugin
  isDeleted?: boolean;
  deletedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.plugin(softDeletePlugin);

export interface IOrder {
  _id: string;
  guest?: Types.ObjectId;
  user?: Types.ObjectId;
  items: {
    item: Types.ObjectId;
    quantity: number;
    note?: string;
    unitPrice: number;
    subtotal: number;
  }[];
  status: 'pending' | 'pending_approval' | 'confirmed' | 'preparing' | 'served' | 'cancelled';
  totalPrice: number;
  isPaid: boolean;
  specialInstructions?: string;
  estimatedReadyTime?: Date;
  table?: Types.ObjectId;
  orderType: OrderType;
  deliveryAddress?: string;
  customerPhone?: string;
  // Bulk Order Approval
  isBulkOrder: boolean;
  approvalType: 'auto' | 'manual';
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  approvalNote?: string;
  // D-Day Inventory
  reservationDate?: Date;
  inventoryReserved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum OrderStatus {
  PENDING = 'pending',
  PENDING_APPROVAL = 'pending_approval', // Chờ phê duyệt cho đơn hàng lớn
  CONFIRMED = 'confirmed', // Đã được phê duyệt
  PREPARING = 'preparing',
  SERVED = 'served',
  CANCELLED = 'cancelled',
}
