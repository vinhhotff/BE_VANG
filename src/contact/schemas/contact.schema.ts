import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';

export type ContactDocument = Contact & Document;

export enum ContactStatus {
  PENDING = 'pending',
  READ = 'read',
  REPLIED = 'replied',
  CLOSED = 'closed',
}

@Schema({ timestamps: true })
export class Contact extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  message: string;

  @Prop({
    type: String,
    enum: Object.values(ContactStatus),
    default: ContactStatus.PENDING,
  })
  status: ContactStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  repliedBy?: Types.ObjectId;

  @Prop()
  repliedAt?: Date;

  @Prop()
  replyMessage?: string;

  @Prop({ type: Object })
  createdBy?: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
  deletedAt?: Date;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);
ContactSchema.plugin(softDeletePlugin);
