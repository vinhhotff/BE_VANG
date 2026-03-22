import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';
export type MenuItemDocument = MenuItem & Document;

@Schema({ timestamps: true })
export class MenuItem {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  images?: []; // Reference to File documents

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({
    default: true,
    set: (value: any) => {
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
      }
      return Boolean(value);
    },
  })
  available: boolean;


  @Prop({ required: true })
  category: string; // VD: Món chính, Tráng miệng

  @Prop({ min: 0, default: 0 })
  preparationTime?: number; // minutes

  @Prop({ type: [String], default: [] })
  tag?: string[]; // allergen information

  @Prop({ default: false })
  isVegetarian?: boolean;

  @Prop({ default: false })
  isVegan?: boolean;

  // ========== D-Day Inventory Management ==========
  @Prop({ type: Number, default: null })
  dailyLimit: number; // Maximum quantity per day (null = unlimited)

  @Prop({ type: Number, default: 0 })
  reservedCount: number; // Current reserved count for today

  @Prop({ type: Boolean, default: false })
  isSpecialItem: boolean; // Flag for items requiring special approval

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
  images?: Types.ObjectId[];
  price: number;
  available: boolean;
  category: string;
  preparationTime?: number;
  tag?: string[];
  isVegetarian?: boolean;
  isVegan?: boolean;
  // D-Day Inventory Management
  dailyLimit?: number | null;
  reservedCount?: number;
  isSpecialItem?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
