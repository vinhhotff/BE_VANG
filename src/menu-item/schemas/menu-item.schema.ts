import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';
export type MenuItemDocument = MenuItem & Document;

@Schema({ timestamps: true })
export class MenuItem extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: [String], default: [] })
  images: string[]; // URL ảnh

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ default: true })
  available: boolean;

  @Prop({ required: true })
  category: string; // VD: Món chính, Tráng miệng

  @Prop({ min: 0, default: 0 })
  preparationTime?: number; // minutes

  @Prop({ type: [String], default: [] })
  allergens?: string[]; // allergen information

  @Prop({ default: false })
  isVegetarian?: boolean;

  @Prop({ default: false })
  isVegan?: boolean;

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

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);
MenuItemSchema.plugin(softDeletePlugin);

export interface IMenuItem {
  _id: string;
  name: string;
  description?: string;
  images?: string[];
  price: number;
  available: boolean;
  category: string;
  preparationTime?: number;
  allergens?: string[];
  isVegetarian?: boolean;
  isVegan?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
