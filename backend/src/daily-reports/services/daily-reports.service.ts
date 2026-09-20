import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import {
  BabyAdoptionStatus,
  BusinessFormTaskStatus,
  DailyReport,
  DailyReportHelpRequestStatus,
  DailyReportOutboxKind,
  DailyReportQuestionKind,
  DailyReportReviewDecision,
  DailyReportScope,
  DailyReportStatus,
  NotificationAction,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/common/services/prisma.service';
import {
  DAILY_REPORT_CARRY_CHAIN_WARN_COUNT,
  DAILY_REPORT_GENERATE_LABEL,
  DAILY_REPORT_GENERATE_MINUTE,
  dailyReportMinuteLabel,
  MAX_HISTORY_RANGE_DAYS,
} from '../constants/daily-report.constants';
import {
  QueryBoardDto,
  QueryMyReportsDto,
  QueryPendingReviewDto,
  QueryScopeMemberHistoryDto,
  QuerySummaryDto,
  ReopenDailyReportDto,
  ReviewCarryOverItemDto,
  ReviewDailyReportDto,
  SaveAnswerDto,
  SaveDailyReportDto,
  SubmitDailyReportDto,
} from '../dto/daily-report.dto';
import {
  dayBoundsUtc,
  dayStrInTz,
  isReportLockedAt,
  minuteOfDayInstant,
  minutesOfDayInTz,
  nextWorkingDate,
  reportDateLabel,
  reportDateValue,
  reviewDeadlineAt,
  snapshotInstant,
} from '../helpers/report-date.helper';
import {
  helpStatusOf,
  isHelpOpen,
  OPEN_HELP_STATUSES,
  toHelpRequestView,
} from '../helpers/help-request-view.helper';
import { buildDailyKpiSummary } from '../helpers/report-kpi.helper';
import { pickPreviewAnswer } from '../helpers/report-preview.helper';
import {
  DailyReportDraftService,
  DraftSource,
} from './daily-report-draft.service';
import { DailyReportGeneratorService } from './daily-report-generator.service';
import { DailyReportScopeService } from './daily-report-scope.service';

/** Ngữ cảnh làm thay đã xác thực. */
interface ActingContext {
  effectiveUserId: string;
  actorId: string;
  onBehalfOfId: string | null;
}

const ANSWER_ORDER = { sortOrder: 'asc' } as const;

/**
 * Cột người dùng mà bảng theo dõi nhóm cần. Tách thành hằng có `satisfies` để
 * `BoardUser` bên dưới bám đúng nó — trước đây `select` viết trực tiếp trong lời
 * gọi, và nhánh "không có ai" của toán tử ba ngôi là `Promise.resolve([])`, tức
 * `never[]`. `Promise.all` gộp hai nhánh lại thành `{}[]` và mọi truy cập
 * `.fullName` phía sau mất kiểu.
 */
const BOARD_USER_SELECT = {
  id: true,
  fullName: true,
  avatar: { select: { fileUrl: true } },
} satisfies Prisma.UserSelect;

type BoardUser = Prisma.UserGetPayload<{ select: typeof BOARD_USER_SELECT }>;

/**
 * Bộ phận của một thành viên, kèm người duyệt của bộ phận đó. Dùng cho danh
 * sách chờ duyệt xuyên ngày (`getPendingReview`).
 */
const PENDING_REVIEW_GROUP_SELECT = {
  memberId: true,
  group: {
    select: {
      id: true,
      name: true,
      reviewers: { select: { reviewerId: true } },
    },
  },
} satisfies Prisma.DailyReportReviewGroupMemberSelect;

type PendingReviewGroupRow = Prisma.DailyReportReviewGroupMemberGetPayload<{
  select: typeof PENDING_REVIEW_GROUP_SELECT;
}>;

/**
 * Chủ báo cáo, nạp cùng bản báo cáo. Người đọc bản của người khác (trưởng nhóm,
 * người duyệt phụ) cần biết mình đang đọc bản CỦA AI - trước đây response chỉ
 * có `owner.id`, và màn chi tiết không có tên nào để in.
 */
const REPORT_OWNER_SELECT = {
  id: true,
  fullName: true,
  avatar: { select: { fileUrl: true } },
} satisfies Prisma.UserSelect;

/** Nhận xét và tên người duyệt của kết luận đang đứng trên bản. */
interface ReviewNote {
  comment: string | null;
  reviewerName: string | null;
}

type ReportWithAnswers = Prisma.DailyReportGetPayload<{
  include: {
    answers: true;
    templateVersion: {
      select: { id: true; version: true; nameSnapshot: true };
    };
    helpRequests: true;
    kpiAchievements: { include: { kpi: true } };
    user: { select: typeof REPORT_OWNER_SELECT };
  };
}> & {
  draftSourcesByKind?: Partial<Record<DailyReportQuestionKind, DraftSource[]>>;
  draftSuggestionsByKind?: Partial<Record<DailyReportQuestionKind, string>>;
  /** Chỉ hai đường đọc một bản (`my/today`, `:id`) nạp; vắng thì coi như null. */
  reviewNote?: ReviewNote | null;
  /**
   * Tên người đã tích "Đã giải quyết" của các yêu cầu hỗ trợ, theo id. Cùng
   * luật với `reviewNote`: chỉ hai đường đọc một bản nạp.
   */
  helpResolverNames?: Record<string, string | null>;
};

/**
 * Bản báo cáo + thông tin scope đã serialize cho FE.
 *
 * PHẢI export: kiểu này lọt vào kiểu trả về của các route công khai trong
 * DailyReportsController, không export thì declaration emit báo TS4053.
 */
export interface SerializedScope {
  id: string;
  scopeType: string;
  name: string;
  generationLabel: string;
  reminderLabel: string;
  leaderSummaryLabel: string;
  /**
   * Mốc chốt số liệu tổng hợp gửi trưởng nhóm — KHÔNG còn là hạn chặn nộp.
   * Giữ tên cũ để không phá client và biến email `leaderSubmitTime` đang chạy.
   */
  leaderSubmitMinute: number;
  leaderSubmitLabel: string;
  cutoffMinute: number;
  reminderBeforeMinutes: number;
  leaderSummaryMinute: number;
  hardStopMinute: number;
  hardStopLabel: string;
  weekdays: number[];
  timezone: string;
  archivedAt: Date | null;
  purgedAt: Date | null;
}

/**
 * Tám trạng thái hiển thị của một dòng trên bảng theo dõi.
 *
 * Ba trong số đó rất dễ bị gộp nhầm và mỗi cái nói một việc khác nhau:
 * `CHO_DUYET` đòi người duyệt hành động, `QUA_HAN_DUYET` nói người duyệt đã lỡ,
 * `QUA_HAN_BO_SUNG` nói thành viên hết hạn sửa và chỉ quản lý gỡ được.
 */
export type DailyReportBoardState =
  | 'CHUA_NOP'
  | 'CHO_DUYET'
  | 'QUA_HAN_DUYET'
  | 'DA_DUYET'
  | 'TIEP_TUC'
  | 'QUA_HAN_BO_SUNG'
  | 'BI_TRA_LAI'
  | 'DA_MO_LAI';

/**
 * Kind, action và câu mở đầu của thông báo gửi cho chủ báo cáo sau khi duyệt.
 *
 * Ba kind riêng chứ không một kind với payload phân nhánh: giao diện thông báo
 * lọc theo `kind`, và gộp lại là bắt nó đọc payload để biết chuyện gì đã xảy ra.
 */
const REVIEW_NOTICE: Record<
  DailyReportReviewDecision,
  { kind: DailyReportOutboxKind; action: NotificationAction; message: string }
> = {
  [DailyReportReviewDecision.ACCEPTED]: {
    kind: DailyReportOutboxKind.REPORT_ACCEPTED,
    action: NotificationAction.daily_report_accepted,
    message: 'Báo cáo đã được duyệt đạt, ngày',
  },
  [DailyReportReviewDecision.CONTINUED]: {
    kind: DailyReportOutboxKind.REPORT_CONTINUED,
    action: NotificationAction.daily_report_continued,
    message: 'Báo cáo đã duyệt, có việc cần tiếp tục, ngày',
  },
  [DailyReportReviewDecision.REJECTED]: {
    kind: DailyReportOutboxKind.REPORT_REJECTED,
    action: NotificationAction.daily_report_rejected,
    message: 'Báo cáo bị trả lại, cần sửa và nộp lại, ngày',
  },
};

/**
 * P2002 của hai partial unique trên `daily_report_carry_overs`:
 * `(fromReportId, taskId)` và `(fromReportId, chainId)`, cùng `WHERE cancelledAt IS NULL`.
 *
 * Prisma 6 báo `meta.target` là DANH SÁCH CỘT kèm `modelName`, không phải tên
 * index. Bản trước so `includes('carry_overs')` nên không bao giờ khớp, và va
 * chạm carry rơi thẳng ra thành 500 thay vì 409 - smoke bắt được ngày 10/09/2026
 * với `meta = { modelName: 'DailyReportCarryOver', target: ['fromReportId', 'taskId'] }`.
 */
export function isCarryOverUniqueViolation(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  ) {
    return false;
  }
  const meta = error.meta as
    | { modelName?: unknown; target?: unknown }
    | undefined;
  if (meta?.modelName === 'DailyReportCarryOver') return true;
  const target = Array.isArray(meta?.target)
    ? meta.target.join(',')
    : String(meta?.target ?? '');
  return target.includes('fromReportId') || target.includes('carry_overs');
}

/**
 * Luật huỷ một dòng chuyển tiếp. Trả lý do từ chối, hoặc `null` nếu được huỷ.
 *
 * Dùng chung cho `cancelCarryOver` và cờ `canCancel` của ứng viên lẫn khối
 * chuyển tiếp: hai chỗ tự viết hai luật là giao diện hiện nút mà API từ chối.
 * Hàm thuần ở cấp module để test được từng nhánh mà không phải dựng service.
 *
 *   Phạm vi đã lưu trữ       -> không ai huỷ được, kể cả quản lý.
 *   Quản lý phạm vi          -> luôn được.
 *   Dòng người duyệt tạo     -> chính người đó, hoặc người đã xác nhận lại nó
 *                               ở lượt duyệt sau.
 *   Dòng không có `reviewId` -> chỉ quản lý. Dòng loại này chỉ còn trong dữ
 *                               liệu cũ của đường thành viên tự kéo việc, đã
 *                               gỡ ngày 15/09/2026.
 */
export function carryCancelDenial(
  row: {
    reviewId: string | null;
    createdById: string;
    confirmerId: string | null;
  },
  actorId: string,
  ctx: { isArchived: boolean; isManager: boolean },
): string | null {
  // Trước đây cờ báo "huỷ được" trên nhóm đã lưu trữ, còn API thì trả 404
  // "Không tìm thấy cấu hình" - nút hiện ra rồi bấm vào là hỏng.
  if (ctx.isArchived) {
    return 'Nhóm đã lưu trữ, không huỷ được việc chuyển tiếp';
  }
  if (ctx.isManager) return null;
  if (row.reviewId) {
    return row.createdById === actorId || row.confirmerId === actorId
      ? null
      : 'Việc do người duyệt chuyển tiếp thì chỉ người duyệt đó hoặc trưởng nhóm mới huỷ được';
  }
  return 'Chỉ trưởng nhóm mới huỷ được việc này';
}

/**
 * Dòng mà lượt duyệt trước đã chuyển đi từ chính báo cáo này, gắn vào ứng viên
 * cùng chuỗi hoặc cùng task. Chọn ứng viên đó là xác nhận lại dòng này.
 */
export interface ExistingCarryOverRef {
  id: string;
  toReportDate: string;
  note: string | null;
}

/** Một việc người duyệt có thể chuyển sang ngày làm việc kế tiếp. */
export interface ReviewCarryCandidate {
  key: string;
  /**
   * `task`: việc gắn trong bài. `carried`: dòng đã chuyển tiếp TỚI báo cáo này.
   * `outgoing`: dòng lượt duyệt trước đã chuyển ĐI từ báo cáo này mà không khớp
   * hai loại kia, ví dụ việc gõ tay. Thiếu loại này thì lượt duyệt sau không xác
   * nhận lại được việc gõ tay của lượt trước.
   */
  kind: 'task' | 'carried' | 'outgoing';
  taskId: string | null;
  code: string | null;
  title: string | null;
  status: BusinessFormTaskStatus | null;
  note: string | null;
  continuesCarryOverId: string | null;
  /** Số LẦN đã chuyển tiếp của chuỗi, không phải số ngày. */
  carriedCount: number;
  /** `carriedCount` chạm `DAILY_REPORT_CARRY_CHAIN_WARN_COUNT`. */
  isLongChain: boolean;
  /** Dòng lượt duyệt trước đã chuyển đi của cùng việc; chọn là xác nhận lại. */
  existingCarryOver: ExistingCarryOverRef | null;
  /**
   * Người đang xem huỷ được dòng mà ứng viên trỏ tới: dòng đáp xuống với
   * `carried`, dòng đi ra với `outgoing`. Tính bằng đúng `carryCancelDenial`,
   * để giao diện không hiện nút huỷ trên dòng mà API sẽ trả 403.
   */
  canCancel: boolean;
  eligible: boolean;
  ineligibleReason: string | null;
}

/** Một dòng đã chuyển đi từ báo cáo, hiện ngay trên chính báo cáo đó. */
export interface CarryOverView {
  id: string;
  chainId: string;
  taskId: string | null;
  code: string | null;
  title: string | null;
  status: BusinessFormTaskStatus | null;
  note: string | null;
  toReportDate: string;
  createdById: string;
  createdByName: string | null;
  /** Người duyệt đã xác nhận lại dòng ở lượt duyệt sau; `null` nếu chưa có. */
  confirmedById: string | null;
  confirmedByName: string | null;
  carriedCount: number;
  isLongChain: boolean;
  cancelledAt: Date | null;
  /** Theo đúng luật của `cancelCarryOver`, tính cho người đang xem. */
  canCancel: boolean;
}

/** Khối chuyển tiếp của một báo cáo. */
export interface CarryPanel {
  /** Mọi dòng đi ra từ báo cáo, kể cả dòng đã huỷ - giao diện nói rõ chứ không giấu. */
  outgoing: CarryOverView[];
}

/** Một phần tử chuyển tiếp đã qua kiểm tra và phân giải chuỗi. */
interface ResolvedCarryItem {
  chainId: string;
  taskId: string | null;
  note: string | null;
  /** Có giá trị = xác nhận dòng đã có này, không tạo dòng mới. */
  confirmId: string | null;
}

/**
 * Dòng carry còn hiệu lực quanh một báo cáo, đủ trường để phân giải chuỗi và
 * để áp luật huỷ.
 */
interface CarryRowRef {
  id: string;
  chainId: string;
  taskId: string | null;
  note: string | null;
  fromReportId: string;
  toReportDate: Date;
  reviewId: string | null;
  createdById: string;
  /** Người duyệt đã xác nhận lại dòng; đọc qua quan hệ `confirmedByReview`. */
  confirmerId: string | null;
}

@Injectable()
export class DailyReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: DailyReportScopeService,
    private readonly generator: DailyReportGeneratorService,
    private readonly draftService: DailyReportDraftService,
  ) {}

  // ── "Làm thay" — cùng luật với BusinessFormTasksService (docs 01 mục 3.1) ──

  /**
   * BẢO MẬT: KHÔNG BAO GIỜ tin `onBehalfOfUserId` từ client. Chỉ chấp nhận khi
   * tồn tại quan hệ Baby đang hoạt động (approved, chưa drop) giữa actor và
   * target — nếu không, Forbidden.
   */
  private async resolveActingContext(
    actorId: string,
    onBehalfOfUserId?: string,
  ): Promise<ActingContext> {
    if (!onBehalfOfUserId || onBehalfOfUserId === actorId) {
      return {
        effectiveUserId: actorId,
        actorId,
        onBehalfOfId: null,
      };
    }
    const baby = await this.prisma.baby.findFirst({
      where: {
        babysitterId: actorId,
        userId: onBehalfOfUserId,
        status: BabyAdoptionStatus.approved,
        droppedAt: null,
      },
      select: { id: true },
    });
    if (!baby) {
      throw new ForbiddenException(
        'Bạn không phải người chăm sóc đang hoạt động của người này',
      );
    }
    return {
      effectiveUserId: onBehalfOfUserId,
      actorId,
      onBehalfOfId: actorId,
    };
  }

  // ── Đọc ──────────────────────────────────────────────────────────────────

  /**
   * GET /daily-reports/my/today — điểm vào chính. Có tác dụng phụ CÓ CHỦ Ý:
   * lazy-upsert bản còn thiếu (an toàn kép khi cron lỗi — US-14).
   */
  async getMyToday(userId: string, date?: string, onBehalfOfUserId?: string) {
    const ctx = await this.resolveActingContext(userId, onBehalfOfUserId);
    const dayStr = dayStrInTz(new Date());
    if (date && date !== dayStr) {
      throw new UnprocessableEntityException(
        'Endpoint today chỉ chấp nhận ngày hiện tại; dùng API lịch sử cho ngày khác',
      );
    }

    const pairs = await this.generator.ensureReportsForUser(
      ctx.effectiveUserId,
      dayStr,
    );

    const reports = await Promise.all(
      pairs.map(async ({ scope, report }) => {
        await this.generator.ensureAnswers(
          report,
          this.requireTemplateVersion(report),
        );
        const full = await this.loadReport(report.id);
        const [withDrafts, reviewNote, helpResolverNames, canResolveHelp] =
          await Promise.all([
            this.attachDrafts(full, scope),
            this.loadReviewNote(full),
            this.loadHelpResolverNames(full),
            this.canResolveHelpOn(full, scope, ctx.actorId),
          ]);
        const carry = await this.buildCarryPanel(
          full,
          scope,
          ctx.actorId,
          await this.scopeService.isManager(scope, ctx.actorId),
        );
        return this.serializeReport(
          { ...withDrafts, reviewNote, helpResolverNames },
          scope,
          await this.scopeMeta(scope),
          // Đúng mặc định của đường chính chủ. `isManager` của khối chuyển tiếp
          // KHÔNG đưa vào đây: nó đổi `canReopen` của bản đã khoá.
          { isOwner: true, isManager: false, canResolveHelp },
          undefined,
          carry,
        );
      }),
    );

    return {
      date: dayStr,
      reports,
      emptyReason:
        reports.length === 0
          ? await this.resolveTodayEmptyReason(
              ctx.effectiveUserId,
              dayStr,
              new Date(),
            )
          : null,
    };
  }

  /** GET /daily-reports/my/pending-count — nhẹ, chỉ đếm. */
  async getPendingCount(userId: string, onBehalfOfUserId?: string) {
    const ctx = await this.resolveActingContext(userId, onBehalfOfUserId);
    const now = new Date();
    const dayStr = dayStrInTz(now);
    const reportDate = reportDateValue(dayStr);

    const existing = await this.prisma.dailyReport.findMany({
      where: {
        userId: ctx.effectiveUserId,
        reportDate,
        deletedAt: null,
        scope: { archivedAt: null, isEnabled: true },
      },
      include: { scope: true },
    });

    let pending = 0;
    let missed = 0;
    for (const row of existing) {
      if (row.status === DailyReportStatus.SUBMITTED) continue;
      pending += 1;
      if (minutesOfDayInTz(now, row.scope.timezone) >= row.scope.cutoffMinute) {
        missed += 1;
      }
    }
    // Làm thay chỉ áp cho việc NỘP; duyệt luôn là việc của chính người đăng nhập.
    const pendingReview = ctx.onBehalfOfId
      ? 0
      : await this.countPendingReviews(ctx.actorId, now);
    return {
      date: dayStr,
      total: existing.length,
      pending,
      missed,
      pendingReview,
    };
  }

  /**
   * Số bản đang chờ CHÍNH người này duyệt, còn trong hạn. Cùng các điều kiện
   * của `buildReviewContext`, chỉ khác phần "đúng người" đã gom sẵn trong
   * `getReviewTargets`. Trước đây `pending-count` chỉ đếm bản của mình phải
   * nộp, nên cả trưởng nhóm lẫn người duyệt phụ không thấy mình còn bao nhiêu
   * bản chờ ở bất cứ đâu ngoài thông báo.
   */
  private async countPendingReviews(
    actorId: string,
    now: Date,
  ): Promise<number> {
    const targets = await this.scopeService.getReviewTargets(actorId);
    if (targets.length === 0) return 0;
    return this.prisma.dailyReport.count({
      where: {
        deletedAt: null,
        status: DailyReportStatus.SUBMITTED,
        reviewDecision: null,
        reviewExpiredAt: null,
        reviewDeadlineAt: { gt: now },
        userId: { not: actorId },
        OR: targets.map((target) => ({
          scopeId: target.scopeId,
          ...(target.memberIds === 'all'
            ? {}
            : { userId: { in: target.memberIds } }),
        })),
      },
    });
  }

  /** GET /daily-reports/my — lịch sử. */
  async getMyHistory(
    userId: string,
    query: QueryMyReportsDto,
    onBehalfOfUserId?: string,
  ) {
    const ctx = await this.resolveActingContext(userId, onBehalfOfUserId);
    this.assertRange(query.from, query.to);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.DailyReportWhereInput = {
      userId: ctx.effectiveUserId,
      deletedAt: null,
      reportDate: {
        gte: reportDateValue(query.from),
        lte: reportDateValue(query.to),
      },
      ...(query.scopeId ? { scopeId: query.scopeId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.dailyReport.findMany({
        where,
        include: { answers: { orderBy: ANSWER_ORDER } },
        orderBy: { reportDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.dailyReport.count({ where }),
    ]);

    const scopeCache = new Map<
      string,
      Promise<{ scope: DailyReportScope; meta: SerializedScope }>
    >();
    const scopeOf = (scopeId: string) => {
      let entry = scopeCache.get(scopeId);
      if (!entry) {
        entry = this.scopeService
          .getScopeOrThrow(scopeId, { includeArchived: true })
          .then(async (scope) => ({
            scope,
            meta: await this.scopeMeta(scope),
          }));
        scopeCache.set(scopeId, entry);
      }
      return entry;
    };
    const data = await Promise.all(
      rows.map(async (r) => {
        const { scope, meta } = await scopeOf(r.scopeId);
        const previewAnswer = pickPreviewAnswer(r.answers);
        /* `isReportLocked`, không phải chỉ mốc ngày: bản bị trả lại còn trong
           cửa sổ `editableUntil` thì chưa khoá, và board cũng tính như vậy. */
        const rowLocked =
          Boolean(scope.archivedAt) || this.isReportLocked(r, scope);
        return {
          id: r.id,
          reportDate: reportDateLabel(r.reportDate),
          scope: meta,
          status: r.status,
          isLocked: rowLocked,
          isMissed: this.isMissedReport(r, rowLocked),
          submittedAt: r.submittedAt,
          answerPreview: (previewAnswer?.content ?? '').slice(0, 120),
          ...this.historyReviewFields(r, rowLocked),
        };
      }),
    );

    return {
      data,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** GET /daily-reports/scope/:scopeId/history — lịch sử một thành viên. */
  async getScopeMemberHistory(
    scopeId: string,
    userId: string,
    query: QueryScopeMemberHistoryDto,
  ) {
    const scope = await this.scopeService.getScopeOrThrow(scopeId, {
      includeArchived: true,
    });
    // Đọc dữ liệu của MỘT thành viên cụ thể: hỏi quyền trên cặp
    // (người xem, chủ báo cáo). `canViewGroupData` trả false cho người duyệt
    // phụ ngoài nhóm, nên một phân công hợp lệ sẽ ăn 403.
    if (
      !(await this.scopeService.canViewReport(scope, userId, query.memberId))
    ) {
      throw new ForbiddenException(
        'Bạn không có quyền xem lịch sử của thành viên này',
      );
    }
    this.assertRange(query.from, query.to);
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;
    const where: Prisma.DailyReportWhereInput = {
      scopeId,
      userId: query.memberId,
      deletedAt: null,
      reportDate: {
        gte: reportDateValue(query.from),
        lte: reportDateValue(query.to),
      },
      ...(query.status ? { status: query.status } : {}),
    };
    const [rows, total, member] = await Promise.all([
      this.prisma.dailyReport.findMany({
        where,
        include: { answers: { orderBy: ANSWER_ORDER } },
        orderBy: { reportDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.dailyReport.count({ where }),
      this.prisma.user.findUnique({
        where: { id: query.memberId },
        select: {
          id: true,
          fullName: true,
          avatar: { select: { fileUrl: true } },
        },
      }),
    ]);
    const meta = await this.scopeMeta(scope);
    return {
      member: member
        ? {
            id: member.id,
            fullName: member.fullName,
            avatarUrl: member.avatar?.fileUrl ?? null,
          }
        : { id: query.memberId, fullName: '', avatarUrl: null },
      data: rows.map((report) => {
        const previewAnswer = pickPreviewAnswer(report.answers);
        const locked =
          Boolean(scope.archivedAt) || this.isReportLocked(report, scope);
        return {
          id: report.id,
          reportDate: reportDateLabel(report.reportDate),
          scope: meta,
          status: report.status,
          isLocked: locked,
          isMissed: this.isMissedReport(report, locked),
          submittedAt: report.lastSubmittedAt ?? report.submittedAt,
          answerPreview: (previewAnswer?.content ?? '').slice(0, 120),
          ...this.historyReviewFields(report, locked),
        };
      }),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** GET /daily-reports/:id — chủ sở hữu hoặc trưởng nhóm của scope. */
  async getById(reportId: string, userId: string, onBehalfOfUserId?: string) {
    const ctx = await this.resolveActingContext(userId, onBehalfOfUserId);
    const report = await this.loadReport(reportId);
    const scope = await this.scopeService.getScopeOrThrow(report.scopeId, {
      includeArchived: true,
    });

    const isOwner = report.userId === ctx.effectiveUserId;
    const isManager = await this.scopeService.isManager(scope, ctx.actorId);
    /*
     * Cổng ĐỌC phải khớp với cổng của bảng nhóm, không hẹp hơn.
     *
     * `GET /scope/:scopeId/board` dùng `canViewGroupData`, tức admin nền tảng
     * xem được bảng của mọi scope đang bật. Nhưng chỗ này trước đây chỉ hỏi
     * `isManager`, nên admin không phải trưởng nhóm rơi vào đúng một ngõ cụt:
     * mở được bảng, thấy đủ tên và trạng thái của cả nhóm, bấm vào một người thì
     * ăn 403 và giao diện chỉ còn "Không mở được báo cáo từ liên kết này".
     *
     * `canViewGroupData` đã tự trả về `isManager` cho người không phải admin,
     * nên dòng này KHÔNG nới quyền cho ai khác ngoài admin nền tảng.
     *
     * Giữ `isManager` nguyên nghĩa "trưởng nhóm của chính scope này": nó là thứ
     * `serializeReport` dùng để bật `canReopen`. Admin được ĐỌC, không được mở
     * lại bản của người khác — mở lại là hành động ghi, vẫn thuộc về trưởng nhóm.
     */
    const canReadGroup = await this.scopeService.canViewReport(
      scope,
      ctx.actorId,
      report.userId,
    );
    if (!isOwner && !isManager && !canReadGroup) {
      throw new ForbiddenException('Bạn không có quyền xem báo cáo này');
    }

    await this.generator.ensureAnswers(
      report,
      this.requireTemplateVersion(report),
    );
    const full = await this.loadReport(report.id);
    const [withDrafts, reviewNote, helpResolverNames, canResolveHelp] =
      await Promise.all([
        isOwner ? this.attachDrafts(full, scope) : Promise.resolve(full),
        this.loadReviewNote(full),
        this.loadHelpResolverNames(full),
        this.canResolveHelpOn(full, scope, ctx.actorId),
      ]);
    const reviewContext = await this.buildReviewContext(
      full,
      scope,
      ctx.actorId,
    );
    const carry = await this.buildCarryPanel(
      full,
      scope,
      ctx.actorId,
      isManager,
    );
    return this.serializeReport(
      { ...withDrafts, reviewNote, helpResolverNames },
      scope,
      await this.scopeMeta(scope),
      {
        isOwner,
        isManager,
        canReadGroup,
        isDecider: report.reviewedById === ctx.actorId,
        canResolveHelp,
      },
      reviewContext,
      carry,
    );
  }

  /** GET /daily-reports/:id/draft — gợi ý mới, không ghi DB. */
  async getDraft(reportId: string, userId: string, onBehalfOfUserId?: string) {
    const ctx = await this.resolveActingContext(userId, onBehalfOfUserId);
    const report = await this.loadReport(reportId);
    if (report.userId !== ctx.effectiveUserId) {
      throw new ForbiddenException(
        'Bạn không có quyền xem gợi ý của báo cáo này',
      );
    }
    const scope = await this.scopeService.getScopeOrThrow(report.scopeId);
    const drafts = await this.draftService.buildDrafts(
      report.userId,
      scope.id,
      reportDateLabel(report.reportDate),
      scope.timezone,
    );
    return {
      reportId: report.id,
      generatedAt: new Date().toISOString(),
      drafts,
    };
  }

  async getRevisions(
    reportId: string,
    userId: string,
    onBehalfOfUserId?: string,
  ) {
    const ctx = await this.resolveActingContext(userId, onBehalfOfUserId);
    const report = await this.loadReport(reportId);
    const scope = await this.scopeService.getScopeOrThrow(report.scopeId, {
      includeArchived: true,
    });
    const isOwner = report.userId === ctx.effectiveUserId;
    /* Cùng một câu hỏi quyền với `getById` — xem chú thích đầy đủ ở đó. Hai
       endpoint này là một cặp: giao diện chỉ gọi `revisions` sau khi đã mở được
       chính bản báo cáo, nên để lệch nhau là admin mở được bản rồi ăn 403 ở
       khối lịch sử nộp ngay bên trong nó. */
    if (
      !isOwner &&
      !(await this.scopeService.canViewReport(
        scope,
        ctx.actorId,
        report.userId,
      ))
    ) {
      throw new ForbiddenException('Bạn không có quyền xem lịch sử báo cáo');
    }
    return this.prisma.dailyReportRevision.findMany({
      where: { reportId },
      orderBy: { revisionNumber: 'desc' },
      select: {
        id: true,
        reportId: true,
        revisionNumber: true,
        submittedById: true,
        submittedAt: true,
        isFirstSubmit: true,
        answersSnapshot: true,
        reopenReason: true,
        createdAt: true,
      },
    });
  }

  // ── Ghi ──────────────────────────────────────────────────────────────────

  /** PATCH /daily-reports/:id — lưu nháp, isResponse giữ nguyên. */
  async saveAnswers(
    reportId: string,
    userId: string,
    dto: SaveDailyReportDto,
    onBehalfOfUserId?: string,
  ) {
    const ctx = await this.resolveActingContext(userId, onBehalfOfUserId);
    const report = await this.loadReport(reportId);
    const scope = await this.scopeService.getScopeOrThrow(report.scopeId);
    this.assertCanEdit(report, scope, ctx);
    await this.generator.ensureAnswers(
      report,
      this.requireTemplateVersion(report),
    );

    await this.validateAnswerReferences(report, dto.answers);
    const selectedKpis =
      dto.achievedKpiIds === undefined
        ? undefined
        : await this.validateKpis(report.scopeId, dto.achievedKpiIds);
    const saved = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.dailyReport.updateMany({
        where: {
          id: report.id,
          status: {
            in: [DailyReportStatus.DRAFT, DailyReportStatus.REOPENED],
          },
        },
        data: { lastEditedAt: new Date(), lastEditedById: ctx.actorId },
      });
      if (claim.count === 0) return false;
      await this.applyAnswersWithClient(tx, report.id, dto.answers);
      if (selectedKpis) {
        await this.syncKpiAchievements(
          tx,
          report.id,
          ctx.actorId,
          selectedKpis,
        );
      }
      return true;
    });
    if (!saved) {
      throw new ConflictException(
        'Báo cáo vừa được nộp hoặc thay đổi bởi request khác',
      );
    }

    const full = await this.loadReport(report.id);
    return this.serializeReport(full, scope, await this.scopeMeta(scope));
  }

  /** POST /daily-reports/:id/submit — idempotent (docs 04 mục 2.6). */
  async submit(
    reportId: string,
    userId: string,
    dto: SubmitDailyReportDto,
    onBehalfOfUserId?: string,
  ) {
    const ctx = await this.resolveActingContext(userId, onBehalfOfUserId);
    const report = await this.loadReport(reportId);
    const scope = await this.scopeService.getScopeOrThrow(report.scopeId);

    if (report.userId !== ctx.effectiveUserId) {
      throw new ForbiddenException('Bạn không có quyền nộp báo cáo này');
    }
    if (report.status === DailyReportStatus.SUBMITTED) {
      const current = await this.loadReport(report.id);
      return this.serializeReport(current, scope, await this.scopeMeta(scope));
    }

    // Nộp trễ sau mốc tổng hợp vẫn hợp lệ (quyết định 20/08/2026): chỉ
    // `cutoffMinute` mới đóng đường ghi. Trước đây chặn ở mốc tổng hợp, và hard
    // stop 23:00 chỉ đúng NHỜ cái chặn đó — nên chỗ này phải kiểm hard stop
    // tường minh, không phải xóa đi là xong.
    this.assertBeforeHardStop(report, scope);

    await this.generator.ensureAnswers(
      report,
      this.requireTemplateVersion(report),
    );
    if (dto.answers && dto.answers.length > 0) {
      await this.validateAnswerReferences(report, dto.answers);
    }
    const selectedKpis =
      dto.achievedKpiIds === undefined
        ? undefined
        : await this.validateKpis(report.scopeId, dto.achievedKpiIds);

    const now = new Date();
    const isFirstSubmit = report.firstSubmittedAt === null;
    const [scopeName, managerIds, assignedReviewerIds, owner] =
      await Promise.all([
        this.scopeService.getScopeName(scope),
        this.scopeService.getLeaderIds(scope),
        this.scopeService.getReviewerIdsForMember(scope, report.userId),
        this.prisma.user.findUnique({
          where: { id: report.userId },
          select: { fullName: true },
        }),
      ]);
    /*
     * Người nhận thông báo "có bài mới nộp":
     *
     *   toàn bộ quản lý chính của phạm vi   (không phụ thuộc phân công)
     *   + người duyệt phụ được phân công phụ trách CHÍNH người vừa nộp
     *
     * Quản lý chính nhận của mọi thành viên - chốt 09/09/2026: vòng này người
     * duyệt phụ chia tải xử lý chứ chưa thay thế trách nhiệm tổng.
     */
    const leaderIds = Array.from(
      new Set([...managerIds, ...assignedReviewerIds]),
    );
    const ownerName = owner?.fullName ?? 'Thành viên';

    /*
     * Hạn duyệt chốt cứng NGAY LÚC NỘP, từ `scope.reviewWindowDays` tại thời
     * điểm này. Đây là chỗ DUY NHẤT trong hệ thống gọi `reviewDeadlineAt()`:
     * mọi đường đọc phải đọc cột đã ghi, vì cấu hình đổi được và tính lại lúc
     * đọc sẽ dịch hạn của những báo cáo đang chờ duyệt. Thiết kế 20 mục 6.5.
     */
    const newReviewDeadline = reviewDeadlineAt(now, scope);

    const claimed = await this.prisma.$transaction(async (tx) => {
      const update = await tx.dailyReport.updateMany({
        where: {
          id: report.id,
          status: {
            in: [DailyReportStatus.DRAFT, DailyReportStatus.REOPENED],
          },
        },
        data: {
          status: DailyReportStatus.SUBMITTED,
          isResponse: true,
          submittedAt: now,
          firstSubmittedAt: report.firstSubmittedAt ?? now,
          lastSubmittedAt: now,
          submittedById: ctx.actorId,
          lastEditedById: ctx.actorId,
          isLate: false,
          onBehalfOfId: ctx.actorId === report.userId ? null : ctx.actorId,

          /*
           * ĐẶT LẠI CỤM VÒNG DUYỆT. Đây là chỗ dễ hỏng nhất của cả thiết kế:
           * quên là board hiển thị "Đã duyệt bởi An" trên một bản nộp mà An
           * chưa từng đọc, và không có cách nào tự phát hiện.
           *
           * Sáu cột về null, cột thứ bảy thì KHÔNG: `reviewDeadlineAt` nhận hạn
           * của revision vừa tạo. Để nó về null là vòng duyệt mới không có hạn
           * và cron không bao giờ đóng được. Thiết kế 20 mục 7.11.
           *
           * Phân biệt với `reopen`: mở lại KHÔNG đặt lại, nộp lại mới đặt lại.
           */
          reviewDecision: null,
          reviewedById: null,
          reviewedAt: null,
          reviewedRevisionNumber: null,
          editableUntil: null,
          reviewExpiredAt: null,
          reviewDeadlineAt: newReviewDeadline,
        },
      });
      if (update.count === 0) return false;

      if (dto.answers && dto.answers.length > 0) {
        await this.applyAnswersWithClient(tx, report.id, dto.answers);
      }
      if (selectedKpis) {
        await this.syncKpiAchievements(
          tx,
          report.id,
          ctx.actorId,
          selectedKpis,
        );
      }
      const answers = await tx.dailyReportAnswer.findMany({
        where: { reportId: report.id },
        orderBy: ANSWER_ORDER,
      });
      const missing = answers.filter(
        (answer) =>
          answer.questionIsRequired && answer.content.trim().length === 0,
      );
      if (missing.length > 0) {
        throw new UnprocessableEntityException({
          message: 'Vui lòng trả lời đầy đủ các câu bắt buộc',
          missingQuestionIds: missing.map((answer) => answer.questionId),
        });
      }
      const help = answers.find(
        (answer) =>
          answer.questionKind === DailyReportQuestionKind.need_help &&
          answer.content.trim().length > 0,
      );

      const latestRevision = await tx.dailyReportRevision.findFirst({
        where: { reportId: report.id },
        orderBy: { revisionNumber: 'desc' },
        select: { revisionNumber: true },
      });
      const revisionNumber = (latestRevision?.revisionNumber ?? 0) + 1;
      await tx.dailyReportRevision.create({
        data: {
          reportId: report.id,
          revisionNumber,
          submittedById: ctx.actorId,
          submittedAt: now,
          isFirstSubmit,
          isLate: false,
          reopenReason: report.reopenReason,
          // Nguồn sự thật của vòng duyệt gắn với chính lần nộp này.
          // `reviewExpiredAt` để null: cron sẽ ghi khi hết hạn mà chưa ai quyết.
          reviewDeadlineAt: newReviewDeadline,
          answersSnapshot: answers.map((answer) => ({
            questionId: answer.questionId,
            kind: answer.questionKind,
            label: answer.questionLabel,
            hint: answer.questionHint,
            isRequired: answer.questionIsRequired,
            allowTaskLink: answer.questionAllowTaskLink,
            sortOrder: answer.sortOrder,
            content: answer.content,
            linkedTaskIds: answer.linkedTaskIds,
            mentionedUserIds: answer.mentionedUserIds,
            attachments: answer.attachments,
          })) as unknown as Prisma.InputJsonValue,
        },
      });

      /*
       * Yêu cầu hỗ trợ đi theo câu 3 của lần nộp này. Ba ca nộp lại phải xử lý
       * riêng, nếu không hai danh sách "chưa giải quyết" / "đã giải quyết" sai:
       *
       *   1. Câu 3 bị xoá trắng mà còn yêu cầu mở -> huỷ yêu cầu đó.
       *   2. Còn yêu cầu mở -> cập nhật nội dung vào chính yêu cầu đó.
       *   3. Không còn yêu cầu mở, và yêu cầu gần nhất đã được giải quyết với
       *      ĐÚNG nội dung này -> không tạo yêu cầu mới. Đây là ca hay gặp
       *      nhất: bản bị trả lại, thành viên sửa câu khác rồi nộp lại, câu 3
       *      giữ nguyên. Tạo mới là bắt người duyệt tích lại một việc đã xong.
       *
       * Ca 1 quyết định từ `report.helpRequests` đã nạp trước giao dịch; lệnh
       * ghi lọc lại theo trạng thái, nên yêu cầu vừa được tích giữa chừng không
       * bị huỷ theo.
       */
      let helpRequestId: string | null = null;
      if (help) {
        const openHelp = await tx.dailyReportHelpRequest.findFirst({
          where: { reportId: report.id, status: { in: OPEN_HELP_STATUSES } },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (openHelp) {
          await tx.dailyReportHelpRequest.update({
            where: { id: openHelp.id },
            data: {
              content: help.content,
              linkedTaskIds: help.linkedTaskIds,
              mentionedUserIds: help.mentionedUserIds,
            },
          });
          helpRequestId = openHelp.id;
        } else {
          const lastResolved = await tx.dailyReportHelpRequest.findFirst({
            where: {
              reportId: report.id,
              status: DailyReportHelpRequestStatus.RESOLVED,
            },
            orderBy: { resolvedAt: 'desc' },
            select: { content: true },
          });
          if (lastResolved?.content.trim() !== help.content.trim()) {
            const created = await tx.dailyReportHelpRequest.create({
              data: {
                reportId: report.id,
                answerId: help.id,
                requesterId: report.userId,
                content: help.content,
                linkedTaskIds: help.linkedTaskIds,
                mentionedUserIds: help.mentionedUserIds,
              },
              select: { id: true },
            });
            helpRequestId = created.id;
          }
        }
      } else if (report.helpRequests.some((h) => isHelpOpen(h.status))) {
        await tx.dailyReportHelpRequest.updateMany({
          where: { reportId: report.id, status: { in: OPEN_HELP_STATUSES } },
          data: {
            status: DailyReportHelpRequestStatus.CANCELLED,
            cancelledById: ctx.actorId,
            cancelledAt: now,
          },
        });
      }

      const outboxRows: Prisma.DailyReportNotificationOutboxCreateManyInput[] =
        [];
      for (const leaderId of leaderIds.filter((id) => id !== report.userId)) {
        outboxRows.push({
          idempotencyKey: `daily-report:submitted:${report.id}:${revisionNumber}:${leaderId}`,
          kind: DailyReportOutboxKind.REPORT_SUBMITTED,
          recipientId: leaderId,
          actorId: ctx.actorId,
          scopeId: scope.id,
          reportId: report.id,
          payload: {
            action: NotificationAction.daily_report_submitted,
            message: `${ownerName} đã nộp báo cáo ngày ${this.formatDmy(report.reportDate)} (${scopeName})`,
            reportId: report.id,
          },
        });
      }
      if (help && helpRequestId) {
        const recipients = Array.from(
          new Set([...leaderIds, ...help.mentionedUserIds]),
        ).filter((id) => id !== report.userId);
        /*
         * Khoá theo NỘI DUNG câu hỏi, không theo lần nộp: nộp lại mà câu 3 giữ
         * nguyên thì không ai bị báo lại, người vừa được nhắc tên thêm vẫn nhận,
         * còn sửa nội dung thì mọi người nhận được báo lại.
         */
        const contentKey = createHash('sha1')
          .update(help.content.trim())
          .digest('hex')
          .slice(0, 16);
        for (const recipientId of recipients) {
          outboxRows.push({
            idempotencyKey: `daily-report:help:${helpRequestId}:${contentKey}:${recipientId}`,
            kind: DailyReportOutboxKind.HELP_REQUESTED,
            recipientId,
            actorId: ctx.actorId,
            scopeId: scope.id,
            reportId: report.id,
            payload: {
              action: NotificationAction.daily_report_help_requested,
              message: `${ownerName} cần hỗ trợ: ${help.content.slice(0, 120)}`,
              reportId: report.id,
            },
          });
        }
      }
      if (outboxRows.length > 0) {
        await tx.dailyReportNotificationOutbox.createMany({
          data: outboxRows,
          skipDuplicates: true,
        });
      }
      return true;
    });

    if (!claimed) {
      const current = await this.loadReport(report.id);
      return this.serializeReport(current, scope, await this.scopeMeta(scope));
    }

    const full = await this.loadReport(report.id);
    return this.serializeReport(full, scope, await this.scopeMeta(scope));
  }

  /** POST /daily-reports/:id/reopen — chủ trong ngày, trưởng nhóm mọi lúc. */
  /**
   * POST /daily-reports/:id/review — kết luận của người duyệt trên MỘT lần nộp.
   *
   * Thiết kế: docs/features/task-management/20-vong-duyet-bao-cao.md mục 7.
   */
  async review(
    reportId: string,
    userId: string,
    dto: ReviewDailyReportDto,
    onBehalfOfUserId?: string,
  ) {
    const ctx = await this.resolveActingContext(userId, onBehalfOfUserId);
    const report = await this.loadReport(reportId);
    const scope = await this.scopeService.getScopeOrThrow(report.scopeId);
    const now = new Date();

    /* ── Sáu điều kiện, kiểm theo ĐÚNG thứ tự, mỗi cái một mã lỗi riêng ──── */

    // 1. Quyền trên CẶP (người duyệt, chủ báo cáo). Ba tham số, không phải hai.
    if (
      !(await this.scopeService.canReviewReport(
        scope,
        ctx.actorId,
        report.userId,
      ))
    ) {
      throw new ForbiddenException('Bạn không có quyền duyệt báo cáo này');
    }
    // 2. Không tự duyệt bài của chính mình.
    if (report.userId === ctx.actorId) {
      throw new ForbiddenException('Không thể tự duyệt báo cáo của chính mình');
    }
    // 3. Chỉ duyệt bản ĐÃ NỘP. `DRAFT` chưa có gì để đọc, `REOPENED` đang chờ
    //    thành viên sửa.
    if (report.status !== DailyReportStatus.SUBMITTED) {
      throw new ConflictException(
        'Chỉ duyệt được báo cáo đang ở trạng thái đã nộp',
      );
    }
    // 4. Phải có lần nộp để gắn kết luận vào.
    const latestRevision = await this.prisma.dailyReportRevision.findFirst({
      where: { reportId: report.id },
      orderBy: { revisionNumber: 'desc' },
      select: {
        id: true,
        revisionNumber: true,
        answersSnapshot: true,
        reviewDeadlineAt: true,
      },
    });
    if (!latestRevision) {
      throw new ConflictException('Báo cáo chưa có lần nộp nào để duyệt');
    }
    // 5. Một vòng duyệt = một lần nộp.
    if (report.reviewDecision) {
      throw new ConflictException('Báo cáo này đã có kết luận duyệt');
    }
    // 6. Còn trong cửa sổ duyệt. Kiểm CẢ HAI: cột do cron ghi, và mốc đã chốt
    //    lúc nộp — giữa lúc hết hạn thật và lúc cron chạy có một khoảng trống.
    const expiredByDeadline = Boolean(
      latestRevision.reviewDeadlineAt &&
      now.getTime() > latestRevision.reviewDeadlineAt.getTime(),
    );
    if (report.reviewExpiredAt || expiredByDeadline) {
      throw new ForbiddenException(
        'Đã quá hạn duyệt báo cáo này. Trưởng nhóm có thể mở lại để thành viên nộp lại.',
      );
    }

    /* ── Kiểm tra dữ liệu đầu vào ────────────────────────────────────────── */

    const items = dto.carryOvers ?? [];
    if (dto.decision === DailyReportReviewDecision.CONTINUED) {
      if (items.length === 0) {
        throw new UnprocessableEntityException(
          'Chọn "Tiếp tục thực hiện" thì phải có ít nhất một việc chuyển sang ngày sau',
        );
      }
    } else if (items.length > 0) {
      throw new UnprocessableEntityException(
        'Chỉ quyết định "Tiếp tục thực hiện" mới kèm được việc chuyển tiếp',
      );
    }
    if (
      dto.decision === DailyReportReviewDecision.REJECTED &&
      !dto.comment?.trim()
    ) {
      throw new UnprocessableEntityException(
        'Trả lại báo cáo thì phải ghi lý do',
      );
    }

    const resolvedCarryOvers = await this.resolveCarryOverItems(
      report,
      scope,
      this.collectRevisionTaskIds(latestRevision.answersSnapshot),
      items,
    );
    const toReportDate = this.carryTargetDate(report, scope, now);

    const rejected = dto.decision === DailyReportReviewDecision.REJECTED;
    const editableUntil = rejected
      ? minuteOfDayInstant(
          nextWorkingDate(dayStrInTz(now, scope.timezone), scope.weekdays),
          scope.cutoffMinute,
          scope.timezone,
        )
      : null;

    /* ── Một transaction cho cả quyết định ───────────────────────────────── */

    const claimed = await this.runReviewTransaction(
      report,
      latestRevision,
      ctx.actorId,
      dto,
      now,
      rejected,
      editableUntil,
      resolvedCarryOvers,
      toReportDate,
    );

    if (!claimed) {
      throw new ConflictException(
        'Báo cáo vừa được người khác xử lý hoặc đã quá hạn duyệt, mời tải lại',
      );
    }

    const full = await this.loadReport(report.id);
    return this.serializeReport(
      full,
      scope,
      await this.scopeMeta(scope),
      {
        isOwner: false,
        isManager: await this.scopeService.isManager(scope, ctx.actorId),
        canReadGroup: true,
      },
      await this.buildReviewContext(full, scope, ctx.actorId),
    );
  }

  /**
   * Huỷ một dòng chuyển tiếp. Ghi `cancelledAt`, KHÔNG xoá cứng.
   *
   * Xoá cứng là mất dấu một quyết định của con người, và làm `carriedCount` của
   * cả chuỗi đổi số mà không ai truy được vì sao. Hủy mềm cũng là thứ giữ cho
   * partial unique index `(fromReportId, chainId) WHERE cancelledAt IS NULL`
   * mở lại đúng chỗ: sau khi huỷ, người duyệt đẩy lại chuỗi đó được.
   *
   * Ai được huỷ nằm ở `carryCancelDenial`, dùng chung với cờ `canCancel`.
   *
   * KHÔNG đụng tới `reviewDecision`: báo cáo đã kết luận `CONTINUED` thì giữ
   * nguyên `CONTINUED` kể cả khi mọi dòng carry bị huỷ. Dữ liệu phái sinh không
   * được sửa quyết định của con người (thiết kế mục 7.2 và 10.4).
   */
  async cancelCarryOver(carryOverId: string, userId: string) {
    const row = await this.prisma.dailyReportCarryOver.findFirst({
      where: { id: carryOverId, cancelledAt: null },
      select: {
        id: true,
        createdById: true,
        reviewId: true,
        confirmedByReviewId: true,
        confirmedByReview: { select: { reviewerId: true } },
        fromReport: { select: { scopeId: true } },
      },
    });
    if (!row) {
      throw new NotFoundException('Không tìm thấy việc chuyển tiếp này');
    }

    // `includeArchived`: phạm vi đã lưu trữ phải nhận đúng lý do từ luật huỷ,
    // không phải 404 "không tìm thấy cấu hình".
    const scope = await this.scopeService.getScopeOrThrow(
      row.fromReport.scopeId,
      { includeArchived: true },
    );
    const denial = carryCancelDenial(
      {
        reviewId: row.reviewId,
        createdById: row.createdById,
        confirmerId: row.confirmedByReview?.reviewerId ?? null,
      },
      userId,
      {
        isArchived: Boolean(scope.archivedAt),
        isManager: await this.scopeService.isManager(scope, userId),
      },
    );
    if (denial) {
      throw new ForbiddenException(denial);
    }

    /*
     * Ghi CÓ ĐIỀU KIỆN theo đúng những cột mà quyết định vừa đọc.
     *
     * Lọc mỗi `cancelledAt: null` như bản trước là kiểm-rồi-ghi: người duyệt gửi
     * huỷ dòng mình tạo ở lượt trước, lúc đọc dòng chưa lượt nào xác nhận lại;
     * trong vài truy vấn trước khi ghi, một lượt "Tiếp tục thực hiện" mới gắn
     * `confirmedByReviewId` lên đúng dòng đó - và lệnh huỷ vẫn khớp, gỡ luôn chỉ
     * đạo mà người duyệt kia vừa đứng tên. Cột nào đổi giữa hai bước thì
     * `count = 0`.
     */
    const now = new Date();
    const claimed = await this.prisma.dailyReportCarryOver.updateMany({
      where: {
        id: row.id,
        cancelledAt: null,
        reviewId: row.reviewId,
        confirmedByReviewId: row.confirmedByReviewId,
      },
      data: { cancelledAt: now },
    });
    if (claimed.count === 0) {
      throw new ConflictException(
        'Việc chuyển tiếp này vừa được huỷ hoặc vừa được người duyệt xác nhận, mời tải lại',
      );
    }
    return { id: row.id, cancelledAt: now };
  }

  /**
   * Phần ghi của một lượt duyệt, tách riêng để chỗ bắt lỗi ràng buộc gọn lại.
   *
   * Bắt `P2002` ĐÚNG hai constraint của vòng duyệt, không bắt mọi `P2002`:
   * nuốt hết là che mất lỗi trùng của thứ khác.
   */
  private async runReviewTransaction(
    report: DailyReport,
    latestRevision: { id: string; revisionNumber: number },
    actorId: string,
    dto: ReviewDailyReportDto,
    now: Date,
    rejected: boolean,
    editableUntil: Date | null,
    resolvedCarryOvers: ResolvedCarryItem[],
    toReportDate: Date,
  ): Promise<string | null> {
    try {
      return await this.reviewWriteSteps(
        report,
        latestRevision,
        actorId,
        dto,
        now,
        rejected,
        editableUntil,
        resolvedCarryOvers,
        toReportDate,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = String(error.meta?.target ?? '');
        // `revisionId` unique: người duyệt thứ hai bấm trên cùng một lần nộp.
        if (target.includes('revisionId')) {
          throw new ConflictException(
            'Báo cáo vừa được người khác xử lý, mời tải lại',
          );
        }
        // Partial unique của carry: một dòng cùng chuỗi hoặc cùng task vừa
        // xuất hiện giữa lúc lượt duyệt đọc danh sách và lúc ghi.
        if (isCarryOverUniqueViolation(error)) {
          throw new ConflictException(
            'Có việc đã được chuyển tiếp từ báo cáo này rồi',
          );
        }
      }
      throw error;
    }
  }

  private async reviewWriteSteps(
    report: DailyReport,
    latestRevision: { id: string; revisionNumber: number },
    actorId: string,
    dto: ReviewDailyReportDto,
    now: Date,
    rejected: boolean,
    editableUntil: Date | null,
    resolvedCarryOvers: ResolvedCarryItem[],
    toReportDate: Date,
  ): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      /*
       * COMPARE-AND-SET, không phải kiểm-rồi-ghi.
       *
       * `@unique` trên `revisionId` chốt race giữa hai NGƯỜI DUYỆT, nhưng không
       * với tới race với cron đánh dấu hết hạn: hai bên ghi hai cột khác nhau.
       * Số dòng bị ảnh hưởng ở đây mới là thứ quyết định. Thiết kế 20 mục 7.7.
       */
      const update = await tx.dailyReport.updateMany({
        where: {
          id: report.id,
          status: DailyReportStatus.SUBMITTED,
          reviewDecision: null,
          reviewExpiredAt: null,
        },
        data: {
          reviewDecision: dto.decision,
          reviewedById: actorId,
          reviewedAt: now,
          reviewedRevisionNumber: latestRevision.revisionNumber,
          // Trả lại thì mở luôn cửa sổ sửa, không bắt thành viên đi xin lần nữa.
          ...(rejected
            ? {
                status: DailyReportStatus.REOPENED,
                isResponse: false,
                editableUntil,
              }
            : {}),
        },
      });
      if (update.count === 0) return null;

      const review = await tx.dailyReportReview.create({
        data: {
          reportId: report.id,
          revisionId: latestRevision.id,
          reviewerId: actorId,
          decision: dto.decision,
          comment: dto.comment ?? null,
        },
        select: { id: true },
      });

      const newRows = resolvedCarryOvers.filter((row) => !row.confirmId);
      if (newRows.length > 0) {
        await tx.dailyReportCarryOver.createMany({
          data: newRows.map((row) => ({
            chainId: row.chainId,
            fromReportId: report.id,
            toReportDate,
            reviewId: review.id,
            taskId: row.taskId,
            note: row.note,
            createdById: actorId,
          })),
        });
      }

      /*
       * XÁC NHẬN LẠI dòng mà lượt duyệt trước của cùng báo cáo đã chuyển đi,
       * thay vì tạo dòng thứ hai: partial unique không cho hai dòng còn hiệu lực
       * cùng chuỗi hoặc cùng task. Dòng giữ nguyên ngày đích và nội dung, chỉ
       * nhận thêm dấu người xác nhận.
       *
       * Compare-and-set trên `cancelledAt`: dòng bị huỷ giữa lúc đọc và lúc ghi
       * thì cả lượt duyệt rollback, không có kết luận nào trỏ vào một dòng chết.
       */
      const confirmIds = resolvedCarryOvers
        .map((row) => row.confirmId)
        .filter((id): id is string => id !== null);
      if (confirmIds.length > 0) {
        const confirmed = await tx.dailyReportCarryOver.updateMany({
          where: {
            id: { in: confirmIds },
            fromReportId: report.id,
            cancelledAt: null,
          },
          data: { confirmedByReviewId: review.id },
        });
        if (confirmed.count !== confirmIds.length) {
          throw new ConflictException(
            'Có việc chuyển tiếp vừa bị huỷ trong lúc duyệt, mời tải lại',
          );
        }
      }

      /*
       * Thông báo cho CHÍNH chủ báo cáo. Ba kind riêng theo lối nhóm
       * HELP_ACKNOWLEDGED / HELP_RESOLVED / HELP_CANCELLED đang chạy, không gộp
       * thành một kind với payload phân nhánh.
       *
       * `revisionNumber` nằm trong khoá: nộp lại rồi duyệt lại vẫn gửi được
       * thông báo mới thay vì bị dedupe nuốt mất.
       */
      const notice = REVIEW_NOTICE[dto.decision];
      await tx.dailyReportNotificationOutbox.createMany({
        data: [
          {
            idempotencyKey: `daily-report:reviewed:${report.id}:${latestRevision.revisionNumber}:${report.userId}`,
            kind: notice.kind,
            recipientId: report.userId,
            actorId,
            scopeId: report.scopeId,
            reportId: report.id,
            payload: {
              action: notice.action,
              message: `${notice.message} ${this.formatDmy(report.reportDate)}${
                dto.comment ? `. Nhận xét: ${dto.comment}` : ''
              }`,
              reportId: report.id,
            },
          },
        ],
        skipDuplicates: true,
      });

      return review.id;
    });
  }

  async reopen(
    reportId: string,
    userId: string,
    dto: ReopenDailyReportDto,
    onBehalfOfUserId?: string,
  ) {
    const ctx = await this.resolveActingContext(userId, onBehalfOfUserId);
    const report = await this.loadReport(reportId);
    const scope = await this.scopeService.getScopeOrThrow(report.scopeId);

    /*
     * Đường thoát của ngõ cụt "Quá hạn bổ sung" (thiết kế 7.8, trạng thái 8 mục
     * 11.1): bản REOPENED đã hết cửa sổ sửa thì không ai duyệt được vì không
     * phải SUBMITTED, mà thành viên cũng không sửa được nữa. Chỉ quản lý chính
     * gỡ được, bằng cách cấp một `editableUntil` mới.
     *
     * Bản trước chặn MỌI bản REOPENED ngay tại đây, nên đường thoát mà thiết kế
     * lẫn board ("chỉ quản lý gỡ được") đều hứa lại không tồn tại.
     */
    const expiredEdit =
      report.status === DailyReportStatus.REOPENED &&
      this.isReportLocked(report, scope);
    if (report.status !== DailyReportStatus.SUBMITTED && !expiredEdit) {
      throw new ConflictException(
        report.status === DailyReportStatus.REOPENED
          ? 'Báo cáo đang mở để sửa, chưa cần mở lại'
          : 'Bản báo cáo này chưa được nộp',
      );
    }

    const isOwner = report.userId === ctx.effectiveUserId;
    const isManager = await this.scopeService.isManager(scope, ctx.actorId);
    if (expiredEdit && !isManager) {
      throw new ForbiddenException(
        'Chỉ trưởng nhóm mới cấp lại được hạn sửa cho báo cáo quá hạn bổ sung',
      );
    }
    const sameDay = this.isSameReportDay(report, scope);
    const beforeHardStop = !this.isReportLocked(report, scope);

    /*
     * BA đường quyền riêng biệt, không gộp (thiết kế 20 mục 7.9):
     *
     *   1. Người ĐÃ ra quyết định trên chính bản này - họ chịu trách nhiệm về
     *      kết luận của mình nên được rút lại để bổ sung.
     *   2. Quản lý chính của phạm vi - kể cả với báo cáo đã QUÁ HẠN duyệt, đó
     *      là đường thoát duy nhất của tình huống đó.
     *   3. Chủ báo cáo tự mở lại, giữ nguyên luật cũ: trong ngày, trước cutoff.
     *
     * Người duyệt phụ KHÔNG phải người đã chốt thì không mở lại được, kể cả khi
     * họ cũng phụ trách thành viên đó - nếu không thì luật "hành động hợp lệ
     * đầu tiên chốt vòng duyệt" thành vô nghĩa.
     */
    const isDecider = Boolean(
      report.reviewedById && report.reviewedById === ctx.actorId,
    );

    /*
     * Vòng duyệt đã CHẠM tới báo cáo này chưa: đã có kết luận, hoặc đã bị đánh
     * dấu quá hạn duyệt.
     *
     * Đây là điều kiện thu hẹp có chủ ý so với mục 7.9 của bản thiết kế, vốn
     * cho `isManager` mở lại vô điều kiện. Lý do: nới như thế là bỏ hard stop
     * cho trưởng nhóm ở MỌI báo cáo, kể cả bản chưa ai đụng tới - trong khi thứ
     * duy nhất nghiệp vụ cần là đường thoát cho bản đã duyệt hoặc đã quá hạn
     * duyệt. Contract 15 mục 3 nói `canReopen=false` với mọi vai từ cutoff, nên
     * mỗi ngoại lệ phải có yêu cầu đứng sau (plan, nguyên tắc 4).
     */
    const inReviewCycle = Boolean(
      report.reviewDecision || report.reviewExpiredAt,
    );
    const canReopen =
      expiredEdit ||
      (isDecider && inReviewCycle) ||
      (isManager && (inReviewCycle || (sameDay && beforeHardStop))) ||
      (isOwner && sameDay && beforeHardStop);
    if (!canReopen) {
      throw new ForbiddenException(
        `Báo cáo chỉ được mở lại bởi người đã duyệt, bởi trưởng nhóm, hoặc bởi chính chủ trong ngày và trước ${dailyReportMinuteLabel(scope.cutoffMinute)}`,
      );
    }

    const reopenedAt = new Date();

    /*
     * Người duyệt mở lại thì cấp một cửa sổ sửa tới hết cutoff của ngày làm
     * việc KẾ TIẾP tính từ lúc bấm. Đây là ngoại lệ duy nhất của hard stop,
     * xem `isReportLocked`.
     *
     * Chủ báo cáo tự mở lại thì KHÔNG cấp: họ vốn đã ở trong ngày và trước
     * cutoff, luật cũ đủ rồi, và cấp thêm là lặng lẽ nới hạn nộp cho chính
     * người phải nộp.
     */
    const editableUntil =
      isDecider || isManager
        ? minuteOfDayInstant(
            nextWorkingDate(
              dayStrInTz(reopenedAt, scope.timezone),
              scope.weekdays,
            ),
            scope.cutoffMinute,
            scope.timezone,
          )
        : null;
    const claimed = await this.prisma.$transaction(async (tx) => {
      const update = await tx.dailyReport.updateMany({
        // Compare-and-set trên đúng trạng thái vừa đọc. Nhánh "Quá hạn bổ sung"
        // khoá thêm theo `editableUntil` cũ: hai lần cấp hạn cùng lúc thì một bên
        // thắng, không có hai cửa sổ chồng lên nhau.
        where: expiredEdit
          ? {
              id: report.id,
              status: DailyReportStatus.REOPENED,
              editableUntil: report.editableUntil,
            }
          : { id: report.id, status: DailyReportStatus.SUBMITTED },
        data: {
          status: DailyReportStatus.REOPENED,
          isResponse: false,
          reopenedById: ctx.actorId,
          reopenedAt,
          reopenReason: dto.reason,
          // MỞ LẠI KHÔNG XOÁ KẾT LUẬN CŨ. Một báo cáo hoàn toàn có thể ở
          // `REOPENED` + `reviewDecision = ACCEPTED` cùng lúc: đã từng được
          // duyệt đạt, và hiện đang mở cho bổ sung. Chỉ khi thành viên NỘP LẠI
          // thì cụm cột duyệt mới được đặt lại - xem `submit`.
          editableUntil,
        },
      });
      if (update.count === 0) return false;
      if (!isOwner) {
        await tx.dailyReportNotificationOutbox.createMany({
          data: [
            {
              idempotencyKey: `daily-report:reopened:${report.id}:${reopenedAt.toISOString()}:${report.userId}`,
              kind: DailyReportOutboxKind.REPORT_REOPENED,
              recipientId: report.userId,
              actorId: ctx.actorId,
              scopeId: scope.id,
              reportId: report.id,
              payload: {
                action: NotificationAction.daily_report_reopened,
                message: `Báo cáo ngày ${this.formatDmy(report.reportDate)} được mở lại: ${dto.reason}`,
                reportId: report.id,
              },
            },
          ],
          skipDuplicates: true,
        });
      }
      return true;
    });
    if (!claimed) {
      throw new ConflictException('Báo cáo đã được mở lại bởi request khác');
    }

    const full = await this.loadReport(report.id);
    return this.serializeReport(full, scope, await this.scopeMeta(scope));
  }

  // ── Bảng nhóm & tổng hợp ─────────────────────────────────────────────────

  /** GET /daily-reports/scope/:scopeId/board (US-10). */
  async getBoard(scopeId: string, userId: string, query: QueryBoardDto) {
    const scope = await this.scopeService.getScopeOrThrow(scopeId, {
      includeArchived: true,
    });
    // Cổng VÀ bộ lọc trong một: hàm này tự ném 403 cho người không có quyền,
    // và trả danh sách thành viên mà người xem được nhìn. Quên lọc theo giá trị
    // trả về là rò rỉ dữ liệu, không phải lỗi hiển thị.
    const boardVisibleMemberIds =
      await this.scopeService.resolveVisibleMemberIds(scope, userId);

    const dayStr = query.date ?? dayStrInTz(new Date(), scope.timezone);
    await this.ensureReportsForRead(scope, dayStr);
    const reportDate = reportDateValue(dayStr);
    const reports = await this.prisma.dailyReport.findMany({
      where: {
        scopeId,
        reportDate,
        deletedAt: null,
        ...(boardVisibleMemberIds === 'all'
          ? {}
          : { userId: { in: boardVisibleMemberIds } }),
      },
      include: {
        answers: { orderBy: ANSWER_ORDER },
        helpRequests: { orderBy: { createdAt: 'desc' } },
        kpiAchievements: {
          include: { kpi: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    const userIds = Array.from(
      new Set(
        reports.flatMap((report) => [
          report.userId,
          ...(report.submittedById ? [report.submittedById] : []),
        ]),
      ),
    );
    /*
     * Mốc kết thúc ngày đang xem, theo múi giờ nghiệp vụ của nhóm. `end` của
     * `dayBoundsUtc` là nửa đêm KẾ TIẾP quy về UTC, và là mốc LOẠI TRỪ — nên
     * `lt: end` đọc đúng là "KPI đã tồn tại vào một lúc nào đó trong ngày này
     * hoặc trước đó". Đừng đổi thành `lte`.
     */
    const { end: dayEndUtc } = dayBoundsUtc(dayStr, scope.timezone);
    /*
     * Danh mục KPI chạy SONG SONG với truy vấn người dùng: nó không phụ thuộc
     * `userIds` nên xếp tuần tự chỉ là thêm một vòng chờ vào đúng endpoint mà
     * trưởng nhóm mở nhiều nhất trong ngày.
     *
     * `createdAt: { lt: dayEndUtc }` là thứ giữ cho SỐ LIỆU CỦA NGÀY ĐÃ CHỐT
     * đứng yên. Không có nó, một KPI tạo hôm nay hiện trên bảng của MỌI ngày
     * cũ ở mức 0%, và vì `achievedPercent` lấy mẫu số là `số KPI × số người`
     * (`report-kpi.helper.ts`), thêm một KPI là tỉ lệ của mọi ngày trong quá
     * khứ tụt theo — trong khi báo cáo những ngày ấy đã khoá, không ai tick bù
     * được. Đúng luật đã chốt ở `docs/features/task-management/
     * 15-contract-chot-truoc-test.md`: "tạo KPI mới không hồi tố vào ngày cũ".
     *
     * ⚠ Bộ lọc này CHỈ dành cho đường ĐỌC của bảng theo dõi một ngày. Tuyệt
     * đối không chép nó sang `DailyReportKpisService.list` hay `validateKpis`:
     * hai chỗ đó phục vụ việc TICK KPI, mà tick một KPI rồi bị `validateKpis`
     * từ chối là thành viên không nộp được và không có cách nào gỡ tick từ
     * giao diện — đúng sự cố 26/08/2026 đã ghi ở `report-form.tsx`. Vì vậy
     * danh sách ở đây CỐ Ý khác popup quản lý KPI, không phải lệch cần sửa.
     *
     * Ca biên đã cân và chấp nhận: KPI tạo SAU mốc khoá của ngày (ví dụ 23:30
     * khi `cutoffMinute` là 23:00) vẫn lọt vào ngày đó và thành dòng 0% không
     * ai tick bù được. Chặn riêng ca này sẽ làm popup và bảng lệch nhau sau
     * giờ khoá — đổi một ca hiếm lấy một ca khó hiểu hơn. Cách chữa từ giao
     * diện đã có sẵn: ngừng dùng KPI đó rồi tạo lại vào hôm sau.
     */
    const [users, activeKpis] = await Promise.all([
      userIds.length > 0
        ? this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: BOARD_USER_SELECT,
          })
        : Promise.resolve<BoardUser[]>([]),
      this.prisma.dailyReportKpi.findMany({
        where: {
          scopeId,
          archivedAt: null,
          isActive: true,
          createdAt: { lt: dayEndUtc },
        },
        select: { id: true, name: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);
    const userById = new Map(users.map((user) => [user.id, user]));
    let rows = reports.map((report) => {
      const owner = userById.get(report.userId);
      const previewAnswer = pickPreviewAnswer(report.answers);
      const boardRowLocked = this.isReportLocked(report, scope);
      return {
        userId: report.userId,
        fullName: owner?.fullName ?? '',
        avatarUrl: owner?.avatar?.fileUrl ?? null,
        reportId: report.id,
        status: report.status,
        isLocked: boardRowLocked,
        isMissed: this.isMissedReport(report, boardRowLocked),
        // Trục duyệt của dòng này. `boardState` suy ở MỘT chỗ, client chỉ đọc
        // và render badge - client tự suy là hai bên lệch nhau lúc nào không
        // biết.
        boardState: this.resolveBoardState(report, boardRowLocked),
        reviewDecision: report.reviewDecision,
        reviewedById: report.reviewedById,
        reviewedByName: report.reviewedById
          ? (userById.get(report.reviewedById)?.fullName ?? null)
          : null,
        reviewedAt: report.reviewedAt,
        reviewDeadlineAt: report.reviewDeadlineAt,
        reviewExpiredAt: report.reviewExpiredAt,
        firstSubmittedAt: report.firstSubmittedAt,
        lastSubmittedAt: report.lastSubmittedAt,
        // Còn một yêu cầu mở là "cần hỗ trợ", dù yêu cầu cũ hơn đã giải quyết.
        helpStatus: helpStatusOf(report.helpRequests),
        // Nội dung yêu cầu mới nhất còn mở (hoặc mới nhất nếu đã xong hết):
        // bộ lọc "Cần hỗ trợ" của bảng in câu này thay cho đoạn xem trước,
        // để dòng nói về việc cần hỗ trợ chứ không đọc như một bản chờ duyệt.
        helpExcerpt: (
          (
            report.helpRequests.find((help) => isHelpOpen(help.status)) ??
            report.helpRequests[0]
          )?.content ?? ''
        ).slice(0, 160),
        submittedByName: report.submittedById
          ? (userById.get(report.submittedById)?.fullName ?? null)
          : null,
        preview: (previewAnswer?.content ?? '').slice(0, 120),
      };
    });

    const allRows = rows;
    if (query.status === 'submitted')
      rows = rows.filter((row) => row.status === DailyReportStatus.SUBMITTED);
    else if (query.status === 'pending')
      rows = rows.filter((row) => row.status !== DailyReportStatus.SUBMITTED);
    else if (query.status === 'missed')
      rows = rows.filter((row) => row.isMissed);

    return {
      scope: await this.scopeMeta(scope),
      date: dayStr,
      stats: {
        total: allRows.length,
        submitted: allRows.filter(
          (row) => row.status === DailyReportStatus.SUBMITTED,
        ).length,
        pending: allRows.filter(
          (row) => row.status !== DailyReportStatus.SUBMITTED,
        ).length,
        missed: allRows.filter((row) => row.isMissed).length,
        /*
         * BA con số rời nhau, không con nào cộng vào con nào:
         *
         *   missed            - thành viên chưa làm.
         *   pendingReview     - người duyệt chưa đọc.
         *   expiredReview     - người duyệt đã lỡ hẳn.
         *
         * Gộp bất kỳ hai cái nào là mất đúng thứ tính năng này sinh ra để giải.
         * `pendingReview` TUYỆT ĐỐI không cộng vào `missed`: thành viên đã nộp
         * thì nghĩa vụ của ngày đó xong rồi.
         */
        pendingReview: allRows.filter((row) => row.boardState === 'CHO_DUYET')
          .length,
        expiredReview: allRows.filter(
          (row) => row.boardState === 'QUA_HAN_DUYET',
        ).length,
        // Không có con số riêng trong vòng này, nhưng board lọc được theo nó.
        expiredEdit: allRows.filter(
          (row) => row.boardState === 'QUA_HAN_BO_SUNG',
        ).length,
        needHelp: allRows.filter((row) => row.helpStatus === 'OPEN').length,
        shown: rows.length,
        /*
         * Người duyệt phụ chỉ thấy phần mình phụ trách, nên giao diện phải nói
         * rõ "đang xem N thành viên bạn phụ trách". Không nói thì họ tưởng cả
         * nhóm chỉ có N người, và quản lý nhìn qua vai tưởng board hỏng.
         */
        visibleMemberCount: allRows.length,
        isFilteredToAssignment: boardVisibleMemberIds !== 'all',
      },
      /*
       * Mẫu số là `allRows.length` (= `stats.total`) chứ không phải số người đã
       * nộp: câu hỏi trưởng nhóm đang hỏi là "bao nhiêu phần trăm NHÓM đạt KPI
       * này hôm nay", nên người chưa nộp phải nằm trong mẫu số. Lấy mẫu số là số
       * người đã nộp sẽ cho ra 100% vào lúc mới có một người nộp.
       */
      kpiSummary: buildDailyKpiSummary(activeKpis, reports, allRows.length),
      rows,
    };
  }

  /**
   * GET /daily-reports/scope/:scopeId/pending-review - mọi bản của nhóm đang
   * chờ kết luận, XUYÊN NGÀY.
   *
   * Vì sao không dùng bảng theo dõi: `getBoard` là ảnh của MỘT ngày (một dòng
   * một thành viên), nên chip "Chờ duyệt" ở đó chỉ thấy bản nộp trong đúng
   * ngày đang xem. Người duyệt vắng hai ngày thì hai ngày ấy không có lối vào
   * nào ngoài thông báo - đúng lỗi UAT 16/09/2026.
   *
   * Phạm vi người: y như bảng, qua `resolveVisibleMemberIds`. Trưởng nhóm thấy
   * CẢ nhóm, kể cả bản thuộc bộ phận của người duyệt khác (quyết định 16/09:
   * badge là tải của cả nhóm); người duyệt phụ chỉ thấy bộ phận mình phụ
   * trách, và dải của họ cũng tên "Bộ phận của bạn" nên con số không nói quá.
   *
   * Bản của CHÍNH người xem bị loại: không ai tự duyệt bản của mình
   * (`canReviewReport`), để lại là một dòng không bao giờ bấm được. Cùng luật
   * với `countPendingReviews` của `my/pending-count`, và hai con số này hiện
   * cùng lúc trên một màn nên không được lệch nhau.
   */
  async getPendingReview(
    scopeId: string,
    userId: string,
    query: QueryPendingReviewDto,
  ) {
    const scope = await this.scopeService.getScopeOrThrow(scopeId, {
      includeArchived: true,
    });
    // Cổng VÀ bộ lọc trong một: hàm này tự ném 403 cho người không có quyền,
    // và trả danh sách thành viên mà người xem được nhìn.
    const visibleMemberIds = await this.scopeService.resolveVisibleMemberIds(
      scope,
      userId,
    );
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const now = new Date();

    const where: Prisma.DailyReportWhereInput = {
      scopeId,
      deletedAt: null,
      status: DailyReportStatus.SUBMITTED,
      reviewDecision: null,
      reviewExpiredAt: null,
      reviewDeadlineAt: { gt: now },
      userId:
        visibleMemberIds === 'all'
          ? { not: userId }
          : { in: visibleMemberIds.filter((id) => id !== userId) },
    };

    const [rows, total] = await Promise.all([
      this.prisma.dailyReport.findMany({
        where,
        select: {
          id: true,
          userId: true,
          reportDate: true,
          firstSubmittedAt: true,
          lastSubmittedAt: true,
          reviewDeadlineAt: true,
        },
        /* Hạn duyệt tăng dần: việc sắp lỡ nằm trên cùng. `reportDate` chỉ là
           mốc phụ cho hai bản cùng hạn, và `id` chốt thứ tự để phân trang
           không nhảy dòng giữa hai trang. */
        orderBy: [
          { reviewDeadlineAt: 'asc' },
          { reportDate: 'asc' },
          { id: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.dailyReport.count({ where }),
    ]);

    const ownerIds = Array.from(new Set(rows.map((row) => row.userId)));
    const [owners, memberGroupRows, isManagerOfScope] = await Promise.all([
      ownerIds.length > 0
        ? this.prisma.user.findMany({
            where: { id: { in: ownerIds } },
            select: BOARD_USER_SELECT,
          })
        : Promise.resolve<BoardUser[]>([]),
      /* Bộ phận của từng người nộp, kèm người duyệt của bộ phận đó: trưởng
         nhóm thấy 5 bản chờ thì câu hỏi kế tiếp luôn là "ai phải duyệt", nên
         tên người duyệt đi cùng dòng thay vì phải mở trang Bộ phận. */
      ownerIds.length > 0
        ? this.prisma.dailyReportReviewGroupMember.findMany({
            where: { memberId: { in: ownerIds }, group: { scopeId } },
            select: PENDING_REVIEW_GROUP_SELECT,
          })
        : Promise.resolve<PendingReviewGroupRow[]>([]),
      this.scopeService.isManager(scope, userId),
    ]);

    // Người duyệt là soft FK sang `users`, Prisma không join hộ được nên tên
    // phải tra riêng sau khi đã biết id.
    const reviewerIds = Array.from(
      new Set(
        memberGroupRows.flatMap((row) =>
          row.group.reviewers.map((reviewer) => reviewer.reviewerId),
        ),
      ),
    );
    const reviewers =
      reviewerIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: reviewerIds } },
            select: BOARD_USER_SELECT,
          })
        : [];
    const userById = new Map<string, BoardUser>(
      [...owners, ...reviewers].map((user) => [user.id, user]),
    );
    const personOf = (id: string) => {
      const user = userById.get(id);
      return {
        id,
        fullName: user?.fullName ?? 'Người dùng đã xoá',
        avatarUrl: user?.avatar?.fileUrl ?? null,
      };
    };

    const departmentsByMember = new Map<
      string,
      {
        id: string;
        name: string;
        reviewers: { id: string; fullName: string; avatarUrl: string | null }[];
      }[]
    >();
    for (const row of memberGroupRows) {
      const list = departmentsByMember.get(row.memberId) ?? [];
      list.push({
        id: row.group.id,
        name: row.group.name,
        reviewers: row.group.reviewers.map((reviewer) =>
          personOf(reviewer.reviewerId),
        ),
      });
      departmentsByMember.set(row.memberId, list);
    }

    /*
     * `canReview` từng dòng, bốn nhánh và không nhánh nào suy ra được từ nhánh
     * khác:
     *   · phạm vi đã lưu trữ - không ai duyệt được, dù vẫn đọc được;
     *   · trưởng nhóm        - duyệt được mọi dòng (bản của mình đã bị loại);
     *   · mảng memberIds     - chính là những người mình phụ trách, nên mọi
     *     dòng còn lại đều duyệt được; `resolveVisibleMemberIds` đã kiểm cả
     *     luật "người duyệt phải đang thuộc phạm vi" ở nhánh đó;
     *   · còn lại là admin nền tảng hoặc người xem lưu trữ: nhận `'all'` mà
     *     không quản lý nhóm, tức ĐỌC được cả nhóm nhưng chỉ duyệt được phần
     *     được giao, nên phải hỏi `canReviewReport` từng người. Đường này
     *     hiếm, và đổi một truy vấn mỗi người lấy đúng luật là đáng.
     */
    const canReviewOf = async (memberId: string): Promise<boolean> => {
      if (scope.archivedAt) return false;
      if (isManagerOfScope) return true;
      if (visibleMemberIds !== 'all') return true;
      return this.scopeService.canReviewReport(scope, userId, memberId);
    };
    const canReviewEntries = await Promise.all(
      ownerIds.map(
        async (id) => [id, await canReviewOf(id)] as [string, boolean],
      ),
    );
    const canReviewByMember = new Map(canReviewEntries);

    return {
      scope: await this.scopeMeta(scope),
      data: rows.map((row) => ({
        reportId: row.id,
        reportDate: reportDateLabel(row.reportDate),
        owner: personOf(row.userId),
        firstSubmittedAt: row.firstSubmittedAt,
        lastSubmittedAt: row.lastSubmittedAt,
        reviewDeadlineAt: row.reviewDeadlineAt,
        departments: departmentsByMember.get(row.userId) ?? [],
        canReview: canReviewByMember.get(row.userId) ?? false,
      })),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
      isFilteredToAssignment: visibleMemberIds !== 'all',
    };
  }

  /**
   * GET /daily-reports/scope/:scopeId/outcome — nội dung đã nộp của cả nhóm
   * trong một ngày, để trưởng nhóm đọc như một bản tổng hợp chung.
   *
   * Chỉ lấy bản SUBMITTED: bản nháp của thành viên không phải là outcome đã
   * chốt, và việc trộn nó vào bản tổng hợp sẽ khiến người xem tưởng đó là kết
   * quả chính thức của nhóm.
   */
  async getGroupOutcome(scopeId: string, userId: string, query: QueryBoardDto) {
    const scope = await this.scopeService.getScopeOrThrow(scopeId, {
      includeArchived: true,
    });
    // Cổng VÀ bộ lọc trong một: hàm này tự ném 403 cho người không có quyền,
    // và trả danh sách thành viên mà người xem được nhìn. Quên lọc theo giá trị
    // trả về là rò rỉ dữ liệu, không phải lỗi hiển thị.
    const outcomeVisibleMemberIds =
      await this.scopeService.resolveVisibleMemberIds(scope, userId);

    const dayStr = query.date ?? dayStrInTz(new Date(), scope.timezone);
    await this.ensureReportsForRead(scope, dayStr);
    const reportDate = reportDateValue(dayStr);
    const reports = await this.prisma.dailyReport.findMany({
      where: {
        scopeId,
        reportDate,
        deletedAt: null,
        ...(outcomeVisibleMemberIds === 'all'
          ? {}
          : { userId: { in: outcomeVisibleMemberIds } }),
      },
      include: { answers: { orderBy: ANSWER_ORDER } },
    });
    const submittedReports = reports.filter(
      (report) => report.status === DailyReportStatus.SUBMITTED,
    );
    const userIds = Array.from(
      new Set(submittedReports.map((report) => report.userId)),
    );
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
              id: true,
              fullName: true,
              avatar: { select: { fileUrl: true } },
            },
          })
        : [];
    const userById = new Map(users.map((user) => [user.id, user]));

    return {
      scope: await this.scopeMeta(scope),
      date: dayStr,
      stats: {
        total: reports.length,
        submitted: submittedReports.length,
        pending: reports.length - submittedReports.length,
      },
      reports: submittedReports.map((report) => {
        const owner = userById.get(report.userId);
        return {
          reportId: report.id,
          userId: report.userId,
          fullName: owner?.fullName ?? '',
          avatarUrl: owner?.avatar?.fileUrl ?? null,
          submittedAt: report.lastSubmittedAt ?? report.submittedAt,
          answers: report.answers.map((answer) => ({
            kind: answer.questionKind,
            label: answer.questionLabel,
            sortOrder: answer.sortOrder,
            content: answer.content,
          })),
        };
      }),
    };
  }

  /** GET /daily-reports/scope/:scopeId/summary (US-13). */
  async getSummary(scopeId: string, userId: string, query: QuerySummaryDto) {
    const scope = await this.scopeService.getScopeOrThrow(scopeId, {
      includeArchived: true,
    });
    // Cổng VÀ bộ lọc trong một: hàm này tự ném 403 cho người không có quyền,
    // và trả danh sách thành viên mà người xem được nhìn. Quên lọc theo giá trị
    // trả về là rò rỉ dữ liệu, không phải lỗi hiển thị.
    const summaryVisibleMemberIds =
      await this.scopeService.resolveVisibleMemberIds(scope, userId);
    this.assertRange(query.from, query.to);

    const reportDays: string[] = [];
    for (
      let d = query.from;
      d <= query.to;
      d = reportDateLabel(
        new Date(reportDateValue(d).getTime() + 24 * 60 * 60 * 1000),
      )
    ) {
      const weekday = reportDateValue(d).getUTCDay();
      const isoWeekday = weekday === 0 ? 7 : weekday;
      if (scope.weekdays.includes(isoWeekday)) reportDays.push(d);
    }
    await Promise.all(
      reportDays.map((day) => this.ensureReportsForRead(scope, day)),
    );

    const reports = await this.prisma.dailyReport.findMany({
      where: {
        scopeId,
        deletedAt: null,
        reportDate: {
          gte: reportDateValue(query.from),
          lte: reportDateValue(query.to),
        },
        ...(summaryVisibleMemberIds === 'all'
          ? {}
          : { userId: { in: summaryVisibleMemberIds } }),
      },
      include: {
        answers: { orderBy: ANSWER_ORDER },
        helpRequests: true,
        kpiAchievements: { include: { kpi: true } },
      },
    });

    const reportUserIds = Array.from(
      new Set(reports.map((report) => report.userId)),
    );
    /* Bộ phận của phạm vi, kèm người duyệt và thành viên. Dùng cho hai việc:
       gắn bộ phận vào từng dòng thành viên, và dựng các thẻ tổng hợp THEO BỘ
       PHẬN của Tổng quan (UAT 16/09/2026 lượt 2). Một người thuộc được nhiều bộ
       phận, nên thẻ tính theo từng bộ phận một, không ghép tên. */
    const summaryGroups =
      reportUserIds.length > 0
        ? await this.prisma.dailyReportReviewGroup.findMany({
            where: { scopeId },
            select: {
              id: true,
              name: true,
              reviewers: { select: { reviewerId: true } },
              members: { select: { memberId: true } },
            },
            orderBy: { name: 'asc' },
          })
        : [];
    /* Người ĐÃ KẾT LUẬN và người duyệt của bộ phận cũng cần tên và ảnh: khối
       trạng thái duyệt của Tổng quan phải nói rõ AI đã duyệt, không chỉ xanh
       hay đỏ (điểm 2 của UAT 16/09/2026). Gộp vào cùng một lượt tra user. */
    const summaryLookupUserIds = Array.from(
      new Set([
        ...reportUserIds,
        ...reports
          .map((report) => report.reviewedById)
          .filter((id): id is string => id !== null),
        ...summaryGroups.flatMap((group) =>
          group.reviewers.map((reviewer) => reviewer.reviewerId),
        ),
      ]),
    );
    const users = await this.prisma.user.findMany({
      where: { id: { in: summaryLookupUserIds } },
      // Ảnh đại diện đi cùng tên ngay từ đây, giống hệt `getBoard`: bảng tổng
      // hợp liệt kê nhiều người cạnh nhau nên cần mặt người để quét mắt, mà
      // client không có đường nào khác lấy ảnh trong phạm vi màn này.
      select: {
        id: true,
        fullName: true,
        avatar: { select: { fileUrl: true } },
      },
    });
    const userNameById = new Map(users.map((user) => [user.id, user.fullName]));
    const userAvatarById = new Map(
      users.map((user) => [user.id, user.avatar?.fileUrl ?? null]),
    );

    /* Bộ phận của từng thành viên, để Tổng quan xem được THEO BỘ PHẬN. Một
       người thuộc được nhiều bộ phận, nên đây là mảng chứ không phải một giá
       trị; ai chưa được chia thì mảng rỗng và client gom vào cụm riêng. */
    const visibleReportUserIds = new Set(reportUserIds);
    const departmentsByMember = new Map<
      string,
      { id: string; name: string }[]
    >();
    for (const group of summaryGroups) {
      for (const { memberId } of group.members) {
        if (!visibleReportUserIds.has(memberId)) continue;
        const list = departmentsByMember.get(memberId) ?? [];
        list.push({ id: group.id, name: group.name });
        departmentsByMember.set(memberId, list);
      }
    }

    // Số ngày làm việc trong khoảng (khớp weekdays của scope).
    let workingDays = 0;
    for (
      let d = query.from;
      d <= query.to;
      d = reportDateLabel(
        new Date(reportDateValue(d).getTime() + 24 * 60 * 60 * 1000),
      )
    ) {
      const weekday = reportDateValue(d).getUTCDay();
      const iso = weekday === 0 ? 7 : weekday;
      if (scope.weekdays.includes(iso)) workingDays += 1;
    }

    const byUser = new Map<string, DailyReport[]>();
    for (const r of reports) {
      const list = byUser.get(r.userId) ?? [];
      list.push(r);
      byUser.set(r.userId, list);
    }

    const memberStats = reportUserIds.map((memberId) => {
      const list = byUser.get(memberId) ?? [];
      /*
       * "Đã nộp" đọc từ `firstSubmittedAt`, KHÔNG từ `status`.
       *
       * Đây là bản sao THỨ TƯ của lỗi ở mục 4.1 tài liệu thiết kế, tìm thấy
       * ngày 09/09/2026 khi làm phase 03: đếm theo `status === SUBMITTED` thì
       * mọi báo cáo bị trả lại (`REOPENED`) rơi vào `missed`, tức thành viên bị
       * tính thiếu báo cáo vì người duyệt trả lại bài của họ.
       */
      const submitted = list.filter((report) => report.firstSubmittedAt).length;
      const expected = list.length;
      /* Hai con số của trục DUYỆT đếm CÙNG LUẬT với hàng đợi chờ duyệt
         (`getPendingReview`): chỉ bản trong vòng duyệt, còn hạn. Trước
         17/09/2026 bản nộp trước khi có vòng duyệt (không có hạn) cũng bị đếm
         "chờ duyệt", nên Tổng quan báo việc mà không có lối vào nào. */
      const now = new Date();
      const awaitingDecision = (report: DailyReport) =>
        report.status === DailyReportStatus.SUBMITTED && !report.reviewDecision;
      const pendingReview = list.filter(
        (report) =>
          awaitingDecision(report) &&
          !report.reviewExpiredAt &&
          report.reviewDeadlineAt !== null &&
          report.reviewDeadlineAt > now,
      ).length;
      const expiredReview = list.filter(
        (report) =>
          awaitingDecision(report) &&
          report.reviewDeadlineAt !== null &&
          (report.reviewExpiredAt !== null || report.reviewDeadlineAt <= now),
      ).length;

      /* Dải ngày của TỪNG người, cũ nhất trước.
       *
       * Vì sao trả cả mảng chứ không chỉ mấy con số: một người 18/20 và một
       * người khác cũng 18/20 nhưng hai ngày thiếu nằm liền nhau ngay tuần
       * này là hai tình huống quản lý khác hẳn nhau, mà tỉ lệ phần trăm thì
       * giấu mất điều đó. Trưởng nhóm cần thấy chỗ THỦNG nằm ở đâu.
       *
       * Ba giá trị `status` bám đúng nghĩa đã dùng ở `getBoard`, không thêm
       * nghĩa mới:
       *   submitted — đã nộp;
       *   missed    — hết giờ khoá mà chưa nộp, không sửa được nữa;
       *   pending   — chưa nộp nhưng vẫn còn hạn.
       * Ngày KHÔNG có bản báo cáo thì không xuất hiện trong mảng. Client phải
       * hiểu chỗ thiếu là "không có dữ liệu" (ngày nghỉ của nhóm, hoặc người
       * đó chưa vào nhóm), tuyệt đối không đọc thành "không nộp" — docs 11
       * mục 3.
       */
      const days = list
        .map((report) => ({
          reportId: report.id,
          date: reportDateLabel(report.reportDate),
          status: report.firstSubmittedAt
            ? ('submitted' as const)
            : this.isReportLocked(report, scope)
              ? ('missed' as const)
              : ('pending' as const),
          /* Bản đã nộp NGOÀI vòng duyệt (nộp trước khi có tính năng, không có
             hạn) không có trạng thái duyệt: vắng thay vì "Chờ duyệt" giả. */
          boardState:
            report.status === DailyReportStatus.SUBMITTED &&
            !report.reviewDecision &&
            report.reviewDeadlineAt === null
              ? undefined
              : this.resolveBoardState(
                  report,
                  this.isReportLocked(report, scope),
                ),
          /* AI đã kết luận và kết luận gì, ngay trên ô của từng ngày: màu xanh
             đỏ trả lời "có duyệt chưa", không trả lời "ai duyệt". */
          reviewDecision: report.reviewDecision,
          reviewedBy: report.reviewedById
            ? {
                id: report.reviewedById,
                fullName: userNameById.get(report.reviewedById) ?? '',
                avatarUrl: userAvatarById.get(report.reviewedById) ?? null,
              }
            : null,
        }))
        .sort((a, b) => (a.date < b.date ? -1 : 1));

      return {
        userId: memberId,
        fullName: userNameById.get(memberId) ?? '',
        avatarUrl: userAvatarById.get(memberId) ?? null,
        departments: departmentsByMember.get(memberId) ?? [],
        expected,
        submitted,
        missed: Math.max(0, expected - submitted),
        // Ba con số của người này, rời nhau y như ở board.
        pendingReview,
        expiredReview,
        rate: expected > 0 ? submitted / expected : 0,
        days,
      };
    });

    /*
     * Ba thứ dưới đây tính trên TOÀN BỘ thành viên người xem thấy, KHÔNG theo
     * trang (điểm 7 của UAT 16/09/2026 bật phân trang cho danh sách thành
     * viên):
     *
     *   totals           - bốn con số của cả nhóm. Trước đây client tự cộng từ
     *                      `members`; để vậy thì đổi trang là đổi luôn tỉ lệ
     *                      chung, đúng loại lỗi "thu hẹp một danh sách là thu
     *                      hẹp mọi thứ suy từ nó".
     *   memberDirectory  - danh bạ nhẹ (id, tên, ảnh) cho ô chọn thành viên và
     *                      cho việc biết tên người đang xem ở chế độ "Theo
     *                      thành viên". Hai chỗ đó là ĐIỀU HƯỚNG, không phải
     *                      hiển thị, nên không được thiếu ai.
     *   reviewStateCounts- khối trạng thái duyệt của Tổng quan (điểm 2): đếm
     *                      theo BẢN, không theo người.
     */
    const totals = memberStats.reduce(
      (acc, member) => ({
        expected: acc.expected + member.expected,
        submitted: acc.submitted + member.submitted,
        missed: acc.missed + member.missed,
      }),
      { expected: 0, submitted: 0, missed: 0 },
    );
    const memberDirectory = memberStats
      .map((member) => ({
        userId: member.userId,
        fullName: member.fullName,
        avatarUrl: member.avatarUrl,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));

    const reviewStateCounts: Record<DailyReportBoardState, number> = {
      CHUA_NOP: 0,
      CHO_DUYET: 0,
      QUA_HAN_DUYET: 0,
      DA_DUYET: 0,
      TIEP_TUC: 0,
      QUA_HAN_BO_SUNG: 0,
      BI_TRA_LAI: 0,
      DA_MO_LAI: 0,
    };
    for (const member of memberStats) {
      for (const day of member.days) {
        if (day.boardState !== undefined) {
          reviewStateCounts[day.boardState] += 1;
        }
      }
    }

    /* Lọc và XẾP Ở SERVER, vì client chỉ giữ một trang: xếp trong trang là xếp
       một mẩu ngẫu nhiên của danh sách. `rate` tăng dần = kém đều đặn lên
       trước; `department` xếp theo tên bộ phận rồi tên người để xem theo bộ
       phận, người chưa thuộc bộ phận nào xuống cuối. */
    /* Thẻ tổng hợp của từng bộ phận. Chỉ tính người mà người xem nhìn thấy
       (`memberStats` đã lọc quyền), và bỏ bộ phận không còn ai trong tầm nhìn:
       người duyệt phụ không được biết số liệu của bộ phận người khác. Người
       chưa thuộc bộ phận nào gom vào thẻ `id = null` ở cuối. */
    const statsOf = (members: typeof memberStats) => {
      const expected = members.reduce((sum, m) => sum + m.expected, 0);
      const submitted = members.reduce((sum, m) => sum + m.submitted, 0);
      return {
        memberCount: members.length,
        expected,
        submitted,
        missed: Math.max(0, expected - submitted),
        pendingReview: members.reduce((sum, m) => sum + m.pendingReview, 0),
        rate: expected > 0 ? submitted / expected : 0,
      };
    };
    const departmentStats: Array<
      {
        id: string | null;
        name: string;
        reviewers: { id: string; fullName: string; avatarUrl: string | null }[];
      } & ReturnType<typeof statsOf>
    > = [];
    for (const group of summaryGroups) {
      const memberIds = new Set(group.members.map((m) => m.memberId));
      const members = memberStats.filter((m) => memberIds.has(m.userId));
      if (members.length === 0) continue;
      departmentStats.push({
        id: group.id,
        name: group.name,
        reviewers: group.reviewers.map(({ reviewerId }) => ({
          id: reviewerId,
          fullName: userNameById.get(reviewerId) ?? '',
          avatarUrl: userAvatarById.get(reviewerId) ?? null,
        })),
        ...statsOf(members),
      });
    }
    const unassignedMembers = memberStats.filter(
      (m) => m.departments.length === 0,
    );
    if (unassignedMembers.length > 0 && departmentStats.length > 0) {
      departmentStats.push({
        id: null,
        name: 'Chưa thuộc bộ phận nào',
        reviewers: [],
        ...statsOf(unassignedMembers),
      });
    }

    const memberFiltered = memberStats.filter(
      (member) =>
        (query.reviewState === undefined ||
          member.days.some((day) => day.boardState === query.reviewState)) &&
        (query.memberDepartment === undefined ||
          (query.memberDepartment === 'none'
            ? member.departments.length === 0
            : member.departments.some(
                (department) => department.id === query.memberDepartment,
              ))),
    );
    const departmentKey = (member: (typeof memberStats)[number]) =>
      member.departments.length > 0
        ? member.departments
            .map((department) => department.name)
            .sort((a, b) => a.localeCompare(b, 'vi'))
            .join(', ')
        : '\uffff';
    const memberSorted =
      query.memberSort === 'department'
        ? [...memberFiltered].sort(
            (a, b) =>
              departmentKey(a).localeCompare(departmentKey(b), 'vi') ||
              a.fullName.localeCompare(b.fullName, 'vi'),
          )
        : [...memberFiltered].sort(
            (a, b) =>
              a.rate - b.rate || a.fullName.localeCompare(b.fullName, 'vi'),
          );
    const memberPage = query.memberPage ?? 1;
    const memberPageSize = query.memberLimit ?? 20;
    const membersTotal = memberSorted.length;
    const membersOfPage = memberSorted.slice(
      (memberPage - 1) * memberPageSize,
      memberPage * memberPageSize,
    );
    /* Người đang xem ở chế độ "Theo thành viên" trả RIÊNG, không nhồi vào
       `members`: nhồi vào thì lưới của chế độ "Toàn nhóm" sẽ có một dòng lạc ra
       ngoài trang. Vắng khi không ai được chọn, hoặc khi họ đã nằm trong
       trang. */
    const focusedMember =
      query.memberFocus !== undefined &&
      !membersOfPage.some((member) => member.userId === query.memberFocus)
        ? (memberStats.find((member) => member.userId === query.memberFocus) ??
          null)
        : null;

    // Việc tồn đọng lặp lại nhiều ngày (gom theo `linkedTaskIds` của câu tồn đọng).
    //
    // Nhận CẢ HAI kind: `blocked` là câu hiện hành, `done_blocked` là câu ghép cũ
    // dùng tới 25/08/2026. Khoảng tra cứu của màn Tổng quan lên tới
    // `MAX_HISTORY_RANGE_DAYS` = 92 ngày nên nó chắc chắn vắt qua ngày đổi bộ câu
    // hỏi — chỉ đọc một kind là mất trắng nửa dữ liệu mà không có lỗi nào báo.
    const blockerDays = new Map<string, Set<string>>();
    for (const r of reports) {
      const blocked = r.answers.find(
        (a) =>
          a.questionKind === DailyReportQuestionKind.blocked ||
          a.questionKind === DailyReportQuestionKind.done_blocked,
      );
      if (!blocked) continue;
      for (const taskId of new Set(blocked.linkedTaskIds)) {
        const dates = blockerDays.get(taskId) ?? new Set<string>();
        dates.add(reportDateLabel(r.reportDate));
        blockerDays.set(taskId, dates);
      }
    }
    const recurringIds = Array.from(blockerDays.entries())
      .map(([taskId, dates]) => [taskId, dates.size] as const)
      .filter(([, days]) => days >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    const recurringTasks =
      recurringIds.length > 0
        ? await this.prisma.businessFormTask.findMany({
            where: { id: { in: recurringIds.map(([id]) => id) } },
            select: { id: true, code: true, title: true },
          })
        : [];
    const taskById = new Map(recurringTasks.map((t) => [t.id, t]));
    const recurringBlockers = recurringIds
      .map(([taskId, appearedDays]) => {
        const t = taskById.get(taskId);
        // Việc đã bị xóa cứng → id mồ côi, lọc bỏ (docs 05 mục 8).
        if (!t) return null;
        return { taskId, code: t.code, title: t.title, appearedDays };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    /*
     * Yêu cầu hỗ trợ của các bản trong khoảng, tách hai nhóm: chưa giải quyết
     * (bản mới nhất trước) và đã giải quyết (vừa giải quyết trước). Mỗi nhóm
     * tối đa 50 dòng.
     */
    const helpRows = reports.flatMap((report) =>
      report.helpRequests.map((help) => ({ report, help })),
    );
    const helpItem = (row: (typeof helpRows)[number]) => ({
      id: row.help.id,
      status: row.help.status,
      reportId: row.report.id,
      date: reportDateLabel(row.report.reportDate),
      userId: row.report.userId,
      fullName: userNameById.get(row.report.userId) ?? '',
      excerpt: row.help.content.slice(0, 200),
    });
    /* Phân trang thay cho trần cứng 50 dòng của bản trước: khoảng 92 ngày của
       một nhóm đông vượt 50 là bình thường, và cắt im lặng ở 50 nghĩa là trưởng
       nhóm tưởng mình đã xem hết. Hai danh sách phân trang ĐỘC LẬP vì chúng là
       hai khối riêng trên màn. */
    const helpPageSize = query.helpLimit ?? 10;
    const openHelpAll = helpRows
      .filter((row) => isHelpOpen(row.help.status))
      .map(helpItem)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    const openHelpTotal = openHelpAll.length;
    const openHelpPage = query.openHelpPage ?? 1;
    const openHelpRequests = openHelpAll.slice(
      (openHelpPage - 1) * helpPageSize,
      openHelpPage * helpPageSize,
    );
    const resolvedHelpAll = helpRows
      .filter(
        (row) => row.help.status === DailyReportHelpRequestStatus.RESOLVED,
      )
      .sort(
        (a, b) =>
          (b.help.resolvedAt?.getTime() ?? 0) -
          (a.help.resolvedAt?.getTime() ?? 0),
      );
    const resolvedHelpTotal = resolvedHelpAll.length;
    const resolvedHelpPage = query.resolvedHelpPage ?? 1;
    const resolvedHelps = resolvedHelpAll.slice(
      (resolvedHelpPage - 1) * helpPageSize,
      resolvedHelpPage * helpPageSize,
    );
    const resolverIds = [
      ...new Set(
        resolvedHelps
          .map((row) => row.help.resolvedById)
          .filter((id): id is string => !!id),
      ),
    ];
    const resolvers =
      resolverIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: resolverIds } },
            select: { id: true, fullName: true },
          })
        : [];
    const resolverNameById = new Map(
      resolvers.map((user) => [user.id, user.fullName] as const),
    );
    const resolvedHelpRequests = resolvedHelps.map((row) => ({
      ...helpItem(row),
      resolvedAt: row.help.resolvedAt,
      resolvedBy: row.help.resolvedById
        ? {
            id: row.help.resolvedById,
            fullName: resolverNameById.get(row.help.resolvedById) ?? null,
          }
        : null,
    }));
    /*
     * Cờ tích ở màn Tổng quan, cùng luật với `assertCanResolve`: người duyệt
     * phụ chỉ thấy đúng thành viên mình phụ trách nên tích được mọi dòng, quản
     * lý cũng vậy; admin nền tảng và người xem nhóm đã lưu trữ chỉ đọc.
     */
    const canResolveHelp =
      !scope.archivedAt &&
      (summaryVisibleMemberIds !== 'all' ||
        (await this.scopeService.isManager(scope, userId)));

    /*
     * Bảng KPI của màn Tổng hợp dựng TỪ ACHIEVEMENT, không từ danh mục — nên
     * KPI chưa ai đạt vốn đã không xuất hiện, và không có chuyện KPI mới tạo
     * hồi tố vào khoảng ngày cũ như bảng theo dõi từng mắc.
     *
     * ⚠ Nếu về sau thêm dòng 0% lấy từ danh mục vào đây, phải lọc `createdAt`
     * THEO TỪNG NGÀY trong khoảng, không phải một lần cho cả khoảng. Lọc theo
     * `query.to` là dựng lại đúng lỗi hồi tố cho những ngày đầu khoảng.
     */
    const kpiStats = new Map<
      string,
      {
        kpiId: string;
        name: string;
        reportIds: Set<string>;
        memberIds: Set<string>;
      }
    >();
    for (const report of reports) {
      if (report.status !== DailyReportStatus.SUBMITTED) continue;
      for (const achievement of report.kpiAchievements) {
        const current = kpiStats.get(achievement.kpiId) ?? {
          kpiId: achievement.kpiId,
          name: achievement.nameSnapshot,
          reportIds: new Set<string>(),
          memberIds: new Set<string>(),
        };
        current.reportIds.add(report.id);
        current.memberIds.add(report.userId);
        kpiStats.set(achievement.kpiId, current);
      }
    }

    return {
      range: { from: query.from, to: query.to },
      workingDays,
      /* Bốn con số của cả nhóm, và tỉ lệ tính ở server để client không phải
         cộng lại từ một trang. */
      totals: {
        ...totals,
        rate: totals.expected > 0 ? totals.submitted / totals.expected : 0,
      },
      memberDirectory,
      reviewStateCounts,
      departmentStats,
      members: membersOfPage,
      focusedMember,
      membersTotal,
      memberPage,
      memberPageSize,
      memberTotalPages: Math.max(1, Math.ceil(membersTotal / memberPageSize)),
      recurringBlockers,
      openHelpRequests,
      openHelpTotal,
      openHelpPage,
      openHelpTotalPages: Math.max(1, Math.ceil(openHelpTotal / helpPageSize)),
      resolvedHelpRequests,
      resolvedHelpTotal,
      resolvedHelpPage,
      resolvedHelpTotalPages: Math.max(
        1,
        Math.ceil(resolvedHelpTotal / helpPageSize),
      ),
      helpPageSize,
      canResolveHelp,
      /*
       * `members` trả TÊN người đạt chứ không chỉ con số.
       *
       * Trước đây chỗ này giữ đúng `memberIds.size` rồi vứt luôn cái Set —
       * nên màn Tổng hợp chỉ in được "3 thành viên · 5 báo cáo" và muốn biết
       * AI đạt thì phải mở từng báo cáo một. Danh sách id đã nằm sẵn trong bộ
       * nhớ, `userNameById`/`userAvatarById` cũng đã dựng ở trên, nên đây
       * không tốn thêm truy vấn nào.
       *
       * Sắp theo `localeCompare(…, 'vi')` chứ không so chuỗi thô: so thô thì
       * "Đ" rơi xuống sau "E" và danh sách tên tiếng Việt đọc ra lộn xộn.
       *
       * KHÔNG lọc theo danh mục hiện tại: `kpiStats` dựng từ achievement của
       * báo cáo ĐÃ NỘP, nên KPI đã ngừng dùng vẫn giữ nguyên công của người
       * ta, đúng như `nameSnapshot` sinh ra để làm.
       */
      kpis: Array.from(kpiStats.values())
        .map((item) => ({
          kpiId: item.kpiId,
          name: item.name,
          achievedReports: item.reportIds.size,
          achievedMembers: item.memberIds.size,
          members: Array.from(item.memberIds)
            .map((memberId) => ({
              userId: memberId,
              fullName: userNameById.get(memberId) ?? '',
              avatarUrl: userAvatarById.get(memberId) ?? null,
            }))
            .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi')),
        }))
        .sort((a, b) => b.achievedReports - a.achievedReports),
    };
  }

  // ── Nội bộ ───────────────────────────────────────────────────────────────

  /**
   * Cờ duyệt và danh sách việc kéo cho MỘT người xem cụ thể.
   *
   * `canReview` gộp đủ SÁU điều kiện của `review()`, không chỉ quyền ở mức
   * phạm vi: nếu chỉ trả quyền scope thì giao diện hiện ba nút trên báo cáo mà
   * API chắc chắn từ chối. Thiết kế 20 mục 7.3.
   */
  private async buildReviewContext(
    report: DailyReport,
    scope: DailyReportScope,
    actorId: string,
    now: Date = new Date(),
  ): Promise<{ canReview: boolean; carryCandidates: ReviewCarryCandidate[] }> {
    const empty = { canReview: false, carryCandidates: [] };

    if (report.userId === actorId) return empty;
    if (report.status !== DailyReportStatus.SUBMITTED) return empty;
    if (report.reviewDecision) return empty;
    if (report.reviewExpiredAt) return empty;
    if (
      !(await this.scopeService.canReviewReport(scope, actorId, report.userId))
    ) {
      return empty;
    }

    const latestRevision = await this.prisma.dailyReportRevision.findFirst({
      where: { reportId: report.id },
      orderBy: { revisionNumber: 'desc' },
      select: { answersSnapshot: true, reviewDeadlineAt: true },
    });
    if (!latestRevision) return empty;
    if (
      latestRevision.reviewDeadlineAt &&
      now.getTime() > latestRevision.reviewDeadlineAt.getTime()
    ) {
      return empty;
    }

    return {
      canReview: true,
      carryCandidates: await this.buildCarryCandidates(
        report,
        scope,
        this.collectRevisionTaskIds(latestRevision.answersSnapshot),
        {
          id: actorId,
          isManager: await this.scopeService.isManager(scope, actorId),
        },
      ),
    };
  }

  /**
   * Danh sách việc người duyệt có thể chuyển sang ngày làm việc kế tiếp.
   * `allowedTaskIds` là task của revision đang duyệt.
   *
   * SERVER quyết định, không phải client: trạng thái công việc đổi được giữa
   * lúc thành viên nộp và lúc người duyệt mở ra đọc (`CV001` lúc nộp còn
   * `in_progress`, tới lúc duyệt đã `done`). Ba loại trộn chung, phân biệt
   * bằng `kind`:
   *   - `task`     : việc gắn `BusinessFormTask` trong chính bài đang xét.
   *   - `carried`  : dòng đã chuyển tiếp TỚI báo cáo này từ ngày trước. Thiếu
   *                  loại này thì không có đường nào đẩy tiếp một việc gõ tay.
   *   - `outgoing` : dòng lượt duyệt trước đã chuyển ĐI mà không khớp hai loại
   *                  trên (việc gõ tay). Chọn nó là xác nhận lại dòng đó.
   *
   * Cờ `eligible` phải khớp ĐÚNG luật `resolveCarryOverItems` sẽ áp: ứng viên
   * hiện cho chọn mà API từ chối là lỗi không test nào tự bắt, vì API vẫn trả
   * một mã lỗi hợp lệ.
   */
  private async buildCarryCandidates(
    report: DailyReport,
    scope: DailyReportScope,
    allowedTaskIds: Set<string>,
    viewer: { id: string; isManager: boolean },
  ): Promise<ReviewCarryCandidate[]> {
    const { incoming, outgoing } = await this.loadCarryRowsAround(
      report,
      scope,
    );
    const canCancel = (row: CarryRowRef) =>
      carryCancelDenial(
        {
          reviewId: row.reviewId,
          createdById: row.createdById,
          confirmerId: row.confirmerId,
        },
        viewer.id,
        {
          isArchived: Boolean(scope.archivedAt),
          isManager: viewer.isManager,
        },
      ) === null;
    const rows = [...incoming, ...outgoing];
    const taskIds = new Set(allowedTaskIds);
    for (const row of rows) if (row.taskId) taskIds.add(row.taskId);

    const [tasks, countByChain] = await Promise.all([
      taskIds.size > 0
        ? this.prisma.businessFormTask.findMany({
            where: { id: { in: [...taskIds] }, deletedAt: null },
            select: { id: true, code: true, title: true, status: true },
          })
        : Promise.resolve([]),
      this.countActiveChains(rows.map((row) => row.chainId)),
    ]);
    const taskById = new Map(tasks.map((task) => [task.id, task] as const));

    const outgoingByChain = new Map(
      outgoing.map((row) => [row.chainId, row] as const),
    );
    const outgoingByTask = new Map(
      outgoing
        .filter((row) => row.taskId)
        .map((row) => [row.taskId as string, row] as const),
    );
    const attached = new Set<string>();
    const existingFor = (chainId: string | null, taskId: string | null) => {
      const hit =
        (chainId ? outgoingByChain.get(chainId) : undefined) ??
        (taskId ? outgoingByTask.get(taskId) : undefined);
      if (hit) attached.add(hit.id);
      return hit;
    };

    const out: ReviewCarryCandidate[] = [];
    const takenTaskIds = new Set<string>();

    // Dòng đã chuyển tiếp đứng TRƯỚC: giao diện phải làm "tiếp tục dòng cũ" dễ
    // hơn "gõ mới", nếu không con số đếm chuỗi sẽ vô nghĩa trong thực tế.
    for (const row of incoming) {
      if (row.taskId) takenTaskIds.add(row.taskId);
      const existing = existingFor(row.chainId, row.taskId);
      out.push(
        this.toCarryCandidate({
          key: `carried:${row.id}`,
          kind: 'carried',
          taskId: row.taskId,
          task: row.taskId ? taskById.get(row.taskId) : undefined,
          note: row.note,
          continuesCarryOverId: row.id,
          carriedCount: countByChain.get(existing?.chainId ?? row.chainId) ?? 1,
          existing,
          canCancel: canCancel(row),
        }),
      );
    }

    for (const taskId of allowedTaskIds) {
      // Gộp trùng: một việc gắn task từng được chuyển tiếp sẽ xuất hiện ở CẢ
      // hai nguồn. Giữ bản `carried` vì nó mang `continuesCarryOverId` và
      // `carriedCount`; giữ bản `task` là vứt mất liên kết chuỗi.
      if (takenTaskIds.has(taskId)) continue;
      const task = taskById.get(taskId);
      if (!task) continue;
      const existing = existingFor(null, taskId);
      out.push(
        this.toCarryCandidate({
          key: `task:${task.id}`,
          kind: 'task',
          taskId: task.id,
          task,
          note: null,
          continuesCarryOverId: null,
          carriedCount: existing
            ? (countByChain.get(existing.chainId) ?? 1)
            : 0,
          existing,
          canCancel: false,
        }),
      );
    }

    // Dòng lượt duyệt trước đã chuyển đi mà không khớp ứng viên nào ở trên,
    // điển hình là việc gõ tay. Lượt duyệt sau phải thấy nó thì mới xác nhận
    // lại được.
    for (const row of outgoing) {
      if (attached.has(row.id)) continue;
      out.push(
        this.toCarryCandidate({
          key: `outgoing:${row.id}`,
          kind: 'outgoing',
          taskId: row.taskId,
          task: row.taskId ? taskById.get(row.taskId) : undefined,
          note: row.note,
          continuesCarryOverId: null,
          carriedCount: countByChain.get(row.chainId) ?? 1,
          existing: row,
          canCancel: canCancel(row),
        }),
      );
    }

    return out;
  }

  private toCarryCandidate(input: {
    key: string;
    kind: ReviewCarryCandidate['kind'];
    taskId: string | null;
    task:
      | { code: string | null; title: string; status: BusinessFormTaskStatus }
      | undefined;
    note: string | null;
    continuesCarryOverId: string | null;
    carriedCount: number;
    existing: CarryRowRef | undefined;
    canCancel: boolean;
  }): ReviewCarryCandidate {
    const { task, existing } = input;
    let ineligibleReason: string | null = null;
    if (input.taskId && !task) {
      ineligibleReason = 'Công việc không còn tồn tại';
    } else if (
      task?.status === BusinessFormTaskStatus.done ||
      task?.status === BusinessFormTaskStatus.cancelled
    ) {
      ineligibleReason = 'Công việc đã hoàn thành hoặc đã huỷ';
    }
    return {
      key: input.key,
      kind: input.kind,
      taskId: input.taskId,
      code: task?.code ?? null,
      title: task?.title ?? null,
      status: task?.status ?? null,
      note: input.note,
      continuesCarryOverId: input.continuesCarryOverId,
      carriedCount: input.carriedCount,
      isLongChain: input.carriedCount >= DAILY_REPORT_CARRY_CHAIN_WARN_COUNT,
      existingCarryOver: existing
        ? {
            id: existing.id,
            toReportDate: reportDateLabel(existing.toReportDate),
            note: existing.note,
          }
        : null,
      canCancel: input.canCancel,
      eligible: ineligibleReason === null,
      ineligibleReason,
    };
  }

  /**
   * Dòng carry còn hiệu lực quanh một báo cáo, trong MỘT truy vấn:
   *
   *   incoming - đáp xuống báo cáo này: cùng chủ, cùng phạm vi, `toReportDate`
   *              bằng ngày báo cáo. Nguồn của nhánh 1 và 2 khi phân giải chuỗi.
   *   outgoing - chuyển đi từ báo cáo này. Nguồn của phép kiểm va chạm.
   *
   * Tách hai nhóm theo `fromReportId`: một dòng không thể vừa đi ra vừa đáp xuống
   * cùng một báo cáo, vì ngày đích luôn sau ngày của báo cáo nguồn.
   */
  private async loadCarryRowsAround(
    report: DailyReport,
    scope: DailyReportScope,
  ): Promise<{ incoming: CarryRowRef[]; outgoing: CarryRowRef[] }> {
    const rows = await this.prisma.dailyReportCarryOver.findMany({
      where: {
        cancelledAt: null,
        OR: [
          {
            toReportDate: report.reportDate,
            fromReport: { userId: report.userId, scopeId: scope.id },
          },
          { fromReportId: report.id },
        ],
      },
      select: {
        id: true,
        chainId: true,
        taskId: true,
        note: true,
        fromReportId: true,
        toReportDate: true,
        reviewId: true,
        createdById: true,
        confirmedByReview: { select: { reviewerId: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const refs = rows.map(
      ({ confirmedByReview, ...row }): CarryRowRef => ({
        ...row,
        confirmerId: confirmedByReview?.reviewerId ?? null,
      }),
    );
    return {
      incoming: refs.filter((row) => row.fromReportId !== report.id),
      outgoing: refs.filter((row) => row.fromReportId === report.id),
    };
  }

  /**
   * Số LẦN đã chuyển tiếp của mỗi chuỗi, không phải số NGÀY. Hai con số lệch
   * nhau ngay khi có một lần duyệt muộn (thiết kế 20 mục 10.3).
   */
  private async countActiveChains(
    chainIds: string[],
  ): Promise<Map<string, number>> {
    const unique = [...new Set(chainIds)];
    if (unique.length === 0) return new Map();
    const counts = await this.prisma.dailyReportCarryOver.groupBy({
      by: ['chainId'],
      where: { chainId: { in: unique }, cancelledAt: null },
      _count: { _all: true },
    });
    return new Map(
      counts.map((row) => [row.chainId, row._count._all] as const),
    );
  }

  /**
   * Khối chuyển tiếp hiện trên một báo cáo: mọi dòng đã chuyển đi, kể cả dòng
   * đã huỷ.
   *
   * Dòng đã huỷ vẫn trả về: thiết kế mục 10.4 đòi giao diện nói rõ "các việc
   * chuyển tiếp đã bị hủy" trên báo cáo `CONTINUED`, không được lặng lẽ giấu đi.
   */
  private async buildCarryPanel(
    report: DailyReport,
    scope: DailyReportScope,
    viewerId: string,
    isManager: boolean,
  ): Promise<CarryPanel> {
    const rows = await this.prisma.dailyReportCarryOver.findMany({
      where: { fromReportId: report.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        chainId: true,
        taskId: true,
        note: true,
        toReportDate: true,
        reviewId: true,
        createdById: true,
        cancelledAt: true,
        confirmedByReview: { select: { reviewerId: true } },
      },
    });

    const taskIds = [
      ...new Set(
        rows.map((row) => row.taskId).filter((id): id is string => !!id),
      ),
    ];
    const userIds = [
      ...new Set(
        rows.flatMap((row) =>
          [row.createdById, row.confirmedByReview?.reviewerId].filter(
            (id): id is string => !!id,
          ),
        ),
      ),
    ];
    const [tasks, users, countByChain] = await Promise.all([
      taskIds.length > 0
        ? this.prisma.businessFormTask.findMany({
            where: { id: { in: taskIds } },
            select: { id: true, code: true, title: true, status: true },
          })
        : Promise.resolve([]),
      userIds.length > 0
        ? this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullName: true },
          })
        : Promise.resolve([]),
      this.countActiveChains(rows.map((row) => row.chainId)),
    ]);
    const taskById = new Map(tasks.map((task) => [task.id, task] as const));
    const nameById = new Map(
      users.map((user) => [user.id, user.fullName] as const),
    );

    const outgoing = rows.map((row): CarryOverView => {
      const task = row.taskId ? taskById.get(row.taskId) : undefined;
      const confirmedById = row.confirmedByReview?.reviewerId ?? null;
      const carriedCount = countByChain.get(row.chainId) ?? 0;
      const canCancel =
        row.cancelledAt === null &&
        carryCancelDenial(
          {
            reviewId: row.reviewId,
            createdById: row.createdById,
            confirmerId: confirmedById,
          },
          viewerId,
          { isArchived: Boolean(scope.archivedAt), isManager },
        ) === null;
      return {
        id: row.id,
        chainId: row.chainId,
        taskId: row.taskId,
        code: task?.code ?? null,
        title: task?.title ?? null,
        status: task?.status ?? null,
        note: row.note,
        toReportDate: reportDateLabel(row.toReportDate),
        createdById: row.createdById,
        createdByName: nameById.get(row.createdById) ?? null,
        confirmedById,
        confirmedByName: confirmedById
          ? (nameById.get(confirmedById) ?? null)
          : null,
        carriedCount,
        isLongChain: carriedCount >= DAILY_REPORT_CARRY_CHAIN_WARN_COUNT,
        cancelledAt: row.cancelledAt,
        canCancel,
      };
    });

    return { outgoing };
  }

  /**
   * Ngày đích của mọi dòng chuyển tiếp:
   *
   *   toReportDate = nextWorkingDate(max(reportDate, thời điểm duyệt))
   *
   * Duyệt trong ngày thì `max` ra `reportDate`, kết quả là ngày làm việc kế
   * tiếp. Duyệt muộn ngày 10/09 một báo cáo ngày 08/09 thì kết quả là 11/09 chứ
   * không phải 09/09 đã trôi qua.
   */
  private carryTargetDate(
    report: DailyReport,
    scope: DailyReportScope,
    now: Date,
  ): Date {
    const today = dayStrInTz(now, scope.timezone);
    const reportDay = reportDateLabel(report.reportDate);
    const anchorDay = today > reportDay ? today : reportDay;
    return reportDateValue(nextWorkingDate(anchorDay, scope.weekdays));
  }

  /**
   * Mọi `taskId` mà revision ĐANG DUYỆT có nhắc tới.
   *
   * Đọc từ `answersSnapshot` chứ không từ `report.answers`: snapshot là bất
   * biến, còn câu trả lời hiện tại có thể đã đổi sau lần nộp đó.
   */
  private collectRevisionTaskIds(answersSnapshot: unknown): Set<string> {
    const out = new Set<string>();
    if (!Array.isArray(answersSnapshot)) return out;
    for (const entry of answersSnapshot) {
      const ids = (entry as { linkedTaskIds?: unknown })?.linkedTaskIds;
      if (!Array.isArray(ids)) continue;
      for (const id of ids) if (typeof id === 'string') out.add(id);
    }
    return out;
  }

  /**
   * Kiểm và phân giải từng dòng chuyển tiếp người duyệt gửi kèm `CONTINUED`.
   *
   * ⚠ ĐÂY LÀ KIỂM TRA BẢO MẬT, không phải tiện ích. Client gửi `taskId` tuỳ ý;
   * chỉ kiểm task tồn tại là chưa đủ - người gọi sẽ gắn được việc bất kỳ của
   * toàn hệ thống vào báo cáo người khác.
   *
   * Luật phân giải `chainId`, ba nhánh theo thứ tự (thiết kế 20 mục 10.3):
   *   1. Có `continuesCarryOverId` hợp lệ  -> lấy `chainId` của dòng đó.
   *   2. Có `taskId` và tồn tại dòng carry còn hiệu lực cùng `taskId` đáp
   *      xuống chính báo cáo này -> lấy `chainId` của dòng đó.
   *   3. Còn lại -> sinh `chainId` mới.
   *
   * Nhánh 2 làm việc gắn task tự nối chuỗi kể cả khi giao diện không gửi liên
   * kết. Nhánh 1 là đường DUY NHẤT cho việc gõ tay: không thể so khớp hai đoạn
   * chữ để đoán chúng là cùng một việc.
   *
   * Sau phân giải, phần tử trùng chuỗi hoặc trùng task với một dòng ĐÃ chuyển đi
   * từ chính báo cáo này (lượt duyệt trước tạo) là va chạm: lượt duyệt này xác
   * nhận lại dòng đó thay vì tạo dòng thứ hai.
   */
  private async resolveCarryOverItems(
    report: DailyReport,
    scope: DailyReportScope,
    allowedTaskIds: Set<string>,
    items: ReviewCarryOverItemDto[],
  ): Promise<ResolvedCarryItem[]> {
    const { incoming, outgoing } = await this.loadCarryRowsAround(
      report,
      scope,
    );
    const incomingById = new Map(incoming.map((row) => [row.id, row] as const));
    const incomingByTask = new Map(
      incoming
        .filter((row) => row.taskId)
        .map((row) => [row.taskId as string, row] as const),
    );
    const outgoingById = new Map(outgoing.map((row) => [row.id, row] as const));
    const outgoingByChain = new Map(
      outgoing.map((row) => [row.chainId, row] as const),
    );
    const outgoingByTask = new Map(
      outgoing
        .filter((row) => row.taskId)
        .map((row) => [row.taskId as string, row] as const),
    );

    const resolved: ResolvedCarryItem[] = [];
    const seenChains = new Set<string>();
    const push = (item: ResolvedCarryItem) => {
      // Khử trùng theo `chainId` SAU khi phân giải, không theo `taskId` trước:
      // hai phần tử khác nhau vẫn có thể quy về cùng một chuỗi.
      if (seenChains.has(item.chainId)) return;
      seenChains.add(item.chainId);
      resolved.push(item);
    };

    for (const item of items) {
      // Xác nhận đích danh một dòng đã chuyển đi. Đứng một mình: xác nhận là
      // giữ nguyên dòng đã có, không kèm sửa nội dung hay đổi task.
      if (item.confirmCarryOverId) {
        if (item.taskId || item.continuesCarryOverId || item.note) {
          throw new UnprocessableEntityException(
            'Xác nhận một việc đã chuyển tiếp thì không gửi kèm trường nào khác',
          );
        }
        const existing = outgoingById.get(item.confirmCarryOverId);
        if (!existing) {
          throw new UnprocessableEntityException(
            'Việc được chọn để xác nhận không còn trên báo cáo này',
          );
        }
        if (existing.taskId) await this.assertTaskCarryable(existing.taskId);
        push({
          chainId: existing.chainId,
          taskId: existing.taskId,
          note: existing.note,
          confirmId: existing.id,
        });
        continue;
      }

      const previous = item.continuesCarryOverId
        ? incomingById.get(item.continuesCarryOverId)
        : undefined;

      if (item.continuesCarryOverId && !previous) {
        // Không phân biệt "không tồn tại" với "của phạm vi khác": cả hai đều là
        // dòng KHÔNG được phép nối tiếp, và nói rõ hơn là rò rỉ thông tin về dữ
        // liệu của nhóm khác.
        throw new UnprocessableEntityException(
          'Dòng chuyển tiếp được chọn không thuộc báo cáo này',
        );
      }
      if (item.taskId && previous?.taskId && item.taskId !== previous.taskId) {
        throw new UnprocessableEntityException(
          'Dòng chuyển tiếp và công việc được chọn không khớp nhau',
        );
      }

      const taskId = item.taskId ?? previous?.taskId ?? null;
      if (taskId) {
        /*
         * Task hợp lệ khi nằm trong bài đang xét, HOẶC đến từ một dòng carry đã
         * đáp xuống chính báo cáo này (cùng chủ, cùng phạm vi). Nguồn thứ hai là
         * dữ liệu server đã kiểm lúc tạo dòng đó, không phải giá trị client tự
         * đặt. Thiếu nó thì ứng viên `carried` hiện ra cho chọn mà API từ chối.
         */
        if (!allowedTaskIds.has(taskId) && !incomingByTask.has(taskId)) {
          throw new UnprocessableEntityException(
            'Chỉ chuyển tiếp được công việc có trong chính bản báo cáo này',
          );
        }
        await this.assertTaskCarryable(taskId);
      }

      // `note` kế thừa từ dòng được nối tiếp khi client không gửi. Bắt gõ lại
      // y nguyên chỉ để qua validate là vô nghĩa, và gõ khác đi một chữ thì hai
      // ngày trong cùng một chuỗi lại nói hai nội dung khác nhau.
      const note = item.note ?? previous?.note ?? null;
      if (!taskId && !note) {
        throw new UnprocessableEntityException(
          'Việc không gắn công việc thì phải ghi nội dung cần tiếp tục',
        );
      }

      const chainId =
        previous?.chainId ??
        (taskId ? incomingByTask.get(taskId)?.chainId : undefined) ??
        randomUUID();

      const existing =
        outgoingByChain.get(chainId) ??
        (taskId ? outgoingByTask.get(taskId) : undefined);
      if (!existing) {
        push({ chainId, taskId, note, confirmId: null });
        continue;
      }
      // Xác nhận giữ nguyên nội dung lượt duyệt trước đã ghi. Muốn dặn thêm thì
      // đó là việc của `comment`, không phải ghi đè nội dung đã chốt.
      if (item.note !== undefined && item.note !== existing.note) {
        throw new UnprocessableEntityException(
          'Việc này đã được chuyển sang ngày sau kèm nội dung riêng. Xác nhận là giữ nguyên nội dung đó; muốn dặn thêm, ghi vào nhận xét.',
        );
      }
      push({
        chainId: existing.chainId,
        taskId: existing.taskId,
        note: existing.note,
        confirmId: existing.id,
      });
    }

    return resolved;
  }

  /** Task còn sống và chưa xong thì mới chuyển tiếp được. */
  private async assertTaskCarryable(taskId: string): Promise<void> {
    const task = await this.prisma.businessFormTask.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!task) {
      throw new UnprocessableEntityException(
        'Công việc được chọn không còn tồn tại',
      );
    }
    if (
      task.status === BusinessFormTaskStatus.done ||
      task.status === BusinessFormTaskStatus.cancelled
    ) {
      throw new UnprocessableEntityException(
        'Công việc đã hoàn thành hoặc đã huỷ thì không chuyển tiếp được',
      );
    }
  }

  private async loadReport(reportId: string): Promise<ReportWithAnswers> {
    const report = await this.prisma.dailyReport.findFirst({
      where: { id: reportId, deletedAt: null },
      include: {
        answers: { orderBy: ANSWER_ORDER },
        templateVersion: {
          select: { id: true, version: true, nameSnapshot: true },
        },
        helpRequests: { orderBy: { createdAt: 'desc' } },
        kpiAchievements: {
          include: { kpi: true },
          orderBy: { createdAt: 'asc' },
        },
        user: { select: REPORT_OWNER_SELECT },
      },
    });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo');
    return report;
  }

  /**
   * Nhận xét và tên người duyệt của kết luận ĐANG ĐỨNG trên bản.
   *
   * Lý do trả lại là thứ người duyệt BẮT BUỘC phải ghi, nhưng trước đây nó chỉ
   * đi theo nội dung thông báo: dải "Bị trả lại" của thành viên rơi về câu mặc
   * định, hoặc tệ hơn là in `reopenReason` của một lần tự mở lại trước đó.
   *
   * `reviewerId` là FK mềm nên tên phải tra riêng. Không có kết luận thì trả
   * `null`: nộp lại đã đặt lại cụm vòng duyệt, kết luận cũ không còn là trạng
   * thái của bản nữa.
   */
  private async loadReviewNote(
    report: DailyReport,
  ): Promise<ReviewNote | null> {
    if (!report.reviewDecision || !report.reviewedById) return null;
    const [review, reviewer] = await Promise.all([
      this.prisma.dailyReportReview.findFirst({
        where: {
          reportId: report.id,
          decision: report.reviewDecision,
          reviewerId: report.reviewedById,
        },
        orderBy: { createdAt: 'desc' },
        select: { comment: true },
      }),
      this.prisma.user.findUnique({
        where: { id: report.reviewedById },
        select: { fullName: true },
      }),
    ]);
    return {
      comment: review?.comment ?? null,
      reviewerName: reviewer?.fullName ?? null,
    };
  }

  /**
   * Tên người đã tích "Đã giải quyết" cho các yêu cầu hỗ trợ của bản.
   * `resolvedById` là FK mềm nên tên tra riêng; bản chưa có yêu cầu nào được
   * giải quyết thì không tốn truy vấn nào.
   */
  private async loadHelpResolverNames(
    report: ReportWithAnswers,
  ): Promise<Record<string, string | null>> {
    const ids = [
      ...new Set(
        report.helpRequests
          .map((help) => help.resolvedById)
          .filter((id): id is string => !!id),
      ),
    ];
    if (ids.length === 0) return {};
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, fullName: true },
    });
    return Object.fromEntries(users.map((user) => [user.id, user.fullName]));
  }

  /**
   * Người đang xem tích / bỏ tích được yêu cầu hỗ trợ của bản này không.
   *
   * Cùng luật với `assertCanResolve` của `DailyReportHelpRequestsService`:
   * chính người hỏi (chủ bản), hoặc người duyệt được bản đó; phạm vi đã lưu trữ
   * thì không ai. Theo `actorId` chứ không theo người được chăm sóc, vì các
   * route yêu cầu hỗ trợ không có chế độ làm hộ. Bản không có yêu cầu nào thì
   * trả false mà không hỏi quyền.
   */
  private async canResolveHelpOn(
    report: ReportWithAnswers,
    scope: DailyReportScope,
    actorId: string,
  ): Promise<boolean> {
    if (scope.archivedAt || report.helpRequests.length === 0) return false;
    if (report.userId === actorId) return true;
    return this.scopeService.canReviewReport(scope, actorId, report.userId);
  }

  private async resolveTodayEmptyReason(
    userId: string,
    dayStr: string,
    now: Date,
  ): Promise<
    | 'BEFORE_GENERATION'
    | 'NON_REPORTING_DAY'
    | 'NOT_IN_SNAPSHOT'
    | 'NO_SCOPE'
    | 'SYNCING'
  > {
    if (minutesOfDayInTz(now) < DAILY_REPORT_GENERATE_MINUTE) {
      return 'BEFORE_GENERATION';
    }
    const scopes = await this.scopeService.getScopesOfUser(userId);
    if (scopes.length === 0) return 'NO_SCOPE';
    const reportingScopes = scopes.filter((scope) =>
      this.generator.isReportingDay(scope, now),
    );
    if (reportingScopes.length === 0) return 'NON_REPORTING_DAY';
    const membership = await Promise.all(
      reportingScopes.map((scope) =>
        this.scopeService.getMemberIdsAt(scope, snapshotInstant(dayStr, scope)),
      ),
    );
    if (!membership.some((memberIds) => memberIds.includes(userId))) {
      return 'NOT_IN_SNAPSHOT';
    }
    return 'SYNCING';
  }

  private requireTemplateVersion(report: DailyReport): string {
    if (!report.templateVersionId) {
      throw new ConflictException('Báo cáo chưa được gắn phiên bản template');
    }
    return report.templateVersionId;
  }

  private async validateKpis(scopeId: string, kpiIds: string[]) {
    const uniqueIds = Array.from(new Set(kpiIds));
    if (uniqueIds.length === 0) return [];
    const kpis = await this.prisma.dailyReportKpi.findMany({
      where: {
        id: { in: uniqueIds },
        scopeId,
        isActive: true,
        archivedAt: null,
      },
      select: { id: true, name: true },
    });
    if (kpis.length !== uniqueIds.length) {
      throw new UnprocessableEntityException(
        'KPI không tồn tại, đã ngừng sử dụng hoặc không thuộc nhóm báo cáo',
      );
    }
    return kpis;
  }

  private async syncKpiAchievements(
    tx: Prisma.TransactionClient,
    reportId: string,
    selectedById: string,
    kpis: Array<{ id: string; name: string }>,
  ) {
    await tx.dailyReportKpiAchievement.deleteMany({
      where: {
        reportId,
        ...(kpis.length > 0 ? { kpiId: { notIn: kpis.map((k) => k.id) } } : {}),
      },
    });
    for (const kpi of kpis) {
      await tx.dailyReportKpiAchievement.upsert({
        where: { reportId_kpiId: { reportId, kpiId: kpi.id } },
        create: {
          reportId,
          kpiId: kpi.id,
          nameSnapshot: kpi.name,
          selectedById,
        },
        update: { nameSnapshot: kpi.name, selectedById },
      });
    }
  }

  /** Chủ sở hữu (hoặc làm thay hợp lệ) + còn trong cửa sổ ghi. */
  private assertCanEdit(
    report: DailyReport,
    scope: DailyReportScope,
    ctx: ActingContext,
  ): void {
    if (report.userId !== ctx.effectiveUserId) {
      throw new ForbiddenException('Bạn không có quyền sửa báo cáo này');
    }
    if (report.status === DailyReportStatus.ARCHIVED) {
      throw new ConflictException('Báo cáo đã lưu trữ và chỉ được đọc');
    }
    if (report.status === DailyReportStatus.SUBMITTED) {
      // Đã có kết luận thì nói rõ, vì đường mở lại của hai ca này khác nhau:
      // báo cáo đã duyệt phải xin người duyệt, báo cáo chưa duyệt thì chủ bản
      // tự mở lại được trong ngày.
      throw new ConflictException(
        report.reviewDecision
          ? 'Báo cáo đã được duyệt. Hãy đề nghị người duyệt mở lại trước khi chỉnh sửa.'
          : 'Cần mở lại báo cáo trước khi chỉnh sửa',
      );
    }
    // Nhánh `REOPENED` + `editableUntil` còn hạn đi qua được chỗ này, vì
    // `isReportLocked` đã trả false cho nó. Xem chú thích ở hàm đó.
    this.assertBeforeHardStop(report, scope);
  }

  private assertBeforeHardStop(
    report: DailyReport,
    scope: DailyReportScope,
  ): void {
    if (this.isReportLocked(report, scope)) {
      throw new ConflictException(
        `Báo cáo đã khóa từ ${dailyReportMinuteLabel(scope.cutoffMinute)} và chỉ được đọc`,
      );
    }
  }

  private isSameReportDay(
    report: DailyReport,
    scope: DailyReportScope,
    now: Date = new Date(),
  ): boolean {
    return (
      dayStrInTz(now, scope.timezone) === reportDateLabel(report.reportDate)
    );
  }

  /**
   * "Chua nop" doc tu moc thoi gian, KHONG suy tu trang thai hien tai.
   *
   * Truc nop va truc duyet doc lap: mot bao cao da nop roi bi tra lai co
   * `status = REOPENED`, nhung nghia vu nop cua thanh vien da hoan thanh tu
   * `firstSubmittedAt`. Suy tu `status` la dem no thanh chua nop.
   *
   * Thiet ke: docs/features/task-management/20-vong-duyet-bao-cao.md muc 4.1.
   */
  private isMissedReport(
    report: Pick<DailyReport, 'firstSubmittedAt'>,
    locked: boolean,
  ): boolean {
    return !report.firstSubmittedAt && locked;
  }

  /**
   * TÁM trạng thái của một dòng trên bảng theo dõi, suy ở MỘT chỗ để board và
   * giao diện không tự suy khác nhau.
   *
   * Đọc từ trên xuống, nhánh đầu tiên khớp là trạng thái hiển thị. Thứ tự quan
   * trọng: `QUA_HAN_BO_SUNG` phải đứng TRƯỚC hai nhánh `REOPENED` còn lại, nếu
   * không nó không bao giờ hiện ra.
   *
   * Thiết kế: 20-vong-duyet-bao-cao.md mục 11.1.
   */
  /**
   * Trục duyệt của một dòng lịch sử: đủ để client in badge kết luận, và biết
   * bản có nằm trong vòng duyệt hay không - bản nộp trước khi có vòng duyệt
   * không có hạn, không có kết luận, không có mốc hết hạn.
   */
  private historyReviewFields(
    report: Pick<
      DailyReport,
      | 'status'
      | 'firstSubmittedAt'
      | 'reviewDecision'
      | 'reviewExpiredAt'
      | 'reviewDeadlineAt'
    >,
    locked: boolean,
  ) {
    return {
      boardState: this.resolveBoardState(report, locked),
      reviewDecision: report.reviewDecision,
      reviewDeadlineAt: report.reviewDeadlineAt,
    };
  }

  private resolveBoardState(
    report: Pick<
      DailyReport,
      | 'status'
      | 'firstSubmittedAt'
      | 'reviewDecision'
      | 'reviewExpiredAt'
      | 'reviewDeadlineAt'
    >,
    locked: boolean,
  ): DailyReportBoardState {
    // 1. "Chưa nộp" đọc từ mốc thời gian, KHÔNG từ `status` — một bản bị trả
    //    lại có `status = REOPENED` nhưng thành viên đã nộp rồi.
    if (!report.firstSubmittedAt) return 'CHUA_NOP';

    if (report.status === DailyReportStatus.SUBMITTED) {
      if (report.reviewDecision === DailyReportReviewDecision.ACCEPTED) {
        return 'DA_DUYET';
      }
      if (report.reviewDecision === DailyReportReviewDecision.CONTINUED) {
        return 'TIEP_TUC';
      }
      // 3. Hết cửa sổ mà không ai quyết: rời hàng chờ duyệt, KHÔNG bịa ra một
      //    giá trị enum quyết định nào.
      if (report.reviewExpiredAt) return 'QUA_HAN_DUYET';
      // Hạn đã qua mà job hết hạn (chạy ở workers) chưa kịp đóng dấu: cũng là
      // quá hạn. Nếu không, bản vẫn đọc "Chờ duyệt" trong khi hàng đợi chờ
      // duyệt (`reviewDeadlineAt > now`) đã loại nó ra - có chữ mà không có
      // lối vào (UAT 17/09/2026).
      if (report.reviewDeadlineAt && report.reviewDeadlineAt <= new Date()) {
        return 'QUA_HAN_DUYET';
      }
      return 'CHO_DUYET';
    }

    if (report.status === DailyReportStatus.REOPENED) {
      // 8. Ngõ cụt: không ai duyệt được vì `status` khác `SUBMITTED`, mà thành
      //    viên cũng không sửa được nữa. Bám vào "còn sửa được không" thay vì
      //    riêng `editableUntil`, để bắt luôn nhánh REOPENED không có cửa sổ
      //    nào và bị `cutoffMinute` khoá theo luật cũ.
      if (locked) return 'QUA_HAN_BO_SUNG';
      if (report.reviewDecision === DailyReportReviewDecision.REJECTED) {
        return 'BI_TRA_LAI';
      }
      return 'DA_MO_LAI';
    }

    /*
     * Phạm vi đã lưu trữ: vòng duyệt đóng băng ở đúng kết luận cuối. Trước đây
     * nhánh này rơi thẳng xuống "Đã duyệt" cho mọi bản đã nộp, kể cả bản chưa
     * ai đọc. Chưa có kết luận mà đã có hạn thì không ai duyệt được nữa: đó là
     * "Quá hạn duyệt". Bản nộp trước khi có vòng duyệt (không có hạn) rơi về
     * "Chờ duyệt", và client chỉ hiện trạng thái duyệt khi bản nằm trong vòng.
     */
    if (report.reviewDecision === DailyReportReviewDecision.ACCEPTED) {
      return 'DA_DUYET';
    }
    if (report.reviewDecision === DailyReportReviewDecision.CONTINUED) {
      return 'TIEP_TUC';
    }
    if (report.reviewDecision === DailyReportReviewDecision.REJECTED) {
      return 'BI_TRA_LAI';
    }
    return report.reviewExpiredAt || report.reviewDeadlineAt
      ? 'QUA_HAN_DUYET'
      : 'CHO_DUYET';
  }

  /**
   * Báo cáo đang khoá hay không.
   *
   * ⚠ NGOẠI LỆ DUY NHẤT của hard stop `cutoffMinute` nằm ở đây, và chỉ ở đây:
   * một báo cáo `REOPENED` mang `editableUntil` còn hạn thì thành viên sửa và
   * nộp lại được, KỂ CẢ khi báo cáo thuộc ngày trước. Cửa sổ đó chỉ do đường
   * duyệt tạo ra - chủ báo cáo không tự cấp cho mình được.
   *
   * Đây KHÔNG phải nộp trễ: nghĩa vụ nộp đã hoàn thành từ `firstSubmittedAt`,
   * đây là sửa theo yêu cầu của người duyệt và revision cũ vẫn còn nguyên.
   * Contract 15 mục 3; thiết kế 20 mục 7.8.
   *
   * Sửa đúng trong hàm này, KHÔNG rải ra 7 chỗ gọi - board và màn chi tiết mà
   * nói hai điều khác nhau về cùng một báo cáo là lỗi không ai tự phát hiện.
   */
  private isReportLocked(
    report: Pick<DailyReport, 'status' | 'editableUntil' | 'reportDate'>,
    scope: DailyReportScope,
    now: Date = new Date(),
  ): boolean {
    if (
      report.status === DailyReportStatus.REOPENED &&
      report.editableUntil &&
      now.getTime() <= report.editableUntil.getTime()
    ) {
      return false;
    }
    return this.isReportDateLocked(
      report.reportDate,
      scope.timezone,
      scope.cutoffMinute,
      now,
    );
  }

  private isReportDateLocked(
    reportDate: Date,
    timezone: string,
    cutoffMinute: number,
    now: Date = new Date(),
  ): boolean {
    return isReportLockedAt(
      reportDateLabel(reportDate),
      now,
      timezone,
      cutoffMinute,
    );
  }

  /** Ghi đè các câu được gửi lên; câu thiếu giữ nguyên (docs 04 mục 2.5). */
  private async applyAnswersWithClient(
    tx: Prisma.TransactionClient,
    reportId: string,
    answers: SaveAnswerDto[],
  ): Promise<void> {
    for (const a of answers) {
      const content = a.content ?? '';
      await tx.dailyReportAnswer.updateMany({
        where: { reportId, questionId: a.questionId },
        data: {
          content,
          isAutoDrafted:
            a.isAutoDrafted ?? (content.trim().length === 0 ? true : false),
          ...(a.linkedTaskIds !== undefined
            ? { linkedTaskIds: a.linkedTaskIds }
            : {}),
          ...(a.mentionedUserIds !== undefined
            ? { mentionedUserIds: a.mentionedUserIds }
            : {}),
          ...(a.attachments !== undefined
            ? {
                attachments: a.attachments as unknown as Prisma.InputJsonValue,
              }
            : {}),
        },
      });
    }
  }

  private async validateAnswerReferences(
    report: DailyReport,
    answers: SaveAnswerDto[],
  ): Promise<void> {
    if (answers.length === 0) return;
    const storedAnswers = await this.prisma.dailyReportAnswer.findMany({
      where: {
        reportId: report.id,
        questionId: { in: answers.map((answer) => answer.questionId) },
      },
      select: { questionId: true, questionAllowTaskLink: true },
    });
    const byQuestion = new Map(
      storedAnswers.map((answer) => [answer.questionId, answer]),
    );
    for (const answer of answers) {
      const stored = byQuestion.get(answer.questionId);
      if (!stored) {
        throw new UnprocessableEntityException(
          `Câu hỏi ${answer.questionId} không thuộc báo cáo`,
        );
      }
      if (answer.linkedTaskIds?.length && !stored.questionAllowTaskLink) {
        throw new UnprocessableEntityException(
          `Câu hỏi ${answer.questionId} không cho phép liên kết công việc`,
        );
      }
    }

    const taskIds = Array.from(
      new Set(answers.flatMap((answer) => answer.linkedTaskIds ?? [])),
    );
    if (taskIds.length > 0) {
      const accessible = await this.prisma.businessFormTask.findMany({
        where: {
          id: { in: taskIds },
          deletedAt: null,
          OR: [
            { mainAssigneeId: report.userId },
            { createdById: report.userId },
            {
              assignments: {
                some: { userId: report.userId, status: 'accepted' },
              },
            },
          ],
        },
        select: { id: true },
      });
      if (accessible.length !== taskIds.length) {
        throw new ForbiddenException(
          'Có công việc không tồn tại hoặc người báo cáo không có quyền truy cập',
        );
      }
    }

    const mentionedIds = Array.from(
      new Set(answers.flatMap((answer) => answer.mentionedUserIds ?? [])),
    );
    if (mentionedIds.length > 0) {
      const validMembers = await this.prisma.dailyReport.findMany({
        where: {
          scopeId: report.scopeId,
          reportDate: report.reportDate,
          userId: { in: mentionedIds },
        },
        distinct: ['userId'],
        select: { userId: true },
      });
      if (validMembers.length !== mentionedIds.length) {
        throw new ForbiddenException(
          'Chỉ được nhắc thành viên thuộc danh sách nghĩa vụ của báo cáo ngày này',
        );
      }
    }
  }

  /** Điền gợi ý vào các câu còn isAutoDrafted && content rỗng (không ghi DB). */
  private async attachDrafts(
    report: ReportWithAnswers,
    scope: DailyReportScope,
  ): Promise<ReportWithAnswers> {
    const needsDraft = report.answers.some(
      (a) => a.isAutoDrafted && a.content.trim().length === 0,
    );
    if (!needsDraft || report.status === DailyReportStatus.SUBMITTED)
      return report;

    const drafts = await this.draftService.buildDrafts(
      report.userId,
      scope.id,
      reportDateLabel(report.reportDate),
      scope.timezone,
    );
    const byKind = new Map(drafts.map((d) => [d.questionKind, d]));

    return {
      ...report,
      draftSourcesByKind: Object.fromEntries(
        drafts.map((draft) => [draft.questionKind, draft.sources]),
      ),
      draftSuggestionsByKind: Object.fromEntries(
        drafts
          .filter((draft) => draft.content.trim().length > 0)
          .map((draft) => [draft.questionKind, draft.content]),
      ),
      answers: report.answers.map((a) => {
        if (!(a.isAutoDrafted && a.content.trim().length === 0)) return a;
        const draft = byKind.get(a.questionKind);
        if (!draft) return a;
        return {
          ...a,
          // Auto-draft is a suggestion only. Never put generated text or task
          // links into the persisted answer/local textarea value.
        };
      }),
    };
  }

  /**
   * Repair missing snapshot rows while reading a board/history view. This is
   * intentionally notification-free: opening history must not send a
   * "report ready" notification. The generator uses the 07:30 membership
   * snapshot, so a member joined later is not backfilled into an old day, but
   * a leader omitted by an earlier materialization bug is restored.
   *
   * `requireExistingSnapshot: true` — đường đọc CHỈ được bù người thiếu vào
   * ngày đã có ít nhất một bản báo cáo, tuyệt đối không dựng mới một ngày chưa
   * từng có bản nào. Hàm này chạy cho MỌI ngày trong khoảng tra cứu (summary
   * lặp tới MAX_HISTORY_RANGE_DAYS = 92 ngày), nên nếu không chặn thì chỉ cần
   * mở Tổng hợp một khoảng trước lúc nhóm bật Daily Report là sinh ra hàng trăm
   * bản DRAFT quá khứ, tất cả hiện "Chưa nộp" vì đã qua 23:00. Đặc tả: ngày
   * scope chưa hoạt động không được tính là Không nộp.
   */
  private async ensureReportsForRead(
    scope: DailyReportScope,
    dayStr: string,
  ): Promise<void> {
    const today = dayStrInTz(new Date(), scope.timezone);
    if (dayStr > today) return;
    if (typeof this.generator.ensureReportsForScope === 'function') {
      await this.generator.ensureReportsForScope(
        scope,
        dayStr,
        snapshotInstant(dayStr, scope),
        {
          enqueueNotifications: false,
          repairMissingMembers: true,
          requireExistingSnapshot: true,
        },
      );
    }
  }

  private async scopeMeta(scope: DailyReportScope): Promise<SerializedScope> {
    const name = await this.scopeService.getScopeName(scope);
    return {
      id: scope.id,
      scopeType: scope.scopeType,
      name,
      generationLabel: DAILY_REPORT_GENERATE_LABEL,
      reminderLabel: dailyReportMinuteLabel(
        scope.cutoffMinute - scope.reminderBeforeMinutes,
      ),
      leaderSummaryLabel: dailyReportMinuteLabel(scope.leaderSummaryMinute),
      leaderSubmitMinute: scope.leaderSummaryMinute,
      leaderSubmitLabel: dailyReportMinuteLabel(scope.leaderSummaryMinute),
      cutoffMinute: scope.cutoffMinute,
      reminderBeforeMinutes: scope.reminderBeforeMinutes,
      leaderSummaryMinute: scope.leaderSummaryMinute,
      hardStopMinute: scope.cutoffMinute,
      hardStopLabel: dailyReportMinuteLabel(scope.cutoffMinute),
      weekdays: scope.weekdays,
      timezone: scope.timezone,
      archivedAt: scope.archivedAt,
      purgedAt: scope.purgedAt,
    };
  }

  private serializeReport(
    report: ReportWithAnswers,
    scope: DailyReportScope,
    meta: SerializedScope,
    /**
     * `canReadGroup` = được đọc dữ liệu của cả nhóm (trưởng nhóm, hoặc admin nền
     * tảng qua `canViewGroupData`). Tách khỏi `isManager` vì hai cờ trả lời hai
     * câu khác nhau: `isManager` mở khoá hành động GHI (mở lại bản đã nộp), còn
     * cờ này chỉ mở khoá phần ĐỌC. Mặc định `false` để mọi lối gọi cũ — đều là
     * đường của chính chủ — giữ nguyên hành vi.
     */
    access: {
      isOwner: boolean;
      isManager: boolean;
      canReadGroup?: boolean;
      /** Người xem là người đã ra kết luận trên bản này (`reviewedById`). */
      isDecider?: boolean;
      /** Người xem tích / bỏ tích được yêu cầu hỗ trợ; xem `canResolveHelpOn`. */
      canResolveHelp?: boolean;
    } = {
      isOwner: true,
      isManager: false,
    },
    /**
     * Chỉ đường ĐỌC MỘT báo cáo mới dựng phần này, vì nó tốn thêm truy vấn.
     * Board và danh sách không cần: ở đó không có nút duyệt nào.
     *
     * `canReview` phải là quyền trên CHÍNH báo cáo đó, gộp đủ sáu điều kiện
     * của `review()`. Client không được tự suy lại từ vai trò - tự tính là
     * chắc chắn lệch, và giao diện sẽ hiện ba nút trên bản mà API từ chối.
     */
    reviewContext?: {
      canReview: boolean;
      carryCandidates: ReviewCarryCandidate[];
    },
    /**
     * Cùng luật với `reviewContext`: chỉ hai đường đọc một báo cáo (`my/today`
     * và `:id`) dựng khối này. Mutation trả khối rỗng vì client luôn tải lại
     * sau khi ghi, không dùng response để vá cache.
     */
    carry?: CarryPanel,
  ) {
    const archived = Boolean(scope.archivedAt);
    const locked = archived || this.isReportLocked(report, scope);
    const missed = this.isMissedReport(report, locked);
    return {
      id: report.id,
      scope: meta,
      reportDate: reportDateLabel(report.reportDate),
      status: report.status,
      owner: {
        id: report.userId,
        fullName: report.user.fullName,
        avatarUrl: report.user.avatar?.fileUrl ?? null,
      },
      /*
       * Cùng một hàm với bảng theo dõi, để màn chi tiết và board không bao giờ
       * nói hai điều khác nhau về cùng một bản.
       */
      boardState: this.resolveBoardState(report, locked),
      actors: {
        lastEditedById: report.lastEditedById,
        submittedById: report.submittedById,
        reopenedById: report.reopenedById,
      },
      isLocked: locked,
      isMissed: missed,
      /*
       * Trục duyệt, tách hẳn khỏi `status`. Giao diện phân biệt "bị trả lại"
       * với "được mở lại để bổ sung" bằng `reviewDecision`, KHÔNG bằng
       * `status`: một báo cáo hoàn toàn có thể ở `REOPENED` +
       * `reviewDecision = ACCEPTED` cùng lúc.
       */
      review: {
        decision: report.reviewDecision,
        reviewedById: report.reviewedById,
        reviewerName: report.reviewNote?.reviewerName ?? null,
        reviewedAt: report.reviewedAt,
        reviewedRevisionNumber: report.reviewedRevisionNumber,
        /** Lời người duyệt; với "Trả lại" đây chính là lý do bắt buộc. */
        comment: report.reviewNote?.comment ?? null,
        deadlineAt: report.reviewDeadlineAt,
        expiredAt: report.reviewExpiredAt,
        editableUntil: report.editableUntil,
        canReview: reviewContext?.canReview ?? false,
        carryCandidates: reviewContext?.carryCandidates ?? [],
      },
      carry: carry ?? { outgoing: [] },
      firstSubmittedAt: report.firstSubmittedAt,
      lastSubmittedAt: report.lastSubmittedAt,
      lastEditedAt: report.lastEditedAt,
      reopenReason: report.reopenReason,
      templateVersion: report.templateVersion,
      permissions: {
        canEdit:
          access.isOwner &&
          !locked &&
          (
            [
              DailyReportStatus.DRAFT,
              DailyReportStatus.REOPENED,
            ] as DailyReportStatus[]
          ).includes(report.status),
        // Không phụ thuộc `leaderSummaryMinute`: nộp sau mốc tổng hợp vẫn được
        // ghi nhận, chỉ không kịp vào email tổng hợp của ngày đó.
        canSubmit:
          access.isOwner &&
          !locked &&
          (
            [
              DailyReportStatus.DRAFT,
              DailyReportStatus.REOPENED,
            ] as DailyReportStatus[]
          ).includes(report.status),
        /* Các đường quyền của `reopen`, giữ khớp với service: người ĐÃ ra quyết
           định trên bản này, quản lý chính, hoặc chính chủ trong ngày trước
           cutoff. Hai đường đầu không bị `locked` chặn - quản lý phải mở lại
           được cả báo cáo đã quá hạn duyệt, đó là đường thoát duy nhất.
           Thêm đường thứ tư: quản lý chính cấp lại hạn sửa cho bản "Quá hạn
           bổ sung" (REOPENED đã khoá). Phạm vi lưu trữ thì không ai mở lại. */
        canReopen:
          !archived &&
          ((report.status === DailyReportStatus.SUBMITTED &&
            ((access.isDecider === true &&
              Boolean(report.reviewDecision || report.reviewExpiredAt)) ||
              (access.isManager &&
                (Boolean(report.reviewDecision || report.reviewExpiredAt) ||
                  !locked)) ||
              (access.isOwner && !locked))) ||
            (report.status === DailyReportStatus.REOPENED &&
              locked &&
              access.isManager)),
        /* Đọc được bản thì đọc được cả lịch sử nộp của chính bản đó. Để cờ này
           bám `isManager` như trước thì admin nền tảng mở được báo cáo nhưng
           khối "đã nộp mấy lần" bên trong lại tắt — server cho phép mà giao
           diện tự giấu, đúng kiểu lệch âm thầm giữa hai tầng. */
        canViewHistory:
          access.isOwner || access.isManager || access.canReadGroup === true,
        canResolveHelp: access.canResolveHelp === true,
      },
      answers: report.answers.map((a) => ({
        id: a.id,
        questionId: a.questionId,
        kind: a.questionKind,
        label: a.questionLabel,
        hint: a.questionHint,
        isRequired: a.questionIsRequired,
        allowTaskLink: a.questionAllowTaskLink,
        sortOrder: a.sortOrder,
        content: a.content,
        suggestion: report.draftSuggestionsByKind?.[a.questionKind] ?? null,
        isAutoDrafted: a.isAutoDrafted,
        linkedTaskIds: a.linkedTaskIds,
        mentionedUserIds: a.mentionedUserIds,
        attachments: a.attachments,
        sources: report.draftSourcesByKind?.[a.questionKind] ?? [],
      })),
      helpRequests: report.helpRequests.map((help) => ({
        ...toHelpRequestView(help),
        resolvedBy: help.resolvedById
          ? {
              id: help.resolvedById,
              fullName: report.helpResolverNames?.[help.resolvedById] ?? null,
            }
          : null,
      })),
      achievedKpis: (report.kpiAchievements ?? []).map((achievement) => ({
        id: achievement.id,
        kpiId: achievement.kpiId,
        name: achievement.nameSnapshot,
        selectedAt: achievement.createdAt,
      })),
    };
  }

  private assertRange(from: string, to: string): void {
    const start = reportDateValue(from).getTime();
    const end = reportDateValue(to).getTime();
    const days = (end - start) / (24 * 60 * 60 * 1000);
    if (days < 0 || days >= MAX_HISTORY_RANGE_DAYS) {
      throw new UnprocessableEntityException(
        `Khoảng thời gian tối đa là ${MAX_HISTORY_RANGE_DAYS} ngày`,
      );
    }
  }

  private formatDmy(d: Date): string {
    const label = reportDateLabel(d);
    const [y, m, day] = label.split('-');
    return `${day}/${m}/${y}`;
  }
}
