import { Injectable, Logger } from '@nestjs/common';
import {
  DailyReportDeliveryChannel,
  DailyReportEmailTemplateKey,
  DailyReportOutboxKind,
  DailyReportOutboxStatus,
  NotificationAction,
  NotificationScope,
  Prisma,
  RelatedModel,
} from '@prisma/client';
import { PrismaService } from 'src/common/services/prisma.service';
import { NotificationService } from 'src/notifications/notification.service';
import {
  dailyReportBoardLink,
  dailyReportLink,
} from '../constants/daily-report.constants';
import { reportDateValue } from '../helpers/report-date.helper';
import { MailService } from 'src/mail/mail.service';
import { DailyReportEmailTemplateService } from './daily-report-email-template.service';

export interface DailyReportOutboxPayload {
  action: NotificationAction;
  message: string;
  /** Bản báo cáo được nhắc tới. Rỗng với sự kiện cấp phạm vi (leader summary). */
  reportId?: string | null;
  /** Phạm vi liên quan — dùng làm `relatedModelId` khi không có `reportId`. */
  scopeId?: string | null;
  /** Nhãn ngày báo cáo `YYYY-MM-DD` — cần cho sự kiện cấp phạm vi. */
  reportDate?: string;
  /** Link sâu tự chọn. Bỏ trống thì suy ra từ `reportId`. */
  linkUrl?: string;
  scopeName?: string;
  emailVariables?: Record<string, string | number>;
}

export interface EnqueueDailyReportNotification {
  idempotencyKey: string;
  kind: DailyReportOutboxKind;
  recipientId: string;
  actorId?: string | null;
  scopeId?: string | null;
  reportId?: string | null;
  payload: DailyReportOutboxPayload;
  expiresAt?: Date | null;
  deliverEmail?: boolean;
}

/** Dòng outbox nguyên vẹn — kiểu suy từ Prisma, không tự khai lại. */
type OutboxRow = Prisma.DailyReportNotificationOutboxGetPayload<object>;

const MEMBER_RETRY_MINUTES = [1, 5, 15, 30];
const DEFAULT_RETRY_MINUTES = [1, 5, 15, 30, 60];

/**
 * Thời gian giữ chỗ một lô sau khi claim. Phải LỚN HƠN nhịp cron (60 giây) để
 * lô chạy chậm không bị nhịp kế tiếp nhặt lại và gửi trùng.
 */
const CLAIM_LEASE_MS = 5 * 60 * 1000;

@Injectable()
export class DailyReportOutboxService {
  private readonly logger = new Logger(DailyReportOutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly mail: MailService,
    private readonly emailTemplates: DailyReportEmailTemplateService,
  ) {}

  async enqueueMany(items: EnqueueDailyReportNotification[]): Promise<number> {
    if (items.length === 0) return 0;
    const inAppRows = items.map((item) => ({
      idempotencyKey: item.idempotencyKey,
      kind: item.kind,
      channel: DailyReportDeliveryChannel.IN_APP,
      recipientId: item.recipientId,
      actorId: item.actorId ?? null,
      scopeId: item.scopeId ?? null,
      reportId: item.reportId ?? null,
      payload: item.payload as unknown as Prisma.InputJsonValue,
      expiresAt: item.expiresAt ?? null,
    }));
    const emailItems = items
      .map((item, index) => ({ item, inAppRow: inAppRows[index] }))
      .filter(({ item }) => item.deliverEmail);
    const userIds = Array.from(
      new Set(emailItems.map(({ item }) => item.recipientId)),
    );
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, fullName: true },
          })
        : [];
    const userById = new Map(users.map((user) => [user.id, user]));
    const emailRows = await Promise.all(
      emailItems.map(async ({ item, inAppRow }) => {
        const user = userById.get(item.recipientId);
        const payload = item.payload;
        const templateKey = this.emailTemplateKeyFor(item.kind);
        const linkUrl =
          payload.linkUrl ??
          (payload.reportId
            ? dailyReportLink(payload.reportId)
            : dailyReportBoardLink(
                payload.scopeId ?? item.scopeId ?? '',
                payload.reportDate,
              ));
        if (!user?.email || !templateKey) {
          return {
            ...inAppRow,
            idempotencyKey: `${item.idempotencyKey}:email`,
            channel: DailyReportDeliveryChannel.EMAIL,
            status: DailyReportOutboxStatus.DEAD,
            lastError: !user?.email
              ? 'Recipient has no email'
              : 'Event kind has no email template',
          };
        }
        try {
          const rendered = await this.emailTemplates.renderPublished(
            templateKey,
            {
              recipientName: user.fullName,
              scopeName: payload.scopeName ?? '',
              reportDate: payload.reportDate ?? '',
              actionUrl: linkUrl,
              ...(payload.emailVariables ?? {}),
            },
          );
          return {
            ...inAppRow,
            idempotencyKey: `${item.idempotencyKey}:email`,
            channel: DailyReportDeliveryChannel.EMAIL,
            emailTo: user.email,
            emailSubject: rendered.subject,
            emailHtml: rendered.html,
            templateVersionId: rendered.templateVersionId,
          };
        } catch (error) {
          return {
            ...inAppRow,
            idempotencyKey: `${item.idempotencyKey}:email`,
            channel: DailyReportDeliveryChannel.EMAIL,
            status: DailyReportOutboxStatus.DEAD,
            lastError: `Email render failed: ${String(error)}`,
          };
        }
      }),
    );
    const result = await this.prisma.dailyReportNotificationOutbox.createMany({
      data: [...inAppRows, ...emailRows],
      skipDuplicates: true,
    });
    return result.count;
  }

  async processDue(
    now = new Date(),
    limit = 100,
  ): Promise<{
    sent: number;
    retried: number;
    dead: number;
  }> {
    const rows = await this.claimDue(now, limit);

    let sent = 0;
    let retried = 0;
    let dead = 0;
    for (const row of rows) {
      if (row.expiresAt && row.expiresAt <= now) {
        await this.prisma.dailyReportNotificationOutbox.update({
          where: { id: row.id },
          data: { status: DailyReportOutboxStatus.EXPIRED },
        });
        dead += 1;
        continue;
      }

      const payload = row.payload as unknown as DailyReportOutboxPayload;
      // Sự kiện cấp phạm vi (leader summary) không gắn vào bản báo cáo nào —
      // neo vào chính scope, và link đi thẳng tới bảng theo dõi.
      const targetId =
        payload.reportId ?? payload.scopeId ?? row.scopeId ?? row.id;
      const linkUrl =
        payload.linkUrl ??
        (payload.reportId
          ? dailyReportLink(payload.reportId)
          : dailyReportBoardLink(targetId, payload.reportDate));
      try {
        if (row.channel === DailyReportDeliveryChannel.EMAIL) {
          if (!row.emailTo || !row.emailSubject || !row.emailHtml) {
            throw new Error('Email delivery payload is incomplete');
          }
          await this.mail.sendTransactionalEmail({
            to: row.emailTo,
            subject: row.emailSubject,
            html: row.emailHtml,
            idempotencyKey: row.idempotencyKey,
          });
        } else {
          await this.notifications.createNotificationWithCounter({
            userId: row.recipientId,
            actorUserId: row.actorId ?? undefined,
            relatedModel: RelatedModel.daily_report,
            relatedModelId: targetId,
            action: payload.action,
            linkUrl,
            message: payload.message,
            scope: NotificationScope.personal,
            idempotencyKey: row.idempotencyKey,
          });
        }
        await this.markSent(row, payload, now);
        sent += 1;
      } catch (error) {
        const attempts = row.attempts + 1;
        const delays =
          row.kind === DailyReportOutboxKind.MEMBER_REMINDER
            ? MEMBER_RETRY_MINUTES
            : DEFAULT_RETRY_MINUTES;
        const delay = delays[attempts - 1];
        const expired = row.expiresAt && row.expiresAt <= now;
        if (delay === undefined || expired) {
          await this.prisma.dailyReportNotificationOutbox.update({
            where: { id: row.id },
            data: {
              attempts,
              status: expired
                ? DailyReportOutboxStatus.EXPIRED
                : DailyReportOutboxStatus.DEAD,
              lastError: String(error),
            },
          });
          this.logger.error(
            `Daily Report notification dead-letter: ${row.id} (${String(error)})`,
          );
          dead += 1;
        } else {
          await this.prisma.dailyReportNotificationOutbox.update({
            where: { id: row.id },
            data: {
              attempts,
              status: DailyReportOutboxStatus.RETRYING,
              nextAttemptAt: new Date(now.getTime() + delay * 60_000),
              lastError: String(error),
            },
          });
          retried += 1;
        }
      }
    }
    return { sent, retried, dead };
  }

  /**
   * Giành lấy một lô dòng tới hạn NGUYÊN TỬ rồi giữ chỗ `CLAIM_LEASE_MS`.
   *
   * `FOR UPDATE SKIP LOCKED` cộng với việc đẩy `nextAttemptAt` lên tương lai
   * ngay trong cùng câu lệnh khiến hai tiến trình không thể cùng nhặt một dòng.
   * Trước đây an toàn chỉ dựa vào khóa cron (TTL 55 giây) trong khi nhịp cron là
   * 60 giây — lô chạy chậm sống lâu hơn khóa là gửi trùng.
   */
  private async claimDue(now: Date, limit: number): Promise<OutboxRow[]> {
    const lease = new Date(now.getTime() + CLAIM_LEASE_MS);
    return this.prisma.$queryRaw<OutboxRow[]>`
      UPDATE "daily_report_notification_outbox"
      SET "nextAttemptAt" = ${lease}, "updatedAt" = ${now}
      WHERE "id" IN (
        SELECT "id" FROM "daily_report_notification_outbox"
        WHERE "status" IN (${DailyReportOutboxStatus.PENDING}::"DailyReportOutboxStatus",
                           ${DailyReportOutboxStatus.RETRYING}::"DailyReportOutboxStatus")
          AND "nextAttemptAt" <= ${now}
        ORDER BY "nextAttemptAt" ASC, "id" ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *`;
  }

  private async markSent(
    row: OutboxRow,
    payload: DailyReportOutboxPayload,
    now: Date,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.dailyReportNotificationOutbox.update({
        where: { id: row.id },
        data: {
          status: DailyReportOutboxStatus.SENT,
          sentAt: now,
          attempts: { increment: 1 },
          lastError: null,
        },
      });
      if (
        row.channel !== DailyReportDeliveryChannel.EMAIL &&
        row.kind === DailyReportOutboxKind.MEMBER_REMINDER
      ) {
        if (!row.reportId) return;
        await tx.dailyReport.updateMany({
          where: { id: row.reportId, remindedAt: null },
          data: { remindedAt: now },
        });
        return;
      }
      if (
        row.channel !== DailyReportDeliveryChannel.EMAIL &&
        row.kind === DailyReportOutboxKind.LEADER_MISSING_SUMMARY
      ) {
        // Tổng hợp là sự kiện của CẢ phạm vi trong một ngày, không của riêng bản
        // nào — đóng dấu lên mọi bản còn thiếu của ngày đó. Bản cũ chỉ đóng dấu
        // một bản tùy ý nên cột này gần như vô nghĩa.
        const scopeId = row.scopeId ?? payload.scopeId;
        if (!scopeId || !payload.reportDate) return;
        await tx.dailyReport.updateMany({
          where: {
            scopeId,
            reportDate: reportDateValue(payload.reportDate),
            leaderNotifiedAt: null,
          },
          data: { leaderNotifiedAt: now },
        });
      }
    });
  }

  private emailTemplateKeyFor(
    kind: DailyReportOutboxKind,
  ): DailyReportEmailTemplateKey | null {
    switch (kind) {
      case DailyReportOutboxKind.REPORT_READY:
        return DailyReportEmailTemplateKey.DAILY_REPORT_READY;
      case DailyReportOutboxKind.MEMBER_REMINDER:
        return DailyReportEmailTemplateKey.DAILY_REPORT_REMINDER;
      case DailyReportOutboxKind.LEADER_MISSING_SUMMARY:
        return DailyReportEmailTemplateKey.DAILY_REPORT_LEADER_SUMMARY;
      default:
        return null;
    }
  }
}
