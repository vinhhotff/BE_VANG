import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type TableLayoutDocument = HydratedDocument<TableLayout>;

export class TablePosition {
  @Prop({ required: true, type: Number })
  x: number;

  @Prop({ required: true, type: Number })
  y: number;

  @Prop({ type: Number, default: 0 })
  rotation?: number;
}

export class TableLayoutTable {
  @Prop({ required: true })
  tableId: string;

  @Prop({ required: true })
  tableName: string;

  @Prop({ required: true, type: Object })
  position: TablePosition;

  @Prop({ type: Number, default: 1 })
  width?: number;

  @Prop({ type: Number, default: 1 })
  height?: number;

  @Prop({ type: String })
  zoneName?: string;

  @Prop({ type: String })
  type?: string;

  @Prop({ type: Number })
  capacity?: number;
}

export class TableLayoutZoneBounds {
  @Prop({ required: true, type: Number })
  x1: number;

  @Prop({ required: true, type: Number })
  y1: number;

  @Prop({ required: true, type: Number })
  x2: number;

  @Prop({ required: true, type: Number })
  y2: number;
}

export class TableLayoutZone {
  @Prop({ required: true })
  zoneId: string;

  @Prop({ required: true })
  zoneName: string;

  @Prop({ required: true, type: Object })
  bounds: TableLayoutZoneBounds;
}

@Schema({ timestamps: true })
export class TableLayout extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, type: Number, default: 12 })
  gridCols: number;

  @Prop({ required: true, type: Number, default: 12 })
  gridRows: number;

  @Prop({ type: Boolean, default: false })
  isActive?: boolean;

  @Prop({ type: [Object], default: [] })
  zones?: TableLayoutZone[];

  @Prop({ required: true, type: [Object] })
  tables: TableLayoutTable[];

  @Prop({ type: String })
  backgroundImage?: string;

  @Prop({ type: String })
  description?: string;
}

export const TableLayoutSchema = SchemaFactory.createForClass(TableLayout);


