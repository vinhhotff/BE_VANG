import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { MenuItem } from 'src/menu-item/schemas/menu-item.schema';
import { Guest } from 'src/guest/schemas/guest.schema';
import { IsMongoId, IsOptional } from 'class-validator';
import { IsOnlyOneDefined } from 'src/auth/decoration/setMetadata';
export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @IsOptional()
  @IsMongoId()
  guest?: string;

  @IsOptional()
  @IsMongoId()
  user?: string;

  @IsOnlyOneDefined(['guest', 'user'], {
    message: 'Chỉ được gửi guest hoặc user, không được gửi cả hai hoặc không gửi gì.',
  })
  onlyOnePayer: true;
  @Prop({
    type: [
      {
        item: { type: Types.ObjectId, ref: 'MenuItem', required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    required: true,
  })
  items: {
    item: Types.ObjectId;
    quantity: number;
  }[];

  @Prop({ default: 'pending', enum: ['pending', 'preparing', 'served', 'cancelled'] })
  status: string;
  
  @Prop({ required: true })
  totalPrice: number; // Tổng tiền của order

  @Prop({ default: false })
  isPaid: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

export interface IOrder {
  _id: string;
  guest: Types.ObjectId;
  items: {
    menuItem: Types.ObjectId;
    quantity: number;
    note?: string;
  }[];
  status: 'pending' | 'served' | 'canceled';
  orderedAt: Date;
}

export enum OrderStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  SERVED = 'served',
  CANCELLED = 'cancelled',
}
