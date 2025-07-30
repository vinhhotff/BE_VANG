import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type MenuItemDocument = MenuItem & Document;

@Schema({ timestamps: true })
export class MenuItem extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ type: [String], default: [] })
  images: string[]; // URL ảnh

  @Prop({ required: true })
  price: number;

  @Prop({ default: true })
  available: boolean;

  @Prop()
  category: string; // VD: Món chính, Tráng miệng
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);

export interface IMenuItem {
  _id: string;
  name: string;
  description?: string;
  images?: string[];
  price: number;
  available: boolean;
  category?: string;
}