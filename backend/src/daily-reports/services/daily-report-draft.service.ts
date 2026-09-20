import { Injectable } from '@nestjs/common';
import {
  BusinessFormTaskStatus,
  DailyReportQuestionKind,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/common/services/prisma.service';
import {
  DRAFT_LOOKBACK_DAYS,
  DRAFT_MAX_BLOCKED_LINES,
  DRAFT_MAX_DONE_LINES,
  DRAFT_MAX_TOMORROW_LINES,
  DRAFT_OVERDUE_HELP_DAYS,
  DRAFT_STALLED_DAYS,
  MAX_ANSWER_CONTENT_LENGTH,
} from '../constants/daily-report.constants';
import {
  addDays,
  dayBoundsUtc,
  reportDateValue,
} from '../helpers/report-date.helper';

/**
 * Một việc con (checklist) đi kèm dòng gợi ý.
 *
 * KHÔNG có id nào của việc con lọt vào `linkedTaskIds` — mảng đó là soft FK tới
 * `BusinessFormTask.id`, nhét id việc con vào sẽ thành chip mồ côi không mở được
 * (docs 05 mục 8, hạn chế 4).
 */
export interface DraftItem {
  id: string;
  label: string;
  done: boolean;
  /** Được CHÍNH người báo cáo tick xong trong ngày báo cáo. */
  doneToday: boolean;
  reportDueAt?: string | null;
  completionDueAt?: string | null;
}

/** Một nguồn gợi ý — FE dựng chip công việc bấm được từ đây (docs 04 mục 2.4). */
export interface DraftSource {
  taskId: string;
  code: string | null;
  title: string;
  /** Phân biệt việc cá nhân với việc được chia sẻ cho nhiều người. */
  scope: 'personal' | 'group';
  reason:
    | 'activity_today'
    | 'completed_today'
    | 'subtask_done_today'
    | 'in_progress_today'
    | 'updated_today'
    | 'overdue'
    | 'due_today'
    | 'carry_over'
    /**
     * Việc do NGƯỜI DUYỆT chuyển tiếp sang ngày này, đọc từ
     * `DailyReportCarryOver`. Khác hẳn `carry_over` ngay trên: cái đó là suy
     * đoán của bộ máy gợi ý từ hạn công việc, cái này là một quyết định đã ghi
     * của con người. Trộn hai nhãn làm một là xoá mất khác biệt đó.
     */
    | 'reviewer_carry_over'
    | 'due_tomorrow'
    | 'starts_tomorrow'
    | 'stalled'
    | 'recurring_blocker';
  /**
   * Tiến độ checklist, đã bỏ việc con xoá mềm. Vắng mặt = việc không có việc con
   * nào — FE dựa vào đó để ẩn hẳn cụm tiến độ thay vì hiện 0/0
   * (cùng luật với thẻ công việc: `10-layout-synchro.md` mục Tiến độ).
   */
  itemsTotal?: number;
  itemsDone?: number;
  /** Toàn bộ việc con được in ra dòng gợi ý của khối tương ứng. */
  items?: DraftItem[];
}

/** Gợi ý cho một câu hỏi. */
export interface QuestionDraft {
  questionKind: DailyReportQuestionKind;
  content: string;
  linkedTaskIds: string[];
  sources: DraftSource[];
}

/** Cột cần cho auto-draft — cùng tinh thần REMINDER_TASK_SELECT (docs 05 mục 7). */
const DRAFT_TASK_SELECT = {
  id: true,
  code: true,
  title: true,
  status: true,
  priority: true,
  mainAssigneeId: true,
  startDate: true,
  dueDate: true,
  completedAt: true,
  lastActivityAt: true,
  updatedAt: true,
  // Việc con nằm ngay trên bảng task dạng cột JSON, không phải bảng quan hệ —
  // nên thêm nó KHÔNG phát sinh truy vấn thứ 4, ngân sách 3 query vẫn nguyên.
  items: true,
  assignments: { select: { userId: true, status: true } },
} satisfies Prisma.BusinessFormTaskSelect;

type DraftTask = Prisma.BusinessFormTaskGetPayload<{
  select: typeof DRAFT_TASK_SELECT;
}>;

/** Việc chưa xóa (cả hồ sơ đối tác cha) — cùng luật NOT_DELETED_FORM_TASK. */
const NOT_DELETED: Prisma.BusinessFormTaskWhereInput = {
  deletedAt: null,
  OR: [{ businessFormId: null }, { businessForm: { is: { deletedAt: null } } }],
};

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/** Khoảng thời gian nửa mở `[start, end)` theo múi giờ phạm vi. */
type DayWindow = { start: Date; end: Date };

/**
 * Việc con nào được in kèm một dòng gợi ý.
 * - `done_today` — vừa tick xong trong ngày (câu "hôm nay làm gì", khối "đã xong")
 * - `pending`    — còn dở dang (khối "tồn đọng", câu "ngày mai làm gì")
 * - `none`       — không in dòng con, chỉ giữ tiến độ
 */
type ItemMode = 'done_today' | 'pending' | 'none';

/**
 * Việc con như đang nằm thật trong cột JSON `items`.
 * Cột này không có schema ở tầng DB và có nơi ghi thiếu `history`
 * (`business-forms-admin.service.ts`), nên mọi trường đều để `unknown` rồi tự
 * kiểm tra — cast thẳng sẽ nổ runtime chứ không đỏ lúc build.
 */
interface StoredItem {
  id?: unknown;
  label?: unknown;
  done?: unknown;
  deleted?: unknown;
  history?: unknown;
  reportDueAt?: unknown;
  completionDueAt?: unknown;
}

interface StoredItemEvent {
  action?: unknown;
  byId?: unknown;
  at?: unknown;
}

/**
 * Việc con này có được `userId` tick xong trong ngày không.
 *
 * `history` là append-only nên chỉ cần soi sự kiện chạm-trạng-thái GẦN NHẤT:
 * tick → bỏ tick → tick lại vẫn ra đúng lần cuối. Việc con tạo ra đã sẵn `done`
 * chỉ có mỗi sự kiện `added`, nên `added` cũng được tính là lần tick đó.
 */
const checkedTodayBy = (
  history: unknown,
  userId: string,
  today: DayWindow,
): boolean => {
  if (!Array.isArray(history)) return false;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const raw: unknown = history[i];
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) continue;
    const event = raw as StoredItemEvent;
    const action = event.action;
    if (action !== 'checked' && action !== 'unchecked' && action !== 'added') {
      continue;
    }
    // Lần chạm cuối là bỏ tick ⇒ không phải việc xong hôm nay.
    if (action === 'unchecked') return false;
    // Người khác tick hộ thì không nhận về báo cáo của mình (cùng luật với
    // `activity_today`: hoạt động phải do chính người báo cáo tạo).
    if (event.byId !== userId) return false;
    if (typeof event.at !== 'string') return false;
    const at = new Date(event.at);
    return !Number.isNaN(at.getTime()) && at >= today.start && at < today.end;
  }
  return false;
};

/**
 * Đọc cột JSON `items` về danh sách dùng được, đã bỏ việc con xoá mềm.
 * Việc con xoá hẳn (`purge`) không còn trong mảng nên không cần lọc.
 */
const readItems = (
  raw: Prisma.JsonValue,
  userId: string,
  today: DayWindow,
): DraftItem[] => {
  if (!Array.isArray(raw)) return [];
  const parsed: DraftItem[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      continue;
    }
    const item = entry as StoredItem;
    if (item.deleted === true) continue;
    const label = typeof item.label === 'string' ? item.label.trim() : '';
    if (label.length === 0) continue;
    const done = item.done === true;
    parsed.push({
      id: typeof item.id === 'string' ? item.id : '',
      label,
      done,
      doneToday: done && checkedTodayBy(item.history, userId, today),
      reportDueAt:
        typeof item.reportDueAt === 'string' ? item.reportDueAt : null,
      completionDueAt:
        typeof item.completionDueAt === 'string' ? item.completionDueAt : null,
    });
  }
  return parsed;
};

/** Dòng báo đã cắt bớt — độ dài của nó phải được tính vào ngân sách ký tự. */
const TRUNCATED_LINE = '… (gợi ý đã cắt bớt cho vừa giới hạn)';

/** Việc con được chọn in ra theo từng khối. */
const pickItems = (items: DraftItem[], mode: ItemMode): DraftItem[] => {
  if (mode === 'done_today') return items.filter((i) => i.doneToday);
  if (mode === 'pending') return items.filter((i) => !i.done);
  return [];
};

/**
 * Bộ máy dựng sẵn câu trả lời từ dữ liệu công việc thật (docs 05).
 * Nguyên tắc: gợi ý là đề xuất; không bịa; mỗi dòng gắn mã CV…; dựng tại thời
 * điểm mở, không lưu.
 */
@Injectable()
export class DailyReportDraftService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dựng gợi ý cho 4 câu lõi của một người cho một ngày, trong một phạm vi.
   * Ngân sách truy vấn: tối đa 3 (docs 05 mục 7).
   *
   * `scopeId` chỉ lọc việc NGƯỜI DUYỆT chuyển tiếp: dòng carry biết nó thuộc
   * nhóm nào qua báo cáo nguồn. Công việc thì không (`BusinessFormTask` không
   * gắn với nhóm), nên phần gợi ý từ công việc vẫn là của người đó ở mọi nhóm.
   */
  async buildDrafts(
    userId: string,
    scopeId: string,
    dayStr: string,
    timezone: string,
  ): Promise<QuestionDraft[]> {
    const today = dayBoundsUtc(dayStr, timezone);
    const tomorrow = dayBoundsUtc(addDays(dayStr, 1), timezone);
    const lookbackStart = dayBoundsUtc(
      addDays(dayStr, -DRAFT_LOOKBACK_DAYS),
      timezone,
    ).start;

    // Việc user thực sự có phần (docs 05 mục 3) — loại lời mời chưa nhận.
    const ownership: Prisma.BusinessFormTaskWhereInput = {
      OR: [
        { mainAssigneeId: userId },
        { createdById: userId },
        { assignments: { some: { userId, status: 'accepted' } } },
      ],
    };

    // ── Truy vấn 1: mọi việc liên quan trong cửa sổ [−7 ngày, +1 ngày] ──────
    const tasks: DraftTask[] = await this.prisma.businessFormTask.findMany({
      where: {
        AND: [
          ownership,
          NOT_DELETED,
          {
            OR: [
              { completedAt: { gte: today.start, lt: today.end } },
              { updatedAt: { gte: today.start, lt: today.end } },
              {
                status: {
                  in: [
                    BusinessFormTaskStatus.pending,
                    BusinessFormTaskStatus.in_progress,
                  ],
                },
                OR: [
                  { dueDate: { lt: tomorrow.end } },
                  { startDate: { lt: tomorrow.end } },
                  { lastActivityAt: { gte: lookbackStart } },
                ],
              },
            ],
          },
        ],
      },
      select: DRAFT_TASK_SELECT,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: 200,
    });

    // ── Truy vấn 2: linkedTaskIds của câu tồn đọng 7 ngày gần nhất ─────────
    // Truy vấn "việc có hoạt động hôm nay" cũ đã bỏ ngày 10/09/2026: từ lần
    // tách câu `done`/`blocked` ngày 25/08 không còn chỗ nào đọc kết quả của
    // nó, mỗi lần dựng gợi ý tốn một truy vấn vô ích.
    // (phục vụ gợi ý "cần hỗ trợ": việc tồn đọng lặp lại nhiều ngày)
    //
    // Đọc CẢ HAI kind: `blocked` là câu hiện hành, `done_blocked` là câu ghép
    // cũ dùng tới 25/08/2026. Cửa sổ nhìn lùi là 7 ngày nên trong tuần đầu sau
    // khi đổi bộ câu hỏi, phần lớn dữ liệu vẫn nằm ở kind cũ — bỏ nó đi là gợi
    // ý "tồn đọng lặp lại" im lặng chết một tuần.
    const pastAnswers = await this.prisma.dailyReportAnswer.findMany({
      where: {
        questionKind: {
          in: [
            DailyReportQuestionKind.blocked,
            DailyReportQuestionKind.done_blocked,
          ],
        },
        report: {
          userId,
          deletedAt: null,
          reportDate: {
            gte: new Date(
              `${addDays(dayStr, -DRAFT_LOOKBACK_DAYS)}T00:00:00.000Z`,
            ),
            lt: new Date(`${dayStr}T00:00:00.000Z`),
          },
        },
      },
      select: { linkedTaskIds: true, report: { select: { reportDate: true } } },
      take: 50,
    });
    const blockerDays = new Map<string, Set<string>>();
    for (const answer of pastAnswers) {
      for (const taskId of new Set(answer.linkedTaskIds)) {
        const dates = blockerDays.get(taskId) ?? new Set<string>();
        dates.add(answer.report.reportDate.toISOString().slice(0, 10));
        blockerDays.set(taskId, dates);
      }
    }
    const blockerDayCount = new Map(
      Array.from(blockerDays, ([taskId, dates]) => [taskId, dates.size]),
    );

    // ── Phân loại trong bộ nhớ (không truy vấn thêm) ────────────────────────
    const inWindow = (d: Date | null, w: DayWindow) =>
      d !== null && d >= w.start && d < w.end;
    const isOpen = (t: DraftTask) =>
      t.status === BusinessFormTaskStatus.pending ||
      t.status === BusinessFormTaskStatus.in_progress;

    // Việc con: parse MỘT lần cho mỗi việc rồi tra bằng Map. Cột `items` đã đi
    // kèm truy vấn 1 nên đây thuần là xử lý trong bộ nhớ.
    const itemsByTask = new Map<string, DraftItem[]>(
      tasks.map((t) => [t.id, readItems(t.items, userId, today)]),
    );
    const itemsOf = (taskId: string): DraftItem[] =>
      itemsByTask.get(taskId) ?? [];
    /**
     * Việc cha chưa xong nhưng trong ngày có việc con được tick — công sức thật.
     *
     * Loại việc đã HUỶ: truy vấn 1 vẫn kéo về việc `cancelled` qua nhánh
     * `updatedAt` trong hôm nay, mà tick một việc con cũng chạm `updatedAt`. Không
     * chặn ở đây thì việc đã huỷ sẽ nằm dưới tiêu đề "Đã xong" — cùng họ với lỗi
     * đã ghi nhận "auto-draft in nhãn (đang làm) cho việc đã huỷ".
     */
    const hasItemDoneToday = (task: DraftTask) =>
      task.status !== BusinessFormTaskStatus.cancelled &&
      itemsOf(task.id).some((i) => i.doneToday);

    /**
     * Báo cáo chỉ kể đúng trạng thái hiện tại trong ngày báo cáo:
     * - việc đã hoàn thành phải có `completedAt` trong hôm nay;
     * - việc đang làm phải có hoạt động gần nhất trong hôm nay.
     *
     * Không dùng `updatedAt` để thay thế `lastActivityAt`: đổi tên, đổi người
     * phụ trách hoặc cập nhật metadata không đồng nghĩa với có tiến triển.
     * Các cờ activity/checklist bên dưới vẫn giúp phân loại lý do, nhưng không
     * được mở cửa cho một việc đang làm đã cũ hoặc một việc đã hoàn thành từ
     * ngày trước.
     */
    const isCompletedToday = (t: DraftTask) =>
      t.status === BusinessFormTaskStatus.done &&
      inWindow(t.completedAt, today);
    const isRecentlyActiveInProgress = (t: DraftTask) =>
      t.status === BusinessFormTaskStatus.in_progress &&
      inWindow(t.lastActivityAt, today);
    const isEligibleForReport = (t: DraftTask) => {
      if (t.status === BusinessFormTaskStatus.cancelled) return false;
      if (t.status === BusinessFormTaskStatus.done) return isCompletedToday(t);
      if (t.status === BusinessFormTaskStatus.in_progress)
        return isRecentlyActiveInProgress(t);
      return true;
    };
    const eligibleTasks = tasks.filter(isEligibleForReport);

    // Câu 1 — Những việc đã hoàn thành.
    // Khối "đã xong" nhận cả việc CHƯA hoàn thành nhưng trong ngày có việc con
    // được tick. Trước đây khối này rỗng dù người ta làm cả ngày, chỉ vì việc cha
    // còn dở — đúng chỗ mà phản hồi "gợi ý chưa lấy việc con" chỉ ra.
    const doneToday: Array<{
      task: DraftTask;
      reason: DraftSource['reason'];
    }> = [];
    for (const t of eligibleTasks) {
      if (isCompletedToday(t)) {
        doneToday.push({ task: t, reason: 'completed_today' });
      } else if (hasItemDoneToday(t)) {
        doneToday.push({ task: t, reason: 'subtask_done_today' });
      }
    }
    // Khối này nay có trần 15 dòng và chứa HAI loại việc, nên thứ tự thành ra
    // quan trọng: việc thật sự hoàn thành phải đứng trước việc mới chỉ xong vài
    // việc con, nếu không nó bị đẩy ra khỏi khối "Đã xong" của chính mình.
    doneToday.sort((a, b) => {
      const closedA = a.reason === 'completed_today' ? 0 : 1;
      const closedB = b.reason === 'completed_today' ? 0 : 1;
      if (closedA !== closedB) return closedA - closedB;
      const pa = PRIORITY_ORDER[a.task.priority] ?? 9;
      const pb = PRIORITY_ORDER[b.task.priority] ?? 9;
      if (pa !== pb) return pa - pb;
      return b.task.lastActivityAt.getTime() - a.task.lastActivityAt.getTime();
    });

    const blocked: Array<{ task: DraftTask; reason: DraftSource['reason'] }> =
      [];
    for (const t of eligibleTasks) {
      if (!isOpen(t)) continue;
      if (t.dueDate && t.dueDate < today.start) {
        blocked.push({ task: t, reason: 'overdue' });
      } else if (inWindow(t.dueDate, today)) {
        blocked.push({ task: t, reason: 'due_today' });
      } else if (
        t.status === BusinessFormTaskStatus.in_progress &&
        (t.startDate === null || t.startDate < today.end)
      ) {
        blocked.push({ task: t, reason: 'carry_over' });
      }
    }
    blocked.sort((a, b) => {
      const da = a.task.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const db = b.task.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return da - db; // quá hạn lâu nhất lên trước
    });

    /*
     * Việc NGƯỜI DUYỆT đã chuyển tiếp sang chính ngày này ("Tiếp tục thực
     * hiện" ở báo cáo hôm trước).
     *
     * Đây là mắt xích cuối của carry-over: không có nó thì "Tiếp tục thực hiện"
     * chỉ ghi một dòng vào bảng rồi thôi, và thành viên mở báo cáo hôm sau không
     * thấy gì cả.
     *
     * Khác `carry_over` phía trên ở chỗ căn bản: cái kia là bộ máy gợi ý SUY từ
     * hạn công việc, cái này là quyết định đã ghi của một con người, nên nó
     * được đẩy LÊN ĐẦU khối tồn đọng và mang nhãn riêng.
     *
     * Lọc theo `scopeId` của báo cáo nguồn: quyết định của người duyệt nhóm X
     * chỉ đáp xuống báo cáo nhóm X. Bản trước chỉ lọc `userId`, nên người ở hai
     * nhóm thấy việc nhóm X chuyển tiếp hiện cả trong báo cáo nhóm Y.
     */
    const carriedRows = await this.prisma.dailyReportCarryOver.findMany({
      where: {
        toReportDate: reportDateValue(dayStr),
        cancelledAt: null,
        fromReport: { userId, scopeId },
      },
      select: { taskId: true, note: true },
      orderBy: { createdAt: 'asc' },
    });

    // Hai lượt duyệt của cùng nhóm có thể chuyển cùng một task: gộp về một dòng.
    const carriedTaskIds = new Set(
      carriedRows
        .map((row) => row.taskId)
        .filter((id): id is string => id !== null),
    );
    if (carriedTaskIds.size > 0) {
      // Việc đã có trong khối tồn đọng thì chỉ NÂNG nhãn, không nhân đôi dòng.
      for (const entry of blocked) {
        if (carriedTaskIds.has(entry.task.id)) {
          entry.reason = 'reviewer_carry_over';
        }
      }
      const daCo = new Set(blocked.map((e) => e.task.id));
      const thieu = [...carriedTaskIds].filter((id) => !daCo.has(id));
      // Việc nằm ngoài cửa sổ [-7, +1] của truy vấn gợi ý vẫn phải hiện: đã có
      // người chỉ đích danh nó.
      if (thieu.length > 0) {
        const themTasks = await this.prisma.businessFormTask.findMany({
          where: { id: { in: thieu }, deletedAt: null },
          select: DRAFT_TASK_SELECT,
        });
        for (const t of themTasks) {
          // Xong hoặc huỷ kể từ lúc được chuyển thì không còn là tồn đọng. Thiếu
          // phép lọc này thì việc đã hoàn thành hiện ở khối "tồn đọng" kèm nhãn
          // "người duyệt chuyển sang hôm nay".
          if (!isOpen(t)) continue;
          blocked.push({ task: t, reason: 'reviewer_carry_over' });
        }
      }
      // Quyết định của con người lên trước mọi suy đoán của bộ máy. `sort` giữ
      // nguyên thứ tự hạn công việc trong cùng một nhóm.
      const rank = (reason: DraftSource['reason']) =>
        reason === 'reviewer_carry_over' ? 0 : 1;
      blocked.sort((a, b) => rank(a.reason) - rank(b.reason));
    }

    /** Dòng chuyển tiếp GÕ TAY: không có task nào để render, chỉ có nội dung. */
    const carriedNotes = carriedRows
      .filter((row) => !row.taskId && row.note)
      .map((row) => `- ${row.note} (người duyệt chuyển sang hôm nay)`);

    // Câu 3 — Cần hỗ trợ: KHÔNG tự viết, chỉ gợi ý nguồn (docs 05 mục 4).
    const helpCutoff = new Date(
      today.start.getTime() - DRAFT_OVERDUE_HELP_DAYS * 24 * 60 * 60 * 1000,
    );
    const stalledCutoff = new Date(
      today.start.getTime() - DRAFT_STALLED_DAYS * 24 * 60 * 60 * 1000,
    );
    const helpSources: DraftSource[] = [];
    const helpSeen = new Set<string>();
    for (const t of eligibleTasks) {
      if (!isOpen(t)) continue;
      let reason: DraftSource['reason'] | null = null;
      if (t.dueDate && t.dueDate < helpCutoff) reason = 'overdue';
      else if (
        t.status === BusinessFormTaskStatus.in_progress &&
        t.lastActivityAt < stalledCutoff
      )
        reason = 'stalled';
      else if ((blockerDayCount.get(t.id) ?? 0) >= 3)
        reason = 'recurring_blocker';
      if (reason && !helpSeen.has(t.id)) {
        helpSeen.add(t.id);
        const items = itemsOf(t.id);
        helpSources.push(
          this.toSource(t, reason, items, pickItems(items, 'pending')),
        );
      }
    }

    // Câu 4 — Ngày mai làm việc gì
    const tomorrowTasks: Array<{
      task: DraftTask;
      reason: DraftSource['reason'];
    }> = [];
    for (const t of eligibleTasks) {
      if (isOpen(t) && inWindow(t.dueDate, tomorrow)) {
        tomorrowTasks.push({ task: t, reason: 'due_tomorrow' });
      }
    }
    for (const b of blocked) {
      if (!tomorrowTasks.some((x) => x.task.id === b.task.id)) {
        tomorrowTasks.push({ task: b.task, reason: 'carry_over' });
      }
    }
    for (const t of eligibleTasks) {
      if (
        inWindow(t.startDate, tomorrow) &&
        isOpen(t) &&
        !tomorrowTasks.some((x) => x.task.id === t.id)
      ) {
        tomorrowTasks.push({ task: t, reason: 'starts_tomorrow' });
      }
    }

    // ── Kết xuất ────────────────────────────────────────────────────────────
    // Dòng con của câu "đã hoàn thành" chỉ nêu việc con vừa tick xong — liệt kê
    // việc con còn dở ở đây là bịa ra thành tích chưa có (docs 05 mục 1).
    const doneBlock = this.renderBlock(
      doneToday,
      DRAFT_MAX_DONE_LINES,
      today.start,
      'done_today',
      itemsOf,
    );
    // Việc con còn dở của một việc tồn đọng chính là câu trả lời cho "tồn ở chỗ
    // nào" — thứ mà docs 05 mục 8 từng ghi là hạn chế không suy được.
    const blockedBlock = this.renderBlock(
      blocked,
      DRAFT_MAX_BLOCKED_LINES,
      today.start,
      'pending',
      itemsOf,
    );
    /*
     * Dòng chuyển tiếp GÕ TAY chen lên ĐẦU khối tồn đọng.
     *
     * Chúng không có `taskId` nên `renderBlock` không dựng được — nhưng chúng
     * là thứ người duyệt gõ tay chỉ đích danh, nên bỏ qua là mất hẳn nhánh
     * carry-over cho báo cáo toàn chữ.
     */
    if (carriedNotes.length > 0) {
      blockedBlock.lines.unshift(...carriedNotes);
    }
    // Từ 25/08/2026 "đã xong" và "tồn đọng" là HAI câu riêng, nên mỗi khối được
    // trọn `MAX_ANSWER_CONTENT_LENGTH` thay vì nửa ngân sách như hồi còn ghép
    // chung một ô. Cũng không còn hai tiêu đề khối "Đã xong:" / "Tồn đọng:" —
    // nhãn câu hỏi đã nói đúng việc đó rồi.
    const tomorrowBlock = this.renderBlock(
      tomorrowTasks,
      DRAFT_MAX_TOMORROW_LINES,
      today.start,
      'pending',
      itemsOf,
    );

    return [
      {
        questionKind: DailyReportQuestionKind.done,
        content: this.capLines(doneBlock.lines, MAX_ANSWER_CONTENT_LENGTH).join(
          '\n',
        ),
        linkedTaskIds: doneBlock.taskIds,
        sources: doneBlock.sources,
      },
      {
        // Một việc có thể xuất hiện ở CẢ hai câu (hôm nay xong việc con A, còn
        // tồn việc con B) — đó là mô tả đúng, không phải trùng lặp. Hồi hai khối
        // còn chung một ô thì `linkedTaskIds` phải gộp qua `Set` để chip không
        // lặp; nay mỗi câu giữ danh sách riêng nên không còn chỗ nào lặp id.
        questionKind: DailyReportQuestionKind.blocked,
        content: this.capLines(
          blockedBlock.lines,
          MAX_ANSWER_CONTENT_LENGTH,
        ).join('\n'),
        linkedTaskIds: blockedBlock.taskIds,
        sources: blockedBlock.sources,
      },
      {
        questionKind: DailyReportQuestionKind.need_help,
        content: '',
        linkedTaskIds: [],
        sources: helpSources,
      },
      {
        questionKind: DailyReportQuestionKind.tomorrow,
        content: this.capLines(
          tomorrowBlock.lines,
          MAX_ANSWER_CONTENT_LENGTH,
        ).join('\n'),
        linkedTaskIds: tomorrowBlock.taskIds,
        sources: tomorrowBlock.sources,
      },
    ];
  }

  private dedupe<T extends { task: DraftTask }>(items: T[]): T[] {
    const seen = new Set<string>();
    return items.filter((x) => {
      if (seen.has(x.task.id)) return false;
      seen.add(x.task.id);
      return true;
    });
  }

  /**
   * Định dạng một việc: dòng cha `• CV… — tiêu đề (hậu tố)` (docs 05 mục 5), rồi
   * các dòng việc con thụt lề `  – nhãn`.
   *
   * Dùng `–` cho dòng con thay vì `•` để người dùng nhìn ra ngay đâu là việc cha,
   * và cũng như `•` nó không phải cú pháp markdown nên không vỡ hiển thị.
   */
  private renderLine(
    task: DraftTask,
    reason: DraftSource['reason'],
    todayStart: Date,
    itemMode: ItemMode,
    items: DraftItem[],
  ): { lines: string[]; source: DraftSource } {
    const title =
      task.title.length > 80 ? `${task.title.slice(0, 80)}…` : task.title;
    const prefix = task.code ? `${task.code} — ` : '';
    let suffix = '';
    switch (reason) {
      case 'completed_today':
        suffix = ' (đã xong)';
        break;
      case 'subtask_done_today':
        suffix = ' (đang làm)';
        break;
      case 'in_progress_today':
      case 'activity_today':
      case 'updated_today':
        suffix = ' (đang làm)';
        break;
      case 'overdue': {
        const days = task.dueDate
          ? Math.max(
              1,
              Math.floor(
                (todayStart.getTime() - task.dueDate.getTime()) /
                  (24 * 60 * 60 * 1000),
              ),
            )
          : 0;
        suffix = days > 0 ? ` (quá hạn ${days} ngày)` : ' (quá hạn)';
        break;
      }
      case 'due_today':
        suffix = ' (đến hạn hôm nay)';
        break;
      case 'due_tomorrow':
        suffix = ' (đến hạn ngày mai)';
        break;
      case 'carry_over':
        suffix = ' (chuyển tiếp từ hôm nay)';
        break;
      case 'reviewer_carry_over':
        suffix = ' (người duyệt chuyển sang hôm nay)';
        break;
      case 'starts_tomorrow':
        suffix = ' (bắt đầu ngày mai)';
        break;
      case 'stalled':
        suffix = ` (không hoạt động ${DRAFT_STALLED_DAYS} ngày)`;
        break;
      case 'recurring_blocker':
        suffix = ' (tồn đọng nhiều ngày)';
        break;
    }

    // In ĐỦ việc con khớp khối, không cắt theo số lượng. Cắt bớt ở đây làm người
    // báo cáo tưởng mình chỉ làm được từng đó, đúng phần họ cần khai lại mất.
    // Trần ký tự của cả câu vẫn do `capLines` giữ, nên không có nguy cơ vượt
    // `MAX_ANSWER_CONTENT_LENGTH`.
    const shown = pickItems(items, itemMode);
    // Dòng cha KHÔNG mang đuôi tiến độ. Bản thân danh sách gạch đầu dòng bên dưới
    // đã nói đủ; thêm `· hôm nay xong 4 việc con (tiến độ 4/4)` chỉ làm dòng dài
    // ra và lặp lại thứ người đọc thấy ngay dòng kế tiếp.
    const lines = [`• ${prefix}${title}${suffix}`];
    for (const item of shown) {
      lines.push(`  – ${item.label}`);
    }

    return { lines, source: this.toSource(task, reason, items, shown) };
  }

  /**
   * Dựng một khối: cắt còn `max` việc, phần dư gộp thành `… và N việc khác`.
   * Trần áp cho VIỆC CHA — dòng việc con không tính vào đây và cũng không vào
   * `linkedTaskIds`, nên mở rộng gợi ý không ăn vào hạn mức MAX_LINKED_TASKS.
   */
  private renderBlock(
    entries: Array<{ task: DraftTask; reason: DraftSource['reason'] }>,
    max: number,
    todayStart: Date,
    itemMode: ItemMode,
    itemsOf: (taskId: string) => DraftItem[],
  ): { lines: string[]; taskIds: string[]; sources: DraftSource[] } {
    const unique = this.dedupe(entries);
    const lines: string[] = [];
    const taskIds: string[] = [];
    const sources: DraftSource[] = [];
    for (const entry of unique.slice(0, max)) {
      const rendered = this.renderLine(
        entry.task,
        entry.reason,
        todayStart,
        itemMode,
        itemsOf(entry.task.id),
      );
      lines.push(...rendered.lines);
      taskIds.push(rendered.source.taskId);
      sources.push(rendered.source);
    }
    if (unique.length > max) {
      lines.push(`… và ${unique.length - max} việc khác`);
    }
    return { lines, taskIds, sources };
  }

  private toSource(
    task: DraftTask,
    reason: DraftSource['reason'],
    items: DraftItem[],
    shownItems: DraftItem[],
  ): DraftSource {
    const acceptedAssignments = (task.assignments ?? []).filter(
      (assignment) => assignment.status === 'accepted',
    );
    const isShared =
      acceptedAssignments.some(
        (assignment) => assignment.userId !== task.mainAssigneeId,
      ) || acceptedAssignments.length > 1;
    const source: DraftSource = {
      taskId: task.id,
      code: task.code,
      title: task.title,
      scope: isShared ? 'group' : 'personal',
      reason,
    };
    // Việc không có việc con thì bỏ hẳn ba trường này khỏi payload, để FE phân
    // biệt được "không có checklist" với "checklist rỗng".
    if (items.length === 0) return source;
    source.itemsTotal = items.length;
    source.itemsDone = items.filter((i) => i.done).length;
    if (shownItems.length > 0) source.items = shownItems;
    return source;
  }

  private capContent(content: string): string {
    if (content.length <= MAX_ANSWER_CONTENT_LENGTH) return content;
    return `${content.slice(0, MAX_ANSWER_CONTENT_LENGTH - 1)}…`;
  }

  /**
   * Cắt theo DÒNG chứ không theo ký tự.
   *
   * Cắt giữa chuỗi để lại một việc con cụt kiểu `  – Xin chữ k…` — đọc ra thành
   * một việc con không có thật. Với dòng con thì hậu quả nặng hơn dòng cha, vì
   * dòng cha phía trên vẫn khẳng định `còn 5/8 việc con` trong khi bên dưới chỉ
   * còn hai dòng.
   */
  private capLines(lines: string[], budget: number): string[] {
    const kept: string[] = [];
    let used = 0;
    // Chừa sẵn chỗ cho dòng báo cắt. Cộng nó vào SAU khi đã quyết định dừng thì
    // chuỗi kết quả vượt trần đúng bằng độ dài dòng đó — và chính DTO của server
    // (`@MaxLength(MAX_ANSWER_CONTENT_LENGTH)`) sẽ trả 400 cho nội dung mà server
    // vừa tự dựng ra, làm người dùng mất bản nháp lúc lưu.
    const safeBudget = budget - TRUNCATED_LINE.length;
    for (const line of lines) {
      const cost = line.length + 1; // +1 cho ký tự xuống dòng
      if (used + cost > safeBudget) {
        kept.push(TRUNCATED_LINE);
        break;
      }
      kept.push(line);
      used += cost;
    }
    return kept;
  }
}
