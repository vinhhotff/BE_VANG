import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';

export type StockMovementDocument = HydratedDocument<StockMovement>;

export enum MovementType {
  IN = 'in', // Nhập kho
  OUT = 'out', // Xuất kho
  ADJUSTMENT = 'adjustment', // Điều chỉnh
  WASTE = 'waste', // Hỏng/Thất thoát
}

export enum MovementReason {
  PURCHASE = 'purchase', // Mua hàng
  ORDER = 'order', // Đơn hàng
  RETURN = 'return', // Trả hàng
  ADJUSTMENT = 'adjustment', // Điều chỉnh
  WASTE = 'waste', // Hỏng
  TRANSFER = 'transfer', // Chuyển kho
}

@Schema({ timestamps: true })
export class StockMovement {
  @Prop({ type: Types.ObjectId, ref: 'Ingredient', required: true })
  ingredient: Types.ObjectId;

  @Prop({
    type: String,
    enum: MovementType,
    required: true,
  })
  type: MovementType;

  @Prop({
    type: String,
    enum: MovementReason,
    required: true,
  })
  reason: MovementReason;

  @Prop({ type: Number, required: true, min: 0 })
  quantity: number;

  @Prop({ type: Number, min: 0 })
  unitPrice?: number; // Price per unit for this movement

  @Prop({ type: Number, min: 0 })
  totalCost?: number; // Total cost for this movement

  @Prop({ type: Number, required: true, min: 0 })
  stockBefore: number; // Stock quantity before movement

  @Prop({ type: Number, required: true, min: 0 })
  stockAfter: number; // Stock quantity after movement

  @Prop({ type: Types.ObjectId, ref: 'Order', required: false })
  order?: Types.ObjectId; // Reference to order if movement is due to order

  @Prop()
  notes?: string; // Additional notes

  @Prop({ type: Object })
  createdBy?: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  // Timestamps are automatically handled by Mongoose when timestamps: true
  createdAt: Date;
  updatedAt: Date;

  // Soft delete fields are handled by the plugin
  isDeleted?: boolean;
  deletedAt?: Date;
}

export const StockMovementSchema = SchemaFactory.createForClass(StockMovement);
StockMovementSchema.plugin(softDeletePlugin);

