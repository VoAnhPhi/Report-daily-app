import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  DailyReportOutboxKind,
  DailyReportScope,
  DailyReportStatus,
  NotificationAction,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/common/services/prisma.service';
import { CronJobLockService } from 'src/common/services/cron-job-lock.service';
import {
  CRON_LOCK_GENERATE,
  CRON_LOCK_OUTBOX,
  CRON_LOCK_PURGE,
  CRON_LOCK_REMIND,
  DAILY_REPORT_ARCHIVE_RETENTION_MONTHS,
  DAILY_REPORT_TIMEZONE,
  dailyReportBoardLink,
  dailyReportMinuteLabel,
} from '../constants/daily-report.constants';
import {
  dayBoundsUtc,
  dayStrInTz,
  isLeaderSummaryDue,
  isReminderWindow,
  minutesOfDayInTz,
  reportDateLabel,
  reportDateValue,
} from '../helpers/report-date.helper';
import { DailyReportGeneratorService } from '../services/daily-report-generator.service';
import { DailyReportOutboxService } from '../services/daily-report-outbox.service';
import { DailyReportScopeService } from '../services/daily-report-scope.service';

/** Nhãn ngày dd/mm/yyyy cho nội dung thông báo tiếng Việt. */
function formatReportDateDmy(reportDate: Date): string {
  const [y, m, d] = reportDateLabel(reportDate).split('-');
  return `${d}/${m}/${y}`;
}

@Injectable()
export class DailyReportCronService {
  private readonly logger = new Logger(DailyReportCronService.name);
  private isGenerating = false;
  private isSweeping = false;
  private isProcessingOutbox = false;
  private isPurging = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: CronJobLockService,
    private readonly generator: DailyReportGeneratorService,
    private readonly scopeService: DailyReportScopeService,
    private readonly outbox: DailyReportOutboxService,
  ) {}

  /** Snapshot nghĩa vụ và sinh report lúc 07:30 giờ Việt Nam. */
  @Cron('0 30 7 * * *', { timeZone: DAILY_REPORT_TIMEZONE })
  async generateDailyReports(): Promise<void> {
    await this.runGeneration('scheduled');
  }

  /** Catch-up và tạo notification event mỗi 5 phút theo lịch từng scope. */
  @Cron('0 */5 * * * *', { timeZone: DAILY_REPORT_TIMEZONE })
  async sweepDailyReportAutomation(): Promise<void> {
    if (this.isSweeping) return;
    const locked = await this.lockService.tryAcquireLockWithCleanup(
      CRON_LOCK_REMIND,
      10 * 60 * 1000,
    );
    if (!locked) return;
    this.isSweeping = true;
    try {
      const now = new Date();
      // Chạy bù vô điều kiện mỗi 5 phút; generator tự chặn trước mốc 07:30 cố
      // định. Hàm idempotent nên chạy thừa không tạo report trùng.
      await this.runGeneration('catch-up');
      let cursor: string | undefined;
      for (;;) {
        const scopes = await this.prisma.dailyReportScope.findMany({
          where: { isEnabled: true, deletedAt: null, archivedAt: null },
          orderBy: { id: 'asc' },
          take: 100,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        if (scopes.length === 0) break;
        for (const scope of scopes) {
          if (!this.generator.isReportingDay(scope, now)) continue;
          try {
            await this.enqueueMemberReminders(scope, now);
            await this.enqueueLeaderSummary(scope, now);
            // Vòng duyệt: đóng cửa sổ đã hết hạn TRƯỚC, rồi mới nhắc — nếu
            // ngược lại thì bản vừa hết hạn vẫn lọt vào bản nhắc của hôm nay.
            await this.markExpiredReviews(scope, now);
            await this.enqueuePendingReviewSummary(scope, now);
          } catch (error) {
            this.logger.error(
              `Daily Report automation scope=${scope.id}: ${String(error)}`,
            );
          }
        }
        cursor = scopes[scopes.length - 1]?.id;
        if (scopes.length < 100) break;
      }
    } finally {
      this.isSweeping = false;
      await this.lockService.releaseLock(CRON_LOCK_REMIND);
    }
  }

  /**
   * Outbox retry: mỗi phút, khóa phân tán chống hai replica gửi cùng event.
   *
   * TTL khóa phải LỚN HƠN nhịp cron. Bản cũ để 55 giây dưới nhịp 60 giây với lô
   * 200 dòng: lô chạy quá 55 giây là khóa hết hạn giữa chừng, nhịp kế tiếp nhặt
   * lại đúng những dòng đang gửi dở. Nay 5 phút, khớp với thời gian giữ chỗ của
   * `claimDue`, và lô hạ xuống 100 để không chạm trần đó.
   */
  @Cron('0 * * * * *')
  async processNotificationOutbox(): Promise<void> {
    if (this.isProcessingOutbox) return;
    const locked = await this.lockService.tryAcquireLockWithCleanup(
      CRON_LOCK_OUTBOX,
      5 * 60 * 1000,
    );
    if (!locked) return;
    this.isProcessingOutbox = true;
    try {
      const result = await this.outbox.processDue(new Date(), 100);
      if (result.sent || result.retried || result.dead) {
        this.logger.log(`Daily Report outbox ${JSON.stringify(result)}`);
      }
    } finally {
      this.isProcessingOutbox = false;
      await this.lockService.releaseLock(CRON_LOCK_OUTBOX);
    }
  }

  /** Xóa nội dung archive đủ 12 tháng lúc 02:30 giờ Việt Nam. */
  @Cron('0 30 2 * * *', { timeZone: DAILY_REPORT_TIMEZONE })
  async purgeExpiredArchives(): Promise<void> {
    if (this.isPurging) return;
    const locked = await this.lockService.tryAcquireLockWithCleanup(
      CRON_LOCK_PURGE,
      30 * 60 * 1000,
    );
    if (!locked) return;
    this.isPurging = true;
    try {
      const threshold = new Date();
      threshold.setUTCMonth(
        threshold.getUTCMonth() - DAILY_REPORT_ARCHIVE_RETENTION_MONTHS,
      );
      const scopes = await this.prisma.dailyReportScope.findMany({
        where: {
          archivedAt: { lte: threshold },
          purgedAt: null,
        },
        orderBy: { archivedAt: 'asc' },
        take: 50,
        select: { id: true },
      });
      for (const scope of scopes) {
        await this.prisma.$transaction(async (tx) => {
          const [reportCount, answerCount] = await Promise.all([
            tx.dailyReport.count({ where: { scopeId: scope.id } }),
            tx.dailyReportAnswer.count({
              where: { report: { scopeId: scope.id } },
            }),
          ]);
          await tx.dailyReportNotificationOutbox.deleteMany({
            where: { scopeId: scope.id },
          });
          await tx.dailyReportScopeArchiveViewer.deleteMany({
            where: { scopeId: scope.id },
          });
          await tx.dailyReport.deleteMany({ where: { scopeId: scope.id } });
          await tx.dailyReportScope.update({
            where: { id: scope.id },
            data: {
              purgedAt: new Date(),
              purgeReportCount: reportCount,
              purgeAnswerCount: answerCount,
            },
          });
        });
      }
      if (scopes.length > 0) {
        this.logger.log(`Purged ${scopes.length} Daily Report archives`);
      }
    } finally {
      this.isPurging = false;
      await this.lockService.releaseLock(CRON_LOCK_PURGE);
    }
  }

  private async runGeneration(reason: string): Promise<void> {
    if (this.isGenerating) return;
    const locked = await this.lockService.tryAcquireLockWithCleanup(
      CRON_LOCK_GENERATE,
      15 * 60 * 1000,
    );
    if (!locked) return;
    this.isGenerating = true;
    try {
      const created = await this.generator.generateForAllScopes(new Date());
      this.logger.log(`Daily Report ${reason}: created ${created}`);
    } catch (error) {
      this.logger.error(`Daily Report generation ${reason}: ${String(error)}`);
    } finally {
      this.isGenerating = false;
      await this.lockService.releaseLock(CRON_LOCK_GENERATE);
    }
  }

  private async enqueueMemberReminders(
    scope: DailyReportScope,
    now: Date,
  ): Promise<void> {
    const minutesNow = minutesOfDayInTz(now, scope.timezone);
    // Reminder tắt tại mốc tổng hợp: nhắc sau đó không còn giúp người nhận kịp
    // vào số liệu gửi trưởng nhóm. Nộp trễ vẫn hợp lệ tới `cutoffMinute`, chỉ
    // là hệ thống không nhắc nữa.
    if (minutesNow >= scope.leaderSummaryMinute) return;
    if (
      !isReminderWindow(
        now,
        scope.timezone,
        scope.cutoffMinute,
        scope.reminderBeforeMinutes,
      )
    )
      return;

    const dayStr = dayStrInTz(now, scope.timezone);
    const scopeName = await this.scopeService.getScopeName(scope);
    const cutoffAt = new Date(
      dayBoundsUtc(dayStr, scope.timezone).start.getTime() +
        scope.leaderSummaryMinute * 60_000,
    );
    const remainingMinutes = Math.max(
      0,
      scope.leaderSummaryMinute - minutesNow,
    );
    let cursor: string | undefined;
    do {
      const pending = await this.prisma.dailyReport.findMany({
        where: {
          scopeId: scope.id,
          reportDate: reportDateValue(dayStr),
          status: {
            in: [DailyReportStatus.DRAFT, DailyReportStatus.REOPENED],
          },
          remindedAt: null,
          deletedAt: null,
        },
        select: { id: true, userId: true },
        orderBy: { id: 'asc' },
        take: 500,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (pending.length === 0) break;
      await this.outbox.enqueueMany(
        pending.map((report) => ({
          idempotencyKey: `daily-report:reminder:${report.id}`,
          kind: DailyReportOutboxKind.MEMBER_REMINDER,
          recipientId: report.userId,
          scopeId: scope.id,
          reportId: report.id,
          expiresAt: cutoffAt,
          deliverEmail: true,
          payload: {
            action: NotificationAction.daily_report_reminder,
            message: `Còn ${remainingMinutes} phút tới mốc tổng hợp gửi trưởng nhóm (${scopeName})`,
            reportId: report.id,
            reportDate: dayStr,
            scopeName,
            emailVariables: {
              remainingTime: `${remainingMinutes} phút`,
              hardStopTime: dailyReportMinuteLabel(scope.cutoffMinute),
              leaderSubmitTime: dailyReportMinuteLabel(
                scope.leaderSummaryMinute,
              ),
            },
          },
        })),
      );
      cursor = pending[pending.length - 1]?.id;
      if (pending.length < 500) break;
    } while (cursor);
  }

  /**
   * Đóng vòng duyệt của những báo cáo hết cửa sổ mà không ai quyết.
   *
   * Ghi HAI chỗ trong một transaction: `DailyReportRevision.reviewExpiredAt` là
   * nguồn sự thật của chính lần nộp đó, `DailyReport.reviewExpiredAt` là bản
   * denormalize để board đếm.
   *
   * ⚠ Cả hai câu ghi đều là COMPARE-AND-SET. Kiểm-rồi-ghi ở đây là để hở đúng
   * khoảng người duyệt đang bấm: báo cáo sẽ vừa có kết luận vừa bị đánh dấu quá
   * hạn, và board nói hai điều mâu thuẫn về cùng một dòng.
   *
   * Chỉ `SUBMITTED`. Bản `REOPENED` đang chờ thành viên sửa, không nằm trong
   * hàng chờ duyệt nên không có gì để hết hạn.
   */
  private async markExpiredReviews(
    scope: DailyReportScope,
    now: Date,
  ): Promise<void> {
    const due = await this.prisma.dailyReport.findMany({
      where: {
        scopeId: scope.id,
        deletedAt: null,
        status: DailyReportStatus.SUBMITTED,
        reviewDecision: null,
        reviewExpiredAt: null,
        reviewDeadlineAt: { lt: now },
      },
      select: { id: true },
      take: 200,
    });

    for (const row of due) {
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.dailyReport.updateMany({
          where: {
            id: row.id,
            status: DailyReportStatus.SUBMITTED,
            reviewDecision: null,
            reviewExpiredAt: null,
          },
          data: { reviewExpiredAt: now },
        });
        // Người duyệt vừa chốt xong giữa lúc quét: bỏ qua, họ thắng.
        if (claimed.count === 0) return;

        const revision = await tx.dailyReportRevision.findFirst({
          where: { reportId: row.id },
          orderBy: { revisionNumber: 'desc' },
          select: { id: true },
        });
        if (!revision) return;
        await tx.dailyReportRevision.updateMany({
          where: { id: revision.id, reviewExpiredAt: null },
          data: { reviewExpiredAt: now },
        });
      });
    }
  }

  /**
   * MỘT bản tổng hợp cho mỗi người duyệt mỗi ngày, gom theo thành viên.
   *
   * Báo cáo cũ chưa ai duyệt không chặn báo cáo ngày mới, nên một người duyệt
   * có thể tồn báo cáo của nhiều ngày cùng lúc. Gửi mỗi báo cáo một thông báo
   * là spam đúng thứ tính năng này sinh ra để tránh.
   *
   * `idempotencyKey` có `runDate` nhưng KHÔNG có `reportDate`:
   *   - thiếu `runDate`  -> chỉ nhắc đúng một lần rồi im, tức để khoá dedupe
   *     quyết định hành vi nghiệp vụ;
   *   - thêm `reportDate` -> quay lại mỗi báo cáo một thông báo.
   *
   * Không dùng `leaderNotifiedAt` để chống trùng: cột đó đang phục vụ cảnh báo
   * thiếu báo cáo, dùng chung là hai cảnh báo chặn lẫn nhau.
   *
   * Nội dung dựng RIÊNG cho từng người nhận: quản lý chính thấy toàn bộ, người
   * duyệt phụ chỉ thấy phần mình phụ trách. Gửi chung một nội dung là để người
   * duyệt phụ đọc được tên và số liệu của thành viên ngoài phần mình.
   */
  private async enqueuePendingReviewSummary(
    scope: DailyReportScope,
    now: Date,
  ): Promise<void> {
    if (!isLeaderSummaryDue(now, scope.timezone, scope.leaderSummaryMinute)) {
      return;
    }

    const today = dayStrInTz(now, scope.timezone);
    const pending = await this.prisma.dailyReport.findMany({
      where: {
        scopeId: scope.id,
        deletedAt: null,
        status: DailyReportStatus.SUBMITTED,
        reviewDecision: null,
        reviewExpiredAt: null,
      },
      select: {
        id: true,
        userId: true,
        reportDate: true,
        lastSubmittedAt: true,
      },
      orderBy: { reportDate: 'asc' },
      take: 500,
    });
    if (pending.length === 0) return;

    /*
     * Ngày nộp KHÔNG nhắc: người duyệt vừa nhận `REPORT_SUBMITTED` vài tiếng
     * trước. Cửa sổ tính cả ngày nộp, nên với N = 3 nộp 08/09 thì chỉ nhắc
     * 09/09 và 10/09; N = 1 thì không có ngày nhắc nào - đó là hệ quả đúng.
     */
    const dueToRemind = pending.filter(
      (report) =>
        !report.lastSubmittedAt ||
        dayStrInTz(report.lastSubmittedAt, scope.timezone) !== today,
    );
    if (dueToRemind.length === 0) return;

    const [managerIds, membersByReviewer] = await Promise.all([
      this.scopeService.getLeaderIds(scope),
      // Luật "ai duyệt ai" chỉ định nghĩa một chỗ: nó suy từ các NHÓM DUYỆT,
      // và cron không tự ghép ba bảng đó lấy một lần nữa.
      this.scopeService.getReviewerMemberMap(scope),
    ]);

    // Quản lý chính không thuộc nhóm duyệt nào - họ phụ trách toàn bộ.
    for (const managerId of managerIds) membersByReviewer.set(managerId, null!);

    const ownerIds = Array.from(
      new Set(dueToRemind.map((report) => report.userId)),
    );
    const owners = await this.prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, fullName: true },
    });
    const nameById = new Map(owners.map((user) => [user.id, user.fullName]));

    const rows: Prisma.DailyReportNotificationOutboxCreateManyInput[] = [];
    for (const [recipientId, memberFilter] of membersByReviewer) {
      const mine = dueToRemind.filter(
        (report) =>
          report.userId !== recipientId &&
          (memberFilter === null || memberFilter.has(report.userId)),
      );
      if (mine.length === 0) continue;

      const byMember = new Map<string, string[]>();
      for (const report of mine) {
        const list = byMember.get(report.userId) ?? [];
        list.push(formatReportDateDmy(report.reportDate));
        byMember.set(report.userId, list);
      }
      const lines = Array.from(byMember.entries()).map(
        ([memberId, days]) =>
          `- ${nameById.get(memberId) ?? 'Thành viên'}: ${days.join(', ')}`,
      );

      rows.push({
        idempotencyKey: `daily-report:pending-review:${scope.id}:${today}:${recipientId}`,
        kind: DailyReportOutboxKind.REVIEWER_PENDING_REVIEW_SUMMARY,
        recipientId,
        scopeId: scope.id,
        payload: {
          action: NotificationAction.daily_report_pending_review,
          message: `Bạn còn ${mine.length} báo cáo chưa duyệt:\n${lines.join('\n')}`,
        },
      });
    }

    if (rows.length > 0) {
      await this.prisma.dailyReportNotificationOutbox.createMany({
        data: rows,
        skipDuplicates: true,
      });
    }
  }

  private async enqueueLeaderSummary(
    scope: DailyReportScope,
    now: Date,
  ): Promise<void> {
    if (!scope.notifyLeaderOnMissing) return;
    if (!isLeaderSummaryDue(now, scope.timezone, scope.leaderSummaryMinute))
      return;
    const dayStr = dayStrInTz(now, scope.timezone);
    const missingWhere = {
      scopeId: scope.id,
      reportDate: reportDateValue(dayStr),
      status: { in: [DailyReportStatus.DRAFT, DailyReportStatus.REOPENED] },
      deletedAt: null,
    } satisfies Prisma.DailyReportWhereInput;
    const [missingCount, missingPreview, total] = await Promise.all([
      this.prisma.dailyReport.count({ where: missingWhere }),
      this.prisma.dailyReport.findMany({
        where: missingWhere,
        select: { id: true, userId: true },
        orderBy: { userId: 'asc' },
        take: 5,
      }),
      this.prisma.dailyReport.count({
        where: { scopeId: scope.id, reportDate: reportDateValue(dayStr) },
      }),
    ]);
    if (missingCount === 0 || missingPreview.length === 0) return;
    const [scopeName, leaderIds, users] = await Promise.all([
      this.scopeService.getScopeName(scope),
      this.scopeService.getLeaderIds(scope),
      this.prisma.user.findMany({
        where: { id: { in: missingPreview.map((row) => row.userId) } },
        select: { id: true, fullName: true },
      }),
    ]);
    const nameById = new Map(users.map((user) => [user.id, user.fullName]));
    const shown = missingPreview
      .map((row) => nameById.get(row.userId))
      .filter((name): name is string => Boolean(name))
      .join(', ');
    const rest =
      missingCount > missingPreview.length
        ? ` và ${missingCount - missingPreview.length} người khác`
        : '';
    const summaryTime = dailyReportMinuteLabel(scope.leaderSummaryMinute);
    // KHÔNG gắn vào bản báo cáo của một thành viên: `getById` chặn người khác
    // đọc bản chưa nộp, nên link kiểu đó luôn trả 403 khi trưởng nhóm bấm vào.
    // Sự kiện này thuộc về cả phạm vi — trỏ thẳng vào bảng theo dõi.
    await this.outbox.enqueueMany(
      leaderIds.map((leaderId) => ({
        idempotencyKey: `daily-report:missing:${scope.id}:${dayStr}:${leaderId}`,
        kind: DailyReportOutboxKind.LEADER_MISSING_SUMMARY,
        recipientId: leaderId,
        scopeId: scope.id,
        reportId: null,
        deliverEmail: true,
        payload: {
          action: NotificationAction.daily_report_missing,
          message: `${missingCount}/${total} thành viên chưa nộp báo cáo tính đến ${summaryTime} (${scopeName}): ${shown}${rest}`,
          scopeId: scope.id,
          reportDate: dayStr,
          scopeName,
          emailVariables: {
            submittedCount: Math.max(0, total - missingCount),
            missingCount,
            totalCount: total,
            hardStopTime: dailyReportMinuteLabel(scope.cutoffMinute),
            leaderSubmitTime: summaryTime,
          },
          linkUrl: dailyReportBoardLink(scope.id, dayStr),
        },
      })),
    );
  }
}
