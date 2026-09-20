import { Module } from '@nestjs/common';

import { PrismaService } from '../../common/services/prisma.service';
import { ReviewGatingConfigController } from './review-gating-config.controller';
import { ReviewGatingConfigService } from './review-gating-config.service';

@Module({
  controllers: [ReviewGatingConfigController],
  providers: [ReviewGatingConfigService, PrismaService],
  exports: [ReviewGatingConfigService],
})
export class ReviewGatingConfigModule {}
