import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';

export type RoleDocument = HydratedDocument<Role>;

@Schema({ timestamps: true })
export class Role extends mongoose.Document {
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
    _id: Types.ObjectId;
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
RoleSchema.plugin(softDeletePlugin);
