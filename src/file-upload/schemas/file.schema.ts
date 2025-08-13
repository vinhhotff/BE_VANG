import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type FileDocument = File & Document;

@Schema({ timestamps: true })
export class File {
 @Prop({ type: mongoose.Schema.Types.ObjectId })
_id: Types.ObjectId; // ✅ Không có index ở đây

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  url: string;

  @Prop()
  mimetype: string;

  @Prop()
  size: number;

  @Prop()
  uploader: string; // userId or similar, optional
}

export const FileSchema = SchemaFactory.createForClass(File);