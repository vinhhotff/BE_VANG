import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';

export type PermissionDocument = HydratedDocument<Permission>;

@Schema({ timestamps: true })
export class Permission extends mongoose.Document {
  @Prop({ required: true, unique: true }) // VD: 'order:create'
  name: string;

  @Prop()
  description?: string; // VD: "Tạo đơn hàng"

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

export const PermissionSchema = SchemaFactory.createForClass(Permission);
PermissionSchema.plugin(softDeletePlugin);
