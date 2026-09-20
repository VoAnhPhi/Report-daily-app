import { Module } from '@nestjs/common';
import { CacheHelperModule } from '../common/cache/cache.module';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationHelperService } from './notification-helper.service';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationQueueController } from './notification-queue.controller';
import { PrismaService } from '../common/services/prisma.service';
import { BackgroundJobService } from '../common/services/background-job.service';
import { LoopRegistryService } from '../common/services/loop-registry.service';

@Module({
  imports: [CacheHelperModule],
  controllers: [NotificationController, NotificationQueueController],
  providers: [
    NotificationService,
    NotificationHelperService,
    NotificationQueueService,
    PrismaService,
    BackgroundJobService,
    LoopRegistryService,
  ],
  exports: [
    NotificationService,
    NotificationHelperService,
    NotificationQueueService,
  ],
})
export class NotificationModule {}
