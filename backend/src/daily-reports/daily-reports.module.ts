import { Module } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { CronJobLockService } from 'src/common/services/cron-job-lock.service';
import { NotificationModule } from 'src/notifications/notification.module';
import { CacheHelperModule } from 'src/common/cache/cache.module';
import { MailModule } from 'src/mail/mail.module';
import { backgroundProviders } from 'src/common/utils/background-role.util';
import { DailyReportsController } from './controllers/daily-reports.controller';
import { DailyReportScopesController } from './controllers/daily-report-scopes.controller';
import { DailyReportTemplatesController } from './controllers/daily-report-templates.controller';
import { DailyReportHelpRequestsController } from './controllers/daily-report-help-requests.controller';
import { DailyReportsService } from './services/daily-reports.service';
import { DailyReportScopeService } from './services/daily-report-scope.service';
import { DailyReportReviewGroupsService } from './services/daily-report-review-groups.service';
import { DailyReportGeneratorService } from './services/daily-report-generator.service';
import { DailyReportDraftService } from './services/daily-report-draft.service';
import { DailyReportOutboxService } from './services/daily-report-outbox.service';
import { DailyReportHelpRequestsService } from './services/daily-report-help-requests.service';
import { DailyReportTemplatesService } from './services/daily-report-templates.service';
import { DailyReportCronService } from './crons/daily-report.cron';
import { DailyReportEmailTemplatesController } from './controllers/daily-report-email-templates.controller';
import { DailyReportEmailTemplateService } from './services/daily-report-email-template.service';
import { DailyReportKpisService } from './services/daily-report-kpis.service';

/**
 * Báo cáo công việc hằng ngày — docs/features/task-management/.
 *
 * Cron chỉ mount dưới worker/mono qua backgroundProviders (P97): web trả []
 * nên không có scheduler nào chạy ở tier web; ScheduleModule.forRoot() nằm ở
 * WorkerBackgroundModule.
 */
@Module({
  imports: [NotificationModule, CacheHelperModule, MailModule],
  controllers: [
    DailyReportsController,
    DailyReportScopesController,
    DailyReportTemplatesController,
    DailyReportHelpRequestsController,
    DailyReportEmailTemplatesController,
  ],
  providers: [
    PrismaService,
    DailyReportsService,
    DailyReportScopeService,
    DailyReportReviewGroupsService,
    DailyReportGeneratorService,
    DailyReportDraftService,
    DailyReportOutboxService,
    DailyReportHelpRequestsService,
    DailyReportTemplatesService,
    DailyReportEmailTemplateService,
    DailyReportKpisService,
    ...backgroundProviders([CronJobLockService, DailyReportCronService]),
  ],
  exports: [DailyReportsService, DailyReportScopeService],
})
export class DailyReportsModule {}
