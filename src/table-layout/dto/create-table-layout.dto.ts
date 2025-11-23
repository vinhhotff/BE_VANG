import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TablePositionDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsNumber()
  @IsOptional()
  rotation?: number;
}

export class TableLayoutTableDto {
  @IsString()
  tableId: string;

  @IsString()
  tableName: string;

  @ValidateNested()
  @Type(() => TablePositionDto)
  position: TablePositionDto;

  @IsNumber()
  @IsOptional()
  width?: number;

  @IsNumber()
  @IsOptional()
  height?: number;

  @IsString()
  @IsOptional()
  zoneName?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsNumber()
  @IsOptional()
  capacity?: number;
}

export class TableLayoutZoneBoundsDto {
  @IsNumber()
  x1: number;

  @IsNumber()
  y1: number;

  @IsNumber()
  x2: number;

  @IsNumber()
  y2: number;
}

export class TableLayoutZoneDto {
  @IsString()
  zoneId: string;

  @IsString()
  zoneName: string;

  @ValidateNested()
  @Type(() => TableLayoutZoneBoundsDto)
  bounds: TableLayoutZoneBoundsDto;
}

export class CreateTableLayoutDto {
  @IsString()
  name: string;

  @IsNumber()
  gridCols: number;

  @IsNumber()
  gridRows: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TableLayoutZoneDto)
  @IsOptional()
  zones?: TableLayoutZoneDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TableLayoutTableDto)
  tables: TableLayoutTableDto[];

  @IsString()
  @IsOptional()
  backgroundImage?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateTableLayoutDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  gridCols?: number;

  @IsNumber()
  @IsOptional()
  gridRows?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TableLayoutZoneDto)
  @IsOptional()
  zones?: TableLayoutZoneDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TableLayoutTableDto)
  @IsOptional()
  tables?: TableLayoutTableDto[];

  @IsString()
  @IsOptional()
  backgroundImage?: string;

  @IsString()
  @IsOptional()
  description?: string;
}


