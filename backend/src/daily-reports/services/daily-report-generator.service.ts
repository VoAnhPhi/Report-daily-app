import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  BusinessFormTaskStatus,
  DailyReport,
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
  dayBoundsUtc,
  dayStrInTz,
  isoWeekdayInTz,
  minutesOfDayInTz,
  reportDateValue,
  snapshotInstant,
} from '../helpers/report-date.helper';
import { DailyReportScopeService } from './daily-report-scope.service';
import {
  DAILY_REPORT_GENERATE_MINUTE,
  MAX_ANSWER_CONTENT_LENGTH,
  MAX_LINKED_TASKS,
  dailyReportMinuteLabel,
} from '../constants/daily-report.constants';
import { DailyReportOutboxService } from './daily-report-outbox.service';
import type {
  DailyReportGenerationPreview,
  DailyReportGenerationResult,
} from '../dto/daily-report-generation.dto';

const REPORT_READY_KIND = 'REPORT_READY' as DailyReportOutboxKind;
const REPORT_READY_ACTION = 'daily_report_ready' as NotificationAction;

/** Nguồn điền sẵn khi người duyệt chọn "Tiếp tục thực hiện". */
interface ContinuedSource {
  answers: ContinuedAnswer[];
  carried: Array<{ taskId: string | null; note: string | null }>;
}

/**
 * Một dòng "người duyệt chuyển sang hôm nay", hoặc `null` khi không cần chèn:
 * task đã xoá, đã xong hoặc đã huỷ (như `isOpen` của bản nháp), hay nội dung
 * cũ đã nhắc tới đúng việc đó.
 */
function carriedLine(
  row: { taskId: string | null; note: string | null },
  taskById: Map<
    string,
    { code: string | null; title: string; status: BusinessFormTaskStatus }
  >,
  base: string,
): string | null {
  const suffix = ' (người duyệt chuyển sang hôm nay)';
  if (row.taskId) {
    const task = taskById.get(row.taskId);
    if (
      !task ||
      task.status === BusinessFormTaskStatus.done ||
      task.status === BusinessFormTaskStatus.cancelled
    ) {
      return null;
    }
    if (base.includes(task.code ?? task.title)) return null;
    const prefix = task.code ? `${task.code} — ` : '';
    return `• ${prefix}${task.title}${suffix}`;
  }
  const note = row.note?.trim();
  if (!note || base.includes(note)) return null;
  return `- ${note}${suffix}`;
}

/** Một câu trả lời trong `answersSnapshot` của lần nộp được chọn tiếp tục. */
interface ContinuedAnswer {
  questionId: string;
  kind: DailyReportQuestionKind;
  content: string;
  linkedTaskIds: string[];
}

const QUESTION_KINDS = new Set<string>(Object.values(DailyReportQuestionKind));

/**
 * `answersSnapshot` là cột JSON do `submit` ghi. Đọc phòng thủ từng phần tử:
 * phần tử hỏng thì bỏ riêng nó, không làm hỏng cả lần mở báo cáo.
 */
function parseContinuedAnswers(snapshot: unknown): ContinuedAnswer[] {
  if (!Array.isArray(snapshot)) return [];
  const out: ContinuedAnswer[] = [];
  for (const entry of snapshot) {
    const e = entry as Record<string, unknown> | null;
    if (
      !e ||
      typeof e.questionId !== 'string' ||
      typeof e.kind !== 'string' ||
      !QUESTION_KINDS.has(e.kind) ||
      typeof e.content !== 'string'
    ) {
      continue;
    }
    out.push({
      questionId: e.questionId,
      kind: e.kind as DailyReportQuestionKind,
      content: e.content,
      linkedTaskIds: Array.isArray(e.linkedTaskIds)
        ? e.linkedTaskIds.filter((id): id is string => typeof id === 'string')
        : [],
    });
  }
  return out;
}

/**
 * Sinh bản báo cáo (isResponse=false) — dùng chung cho cron 07:30, catch-up và
 * lazy-upsert khi người dùng mở màn (an toàn kép, docs 04 mục 2.1 + 7).
 *
 * Idempotent tuyệt đối: dựa vào @@unique([scopeId, userId, reportDate]) +
 * createMany skipDuplicates — chạy lại bao nhiêu lần cũng không nhân bản.
 */
@Injectable()
export class DailyReportGeneratorService {
  private readonly logger = new Logger(DailyReportGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: DailyReportScopeService,
    private readonly outbox: DailyReportOutboxService,
  ) {}

  /** Hôm nay (theo timezone của scope) có phải ngày phải báo cáo? */
  isReportingDay(scope: DailyReportScope, instant: Date = new Date()): boolean {
    const weekday = isoWeekdayInTz(instant, scope.timezone);
    return scope.weekdays.includes(weekday);
  }

  /**
   * Snapshot chuẩn là 07:30. Một scope được tạo sau mốc đó chưa tồn tại tại
   * 07:30, nên thao tác manual dùng thời điểm kiểm tra làm mốc đầu tiên; nếu
   * không thì đúng scenario "tạo nhóm lúc 10:00 rồi tạo báo cáo" sẽ luôn rỗng.
   */
  private manualSnapshotInstant(
    scope: DailyReportScope,
    dayStr: string,
    instant: Date,
  ): Date {
    const scheduledSnapshot = snapshotInstant(dayStr, scope);
    return scope.createdAt > scheduledSnapshot ? instant : scheduledSnapshot;
  }

  /**
   * Kiểm tra nhanh thao tác tạo báo cáo hôm nay mà không ghi DB. Mốc thành viên
   * mặc định là 07:30; scope tạo sau mốc dùng thời điểm kiểm tra làm snapshot
   * đầu tiên để hỗ trợ đúng luồng tạo nhóm trễ.
   */
  async previewTodayForScope(
    scope: DailyReportScope,
    instant: Date = new Date(),
  ): Promise<DailyReportGenerationPreview> {
    const dayStr = dayStrInTz(instant, scope.timezone);
    const snapshotAt = this.manualSnapshotInstant(scope, dayStr, instant);
    const minute = minutesOfDayInTz(instant, scope.timezone);
    const scopeName = await this.scopeService.getScopeName(scope);
    const base = {
      scopeId: scope.id,
      scopeName,
      reportDate: dayStr,
      timezone: scope.timezone,
      snapshotAt: snapshotAt.toISOString(),
      generationLabel: dailyReportMinuteLabel(DAILY_REPORT_GENERATE_MINUTE),
      hardStopLabel: dailyReportMinuteLabel(scope.cutoffMinute),
      templateVersionId: scope.currentTemplateVersionId,
    };

    let blockedReason: DailyReportGenerationPreview['blockedReason'];
    if (scope.archivedAt) blockedReason = 'SCOPE_ARCHIVED';
    else if (!scope.isEnabled) blockedReason = 'SCOPE_DISABLED';
    else if (!this.isReportingDay(scope, instant))
      blockedReason = 'NON_REPORTING_DAY';
    else if (minute < DAILY_REPORT_GENERATE_MINUTE)
      blockedReason = 'BEFORE_GENERATION_TIME';
    else if (minute >= scope.cutoffMinute) blockedReason = 'PAST_HARD_STOP';
    else if (!scope.currentTemplateVersionId) blockedReason = 'NO_TEMPLATE';

    // Trước 07:30 vẫn cho xem danh sách dự kiến để trưởng nhóm kiểm tra nhanh;
    // chỉ thao tác ghi mới bị chặn cho tới khi mốc snapshot đã đi qua.
    if (blockedReason && blockedReason !== 'BEFORE_GENERATION_TIME') {
      return {
        ...base,
        canGenerate: false,
        blockedReason,
        counts: { snapshotMembers: 0, existingReports: 0, toCreate: 0 },
        includedMembers: [],
        excludedMembers: [],
      };
    }

    const [snapshotMemberIds, currentMemberIds] = await Promise.all([
      this.scopeService.getMemberIdsAt(scope, snapshotAt),
      this.scopeService.getMemberIds(scope),
    ]);
    if (snapshotMemberIds.length === 0) {
      return {
        ...base,
        canGenerate: false,
        blockedReason: 'EMPTY_SNAPSHOT',
        counts: { snapshotMembers: 0, existingReports: 0, toCreate: 0 },
        includedMembers: [],
        excludedMembers: [],
      };
    }

    const reportDate = reportDateValue(dayStr);
    const reports = await this.prisma.dailyReport.findMany({
      where: {
        scopeId: scope.id,
        reportDate,
        deletedAt: null,
        userId: { in: snapshotMemberIds },
      },
      select: { userId: true, status: true },
    });
    const statusByUserId = new Map(
      reports.map((report) => [report.userId, report.status]),
    );
    const [snapshotMembers, excludedMembers] = await Promise.all([
      this.scopeService.getMemberInfosByIds(snapshotMemberIds),
      this.scopeService.getMemberInfosByIds(
        currentMemberIds.filter((id) => !snapshotMemberIds.includes(id)),
      ),
    ]);

    const included = snapshotMembers.map((member) => ({
      ...member,
      reportStatus: statusByUserId.get(member.id) ?? null,
    }));
    const existingReports = included.filter(
      (member) => member.reportStatus !== null,
    ).length;

    return {
      ...base,
      canGenerate: !blockedReason,
      ...(blockedReason ? { blockedReason } : {}),
      counts: {
        snapshotMembers: included.length,
        existingReports,
        toCreate: included.length - existingReports,
      },
      includedMembers: included,
      excludedMembers: excludedMembers.map((member) => ({
        ...member,
        reason: 'NOT_IN_SNAPSHOT' as const,
      })),
    };
  }

  /** Tạo bản hôm nay sau khi preview đã qua toàn bộ chốt thời gian/quyền. */
  async generateTodayForScope(
    scope: DailyReportScope,
    instant: Date = new Date(),
  ): Promise<DailyReportGenerationResult> {
    const preview = await this.previewTodayForScope(scope, instant);
    if (!preview.canGenerate) {
      throw new UnprocessableEntityException({
        message: 'Chưa thể tạo báo cáo hôm nay.',
        code: preview.blockedReason,
      });
    }

    // Trưởng nhóm được bấm "tạo báo cáo ngay" nhiều lần trong cùng một ngày:
    // lần đầu dựng snapshot, các lần sau bù cho người vừa được mời vào nhóm.
    // Thiếu cờ này thì `ensureReportsForScope` thấy scope+ngày đã có bản là
    // dừng ngay, trả 0, và người mới không bao giờ có báo cáo — trong khi
    // preview vẫn đếm ra họ (snapshotMembers − existingReports).
    //
    // An toàn với luật snapshot: tập thành viên vẫn lấy tại `preview.snapshotAt`
    // (07:30 với scope có trước mốc đó; thời điểm thao tác với scope tạo sau).
    // Đây là đường ghi thủ công của trưởng nhóm trên một ngày ĐÃ có báo cáo,
    // không phải đường đọc dựng lại ngày chưa từng có bản nào.
    const createdReports = await this.ensureReportsForScope(
      scope,
      preview.reportDate,
      new Date(preview.snapshotAt),
      { repairMissingMembers: true },
    );
    return {
      scopeId: scope.id,
      reportDate: preview.reportDate,
      snapshotAt: preview.snapshotAt,
      totalMembers: preview.counts.snapshotMembers,
      createdReports,
      existingReports: preview.counts.snapshotMembers - createdReports,
      notificationRecipients: preview.counts.snapshotMembers,
    };
  }

  /** Sinh bản trống cho MỌI thành viên của một phạm vi cho một ngày. */
  async ensureReportsForScope(
    scope: DailyReportScope,
    dayStr: string,
    snapshotAt: Date = snapshotInstant(dayStr, scope),
    options: {
      enqueueNotifications?: boolean;
      repairMissingMembers?: boolean;
      /**
       * Chỉ bù người thiếu vào ngày ĐÃ có ít nhất một bản báo cáo; ngày chưa
       * từng có bản nào thì không dựng mới. Dành riêng cho ĐƯỜNG ĐỌC.
       */
      requireExistingSnapshot?: boolean;
    } = {},
  ): Promise<number> {
    if (scope.archivedAt || !scope.isEnabled) return 0;
    // Ngày nghỉ của nhóm thì KHÔNG sinh bản nào. Cổng này trước đây chỉ nằm ở
    // phía gọi (`generateForAllScopes` và hai controller POST/PATCH), nên bất kỳ
    // đường gọi mới nào quên kiểm là sinh báo cáo vào đúng ngày nhóm nghỉ. Đặt
    // ngay trong primitive: mọi caller hiện có đều đã kiểm nên hành vi không đổi.
    if (
      !scope.weekdays.includes(isoWeekdayInTz(reportDateValue(dayStr), 'UTC'))
    )
      return 0;
    const reportDate = reportDateValue(dayStr);
    // Dòng report chính là snapshot nghĩa vụ. Một khi đã chụp thì thay đổi
    // membership trong ngày không được bổ sung/xóa người khỏi tập này.
    let created = 0;
    const snapshotExists = await this.prisma.dailyReport.findFirst({
      where: { scopeId: scope.id, reportDate },
      select: { id: true },
    });
    // Đường ĐỌC (board/outcome/summary) bị chặn dựng lại một ngày chưa từng có
    // bản báo cáo nào; đường GHI thì không.
    //
    // Lý do: đường đọc lặp qua MỌI ngày trong khoảng tra cứu (tối đa
    // MAX_HISTORY_RANGE_DAYS = 92 ngày). Nếu nó được phép tạo mới, chỉ cần mở
    // Tổng hợp cho một khoảng nằm TRƯỚC lúc nhóm bật Daily Report là hệ thống
    // dựng hàng loạt bản DRAFT cho quá khứ, và vì đã qua 23:00 nên tất cả hiện
    // "Chưa nộp" — sai đặc tả: ngày scope chưa hoạt động không được tính là
    // Không nộp. Chặn ở đây thì đường đọc chỉ còn vai trò BÙ người thiếu vào
    // ngày vốn đã có snapshot (đúng mục đích repair ban đầu).
    //
    // Đường ghi (`generateTodayForScope` — trưởng nhóm bấm tạo, cron 07:30,
    // sweep, fallback `my/today`) KHÔNG truyền cờ này: chúng phải được phép tạo
    // snapshot đầu tiên của ngày, đó chính là việc của chúng.
    if (options.requireExistingSnapshot === true && !snapshotExists) return 0;
    // Chốt template đứng SAU chốt trên có chủ ý: nhóm chưa gắn bộ câu hỏi mà
    // ngày đó cũng chưa có bản nào thì đường đọc không có gì để bù, trả 0 là
    // đủ. Ném lỗi ở đây sẽ làm 500 cả màn Tổng hợp chỉ vì một scope cũ thiếu
    // cấu hình. Đường ghi vẫn ném như trước — đó là nhánh 6 trong docs 13.
    if (!scope.currentTemplateVersionId) {
      throw new Error(`Scope ${scope.id} chưa có template version`);
    }
    if (!snapshotExists || options.repairMissingMembers) {
      const memberIds = await this.scopeService.getMemberIdsAt(
        scope,
        snapshotAt,
      );
      if (memberIds.length === 0) return 0;
      const existingUserIds = snapshotExists
        ? new Set(
            (
              await this.prisma.dailyReport.findMany({
                where: { scopeId: scope.id, reportDate },
                select: { userId: true },
              })
            ).map((report) => report.userId),
          )
        : new Set<string>();
      const missingMemberIds = memberIds.filter(
        (userId) => !existingUserIds.has(userId),
      );
      if (missingMemberIds.length === 0) {
        if (options.enqueueNotifications === false) return 0;
      }
      if (missingMemberIds.length > 0) {
        const result = await this.prisma.dailyReport.createMany({
          data: missingMemberIds.map((userId) => ({
            scopeId: scope.id,
            userId,
            reportDate,
            status: DailyReportStatus.DRAFT,
            templateVersionId: scope.currentTemplateVersionId,
            participantSnapshotAt: snapshotAt,
          })),
          skipDuplicates: true,
        });
        created = result.count;
      }
    }

    // Board/summary GETs use the same repair-safe materializer but must not
    // enqueue ready notifications as a side effect of merely viewing history.
    if (options.enqueueNotifications === false) return created;

    // Repair-safe: nếu worker chết sau khi tạo report nhưng trước khi enqueue,
    // lần catch-up sau vẫn bù event. Unique idempotency key chặn gửi trùng.
    const reports = await this.prisma.dailyReport.findMany({
      where: { scopeId: scope.id, reportDate, deletedAt: null },
      select: { id: true, userId: true },
    });
    const scopeName = await this.scopeService.getScopeName(scope);
    const expiresAt = new Date(
      dayBoundsUtc(dayStr, scope.timezone).start.getTime() +
        scope.cutoffMinute * 60_000,
    );
    await this.outbox.enqueueMany(
      reports.map((report) => ({
        idempotencyKey: `daily-report:ready:${report.id}`,
        kind: REPORT_READY_KIND,
        recipientId: report.userId,
        scopeId: scope.id,
        reportId: report.id,
        expiresAt,
        deliverEmail: true,
        payload: {
          action: REPORT_READY_ACTION,
          message: `Báo cáo hằng ngày của bạn đã sẵn sàng (${scopeName})`,
          reportId: report.id,
          reportDate: dayStr,
          scopeName,
          emailVariables: {
            hardStopTime: dailyReportMinuteLabel(scope.cutoffMinute),
            leaderSubmitTime: dailyReportMinuteLabel(scope.leaderSummaryMinute),
          },
        },
      })),
    );
    return created;
  }

  /**
   * Lazy-upsert cho MỘT người dùng khi mở màn: bảo đảm bản của ngày đó tồn tại
   * cho mọi phạm vi user thuộc về (nếu hôm đó là ngày phải báo cáo).
   * Trả về danh sách scope kèm bản báo cáo.
   */
  async ensureReportsForUser(
    userId: string,
    dayStr: string,
    instant: Date = new Date(),
  ): Promise<Array<{ scope: DailyReportScope; report: DailyReport }>> {
    const scopes = await this.scopeService.getScopesOfUser(userId);
    const reportDate = reportDateValue(dayStr);
    const out: Array<{ scope: DailyReportScope; report: DailyReport }> = [];

    for (const scope of scopes) {
      // Ngày nghỉ của nhóm → không sinh, không hiện.
      const weekday = isoWeekdayInTz(reportDate, 'UTC');
      if (!scope.weekdays.includes(weekday)) continue;

      let report = await this.prisma.dailyReport.findUnique({
        where: {
          scopeId_userId_reportDate: { scopeId: scope.id, userId, reportDate },
        },
      });

      // GET /my/today là safety net nếu cron 07:30 bỏ lỡ. Trước 07:30 chỉ đọc,
      // tuyệt đối không materialize. Sau mốc này luôn dùng membership đúng tại
      // 07:30, không dùng danh sách thành viên hiện tại.
      if (
        !report &&
        dayStrInTz(instant, scope.timezone) === dayStr &&
        minutesOfDayInTz(instant, scope.timezone) >=
          DAILY_REPORT_GENERATE_MINUTE
      ) {
        const snapshotAt = snapshotInstant(dayStr, scope);
        const snapshotMemberIds = await this.scopeService.getMemberIdsAt(
          scope,
          snapshotAt,
        );
        if (!snapshotMemberIds.includes(userId)) continue;
        await this.ensureReportsForScope(scope, dayStr, snapshotAt);
        report = await this.prisma.dailyReport.findUnique({
          where: {
            scopeId_userId_reportDate: {
              scopeId: scope.id,
              userId,
              reportDate,
            },
          },
        });
      }
      if (report) out.push({ scope, report });
    }
    return out;
  }

  /**
   * Bảo đảm mỗi câu hỏi của bộ hiện hành có một dòng trả lời (chụp lại
   * label/kind — QT-11). Gọi lười khi mở bản, không sinh sẵn trong cron để
   * tránh hàng triệu dòng chết.
   *
   * Ở lần dựng ĐẦU TIÊN, nếu người duyệt của CHÍNH nhóm này đã chọn "Tiếp tục
   * thực hiện" cho một báo cáo trước và chuyển việc sang đúng ngày này, các câu
   * trả lời được điền sẵn bằng bản đã được duyệt (xem `loadContinuedSource`).
   *
   * Không bao giờ đè lên nội dung người dùng: ngày đích của việc chuyển tiếp
   * luôn SAU ngày duyệt (`carryTargetDate`), nên lúc người duyệt bấm, bản của
   * ngày đích chưa có dòng trả lời nào; và chỉ dòng CÒN THIẾU mới được tạo.
   */
  async ensureAnswers(
    report: Pick<DailyReport, 'id' | 'userId' | 'scopeId' | 'reportDate'>,
    templateVersionId: string,
  ): Promise<void> {
    const [questions, existing] = await Promise.all([
      this.prisma.dailyReportQuestion.findMany({
        where: { templateVersionId },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.dailyReportAnswer.findMany({
        where: { reportId: report.id },
        select: { questionId: true },
      }),
    ]);
    const have = new Set(existing.map((a) => a.questionId));
    const missing = questions.filter((q) => !have.has(q.id));
    if (missing.length === 0) return;

    // Câu hỏi được thêm vào bộ giữa ngày thì không điền sẵn: nửa bản đã có nội
    // dung của hôm nay, chép thêm một câu của hôm trước là ghép hai ngày làm một.
    const source =
      existing.length === 0 ? await this.loadContinuedSource(report) : null;
    const prefill = source
      ? await this.buildContinuedPrefill(report.userId, missing, source)
      : new Map<string, { content: string; linkedTaskIds: string[] }>();

    await this.prisma.dailyReportAnswer.createMany({
      data: missing.map((q) => {
        const filled = prefill.get(q.id);
        return {
          reportId: report.id,
          questionId: q.id,
          questionKind: q.kind,
          questionLabel: q.label,
          sortOrder: q.sortOrder,
          questionHint: q.hint,
          questionIsRequired: q.isRequired,
          questionAllowTaskLink: q.allowTaskLink,
          // Nội dung thật của một bản đã nộp, không phải gợi ý của bộ máy.
          ...(filled
            ? {
                content: filled.content,
                isAutoDrafted: false,
                linkedTaskIds: filled.linkedTaskIds,
              }
            : {}),
        };
      }),
      skipDuplicates: true,
    });
  }

  /**
   * Nguồn điền sẵn cho `report`: bản mà người duyệt CÙNG NHÓM đã chọn "Tiếp tục
   * thực hiện" và chuyển việc sang đúng ngày này, cùng các dòng carry đáp xuống.
   *
   * - Chỉ dòng còn hiệu lực của cùng người và cùng phạm vi. Nhóm Y không bao
   *   giờ nhận nội dung của nhóm X.
   * - Không có dòng nào do lượt duyệt tạo hoặc xác nhận thì không điền gì: chưa
   *   ai chọn "Tiếp tục thực hiện" cho người này ở nhóm này.
   * - Nhiều bản nguồn cùng đáp xuống một ngày (một lượt duyệt muộn): lấy bản có
   *   ngày gần nhất. Dòng carry thì lấy HẾT, như khối tồn đọng của bản nháp.
   * - Đọc `answersSnapshot` của lần nộp mà lượt `CONTINUED` MỚI NHẤT đã duyệt,
   *   không đọc câu trả lời hiện tại: đó đúng là nội dung người duyệt đã đọc.
   */
  private async loadContinuedSource(
    report: Pick<DailyReport, 'userId' | 'scopeId' | 'reportDate'>,
  ): Promise<ContinuedSource | null> {
    const rows = await this.prisma.dailyReportCarryOver.findMany({
      where: {
        toReportDate: report.reportDate,
        cancelledAt: null,
        fromReport: { userId: report.userId, scopeId: report.scopeId },
      },
      select: {
        fromReportId: true,
        taskId: true,
        note: true,
        reviewId: true,
        confirmedByReviewId: true,
        fromReport: { select: { reportDate: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const decided = rows.filter(
      (row) => row.reviewId !== null || row.confirmedByReviewId !== null,
    );
    if (decided.length === 0) return null;
    const latest = decided.reduce((a, b) =>
      b.fromReport.reportDate > a.fromReport.reportDate ? b : a,
    );

    const review = await this.prisma.dailyReportReview.findFirst({
      where: {
        reportId: latest.fromReportId,
        decision: DailyReportReviewDecision.CONTINUED,
      },
      orderBy: { createdAt: 'desc' },
      select: { revision: { select: { answersSnapshot: true } } },
    });
    return {
      answers: parseContinuedAnswers(review?.revision.answersSnapshot),
      carried: rows.map((row) => ({ taskId: row.taskId, note: row.note })),
    };
  }

  /**
   * Nội dung điền sẵn cho từng câu hỏi của bản mới.
   *
   * Ghép câu trả lời của bản nguồn theo `questionId` trước (cùng bộ câu hỏi),
   * sau đó theo `kind` cho các câu lõi (trưởng nhóm đã phát hành bộ mới). Câu
   * `custom` chỉ ghép được theo id.
   *
   * Việc được chuyển tiếp đứng ĐẦU câu tồn đọng, cùng định dạng dòng với khối
   * `reviewer_carry_over` của bản nháp. Thiếu bước này thì khi cả bốn câu đã có
   * nội dung, bản nháp không còn dựng gợi ý nào và lời dặn của người duyệt biến
   * mất khỏi báo cáo mới. Việc nào nội dung cũ đã nhắc thì không chèn lại.
   *
   * `linkedTaskIds` được lọc bằng ĐÚNG điều kiện `validateAnswerReferences` áp
   * lúc nộp. Chép nguyên một task đã xoá hoặc đã rời tay người báo cáo là để
   * lần nộp của họ trả 403 vì một thứ họ không tự gắn.
   */
  private async buildContinuedPrefill(
    userId: string,
    questions: Array<{
      id: string;
      kind: DailyReportQuestionKind;
      allowTaskLink: boolean;
    }>,
    source: ContinuedSource,
  ): Promise<Map<string, { content: string; linkedTaskIds: string[] }>> {
    const byId = new Map(source.answers.map((a) => [a.questionId, a] as const));
    const byKind = new Map<DailyReportQuestionKind, ContinuedAnswer | null>();
    for (const answer of source.answers) {
      if (answer.kind === DailyReportQuestionKind.custom) continue;
      // Hai câu cùng loại trong một bản thì không đoán được câu nào khớp câu nào.
      byKind.set(answer.kind, byKind.has(answer.kind) ? null : answer);
    }
    const matchOf = (q: { id: string; kind: DailyReportQuestionKind }) =>
      byId.get(q.id) ??
      (q.kind === DailyReportQuestionKind.custom
        ? undefined
        : (byKind.get(q.kind) ?? undefined));

    const wantedTaskIds = new Set<string>();
    for (const q of questions) {
      for (const id of matchOf(q)?.linkedTaskIds ?? []) wantedTaskIds.add(id);
    }
    for (const row of source.carried) {
      if (row.taskId) wantedTaskIds.add(row.taskId);
    }
    const tasks =
      wantedTaskIds.size > 0
        ? await this.prisma.businessFormTask.findMany({
            where: {
              id: { in: [...wantedTaskIds] },
              deletedAt: null,
              OR: [
                { mainAssigneeId: userId },
                { createdById: userId },
                { assignments: { some: { userId, status: 'accepted' } } },
              ],
            },
            select: { id: true, code: true, title: true, status: true },
          })
        : [];
    const taskById = new Map(tasks.map((task) => [task.id, task] as const));

    const out = new Map<string, { content: string; linkedTaskIds: string[] }>();
    const blockedQuestion = questions.find(
      (q) => q.kind === DailyReportQuestionKind.blocked,
    );
    for (const q of questions) {
      const base = matchOf(q)?.content.trim() ?? '';
      const linked = q.allowTaskLink
        ? (matchOf(q)?.linkedTaskIds ?? []).filter((id) => taskById.has(id))
        : [];

      const lines: Array<{ text: string; taskId: string | null }> = [];
      if (q === blockedQuestion) {
        for (const row of source.carried) {
          const text = carriedLine(row, taskById, base);
          if (text) lines.push({ text, taskId: row.taskId });
        }
      }

      // Dòng chuyển tiếp nào làm câu vượt trần thì bỏ riêng dòng đó (và không
      // gắn task của nó), không cắt ngang nội dung cũ: câu dài quá trần thì lần
      // nộp bị từ chối.
      let content = base;
      for (const line of [...lines].reverse()) {
        const next = content ? `${line.text}\n${content}` : line.text;
        if (next.length > MAX_ANSWER_CONTENT_LENGTH) continue;
        content = next;
        if (
          line.taskId &&
          q.allowTaskLink &&
          !linked.includes(line.taskId) &&
          linked.length < MAX_LINKED_TASKS
        ) {
          linked.unshift(line.taskId);
        }
      }
      if (content.length > 0) out.set(q.id, { content, linkedTaskIds: linked });
    }
    return out;
  }

  /**
   * Cron 07:30/catch-up: sinh bản trống cho mọi phạm vi đang bật, theo lô.
   * Trả về tổng số bản đã sinh (phục vụ log).
   */
  async generateForAllScopes(instant: Date = new Date()): Promise<number> {
    let created = 0;
    let cursor: string | undefined;
    const BATCH = 100;

    for (;;) {
      const scopes: DailyReportScope[] =
        await this.prisma.dailyReportScope.findMany({
          where: { isEnabled: true, deletedAt: null, archivedAt: null },
          orderBy: { id: 'asc' },
          take: BATCH,
          ...(cursor
            ? { cursor: { id: cursor }, skip: 1 }
            : ({} as Prisma.DailyReportScopeFindManyArgs)),
        });
      if (scopes.length === 0) break;

      for (const scope of scopes) {
        if (!this.isReportingDay(scope, instant)) continue;
        const dayStr = dayStrInTz(instant, scope.timezone);
        // Contract sản phẩm cố định 07:30 cho mọi scope.
        if (
          minutesOfDayInTz(instant, scope.timezone) <
          DAILY_REPORT_GENERATE_MINUTE
        ) {
          continue;
        }
        try {
          // Mốc chụp nghĩa vụ = đúng giờ sinh của nhóm, quy về UTC. Cố định theo
          // cấu hình chứ không theo lúc worker chạy, để chạy bù bao nhiêu lần
          // cũng ra cùng một tập thành viên.
          const snapshotAt = snapshotInstant(dayStr, scope);
          created += await this.ensureReportsForScope(
            scope,
            dayStr,
            snapshotAt,
          );
        } catch (err) {
          this.logger.error(
            `Sinh bản báo cáo lỗi (scope=${scope.id}): ${String(err)}`,
          );
        }
      }

      cursor = scopes[scopes.length - 1].id;
      if (scopes.length < BATCH) break;
    }
    return created;
  }
}
