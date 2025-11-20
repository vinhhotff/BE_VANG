import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';

export type ZoneDocument = HydratedDocument<Zone>;

@Schema({ timestamps: true })
export class Zone {
  @Prop({ required: true, unique: true })
  name: string; // Tên khu: A, B, C, VIP, etc.

  @Prop({ type: String })
  description?: string; // Mô tả khu

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

export const ZoneSchema = SchemaFactory.createForClass(Zone);
ZoneSchema.plugin(softDeletePlugin);

