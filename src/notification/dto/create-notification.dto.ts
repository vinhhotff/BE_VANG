import { IsString, IsEnum, IsOptional, IsObject, IsBoolean, IsDateString } from 'class-validator';
import { NotificationType, NotificationPriority } from '../schemas/notification.schema';

export class CreateNotificationDto {
  @IsString()
  @IsOptional()
  user?: string;

  @IsString()
  @IsOptional()
  guestId?: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @IsString()
  @IsOptional()
  actionUrl?: string;
}

export class UpdateNotificationDto {
  @IsBoolean()
  @IsOptional()
  read?: boolean;

  @IsDateString()
  @IsOptional()
  readAt?: Date;
}

