import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../user/schemas/user.schema';

@Schema({ timestamps: true })
export class Loyalty extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  user: User;

  @Prop({ default: 0 })
  points: number;
  @Prop({ default: Date.now })
  createdAt: Date;
}

export const LoyaltySchema = SchemaFactory.createForClass(Loyalty);
