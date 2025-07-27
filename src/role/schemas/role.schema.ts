// role.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type RoleDocument = Role & Document;

@Schema({ timestamps: true })
export class Role {
  @Prop({ required: true, unique: true })
  name: string; // ví dụ: 'admin', 'staff', 'guest'

  @Prop({ type: [Types.ObjectId], ref: 'Permission', default: [] })
  permissions: Types.ObjectId[]; // danh sách quyền

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
}

export const RoleSchema = SchemaFactory.createForClass(Role);
