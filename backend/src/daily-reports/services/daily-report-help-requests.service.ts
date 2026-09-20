import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DailyReportHelpRequestStatus,
  DailyReportOutboxKind,
  NotificationAction,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/common/services/prisma.service';
import { QueryHelpRequestsDto } from '../dto/daily-report.dto';
import {
  HelpRequestView,
  OPEN_HELP_STATUSES,
  toHelpRequestView,
} from '../helpers/help-request-view.helper';
import { DailyReportScopeService } from './daily-report-scope.service';

type HelpWithReport = Prisma.DailyReportHelpRequestGetPayload<{
  include: {
    report: { select: { id: true; scopeId: true; userId: true } };
  };
}>;

/** Thông báo gửi người hỏi khi trạng thái yêu cầu đổi. */
interface HelpNotice {
  kind: DailyReportOutboxKind;
  action: NotificationAction;
  message: string;
}

@Injectable()
export class DailyReportHelpRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopes: DailyReportScopeService,
  ) {}

  async listMine(userId: string, query: QueryHelpRequestsDto) {
    const rows = await this.prisma.dailyReportHelpRequest.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        OR: [{ requesterId: userId }, { mentionedUserIds: { has: userId } }],
      },
      include: {
        report: {
          select: { id: true, scopeId: true, reportDate: true, userId: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return rows.map((help) => ({
      ...toHelpRequestView(help),
      report: {
        id: help.report.id,
        scopeId: help.report.scopeId,
        reportDate: help.report.reportDate,
        userId: help.report.userId,
      },
    }));
  }

  /**
   * Tiếp nhận: người được nhắc tên, hoặc người xử lý. Giao diện chỉ còn hai
   * trạng thái nên không màn nào gọi bước này; route giữ lại cho client cũ.
   */
  async acknowledge(id: string, actorId: string) {
    const help = await this.load(id);
    const scope = await this.scopes.getScopeOrThrow(help.report.scopeId);
    const allowed =
      help.mentionedUserIds.includes(actorId) ||
      (await this.scopes.canReviewReport(scope, actorId, help.report.userId));
    if (!allowed) {
      throw new ForbiddenException('Bạn không được tiếp nhận yêu cầu này');
    }
    return this.transition(help, actorId, {
      from: [DailyReportHelpRequestStatus.OPEN],
      to: DailyReportHelpRequestStatus.ACKNOWLEDGED,
      data: { acknowledgedById: actorId, acknowledgedAt: new Date() },
      notice: {
        kind: DailyReportOutboxKind.HELP_ACKNOWLEDGED,
        action: NotificationAction.daily_report_help_acknowledged,
        message: 'Yêu cầu hỗ trợ của bạn đã được tiếp nhận',
      },
    });
  }

  /** Tích "Đã giải quyết". Ai được tích: xem `assertCanResolve`. */
  async resolve(id: string, actorId: string) {
    const help = await this.load(id);
    await this.assertCanResolve(help, actorId);
    return this.transition(help, actorId, {
      from: OPEN_HELP_STATUSES,
      to: DailyReportHelpRequestStatus.RESOLVED,
      data: { resolvedById: actorId, resolvedAt: new Date() },
      /*
       * Khoá idempotency theo (yêu cầu, trạng thái, người hỏi) nên mỗi yêu cầu
       * chỉ báo người hỏi MỘT lần: tích, bỏ tích rồi tích lại không thành ba
       * thông báo.
       */
      notice: {
        kind: DailyReportOutboxKind.HELP_RESOLVED,
        action: NotificationAction.daily_report_help_resolved,
        message: 'Yêu cầu hỗ trợ của bạn đã được giải quyết',
      },
    });
  }

  /**
   * Bỏ tích "Đã giải quyết": về lại chưa giải quyết. Cùng người được tích, và
   * không gửi thông báo: bỏ tích thường là sửa một cú bấm nhầm.
   */
  async reopen(id: string, actorId: string) {
    const help = await this.load(id);
    await this.assertCanResolve(help, actorId);
    return this.transition(help, actorId, {
      from: [DailyReportHelpRequestStatus.RESOLVED],
      to: DailyReportHelpRequestStatus.OPEN,
      data: { resolvedById: null, resolvedAt: null },
      notice: null,
    });
  }

  async cancel(id: string, actorId: string) {
    const help = await this.load(id);
    await this.scopes.getScopeOrThrow(help.report.scopeId);
    if (help.requesterId !== actorId) {
      throw new ForbiddenException('Chỉ người yêu cầu mới được hủy');
    }
    return this.transition(help, actorId, {
      from: OPEN_HELP_STATUSES,
      to: DailyReportHelpRequestStatus.CANCELLED,
      data: { cancelledById: actorId, cancelledAt: new Date() },
      notice: {
        kind: DailyReportOutboxKind.HELP_CANCELLED,
        action: NotificationAction.daily_report_help_cancelled,
        message: 'Yêu cầu hỗ trợ đã được hủy',
      },
    });
  }

  /**
   * Ai tích và bỏ tích "Đã giải quyết": chính người hỏi, hoặc người xử lý.
   *
   * Người xử lý = người duyệt được bản của người hỏi (`canReviewReport`):
   * trưởng nhóm, hoặc người duyệt phụ đang là thành viên và phụ trách đúng
   * người đó; phạm vi đã lưu trữ thì không ai. Người duyệt xử lý trước, trưởng
   * nhóm theo dõi kết quả. Luật chốt ngày 15/09/2026, thay cho "người hỏi hoặc
   * quản lý" của thiết kế 20 mục 8.5.
   *
   * Cờ `canResolveHelp` của chi tiết bản và của tổng quan phải bám đúng luật này.
   */
  private async assertCanResolve(
    help: HelpWithReport,
    actorId: string,
  ): Promise<void> {
    const scope = await this.scopes.getScopeOrThrow(help.report.scopeId);
    if (help.requesterId === actorId) return;
    if (await this.scopes.canReviewReport(scope, actorId, help.report.userId)) {
      return;
    }
    throw new ForbiddenException(
      'Bạn không được đánh dấu giải quyết yêu cầu hỗ trợ này',
    );
  }

  private async load(id: string): Promise<HelpWithReport> {
    const help = await this.prisma.dailyReportHelpRequest.findUnique({
      where: { id },
      include: {
        report: { select: { id: true, scopeId: true, userId: true } },
      },
    });
    if (!help) throw new NotFoundException('Không tìm thấy yêu cầu hỗ trợ');
    return help;
  }

  private async transition(
    help: HelpWithReport,
    actorId: string,
    options: {
      from: DailyReportHelpRequestStatus[];
      to: DailyReportHelpRequestStatus;
      data: Omit<
        Prisma.DailyReportHelpRequestUpdateManyMutationInput,
        'status'
      >;
      notice: HelpNotice | null;
    },
  ): Promise<HelpRequestView> {
    return this.prisma.$transaction(async (tx) => {
      const update = await tx.dailyReportHelpRequest.updateMany({
        where: { id: help.id, status: { in: options.from } },
        data: { ...options.data, status: options.to },
      });
      if (update.count === 0) {
        throw new ConflictException('Trạng thái yêu cầu đã thay đổi');
      }
      if (options.notice && help.requesterId !== actorId) {
        await tx.dailyReportNotificationOutbox.createMany({
          data: [
            {
              idempotencyKey: `daily-report:help:${help.id}:${options.to}:${help.requesterId}`,
              kind: options.notice.kind,
              recipientId: help.requesterId,
              actorId,
              scopeId: help.report.scopeId,
              reportId: help.report.id,
              payload: {
                action: options.notice.action,
                message: options.notice.message,
                reportId: help.report.id,
              },
            },
          ],
          skipDuplicates: true,
        });
      }
      return toHelpRequestView(
        await tx.dailyReportHelpRequest.findUniqueOrThrow({
          where: { id: help.id },
        }),
      );
    });
  }
}
