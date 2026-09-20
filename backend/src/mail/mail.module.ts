import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { EmailModule } from './email.module';
import { MAIL_NOTIFICATIONS_QUEUE } from './queue/mail-notifications.constants';
import { MailNotificationsPublisher } from './queue/mail-notifications.publisher';
import { MailNotificationsProcessor } from './queue/mail-notifications.processor';
import { PrismaService } from '../common/services/prisma.service';
import { backgroundProviders } from '../common/utils/background-role.util';
import { WalletResetPreviewService } from '../admin/wallet-reset-preview/wallet-reset-preview.service';

@Module({
  imports: [
    EmailModule,
    BullModule.registerQueueAsync({
      name: MAIL_NOTIFICATIONS_QUEUE,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('redis.redisUrl');
        if (!redisUrl) {
          throw new Error('REDIS_URL is not configured');
        }
        const url = new URL(redisUrl);
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port, 10) || 6379,
            password: url.password || undefined,
            username:
              url.username && url.username !== 'default'
                ? url.username
                : undefined,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    MailService,
    MailNotificationsPublisher,
    // P97 (WORKER-02/SPLIT-05): gate the @Processor consumer — web enqueues via the
    // publisher; only worker/mono instantiate the WorkerHost.
    ...backgroundProviders([MailNotificationsProcessor]),
    PrismaService,
    // Chiến dịch cảnh báo reset ví: job khởi động chạy truy vấn cohort ngay trong processor.
    // ⚠ Khai THẲNG provider thay vì `imports: [WalletResetPreviewModule]` — module đó đã import
    // `MailModule`, nên import ngược lại là vòng tròn. Service này không giữ trạng thái, khai ở
    // hai nơi là vô hại.
    WalletResetPreviewService,
  ],
  // ⚠ `BullModule` PHẢI được export, không chỉ import. `registerQueueAsync` tạo provider
  // `BullQueue_mail-notifications` trong phạm vi module NÀY; module khác import `MailModule` mà
  // không có dòng export này sẽ không thấy token đó và Nest sập lúc khởi động với
  // "can't resolve dependencies … BullQueue_mail-notifications". `tsc` KHÔNG bắt được lỗi này —
  // nó chỉ lộ ra khi dựng cây phụ thuộc thật (xem `yarn test:di`).
  exports: [MailService, EmailModule, MailNotificationsPublisher, BullModule],
})
export class MailModule {}
