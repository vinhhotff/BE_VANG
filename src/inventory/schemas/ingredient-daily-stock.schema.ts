import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';

export type IngredientDailyStockDocument = HydratedDocument<IngredientDailyStock>;

@Schema({ timestamps: true })
export class IngredientDailyStock extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Ingredient', required: true })
  ingredient: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'MenuItem', required: true })
  menuItem: Types.ObjectId;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: Number, default: 0, min: 0 })
  pendingQuantity: number;

  @Prop({ type: Number, default: 0, min: 0 })
  confirmedQuantity: number;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  orderId?: Types.ObjectId;

  @Prop({ type: String })
  reason?: string;

  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
  deletedAt?: Date;
}

export const IngredientDailyStockSchema = SchemaFactory.createForClass(IngredientDailyStock);
IngredientDailyStockSchema.plugin(softDeletePlugin);

IngredientDailyStockSchema.index({ ingredient: 1, date: 1 }, { unique: true });
IngredientDailyStockSchema.index({ menuItem: 1, date: 1 });
IngredientDailyStockSchema.index({ orderId: 1 });
