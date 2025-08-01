import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum QRSessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  COMPLETED = 'completed',
}

@Schema({ timestamps: true })
export class QRSession extends Document {
  @Prop({ required: true, unique: true })
  qrCode: string; // Mã QR duy nhất

  @Prop({ required: true })
  tableCode: string; // Mã bàn

  @Prop({ type: String, enum: QRSessionStatus, default: QRSessionStatus.ACTIVE })
  status: QRSessionStatus;

  @Prop({ required: true })
  expiresAt: Date; // Thời gian hết hạn QR

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Order' }], default: [] })
  orders: Types.ObjectId[]; // Các đơn hàng từ QR này

  @Prop()
  customerName?: string; // Tên khách (tùy chọn)

  @Prop()
  customerPhone?: string; // SĐT khách (tùy chọn)

  @Prop({ type: Object })
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
}

export const QRSessionSchema = SchemaFactory.createForClass(QRSession);

export interface IQRSession {
  _id: string;
  qrCode: string;
  tableCode: string;
  status: QRSessionStatus;
  expiresAt: Date;
  orders: Types.ObjectId[];
  customerName?: string;
  customerPhone?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}
