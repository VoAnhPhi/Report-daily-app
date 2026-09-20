import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { NotificationQueueService } from './notification-queue.service';

@Controller('notification-queue')
@UseGuards(RolesGuard)
export class NotificationQueueController {
  constructor(
    private readonly notificationQueueService: NotificationQueueService,
  ) {}

  @Get('stats')
  @Roles(Role.ADMIN)
  async getQueueStats() {
    return this.notificationQueueService.getQueueStats();
  }

  @Post('clear')
  @Roles(Role.ADMIN)
  async clearQueue() {
    return this.notificationQueueService.clearQueue();
  }

  @Post('retry/:itemId')
  @Roles(Role.ADMIN)
  async retryItem(@Param('itemId') itemId: string) {
    return this.notificationQueueService.retryItem(itemId);
  }
}
