import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";

@Schema({ timestamps: true })
export class Permission {
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
