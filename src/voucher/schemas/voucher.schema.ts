import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VoucherDocument = Voucher & Document;

export enum VoucherType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  FREE_SHIPPING = 'free_shipping',
}

export enum VoucherStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  USED_UP = 'used_up',
}

@Schema({ timestamps: true })
export class Voucher {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(VoucherType),
    required: true,
  })
  type: VoucherType;

  @Prop({ required: true, min: 0 })
  value: number; // Percentage (1-100) or fixed amount

  @Prop({ min: 0 })
  minOrderValue?: number; // Minimum order value to use voucher

  @Prop({ min: 0 })
  maxDiscount?: number; // Maximum discount amount (for percentage vouchers)

  @Prop({ required: true, min: 0 })
  usageLimit: number; // Total number of times this voucher can be used

  @Prop({ default: 0, min: 0 })
  usedCount: number; // Number of times this voucher has been used

  @Prop({ default: 1, min: 1 })
  usageLimitPerUser: number; // Max uses per user

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({
    type: String,
    enum: Object.values(VoucherStatus),
    default: VoucherStatus.ACTIVE,
  })
  status: VoucherStatus;

  @Prop({ default: false })
  isActive: boolean;

  @Prop([{ type: Types.ObjectId, ref: 'User' }])
  allowedUsers?: Types.ObjectId[]; // Specific users who can use this voucher (empty = all users)

  @Prop([String])
  allowedCategories?: string[]; // Menu item categories this voucher applies to

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const VoucherSchema = SchemaFactory.createForClass(Voucher);
