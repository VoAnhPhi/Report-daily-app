import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CacheTTLms,
  CacheTags,
  InvalidateTags,
} from '../common/cache/cache.decorators';
import {
  CreateNotificationDto,
  NotificationService,
  UpdateNotificationDto,
} from './notification.service';

interface AuthRequest {
  user: { id: string };
}

interface OptionalAuthRequest {
  user?: { id: string };
}

@UseGuards(JwtAuthGuard)
@Controller('notifications')
@Throttle({ default: { limit: 200, ttl: 60_000 } }) // 200 req / 60s
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @CacheTTLms(30_000) // 30 seconds - notifications need to be relatively fresh
  @CacheTags('notification:list')
  async getNotifications(
    @Query() query: Record<string, string>,
    @Request() req: AuthRequest,
  ) {
    const userId = req.user.id;
    return this.notificationService.getNotifications({
      ...query,
      userId,
    });
  }

  @Get('stats')
  @CacheTTLms(30_000) // 30 seconds - stats update frequently
  @CacheTags('notification:stats')
  async getNotificationStats(@Request() req: AuthRequest) {
    const userId = req.user.id;
    return this.notificationService.getNotificationStats(userId);
  }

  @Get('all-data')
  @CacheTTLms(30_000) // 30 seconds - all data needs freshness
  @CacheTags('notification:all')
  async getAllNotificationData(
    @Request() req: AuthRequest,
    @Query() query: { limit?: string; cursor?: string },
  ) {
    const userId = req.user.id;
    const { limit, cursor } = query;
    return this.notificationService.getAllNotificationData(userId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      cursor,
    });
  }

  @Put('mark-read')
  @InvalidateTags('notification:list', 'notification:stats', 'notification:unread')
  async markNotificationsAsRead(
    @Request() req: OptionalAuthRequest,
    @Body() body: { ids: string[] },
  ) {
    if (!req.user?.id) {
      throw new Error('User ID not found in request');
    }

    try {
      const result = await this.notificationService.markNotificationsAsRead(
        body.ids,
      );
      return result;
    } catch (error) {
      throw new Error(`Failed to mark notifications as read: ${error.message}`);
    }
  }

  @Put('mark-seen')
  @InvalidateTags('notification:list', 'notification:stats', 'notification:unread')
  async markAsSeen(@Request() req: OptionalAuthRequest) {
    if (!req.user?.id) {
      throw new Error('User ID not found in request');
    }

    try {
      const userId = req.user.id;
      const result = await this.notificationService.markAsSeen(userId);
      return result;
    } catch (error) {
      throw new Error(`Failed to mark notifications as seen: ${error.message}`);
    }
  }

  @Get('unread-count')
  @CacheTTLms(30_000) // 30 seconds - unread count needs freshness
  @CacheTags('notification:unread')
  async getUnreadCount(@Request() req: AuthRequest) {
    const userId = req.user.id;
    const count = await this.notificationService.getUnreadCount(userId);
    return { unreadCount: count };
  }

  @Get(':id')
  @CacheTTLms(60_000) // 1 minute - individual notifications
  @CacheTags('notification:detail')
  async getNotificationById(@Param('id') id: string) {
    return this.notificationService.getNotificationById(id);
  }

  @Post()
  @InvalidateTags('notification:list', 'notification:stats', 'notification:unread')
  async createNotification(@Body() data: CreateNotificationDto) {
    return this.notificationService.createNotification(data);
  }

  @Put('mark-all-read')
  @InvalidateTags('notification:list', 'notification:stats', 'notification:unread')
  async markAllAsRead(@Request() req: OptionalAuthRequest) {
    if (!req.user?.id) {
      throw new Error('User ID not found in request');
    }

    try {
      const userId = req.user.id;
      const result = await this.notificationService.markAllAsRead(userId);
      return result;
    } catch (error) {
      throw new Error(
        `Failed to mark all notifications as read: ${error.message}`,
      );
    }
  }

  @Put(':id/read')
  @InvalidateTags('notification:list', 'notification:stats', 'notification:detail')
  async markAsRead(@Param('id') id: string) {
    try {
      return await this.notificationService.markAsRead(id);
    } catch (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  @Put(':id')
  @InvalidateTags('notification:detail', 'notification:list')
  async updateNotification(
    @Param('id') id: string,
    @Body() data: UpdateNotificationDto,
  ) {
    try {
      return await this.notificationService.updateNotification(id, data);
    } catch (error) {
      throw new Error(`Failed to update notification: ${error.message}`);
    }
  }

  @Delete(':id')
  @InvalidateTags('notification:list', 'notification:stats', 'notification:unread')
  async deleteNotification(@Param('id') id: string) {
    return this.notificationService.deleteNotification(id);
  }
}
