// schemas/payment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsMongoId, IsOptional } from 'class-validator';
import { Types } from 'mongoose';
import { IsOnlyOneDefined } from 'src/auth/decoration/setMetadata';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true, enum: ['cash', 'qr'] })
  method: 'cash' | 'qr';

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  paidAt: Date;

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

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Order' }] })
  orders: Types.ObjectId[];

  @Prop({ default: false })
  isRefunded: boolean;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

export interface IPayment {
  _id: string;
  method: 'cash' | 'qr';
  amount: number;
  paidAt: Date;
  guest: Types.ObjectId;
  orders: Types.ObjectId[];
  isRefunded: boolean;
}