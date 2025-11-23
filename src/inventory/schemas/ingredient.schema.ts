import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, HydratedDocument } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';

export type IngredientDocument = HydratedDocument<Ingredient>;

export enum UnitType {
  KILOGRAM = 'kg',
  GRAM = 'g',
  LITER = 'L',
  MILLILITER = 'mL',
  PIECE = 'piece',
  PACK = 'pack',
  BOTTLE = 'bottle',
  BOX = 'box',
}

@Schema({ timestamps: true })
export class Ingredient {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({
    type: String,
    enum: UnitType,
    default: UnitType.KILOGRAM,
  })
  unit: UnitType;

  @Prop({ type: Number, default: 0, min: 0 })
  currentStock: number; // Current stock quantity

  @Prop({ type: Number, default: 0, min: 0 })
  minStock: number; // Minimum stock threshold for alerts

  @Prop({ type: Number, default: 0, min: 0 })
  maxStock: number; // Maximum stock capacity

  @Prop({ type: Number, min: 0 })
  costPerUnit?: number; // Cost per unit for calculation

  @Prop({ type: String })
  supplier?: string; // Supplier name

  @Prop({ type: String })
  location?: string; // Storage location

  @Prop({ type: Object })
  createdBy?: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  @Prop({ type: Object })
  updatedBy?: {
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

export const IngredientSchema = SchemaFactory.createForClass(Ingredient);
IngredientSchema.plugin(softDeletePlugin);

