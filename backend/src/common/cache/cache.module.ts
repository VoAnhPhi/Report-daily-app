import { Module, Global } from '@nestjs/common';
import { AppCacheService } from './cache.service';
import { InflightRequestsService } from './inflight-requests.service';
import { CacheHealthService } from './cache-health.service';
import { CacheValidationController } from './cache-validation.controller';
import { PrismaService } from '../services/prisma.service';
import { CacheInvalidationService } from '../services/cache-invalidation.service';
import { RequestContextService } from '../services/request-context.service';
import { TenantContextResolver } from '../services/tenant-context.resolver';
import { TenantCronContextService } from '../services/tenant-cron-context.service';

@Global()
@Module({
  controllers: [CacheValidationController],
  providers: [
    AppCacheService,
    InflightRequestsService,
    CacheHealthService,
    CacheInvalidationService,
    PrismaService,
    RequestContextService,
    TenantContextResolver,
    // Phase 98 (D-98-3): the cron/worker tenant-context helper. Registered +
    // exported from the SAME @Global module that already owns RequestContextService
    // (its only dependency) so salary/cron modules can inject it with no extra
    // import. It is a thin delegate over RequestContextService.run() — NOT a second
    // CLS — so it belongs beside the primitive it wraps.
    TenantCronContextService,
  ],
  exports: [
    AppCacheService,
    InflightRequestsService,
    CacheHealthService,
    CacheInvalidationService,
    RequestContextService,
    TenantContextResolver,
    TenantCronContextService,
  ],
})
export class CacheHelperModule {}
