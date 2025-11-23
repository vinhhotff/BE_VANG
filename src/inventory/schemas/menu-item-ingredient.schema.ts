import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, HydratedDocument, Types } from 'mongoose';

export type MenuItemIngredientDocument = HydratedDocument<MenuItemIngredient>;

@Schema({ timestamps: true })
export class MenuItemIngredient {
  @Prop({ type: Types.ObjectId, ref: 'MenuItem', required: true })
  menuItem: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Ingredient', required: true })
  ingredient: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  quantity: number; // Quantity of ingredient needed for this menu item

  @Prop({ type: String, required: false })
  unit?: string; // Unit override if different from ingredient's default unit

  @Prop({ type: Object })
  createdBy?: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  @Prop({ type: Object })
  updatedBy?: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  // Timestamps are automatically handled by Mongoose when timestamps: true
  createdAt: Date;
  updatedAt: Date;
}

export const MenuItemIngredientSchema = SchemaFactory.createForClass(MenuItemIngredient);

// Create compound index to ensure unique menuItem-ingredient pairs
MenuItemIngredientSchema.index({ menuItem: 1, ingredient: 1 }, { unique: true });

