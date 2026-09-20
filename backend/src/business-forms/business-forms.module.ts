import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ActivityLogModule } from 'src/activity-logs/activity-log.module';
import { PrismaService } from 'src/common/services/prisma.service';
import { MailModule } from 'src/mail/mail.module';
import { NotificationModule } from 'src/notifications/notification.module';
import { ReviewGatingConfigModule } from 'src/admin/review-gating-config/review-gating-config.module';
import {
  BUSINESS_FORM_NOTIFICATION_QUEUE,
  BUSINESS_FORM_REMINDER_QUEUE,
} from './business-forms.constants';
import { AdminBusinessFormsController } from './controllers/admin-business-forms.controller';
import { AdminBusinessFormTasksController } from './controllers/admin-business-form-tasks.controller';
import { BusinessFormTasksController } from './controllers/business-form-tasks.controller';
import { BusinessFormsController } from './controllers/business-forms.controller';
import { TaskAssignGroupsController } from './controllers/task-assign-groups.controller';
import { AdminTaskAssignGroupsController } from './controllers/admin-task-assign-groups.controller';
import { BusinessFormNotificationsService } from './services/business-form-notifications.service';
import { BusinessFormRemindersService } from './services/business-form-reminders.service';
import { BusinessFormTasksService } from './services/business-form-tasks.service';
import { TaskAssignGroupService } from './services/task-assign-group.service';
import { BusinessFormsAdminService } from './services/business-forms-admin.service';
import { BusinessFormsService } from './services/business-forms.service';
import { BusinessFormTasksGateway } from './gateways/business-form-tasks.gateway';

function buildRedisConnection(configService: ConfigService) {
  const redisUrl = configService.get<string>('redis.redisUrl');
  if (!redisUrl) {
    throw new Error('REDIS_URL is not configured');
  }
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: parseInt(url.port, 10) || 6379,
    password: url.password || undefined,
    username: url.username && url.username !== 'default' ? url.username : undefined,
  };
}

@Module({
  imports: [
    ActivityLogModule,
    MailModule,
    NotificationModule,
    ReviewGatingConfigModule,
    BullModule.registerQueueAsync(
      {
        name: BUSINESS_FORM_REMINDER_QUEUE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          connection: buildRedisConnection(configService),
        }),
        inject: [ConfigService],
      },
      {
        name: BUSINESS_FORM_NOTIFICATION_QUEUE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          connection: buildRedisConnection(configService),
        }),
        inject: [ConfigService],
      },
    ),
  ],
  controllers: [
    BusinessFormsController,
    AdminBusinessFormsController,
    BusinessFormTasksController,
    AdminBusinessFormTasksController,
    TaskAssignGroupsController,
    AdminTaskAssignGroupsController,
  ],
  providers: [
    PrismaService,
    BusinessFormsService,
    BusinessFormsAdminService,
    BusinessFormNotificationsService,
    BusinessFormRemindersService,
    BusinessFormTasksService,
    TaskAssignGroupService,
    BusinessFormTasksGateway,
  ],
  exports: [BusinessFormsService, BusinessFormTasksService],
})
export class BusinessFormsModule {}
