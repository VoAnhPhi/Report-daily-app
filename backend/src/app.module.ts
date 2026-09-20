import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClsModule } from 'nestjs-cls';
import { ActivityLogModule } from 'src/activity-logs/activity-log.module';
import appConfig from 'src/common/configs/index.config';
import databaseConfig from 'src/common/configs/database.config';
import redisConfig from 'src/common/configs/redis.config';
import resendConfig from 'src/common/configs/resend.config';
import { CacheHelperModule } from 'src/common/cache/cache.module';
import { CacheConfigService } from 'src/common/services/cache-config.service';
import { BusinessFormsModule } from 'src/business-forms/business-forms.module';
import { DailyReportsModule } from 'src/daily-reports/daily-reports.module';
import { FeatureAuthModule } from 'src/auth/feature-auth.module';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { SimpleAuthModule } from 'src/auth/simple-auth.module';
import { MailModule } from 'src/mail/mail.module';
import { NotificationModule } from 'src/notifications/notification.module';
import { ReviewGatingConfigModule } from 'src/admin/review-gating-config/review-gating-config.module';

function redisConnection(config: ConfigService) {
  const value = config.get<string>('redis.redisUrl') || 'redis://localhost:6379';
  const url = new URL(value);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
    username: url.username && url.username !== 'default' ? url.username : undefined,
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, resendConfig],
    }),
    CacheConfigService.register(),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: false },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: redisConnection(config),
      }),
    }),
    FeatureAuthModule,
    SimpleAuthModule,
    CacheHelperModule,
    ActivityLogModule,
    NotificationModule,
    MailModule,
    ReviewGatingConfigModule,
    BusinessFormsModule,
    DailyReportsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
