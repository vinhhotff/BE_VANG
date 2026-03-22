import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types, Document } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';
export type OrderDocument = Order & Document;

export enum OrderType {
  DINE_IN = 'DINE_IN',
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP',
}

export enum OrderStatus {
  PENDING = 'pending',
  PENDING_APPROVAL = 'pending_approval',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  SERVED = 'served',
  CANCELLED = 'cancelled',
}

/**
 * Order Status State Machine
 * Valid transitions:
 * - PENDING -> CONFIRMED, CANCELLED
 * - PENDING_APPROVAL -> CONFIRMED, CANCELLED
 * - CONFIRMED -> PREPARING, CANCELLED
 * - PREPARING -> SERVED, CANCELLED
 * - SERVED -> (terminal state)
 * - CANCELLED -> (terminal state)
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.PENDING_APPROVAL]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.SERVED, OrderStatus.CANCELLED],
  [OrderStatus.SERVED]: [],
  [OrderStatus.CANCELLED]: [],
};

export const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.SERVED,
  OrderStatus.CANCELLED,
];

export function isValidStatusTransition(fromStatus: OrderStatus, toStatus: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
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
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Prop({ required: true, min: 0 })
  totalPrice: number;

  @Prop({ default: false })
  isPaid: boolean;

  @Prop()
  specialInstructions?: string;

  @Prop()
  estimatedReadyTime?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Table', required: false })
  table?: Types.ObjectId;

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

  @Prop({ type: Boolean, default: false })
  isBulkOrder: boolean;

  @Prop({ type: String, enum: ['auto', 'manual'], default: 'auto' })
  approvalType: 'auto' | 'manual';

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy: mongoose.Types.ObjectId;

  @Prop()
  approvedAt: Date;

  @Prop()
  approvalNote: string;

  @Prop({ type: Date })
  reservationDate: Date;

  @Prop({ type: Boolean, default: false })
  inventoryReserved: boolean;

  createdAt: Date;
  updatedAt: Date;
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
  status: OrderStatus;
  totalPrice: number;
  isPaid: boolean;
  specialInstructions?: string;
  estimatedReadyTime?: Date;
  table?: Types.ObjectId;
  orderType: OrderType;
  deliveryAddress?: string;
  customerPhone?: string;
  isBulkOrder: boolean;
  approvalType: 'auto' | 'manual';
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  approvalNote?: string;
  reservationDate?: Date;
  inventoryReserved: boolean;
  createdAt: Date;
  updatedAt: Date;
}
