import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

@Schema({ timestamps: true })
export class Guest extends Document {
  @Prop({ required: true })
  tableCode: string; // Mã QR / mã bàn

  @Prop({ default: false })
  isPaid: boolean; // Đã thanh toán hay chưa

  @Prop({ type: [Types.ObjectId], ref: 'Order' })
  orders: Types.ObjectId[]; // Các đơn đã gọi

  @Prop({ type: Types.ObjectId, ref: 'Payment', default: null })
  payment: Types.ObjectId | null; // Thanh toán (nếu đã có)
}

export const GuestSchema = SchemaFactory.createForClass(Guest);

export interface IGuest {
  _id: string;
  tableCode: string;
  joinedAt: Date;
  isPaid: boolean;
  orders: Types.ObjectId[];
  payment?: Types.ObjectId | null; // Thanh toán (nếu đã có)
}