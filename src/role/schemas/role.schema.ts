import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';

export type RoleDocument = HydratedDocument<Role>;

@Schema({ timestamps: true })
export class Role {
  @Prop({ required: true, unique: true })
  name: string; // ví dụ: 'admin', 'staff', 'guest'

  @Prop({ type: [Types.ObjectId], ref: 'Permission', default: [] })
  permissions?: Types.ObjectId[]; // danh sách quyền

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

  // Timestamps tự động được Mongoose thêm khi có { timestamps: true }
  createdAt: Date;
  updatedAt: Date;

  // Soft delete fields (do plugin thêm)
  isDeleted?: boolean;
  deletedAt?: Date;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
RoleSchema.plugin(softDeletePlugin);

export enum DefaultRole {
  SuperAdmin = 'super-admin',
  Admin = 'admin',
  User = 'user',
}
