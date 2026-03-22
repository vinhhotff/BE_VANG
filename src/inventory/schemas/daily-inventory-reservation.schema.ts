import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types, HydratedDocument } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';

export type DailyInventoryReservationDocument = HydratedDocument<DailyInventoryReservation>;

@Schema({ timestamps: true })
export class DailyInventoryReservation {
  @Prop({ type: Types.ObjectId, ref: 'MenuItem', required: true })
  menuItem: Types.ObjectId;

  @Prop({ required: true })
  date: Date; // The usage date (D-Day) - stored as date only (no time)

  @Prop({ type: Number, default: 0 })
  totalReserved: number; // Total quantity reserved for this day

  @Prop({ type: Number })
  dailyLimit: number; // Daily limit for this item

  @Prop({ type: Number, default: 0 })
  confirmedCount: number; // Confirmed reservations (paid)

  @Prop({ type: Number, default: 0 })
  pendingCount: number; // Pending reservations (not yet paid)

  @Prop({ type: [String], default: [] })
  orderIds: string[]; // Track which orders have reserved this inventory for audit trail

  // Soft delete
  isDeleted?: boolean;
  deletedAt?: Date;
}

export const DailyInventoryReservationSchema = SchemaFactory.createForClass(DailyInventoryReservation);

// Compound index for efficient queries
DailyInventoryReservationSchema.index({ menuItem: 1, date: 1 }, { unique: true });
// Index for orderId tracking queries
DailyInventoryReservationSchema.index({ orderIds: 1 });
DailyInventoryReservationSchema.plugin(softDeletePlugin);
