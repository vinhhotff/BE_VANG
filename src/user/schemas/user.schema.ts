import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { Role } from 'src/role/schemas/role.schema';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
    _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ unique: true, sparse: true })
  email: string;

  @Prop()
  password: string;

  @Prop({ type: Types.ObjectId, ref: 'role' })
  role: Role;

  @Prop({ default: true })
  isMember: boolean;

  @Prop()
  phone?: string;

  @Prop({
    type: [{ type: mongoose.Types.ObjectId, ref: 'transaction' }],
    default: [],
  })
  transactions: mongoose.Types.ObjectId[];
  @Prop({ type: Object })
  createdBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  @Prop({ type: Object })
  updatedBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  @Prop({ type: Object })
  deletedBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };
  @Prop()
  createdAt: Date;
  @Prop()
  updateAt: string;
  @Prop()
  isDelete: boolean;

  @Prop()
  deleteAt: Date;
  @Prop()
  refreshToken?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
