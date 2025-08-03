import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types, Document } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';

@Schema({ timestamps: true })
export class Guest extends Document {
  @Prop({ required: true })
  tableName: string; // Mã QR / mã bàn
  
  @Prop({ required: true })
  guestName: string; // Tên khách

  @Prop()
  guestPhone?: string; // Số điện thoại khách (tùy chọn)

  @Prop({ default: false })
  isPaid: boolean; // Đã thanh toán hay chưa

  @Prop({ type: [Types.ObjectId], ref: 'Order', default: [] })
  orders: Types.ObjectId[]; // Các đơn đã gọi

  @Prop({ type: Types.ObjectId, ref: 'Payment', default: null })
  payment: Types.ObjectId | null; // Thanh toán (nếu đã có)

  @Prop({ default: Date.now })
  joinedAt: Date; // Thời gian tham gia

  // Timestamps are automatically handled by Mongoose when timestamps: true
  createdAt: Date;
  updatedAt: Date;

  // Soft delete fields are handled by the plugin
  isDeleted?: boolean;
  deletedAt?: Date;
}

export const GuestSchema = SchemaFactory.createForClass(Guest);
GuestSchema.plugin(softDeletePlugin);

export interface IGuest {
  _id: string;
  tableCode: string;
  guestName: string;
  joinedAt: Date;
  isPaid: boolean;
  orders: Types.ObjectId[];
  payment?: Types.ObjectId | null; // Thanh toán (nếu đã có)
}