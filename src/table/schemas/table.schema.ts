import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, HydratedDocument, Types } from 'mongoose';
import { Order } from '../../order/schemas/order.schema';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';

export type TableDocument = HydratedDocument<Table>;

@Schema({ timestamps: true })
export class Table {
  @Prop({ required: true })
  tableName: string;

  @Prop({ required: false })
  location?: string;

  @Prop({ required: true, enum: ['available', 'occupied', 'reserved', 'maintenance'] })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'Order', default: null })
  currentOrder: Order;

  @Prop({ type: Number, default: 1, min: 1 })
  width: number; // Số ô chiếm theo chiều ngang

  @Prop({ type: Number, default: 1, min: 1 })
  height: number; // Số ô chiếm theo chiều dọc

  @Prop({ type: Number, default: 1, min: 1 })
  capacity: number; // Số người tối đa có thể ngồi

  @Prop({ type: Date, default: null })
  reservedAt: Date | null; // Timestamp when table was set to 'reserved'

  @Prop({ type: Object })
  updatedBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  @Prop({
    type: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      email: { type: String },
    },
  })
  deletedBy?: {
    _id: mongoose.Types.ObjectId;
    email: string;
  };
}

export const TableSchema = SchemaFactory.createForClass(Table);
TableSchema.plugin(softDeletePlugin);
