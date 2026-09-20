import { Module } from '@nestjs/common';
import { CacheConfigService } from '../common/services/cache-config.service';
import { PrismaService } from '../common/services/prisma.service';
import { ActivityLogService } from './activity-log.service';
import { ActivityLogsGateway } from './activity-logs.gateway';

@Module({
  imports: [CacheConfigService.register()],
  providers: [PrismaService, ActivityLogService, ActivityLogsGateway],
  exports: [ActivityLogService, ActivityLogsGateway],
})
export class ActivityLogModule {}
