import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum TableType {
  SMALL = 'small',      // 2-4 người
  MEDIUM = 'medium',    // 4-6 người
  LARGE = 'large',      // 6-8 người
  VIP = 'vip',          // VIP room
  BAR = 'bar',          // Bar counter
}

export class TablePosition {
  @IsNumber()
  x: number; // Position X in grid (0-based)

  @IsNumber()
  y: number; // Position Y in grid (0-based)

  @IsNumber()
  @IsOptional()
  rotation?: number; // Rotation in degrees (0, 90, 180, 270)
}

export class TableLayoutItem {
  @IsString()
  tableId: string; // Reference to Table._id

  @IsString()
  tableName: string;

  @ValidateNested()
  @Type(() => TablePosition)
  position: TablePosition;

  @IsEnum(TableType)
  @IsOptional()
  type?: TableType;

  @IsNumber()
  @IsOptional()
  capacity?: number; // Max number of guests
}

export class RestaurantLayout {
  @IsString()
  name: string; // Layout name (e.g., "Main Floor", "VIP Area")

  @IsNumber()
  gridCols: number; // Number of columns in grid (default: 12)

  @IsNumber()
  gridRows: number; // Number of rows in grid (default: 12)

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TableLayoutItem)
  tables: TableLayoutItem[];

  @IsString()
  @IsOptional()
  backgroundImage?: string; // URL to floor plan image

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateTableLayoutDto {
  @IsString()
  restaurantId: string;

  @ValidateNested()
  @Type(() => RestaurantLayout)
  layout: RestaurantLayout;
}

