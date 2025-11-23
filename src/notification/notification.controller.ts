import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Delete,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { UpdateNotificationDto } from './dto/create-notification.dto';
import { User, Public } from '../auth/decoration/setMetadata';
import { IUser } from '../user/user.interface';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async findAll(
    @User() user: IUser,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('unreadOnly') unreadOnly: string = 'false',
    @Query('guestId') guestId?: string,
  ) {
    const userId = user?._id?.toString();
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const unreadOnlyBool = unreadOnly === 'true';

    return this.notificationService.findAll(
      userId,
      guestId,
      pageNum,
      limitNum,
      unreadOnlyBool,
    );
  }

  @Get('unread-count')
  async getUnreadCount(
    @User() user: IUser,
    @Query('guestId') guestId?: string,
  ) {
    const userId = user?._id?.toString();
    const count = await this.notificationService.getUnreadCount(userId, guestId);
    return { count };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.notificationService.findOne(id);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Patch('mark-all-read')
  async markAllAsRead(
    @User() user: IUser,
    @Query('guestId') guestId?: string,
  ) {
    const userId = user?._id?.toString();
    await this.notificationService.markAllAsRead(userId, guestId);
    return { message: 'All notifications marked as read' };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.notificationService.delete(id);
    return { message: 'Notification deleted' };
  }
}

