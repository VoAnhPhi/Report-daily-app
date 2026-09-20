import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import {
  AdminCreateTaskDto,
  AdminUpdateTaskDto,
  AdminQueryTasksDto,
  ExportTasksDto,
  AdminTaskAssignmentDto,
  AdminUserTaskOverviewDto,
  AdminTaskAnalyticsDto,
} from '../dto/admin-task.dto';
import {
  CreateUserTaskDto,
  UpdateUserTaskDto,
  CreateTaskActivityDto,
  UpdateTaskStatusDto,
  UpdateTaskActivityDto,
  QueryTaskActivitiesDto,
  QuerySharedTasksDto,
  TaskActivityFilter,
  ReactTaskActivityDto,
  LeaveTaskDto,
  REMINDER_TASK_SELECT,
  ReminderTask,
  TaskAccessInput,
} from '../dto/user-task.dto';
import {
  BabyAdoptionStatus,
  BusinessFormPriority,
  BusinessFormTaskActivityType,
  BusinessFormTaskAssignmentStatus,
  BusinessFormTaskStatus,
  BusinessFormTaskType,
  Prisma,
  ActivityTargetType,
  ActivityType,
  NotificationAction,
  NotificationScope,
  RelatedModel,
} from '@prisma/client';
import { QueryUserTasksDto } from '../dto/query-user-tasks.dto';
import {
  BusinessFormTaskResponseDto,
  BusinessFormTaskActivityResponseDto,
  BusinessFormTaskActivityReactionSummaryDto,
  BusinessFormTaskMemberDto,
  BusinessFormUserSummaryDto,
  PaginatedTasksResponse,
} from '../dto/business-form-response.dto';
import { JwtPayload } from 'src/auth/jwt-payload';
import { randomUUID } from 'node:crypto';
import { ActivityLogService } from '../../activity-logs/activity-log.service';
import { BusinessFormTasksGateway } from '../gateways/business-form-tasks.gateway';
import { MailNotificationsPublisher } from '../../mail/queue/mail-notifications.publisher';
import { NotificationService } from '../../notifications/notification.service';
import * as ExcelJS from 'exceljs';
import { generateTaskCode } from '../helpers/task-code.helper';
import {
  MAX_EXPORT_ROWS,
  THIN_BORDER,
  EXPORT_COLORS,
  EXPORT_HEADER_HEIGHT,
  EXPORT_HEADER_FONT_SIZE,
  TASK_EXPORT_COLUMNS,
  slugify,
  sheetName,
} from '../helpers/task-export.helper';
import { TASK_STATUS_LABELS } from '../constants/task-labels';
import { COOPERATION_CATEGORY_LABELS } from '../constants/cooperation-category-labels';

const TASK_INCLUDE = {
  createdBy: {
    select: {
      id: true,
      fullName: true,
      avatar: { select: { fileUrl: true } },
    },
  },
  mainAssignee: {
    select: {
      id: true,
      fullName: true,
      referenceId: true,
      avatar: { select: { fileUrl: true } },
    },
  },
  assignments: {
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          referenceId: true,
          avatar: { select: { fileUrl: true } },
        },
      },
    },
  },
  completedBy: { select: { id: true, fullName: true } },
  // Làm thay: join lấy tên tươi người được chăm cho badge "thay cho".
  onBehalfOf: { select: { fullName: true } },
  // items + attachments giờ là cột JSONB scalar trên task -> tự được select, không cần include.
  businessForm: {
    select: { id: true, companyName: true, status: true, userId: true },
  },
};

// ---- Checklist item (cột JSON `items`) + lịch sử theo từng việc con ----
type TaskItemAction =
  | 'added'
  | 'renamed'
  | 'checked'
  | 'unchecked'
  | 'deleted'
  | 'restored'
  | 'report_due_changed'
  | 'completion_due_changed';

interface TaskItemEvent {
  action: TaskItemAction;
  byId: string;
  byName: string; // snapshot tên để FE không phải join
  at: string; // ISO
  from?: string; // 'renamed': nhãn cũ
  to?: string; // 'renamed': nhãn mới
}

interface StoredTaskItem {
  id: string;
  label: string;
  done: boolean;
  deleted?: boolean;
  reportDueAt?: string | null;
  completionDueAt?: string | null;
  history: TaskItemEvent[];
}

/** Item client gửi lên (history do server tự quản, không nhận từ client). */
type IncomingTaskItem = {
  id?: string;
  label: string;
  done?: boolean;
  deleted?: boolean;
  reportDueAt?: string | null;
  completionDueAt?: string | null;
  /** Xoá hẳn khi lưu: gỡ khỏi mảng kèm history. */
  purge?: boolean;
};

type ItemActor = { id: string; name: string };

const makeEvent = (
  action: TaskItemAction,
  actor: ItemActor,
  now: Date,
  extra?: { from?: string; to?: string },
): TaskItemEvent => ({
  action,
  byId: actor.id,
  byName: actor.name,
  at: now.toISOString(),
  ...extra,
});

/** Tạo items khi TẠO việc: mỗi item gắn 1 event `added` bởi người tạo. */
const buildItemsForCreate = (
  items: IncomingTaskItem[] | undefined,
  actor: ItemActor,
  now: Date,
): StoredTaskItem[] =>
  (items ?? []).map((i) => ({
    id: randomUUID(),
    label: i.label,
    done: i.done ?? false,
    reportDueAt: i.reportDueAt ?? null,
    completionDueAt: i.completionDueAt ?? null,
    history: [makeEvent('added', actor, now)],
  }));

/**
 * Gộp items khi CẬP NHẬT: so mảng cũ (đã lưu) với mảng client gửi lên theo `id`,
 * ghi append-only các event (thêm/sửa nhãn/tick/bỏ tick/xoá mềm/khôi phục).
 * Item bị xoá được GIỮ LẠI (deleted:true) để FE hiển thị gạch ngang + lịch sử.
 */
/** Việc con bị xoá hẳn trong một lần lưu — dùng để ghi log timeline. */
type PurgedItem = { id: string; label: string };

const mergeItemsForUpdate = (
  oldItemsRaw: unknown,
  incoming: IncomingTaskItem[] | undefined,
  actor: ItemActor,
  now: Date,
): { items: StoredTaskItem[]; purged: PurgedItem[] } => {
  const oldItems: StoredTaskItem[] = Array.isArray(oldItemsRaw)
    ? (oldItemsRaw as StoredTaskItem[]).map((i) => ({
        id: i.id,
        label: i.label,
        done: !!i.done,
        deleted: !!i.deleted,
        reportDueAt: i.reportDueAt ?? null,
        completionDueAt: i.completionDueAt ?? null,
        history: Array.isArray(i.history) ? i.history : [],
      }))
    : [];
  const oldById = new Map(oldItems.map((i) => [i.id, i]));
  const seen = new Set<string>();
  const result: StoredTaskItem[] = [];
  const purged: PurgedItem[] = [];

  for (const inc of incoming ?? []) {
    const prev = inc.id ? oldById.get(inc.id) : undefined;

    // Xoá hẳn: bỏ khỏi kết quả kèm toàn bộ history. `seen` phải đánh dấu để
    // nhánh phòng thủ bên dưới không hồi sinh nó dưới dạng xoá mềm.
    if (inc.purge) {
      if (prev) {
        seen.add(prev.id);
        purged.push({ id: prev.id, label: prev.label });
      }
      continue;
    }

    if (!prev) {
      // Item mới (không id hoặc id lạ) → gán id + event added.
      result.push({
        id: randomUUID(),
        label: inc.label,
        done: inc.done ?? false,
        reportDueAt: inc.reportDueAt ?? null,
        completionDueAt: inc.completionDueAt ?? null,
        history: [makeEvent('added', actor, now)],
      });
      continue;
    }
    seen.add(prev.id);
    const history = [...prev.history];
    const nextLabel = inc.label;
    const nextDone = inc.done ?? false;
    const nextDeleted = !!inc.deleted;
    const nextReportDueAt = inc.reportDueAt ?? null;
    const nextCompletionDueAt = inc.completionDueAt ?? null;

    if (nextLabel !== prev.label) {
      history.push(
        makeEvent('renamed', actor, now, {
          from: prev.label,
          to: nextLabel,
        }),
      );
    }
    if (nextDone !== prev.done) {
      history.push(makeEvent(nextDone ? 'checked' : 'unchecked', actor, now));
    }
    if (nextReportDueAt !== (prev.reportDueAt ?? null)) {
      history.push(
        makeEvent('report_due_changed', actor, now, {
          from: prev.reportDueAt ?? undefined,
          to: nextReportDueAt ?? undefined,
        }),
      );
    }
    if (nextCompletionDueAt !== (prev.completionDueAt ?? null)) {
      history.push(
        makeEvent('completion_due_changed', actor, now, {
          from: prev.completionDueAt ?? undefined,
          to: nextCompletionDueAt ?? undefined,
        }),
      );
    }
    if (nextDeleted && !prev.deleted) {
      history.push(makeEvent('deleted', actor, now));
    } else if (!nextDeleted && prev.deleted) {
      history.push(makeEvent('restored', actor, now));
    }

    result.push({
      id: prev.id,
      label: nextLabel,
      done: nextDone,
      deleted: nextDeleted,
      reportDueAt: nextReportDueAt,
      completionDueAt: nextCompletionDueAt,
      history,
    });
  }

  // Item cũ mà client KHÔNG gửi lại (id biến mất) → xoá mềm phòng thủ, giữ lại.
  for (const old of oldItems) {
    if (seen.has(old.id)) continue;
    if (old.deleted) {
      result.push(old); // đã xoá từ trước, giữ nguyên
      continue;
    }
    result.push({
      ...old,
      deleted: true,
      history: [...old.history, makeEvent('deleted', actor, now)],
    });
  }

  return { items: result, purged };
};

const toAttachmentsJson = (atts?: { name: string; url: string }[]) =>
  (atts ?? []).map((a) => ({ id: randomUUID(), name: a.name, url: a.url }));

const NOT_DELETED_FORM_TASK: Prisma.BusinessFormTaskWhereInput = {
  deletedAt: null,
  OR: [{ businessFormId: null }, { businessForm: { is: { deletedAt: null } } }],
};

/**
 * "Tham gia" một công việc = phụ trách chính, hoặc người hỗ trợ ĐÃ chấp nhận.
 * Hẹp hơn `hasTaskAccess` (không tính người tạo, chủ hồ sơ, hay người còn chờ
 * xác nhận) — dùng cho "việc chung giữa hai người".
 */
const participatesIn = (
  userId: string,
): Prisma.BusinessFormTaskWhereInput => ({
  OR: [
    { mainAssigneeId: userId },
    {
      assignments: {
        some: { userId, status: BusinessFormTaskAssignmentStatus.accepted },
      },
    },
  ],
});

/**
 * Điều kiện "việc chia sẻ tới tôi": tôi là người liên quan (assignments), không
 * phải người phụ trách chính. `status` lọc trạng thái tham gia (bỏ trống = cả hai).
 */
const sharedWithMe = (
  userId: string,
  status?: BusinessFormTaskAssignmentStatus,
): Prisma.BusinessFormTaskWhereInput => ({
  assignments: { some: { userId, ...(status ? { status } : {}) } },
  NOT: { mainAssigneeId: userId },
});

/** Nhắc hạn: cửa sổ "sắp hết hạn" (24h trước hạn). */
const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Nhắc hạn: giới hạn số task quét mỗi nhịp. */
const REMINDER_SCAN_LIMIT = 500;

const REMINDER_ACTIVE_STATUSES = [
  BusinessFormTaskStatus.pending,
  BusinessFormTaskStatus.in_progress,
];

// ─── Lọc theo khoảng NGÀY, tính bằng giờ Việt Nam ───────────────────────────

/**
 * Độ lệch múi giờ Việt Nam so với UTC (+07:00), tính bằng mili-giây.
 *
 * Ghim CỨNG chứ không đọc múi giờ của tiến trình, vì máy chủ chạy trong
 * container mặc định `TZ=UTC` còn máy lập trình viên chạy `+07` — mọi hàm
 * `Date` phụ thuộc múi giờ (`getHours`, `setHours`, `getDate`…) sẽ cho hai kết
 * quả khác nhau ở hai nơi, tức loại lỗi chỉ lộ ra sau khi đã lên thật và lộ ra
 * dưới dạng "lọc sai ngày" chứ không dưới dạng ngoại lệ. Toàn bộ phép tính bên
 * dưới chỉ chạy trên số mili-giây kể từ mốc epoch nên kết quả giống hệt nhau ở
 * mọi máy. Việt Nam KHÔNG có giờ mùa hè từ 1975 nên một hằng số cộng/trừ là đủ
 * và đúng tuyệt đối, không phải kéo Intl/ICU vào chỉ để cộng bảy tiếng.
 *
 * ⚠ Module `nhan-vien-nhan` có hằng số y hệt (`NHAN_LECH_GIO_VN_MS`) và cách
 * tính y hệt. CỐ Ý khai lại ở đây thay vì nhập chéo: `business-forms` là tầng
 * nghiệp vụ nền, `nhan-vien-nhan` là một trợ lý ngồi TRÊN nó và gọi xuống —
 * nhập ngược chiều sẽ tạo vòng phụ thuộc giữa hai module.
 */
const LECH_GIO_VN_MS = 7 * 60 * 60_000;

/** Số mili-giây của một ngày tròn. */
const MS_MOI_NGAY = 24 * 60 * 60_000;

/**
 * Chỉ khớp NGÀY TRẦN `YYYY-MM-DD`: không phần giờ, không hậu tố múi giờ.
 * Đây là ranh giới quyết định giữa hai lối diễn giải bên dưới, nên nó phải
 * chặt — thêm bất cứ ký tự nào (kể cả một dấu cách thừa) là chuỗi rơi sang lối
 * "tôn trọng nguyên giá trị".
 */
const MAU_NGAY_TRAN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Mốc 00:00 GIỜ VIỆT NAM của một ngày `YYYY-MM-DD`, trả về dưới dạng thời điểm
 * tuyệt đối (đúng 17:00 UTC của ngày hôm trước). `null` khi chuỗi không phải
 * một ngày có thật.
 *
 * Vì sao phải so lại chuỗi ISO ở cuối chứ không chỉ kiểm `NaN`: `new Date`
 * KHÔNG báo lỗi với ngày không tồn tại, nó TRÀN sang tháng sau —
 * `2026-02-30T00:00:00.000Z` cho ra **02/03/2026** (đo thật trên V8, đừng suy
 * đoán lại). Chỉ dựa vào `NaN` thì một ngày bịa vẫn lọt qua và bộ lọc âm thầm
 * quét sai tháng. (`2026-13-01` thì đúng là `NaN` — tràn chỉ xảy ra khi THÁNG
 * hợp lệ mà NGÀY vượt số ngày của tháng đó, nên phần kiểm `NaN` vẫn phải giữ,
 * chỉ là không được dựa vào một mình nó.)
 */
const mocDauNgayVN = (ngayTran: string): Date | null => {
  const nuaDemUTC = new Date(`${ngayTran}T00:00:00.000Z`);
  const ms = nuaDemUTC.getTime();
  if (Number.isNaN(ms)) return null;
  if (nuaDemUTC.toISOString().slice(0, 10) !== ngayTran) return null;
  return new Date(ms - LECH_GIO_VN_MS);
};

/**
 * Dựng mệnh đề `{ field: { gte, lt|lte } }` cho một khoảng ngày; trả `{}` khi
 * không có cận nào dùng được.
 *
 * ⚠ **HÀNH VI ĐÃ ĐỔI (bản vá lỗi "Excel tải về trống không").** Trước đây hàm
 * này viết đúng hai dòng `range.gte = new Date(from)` / `range.lte =
 * new Date(to)`, và cả hai đều sai theo cùng một kiểu:
 *
 *  1. `new Date('2026-06-24')` là **nửa đêm UTC**, nên `lte` cắt ngay ĐẦU ngày
 *     cuối ⇒ gần trọn ngày 24/06 bị loại. Người dùng gõ "đến 24/06" thì hiểu là
 *     HẾT ngày 24/06, không phải 00:00 ngày 24/06 — và một khoảng "từ 24/06 đến
 *     24/06" thì rỗng tuyệt đối, tức bộ lọc phổ biến nhất (xem một ngày) là bộ
 *     lọc hỏng nặng nhất.
 *  2. Mốc là UTC trong khi nghiệp vụ chạy theo giờ Việt Nam (+07) ⇒ lệch thêm
 *     bảy tiếng nữa về cùng một phía.
 *
 * Số đo của lần hỏng thật: xuất báo cáo `startFrom=2026-06-23`,
 * `startTo=2026-06-24` cho một người có 7 việc, tệp Excel về chỉ có dòng tiêu
 * đề. Cả 7 việc đều `startDate = 2026-06-24 17:00:00+00` (tức 00:00 ngày 25/06
 * giờ VN theo cách CSDL ghi), còn cửa sổ lọc là
 * `[2026-06-23T00:00:00Z, 2026-06-24T00:00:00Z]` — cả bảy nằm ngoài, không một
 * dòng nào lọt.
 *
 * Luật MỚI, và nói rõ để không ai đọc nhầm khi đối chiếu số liệu cũ:
 *  - `from` dạng ngày trần ⇒ `gte` = **đầu ngày VN** của ngày đó;
 *  - `to` dạng ngày trần ⇒ `lt` = **đầu ngày VN KẾ TIẾP**, tức bao trọn 24 giờ
 *    của ngày cuối. Dùng `lt` của hôm sau chứ KHÔNG cộng `23:59:59.999`: cách
 *    cộng đó bỏ sót đúng một mili-giây, và một mốc rơi trúng mili-giây ấy là
 *    loại lỗi không ai tái hiện nổi;
 *  - chuỗi CÓ sẵn phần giờ (`2026-06-24T09:00:00Z`) được TÔN TRỌNG nguyên giá
 *    trị — nơi gọi đã nói rõ tới thời điểm nào thì không được ép về mốc ngày;
 *  - chuỗi không phân giải được thì BỎ QUA vế đó, thay vì đẩy một `Invalid Date`
 *    xuống Prisma (ở đó nó thành `null` trong SQL và làm cả mệnh đề im lặng
 *    không khớp gì).
 *
 * ⚠ Hàm dùng CHUNG cho ba đường: danh sách việc của người dùng, danh sách việc
 * của trang quản trị (`buildAdminTaskWhere`) và bản xuất Excel. Bản vá này sửa
 * luôn lỗi tương tự ở cả ba — đó là ý muốn. Hệ quả phải ghi nhớ: bộ lọc
 * "đến ngày X" từ nay nghĩa là **hết ngày X giờ Việt Nam**, nên cùng một tham
 * số sẽ trả về NHIỀU việc hơn trước (thêm gần trọn một ngày rưỡi ở cận trên).
 * Số liệu cũ và số liệu mới KHÔNG so sánh trực tiếp được.
 */
export const dateRangeFilter = (
  field: 'createdAt' | 'startDate' | 'dueDate',
  from?: string,
  to?: string,
): Prisma.BusinessFormTaskWhereInput => {
  if (!from && !to) return {};
  const range: Prisma.DateTimeFilter = {};

  if (from) {
    if (MAU_NGAY_TRAN.test(from)) {
      const dauNgay = mocDauNgayVN(from);
      if (dauNgay) range.gte = dauNgay;
    } else {
      const moc = new Date(from);
      if (!Number.isNaN(moc.getTime())) range.gte = moc;
    }
  }

  if (to) {
    if (MAU_NGAY_TRAN.test(to)) {
      const dauNgay = mocDauNgayVN(to);
      if (dauNgay) range.lt = new Date(dauNgay.getTime() + MS_MOI_NGAY);
    } else {
      const moc = new Date(to);
      if (!Number.isNaN(moc.getTime())) range.lte = moc;
    }
  }

  // Hai cận đều rác ⇒ trả `{}` chứ không `{ field: {} }`. Một mệnh đề rỗng lồng
  // trong `AND` là vô hại với Prisma, nhưng nó nói dối trong nhật ký truy vấn
  // rằng "có lọc theo ngày" trong khi thực chất không lọc gì.
  if (Object.keys(range).length === 0) return {};
  return { [field]: range };
};

/**
 * In một thời điểm ra `DD/MM/YYYY` **theo giờ Việt Nam**, không theo múi giờ
 * của tiến trình.
 *
 * ⚠ **HÀNH VI ĐÃ ĐỔI.** Bản cũ (`private formatDmy`) gọi thẳng `d.getDate()`,
 * `d.getMonth()`, `d.getFullYear()` — ba hàm ấy đọc múi giờ TIẾN TRÌNH. Máy chủ
 * chạy container `TZ=UTC`, nên một việc lưu `2026-06-24T17:00:00Z` (đúng 00:00
 * ngày 25/06 giờ VN, tức ngày nghiệp vụ của nó là **25/06**) bị in ra thành
 * `24/06/2026`. Trên máy lập trình viên chạy `+07` thì cùng dòng mã lại in ra
 * `25/06/2026` — nên lỗi này KHÔNG tái hiện được ở máy nội bộ, chỉ lộ ra sau
 * khi đã lên thật.
 *
 * Vì sao phải sửa NGAY trong cùng đợt vá bộ lọc khoảng ngày: vòng vá trước vừa
 * đổi `dateRangeFilter` sang mốc giờ VN. Nếu để nguyên chỗ in này thì tệp Excel
 * TỰ MÂU THUẪN với chính nó — lọc theo ngày VN nhưng in ngày theo UTC. Người
 * dùng chọn "ngày 25/06", tệp trả về đúng các việc của ngày 25/06, rồi cột
 * "Ngày bắt đầu" của từng dòng lại ghi "24/06". Một bản báo cáo tự cãi mình như
 * vậy còn tệ hơn bản lọc sai, vì người đọc không có cách nào biết bên nào đúng.
 *
 * Cách tính: cộng thẳng độ lệch vào mốc epoch rồi đọc bằng các hàm `getUTC*`.
 * Sau khi đã dịch, "giờ UTC của mốc đã dịch" chính là "giờ VN của mốc gốc", nên
 * phép đọc không còn phụ thuộc `TZ` của máy nào cả. Dùng lại đúng hằng
 * `LECH_GIO_VN_MS` đã khai ở đầu tệp — KHÔNG khai thêm một hằng thứ hai: hai
 * hằng cùng nghĩa nằm hai chỗ là cách chắc chắn nhất để một ngày nào đó chúng
 * lệch nhau mà không cổng nào kêu.
 *
 * Không dùng `toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })`:
 * nó phụ thuộc bộ dữ liệu ICU của bản Node đang chạy (ảnh `-slim` cắt ICU nên
 * âm thầm rơi về `en-US`, đảo thứ tự thành `MM/DD/YYYY` — vẫn là một chuỗi
 * trông hợp lệ, nên hỏng kiểu đó không ai phát hiện ra).
 */
export const formatNgayVN = (d: Date): string => {
  const vn = new Date(d.getTime() + LECH_GIO_VN_MS);
  const dd = String(vn.getUTCDate()).padStart(2, '0');
  const mm = String(vn.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${vn.getUTCFullYear()}`;
};

/** Link sâu tới 1 công việc (mở đúng việc trên web). Đổi domain 1 chỗ duy nhất. */
const taskLink = (id: string) => `https://acta.vn/tasks?focusTaskId=${id}`;

@Injectable()
export class BusinessFormTasksService {
  private readonly logger = new Logger(BusinessFormTasksService.name);
  private isReminderSweepRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
    private readonly tasksGateway: BusinessFormTasksGateway,
    private readonly mailPublisher: MailNotificationsPublisher,
    private readonly notificationService: NotificationService,
  ) {}

  // ────────────────────────────────────────────────────────────────────────────
  // CRON: NHẮC HẠN CÔNG VIỆC (gọi bởi ScheduledCronService)
  // ────────────────────────────────────────────────────────────────────────────

  /** Quét nhắc hạn (sắp hết hạn + quá hạn) — gọi bởi cron tập trung. */
  async sweepDeadlineReminders(): Promise<void> {
    if (this.isReminderSweepRunning) {
      this.logger.warn('Quét nhắc hạn đang chạy — bỏ qua nhịp này');
      return;
    }
    this.isReminderSweepRunning = true;
    try {
      const now = new Date();
      await this.handleReminderDueSoon(now);
      await this.handleReminderOverdue(now);
    } catch (err) {
      this.logger.error(`Quét nhắc hạn lỗi: ${String(err)}`);
    } finally {
      this.isReminderSweepRunning = false;
    }
  }

  private async handleReminderDueSoon(now: Date): Promise<void> {
    const upper = new Date(now.getTime() + DUE_SOON_WINDOW_MS);
    const tasks = await this.prisma.businessFormTask.findMany({
      where: {
        AND: [
          { status: { in: REMINDER_ACTIVE_STATUSES } },
          { dueDate: { gte: now, lte: upper } },
          { dueSoonNotifiedAt: null },
          NOT_DELETED_FORM_TASK,
        ],
      },
      select: REMINDER_TASK_SELECT,
      take: REMINDER_SCAN_LIMIT,
    });

    if (tasks.length === 0) return;
    // Bắn notify song song rồi đánh dấu 1 lần cho cả lô (thay N UPDATE tuần tự).
    await Promise.all(
      tasks.map((task) =>
        this.notifyReminderTask(
          task,
          this.reminderDedupe([
            task.mainAssigneeId,
            task.createdById,
            task.businessForm?.userId ?? null,
            ...task.assignments.map((a) => a.userId),
          ]),
          'due-soon',
        ),
      ),
    );
    await this.prisma.businessFormTask.updateMany({
      where: { id: { in: tasks.map((t) => t.id) } },
      data: { dueSoonNotifiedAt: new Date() },
    });
    this.logger.log(`Nhắc sắp hết hạn: ${tasks.length} công việc`);
  }

  private async handleReminderOverdue(now: Date): Promise<void> {
    const tasks = await this.prisma.businessFormTask.findMany({
      where: {
        AND: [
          { status: { in: REMINDER_ACTIVE_STATUSES } },
          { dueDate: { lt: now } },
          { overdueNotifiedAt: null },
          NOT_DELETED_FORM_TASK,
        ],
      },
      select: REMINDER_TASK_SELECT,
      take: REMINDER_SCAN_LIMIT,
    });

    if (tasks.length === 0) return;
    await Promise.all(
      tasks.map((task) =>
        this.notifyReminderTask(
          task,
          this.reminderDedupe([task.mainAssigneeId, task.createdById]),
          'overdue',
        ),
      ),
    );
    await this.prisma.businessFormTask.updateMany({
      where: { id: { in: tasks.map((t) => t.id) } },
      data: { overdueNotifiedAt: new Date() },
    });
    this.logger.log(`Nhắc quá hạn: ${tasks.length} công việc`);
  }

  /** Tạo notification + enqueue mail nhắc hạn cho 1 công việc. */
  private async notifyReminderTask(
    task: ReminderTask,
    recipientIds: string[],
    variant: 'due-soon' | 'overdue',
  ): Promise<void> {
    if (recipientIds.length === 0 || !task.dueDate) return;
    const dueDate = this.formatDmy(task.dueDate);

    try {
      const action =
        variant === 'overdue'
          ? NotificationAction.task_overdue
          : NotificationAction.task_due_soon;
      const message =
        variant === 'overdue'
          ? `Công việc ${task.title} đã quá hạn (${dueDate})`
          : `Công việc ${task.title} sắp đến hạn (${dueDate})`;
      await Promise.all(
        recipientIds.map((uid) =>
          this.notificationService.createNotificationWithCounter({
            userId: uid,
            relatedModel: RelatedModel.system,
            relatedModelId: task.id,
            action,
            linkUrl: taskLink(task.id),
            message,
            scope: NotificationScope.personal,
          }),
        ),
      );
    } catch (err) {
      this.logger.error(
        `Notification nhắc hạn lỗi (task=${task.id}): ${String(err)}`,
      );
    }

    try {
      const users = await this.prisma.user.findMany({
        where: { id: { in: recipientIds } },
        select: { email: true },
      });
      const emails = this.reminderDedupe(users.map((u) => u.email));
      if (emails.length === 0) return;

      const taskUrl = taskLink(task.id);
      await this.mailPublisher.enqueue({
        mailType: variant === 'overdue' ? 'task-overdue' : 'task-due-soon',
        taskId: task.id,
        data: {
          taskTitle: task.title,
          dueDate,
          taskUrl,
          recipients: emails,
        },
      });
    } catch (err) {
      this.logger.error(
        `Enqueue mail nhắc hạn lỗi (task=${task.id}): ${String(err)}`,
      );
    }
  }

  /**
   * Tạo task kèm mã `code`. Mã sinh bằng đếm-theo-ngày nên hai request đồng thời
   * có thể ra cùng số; lúc đó unique constraint bung P2002 và ta sinh lại.
   */
  private async createTaskWithCode(
    data: Prisma.BusinessFormTaskUncheckedCreateInput,
    include: typeof TASK_INCLUDE,
  ) {
    const MAX_ATTEMPTS = 5;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const code = await generateTaskCode(this.prisma);
      try {
        return await this.prisma.businessFormTask.create({
          data: { ...data, code },
          include,
        });
      } catch (err) {
        const isCodeClash =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          String((err.meta as { target?: unknown } | undefined)?.target).includes(
            'code',
          );
        if (isCodeClash && attempt < MAX_ATTEMPTS) continue;
        throw err;
      }
    }
    throw new InternalServerErrorException(
      'Không tạo được mã công việc sau nhiều lần thử',
    );
  }

  private reminderDedupe(ids: (string | null | undefined)[]): string[] {
    return [...new Set(ids.filter((id): id is string => !!id))];
  }

  private hasTaskAccess(task: TaskAccessInput, userId: string): boolean {
    const isOwner = task.businessForm?.userId === userId;
    const isCreator = task.createdById === userId;
    const isMain = task.mainAssigneeId === userId;
    const isRelated = task.assignments?.some((a) => a.userId === userId);
    return isOwner || isCreator || isMain || !!isRelated;
  }

  /**
   * Người hỗ trợ CHƯA xác nhận tham gia (assignment status = pending) chưa được thao tác
   * (sửa việc / đổi trạng thái / bình luận). Phải bấm "Tham gia" trước.
   * Phụ trách chính / người tạo / chủ hồ sơ không nằm trong assignments nên không bị chặn.
   */
  private async assertNotPendingMember(
    userId: string,
    taskId: string,
  ): Promise<void> {
    const assignment = await this.prisma.businessFormTaskAssignment.findUnique({
      where: { taskId_userId: { taskId, userId } },
      select: { status: true },
    });
    if (assignment?.status === BusinessFormTaskAssignmentStatus.pending) {
      throw new ForbiddenException(
        'Bạn cần tham gia công việc trước khi thao tác',
      );
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // "LÀM THAY" — người chăm sóc (babysitter) thao tác hộ người được chăm
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Ngữ cảnh "làm thay": tách người ĐƯỢC tính quyền (effectiveUserId = người được
   * chăm) khỏi người THỰC SỰ thao tác (actorId = người chăm, ghi vào log).
   *
   * BẢO MẬT: KHÔNG BAO GIỜ tin `onBehalfOfUserId` từ client. Chỉ chấp nhận khi
   * tồn tại quan hệ `Baby` đang hoạt động (status=approved, chưa drop) giữa actor
   * và target — nếu không, ném Forbidden. Đây là bề mặt nâng quyền.
   */
  private async resolveActingContext(
    actorId: string,
    onBehalfOfUserId?: string,
  ): Promise<{
    effectiveUserId: string;
    actorId: string;
    /** FK người được chăm khi làm thay (null = tự làm) — ghi cột onBehalfOfId. */
    onBehalfOfId: string | null;
    /** Tên người được chăm — chỉ dùng cho snapshot item-history JSON. */
    onBehalfName: string | null;
  }> {
    if (!onBehalfOfUserId || onBehalfOfUserId === actorId) {
      return {
        effectiveUserId: actorId,
        actorId,
        onBehalfOfId: null,
        onBehalfName: null,
      };
    }
    const baby = await this.prisma.baby.findFirst({
      where: {
        babysitterId: actorId,
        userId: onBehalfOfUserId,
        status: BabyAdoptionStatus.approved,
        droppedAt: null,
      },
      select: { user: { select: { fullName: true } } },
    });
    if (!baby) {
      throw new ForbiddenException(
        'Bạn không phải người chăm sóc đang hoạt động của người này',
      );
    }
    return {
      effectiveUserId: onBehalfOfUserId,
      actorId,
      onBehalfOfId: onBehalfOfUserId,
      onBehalfName: baby.user.fullName,
    };
  }

  /**
   * Làm thay: người chăm CHỈ được tạo/đọc/thao tác việc ĐỐI TÁC của người được
   * chăm, không đụng việc cá nhân hay việc nội bộ. Chặn ngay cả khi client tự
   * gọi API (không tin FE). No-op khi tự làm (onBehalfOfId = null).
   */
  private assertOnBehalfPartnerOnly(
    onBehalfOfId: string | null,
    taskType: BusinessFormTaskType,
  ): void {
    if (onBehalfOfId && taskType !== BusinessFormTaskType.partner_task) {
      throw new ForbiddenException(
        'Chế độ làm thay chỉ được thao tác với công việc đối tác',
      );
    }
  }

  /** Gắn hậu tố "(thay cho {tên})" vào message log khi thao tác hộ. */
  private withOnBehalf(
    message: string | null | undefined,
    onBehalfName: string | null | undefined,
  ): string | null {
    if (!onBehalfName) return message ?? null;
    const suffix = `(thay cho ${onBehalfName})`;
    return message ? `${message} ${suffix}` : suffix;
  }

  /** Tên người giao việc cho email (JwtPayload không kèm fullName). */
  private async getActorName(actorId: string): Promise<string> {
    const u = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { fullName: true },
    });
    return u?.fullName ?? 'Quản trị viên';
  }

  /**
   * Gộp checklist khi cập nhật (dùng chung cho update thường + admin): build actor
   * rồi `mergeItemsForUpdate`, trả JSON để ghi vào `data.items` và danh sách việc
   * con bị xoá hẳn để log timeline.
   */
  private async applyItemMerge(
    oldItems: unknown,
    incoming: IncomingTaskItem[],
    actorId: string,
    now: Date,
    onBehalfName?: string | null,
  ): Promise<{ itemsJson: Prisma.InputJsonValue; purged: PurgedItem[] }> {
    const baseName = await this.getActorName(actorId);
    const actor: ItemActor = {
      id: actorId,
      // Làm thay: tên trong lịch sử việc con kèm "(thay cho {Baby})".
      name: this.withOnBehalf(baseName, onBehalfName) ?? baseName,
    };
    const merged = mergeItemsForUpdate(oldItems, incoming, actor, now);
    return {
      itemsJson: merged.items as unknown as Prisma.InputJsonValue,
      purged: merged.purged,
    };
  }

  /** Ghi timeline một dòng `item_purged` cho mỗi việc con bị xoá hẳn. */
  private async logPurgedItems(
    tx: Prisma.TransactionClient,
    taskId: string,
    purged: PurgedItem[],
    actorId: string,
    onBehalfOfId?: string | null,
  ): Promise<void> {
    if (purged.length === 0) return;
    // 1 lệnh createMany thay vì N create trong vòng lặp.
    await tx.businessFormTaskActivity.createMany({
      data: purged.map((item) => ({
        taskId,
        type: BusinessFormTaskActivityType.item_purged,
        message: `Đã xóa việc ${item.label}`,
        onBehalfOfId: onBehalfOfId ?? null,
        createdById: actorId,
      })),
    });
  }

  /**
   * Đồng bộ người hỗ trợ: chỉ gỡ người bị bỏ và thêm người mới (pending), không
   * đụng người đã tham gia. `relatedUserIds` phải đã lọc bỏ người phụ trách chính.
   */
  private async syncAssignments(
    tx: Prisma.TransactionClient,
    taskId: string,
    existingIds: string[],
    relatedUserIds: string[],
    assignedById: string,
  ): Promise<void> {
    const toRemove = existingIds.filter((id) => !relatedUserIds.includes(id));
    const toAdd = relatedUserIds.filter((id) => !existingIds.includes(id));
    if (toRemove.length > 0) {
      await tx.businessFormTaskAssignment.deleteMany({
        where: { taskId, userId: { in: toRemove } },
      });
    }
    if (toAdd.length > 0) {
      await tx.businessFormTaskAssignment.createMany({
        data: toAdd.map((id) => ({ taskId, userId: id, assignedById })),
      });
    }
  }

  /**
   * Giữ nguyên tên cũ để ba chỗ gọi (nhắc hạn, thư giao việc, xuất Excel) không
   * phải đổi, nhưng phần tính đã dời hẳn ra `formatNgayVN` ở đầu tệp — vì một
   * phương thức `private` thì bài kiểm thuần không với tới được, mà đây đúng là
   * loại lỗi chỉ bài kiểm thuần mới ghim nổi (xem chú thích của `formatNgayVN`:
   * cùng một dòng mã cho hai kết quả khác nhau ở máy `TZ=UTC` và máy `+07`).
   */
  private formatDmy(d: Date): string {
    return formatNgayVN(d);
  }

  /**
   * Điều phối thông báo khi giao việc:
   *  - Tạo notification in-app.
   *  - Gửi email.
   * Loại người thao tác khỏi danh sách.
   */
  private async dispatchAssignment(
    task: { id: string; title: string; dueDate: Date | null },
    recipients: { mainAssigneeId?: string | null; supportUserIds?: string[] },
    assignerName: string,
    actorId: string,
  ): Promise<void> {
    const mainId =
      recipients.mainAssigneeId && recipients.mainAssigneeId !== actorId
        ? recipients.mainAssigneeId
        : null;
    const supportIds = [
      ...new Set(
        (recipients.supportUserIds ?? []).filter((id) => id && id !== actorId),
      ),
    ];
    if (!mainId && supportIds.length === 0) return;

    await this.notifyAssignment(task, mainId, supportIds, actorId);
    await this.enqueueAssignmentMails(task, mainId, supportIds, assignerName);
  }

  /** Notification in-app cho người được giao. */
  private async notifyAssignment(
    task: { id: string; title: string },
    mainId: string | null,
    supportIds: string[],
    actorId: string,
  ): Promise<void> {
    try {
      const base = {
        relatedModel: RelatedModel.system,
        relatedModelId: task.id,
        action: NotificationAction.task_assigned,
        linkUrl: taskLink(task.id),
        actorUserId: actorId,
        scope: NotificationScope.personal,
      };
      const jobs: Promise<unknown>[] = [];
      if (mainId) {
        jobs.push(
          this.notificationService.createNotificationWithCounter({
            ...base,
            userId: mainId,
            message: `Bạn được giao phụ trách công việc ${task.title}`,
          }),
        );
      }
      for (const id of supportIds) {
        jobs.push(
          this.notificationService.createNotificationWithCounter({
            ...base,
            userId: id,
            message: `Bạn được thêm hỗ trợ công việc ${task.title}`,
          }),
        );
      }
      await Promise.all(jobs);
    } catch (err) {
      this.logger.error(
        `Không tạo được notification giao việc (task=${task.id}): ${String(err)}`,
      );
    }
  }

  /** Email giao việc. */
  private async enqueueAssignmentMails(
    task: { id: string; title: string; dueDate: Date | null },
    mainId: string | null,
    supportIds: string[],
    assignerName: string,
  ): Promise<void> {
    try {
      const ids = [...new Set([...(mainId ? [mainId] : []), ...supportIds])];
      if (ids.length === 0) return;

      const users = await this.prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, email: true },
      });
      const emailById = new Map(users.map((u) => [u.id, u.email]));

      const taskUrl = taskLink(task.id);
      const dueDate = task.dueDate ? this.formatDmy(task.dueDate) : undefined;
      const transitionId = randomUUID();

      const mainEmail = mainId ? emailById.get(mainId) : undefined;
      if (mainEmail) {
        await this.mailPublisher.enqueue({
          mailType: 'task-assigned',
          taskId: task.id,
          transitionId,
          role: 'main',
          data: {
            role: 'main',
            taskTitle: task.title,
            assignerName,
            taskUrl,
            dueDate,
            recipients: [mainEmail],
          },
        });
      }

      const supportEmails = supportIds
        .map((id) => emailById.get(id))
        .filter((e): e is string => !!e);
      if (supportEmails.length > 0) {
        await this.mailPublisher.enqueue({
          mailType: 'task-assigned',
          taskId: task.id,
          transitionId,
          role: 'support',
          data: {
            role: 'support',
            taskTitle: task.title,
            assignerName,
            taskUrl,
            dueDate,
            recipients: supportEmails,
          },
        });
      }
    } catch (err) {
      this.logger.error(
        `Không enqueue được mail giao việc (task=${task.id}): ${String(err)}`,
      );
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // USER / PARTNER METHODS
  // ────────────────────────────────────────────────────────────────────────────

  async getMyTasks(
    userId: string,
    query?: QueryUserTasksDto,
    onBehalfOfUserId?: string,
  ): Promise<BusinessFormTaskResponseDto[] | PaginatedTasksResponse> {
    const { effectiveUserId, onBehalfOfId } = await this.resolveActingContext(
      userId,
      onBehalfOfUserId,
    );
    userId = effectiveUserId;
    // Làm thay: chỉ được xem việc đối tác — ép type=partner, bỏ nhánh "chung".
    if (onBehalfOfId) {
      query = {
        ...query,
        type: BusinessFormTaskType.partner_task,
        shared: false,
        assignmentStatus: undefined,
      };
    }
    if (query?.deleted) {
      const deletedTasks = await this.prisma.businessFormTask.findMany({
        where: {
          deletedAt: { not: null },
          ...(query?.type ? { type: query.type } : {}),
          OR: [
            { mainAssigneeId: userId },
            { createdById: userId },
            { businessForm: { userId } },
            { assignments: { some: { userId } } },
          ],
        },
        include: TASK_INCLUDE,
        orderBy: { updatedAt: 'desc' },
      });
      return deletedTasks.map((t) =>
        BusinessFormTaskResponseDto.fromEntity(t, userId),
      );
    }

    // "Chia sẻ" (shared) = task mà mình là NGƯỜI LIÊN QUAN (assignments), không phải người phụ trách chính. Ngược lại (mặc định) = task của mình (phụ trách chính / người tạo / chủ hồ sơ đối tác).
    const where: Prisma.BusinessFormTaskWhereInput = {
      AND: [
        query?.shared
          ? sharedWithMe(userId, query.assignmentStatus)
          : {
              OR: [{ mainAssigneeId: userId }, { businessForm: { userId } }],
            },
        NOT_DELETED_FORM_TASK,
        query?.type ? { type: query.type } : {},
        query?.status ? { status: query.status } : {},
        query?.category ? { category: query.category } : {},
        query?.priority ? { priority: query.priority } : {},
        query?.createdByAdmin ? { createdByAdmin: true } : {},
        query?.businessFormId ? { businessFormId: query.businessFormId } : {},
        query?.mainAssigneeId ? { mainAssigneeId: query.mainAssigneeId } : {},
        // Ghim của người xem: true = chỉ việc đã ghim; false = bỏ việc ghim;
        // undefined = không lọc (dùng === để undefined không rơi vào nhánh nào).
        query?.pinned === true
          ? { pins: { some: { userId } } }
          : query?.pinned === false
            ? { NOT: { pins: { some: { userId } } } }
            : {},
        query?.search
          ? {
              OR: [
                { code: { contains: query.search, mode: 'insensitive' } },
                { title: { contains: query.search, mode: 'insensitive' } },
                {
                  description: { contains: query.search, mode: 'insensitive' },
                },
              ],
            }
          : {},
        dateRangeFilter('startDate', query?.startFrom, query?.startTo),
        dateRangeFilter('dueDate', query?.dueFrom, query?.dueTo),
      ],
    };

    const include = {
      ...TASK_INCLUDE,
      // Ghim riêng của người đang xem — dùng để suy `isPinnedByMe`.
      pins: { where: { userId }, select: { userId: true } },
    };

    // Chế độ phân trang (board/list infinite scroll theo từng cột status).
    // Sắp theo startDate desc để các mốc tháng nằm liền khối — cuộn xuống lộ dần
    // tháng cũ; createdAt là tiebreak. Việc ghim tải bằng query riêng (pinned:'only').
    if (query?.page) {
      const page = query.page;
      const limit = query.limit ?? 20;
      const [total, rows] = await this.prisma.$transaction([
        this.prisma.businessFormTask.count({ where }),
        this.prisma.businessFormTask.findMany({
          where,
          include,
          orderBy: [
            { startDate: { sort: 'desc', nulls: 'last' } },
            { createdAt: 'desc' },
          ],
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);
      return {
        data: rows.map((t) => BusinessFormTaskResponseDto.fromEntity(t, userId)),
        total,
        page,
        currentPage: page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const tasks = await this.prisma.businessFormTask.findMany({
      where,
      include,
      // Hoạt động mới nhất (bình luận / đổi trạng thái / đổi thành viên / thả cảm xúc) lên đầu.
      orderBy: { lastActivityAt: 'desc' },
    });

    // Việc đã ghim nổi lên đầu; trong mỗi nhóm giữ nguyên thứ tự lastActivityAt.
    // Array.sort của V8 ổn định nên phần chưa ghim giữ nguyên thứ tự từ DB.
    const sorted = [...tasks].sort(
      (a, b) => Number(b.pins.length > 0) - Number(a.pins.length > 0),
    );

    return sorted.map((t) => BusinessFormTaskResponseDto.fromEntity(t, userId));
  }

  /**
   * Danh sách người phụ trách chính của các việc chung mà tôi đã tham gia
   * (người "gán tôi vào việc"), kèm số việc — dùng cho bộ lọc tab Việc chung /
   * Việc chờ tham gia. `status` chọn tập việc: đã tham gia (accepted, mặc định)
   * hay đang chờ xác nhận (pending). Cố ý KHÔNG áp bộ lọc tạm (search/trạng
   * thái/ngày) để danh sách bên trái ổn định, không nhảy khi gõ tìm kiếm.
   */
  async getMySharedAssignees(
    userId: string,
    status?: string,
    onBehalfOfUserId?: string,
  ): Promise<
    {
      id: string;
      fullName: string;
      referenceId: string | null;
      avatarUrl: string | null;
      count: number;
    }[]
  > {
    const { effectiveUserId, onBehalfOfId } = await this.resolveActingContext(
      userId,
      onBehalfOfUserId,
    );
    // Làm thay chỉ còn tab đối tác → không có "người phụ trách việc chung".
    if (onBehalfOfId) return [];
    userId = effectiveUserId;
    const assignmentStatus =
      status === BusinessFormTaskAssignmentStatus.pending
        ? BusinessFormTaskAssignmentStatus.pending
        : BusinessFormTaskAssignmentStatus.accepted;

    const rows = await this.prisma.businessFormTask.findMany({
      where: {
        AND: [
          { ...sharedWithMe(userId, assignmentStatus), mainAssigneeId: { not: null } },
          NOT_DELETED_FORM_TASK,
        ],
      },
      select: {
        mainAssignee: {
          select: {
            id: true,
            fullName: true,
            referenceId: true,
            avatar: { select: { fileUrl: true } },
          },
        },
      },
    });

    const map = new Map<
      string,
      {
        id: string;
        fullName: string;
        referenceId: string | null;
        avatarUrl: string | null;
        count: number;
      }
    >();
    for (const r of rows) {
      const a = r.mainAssignee;
      if (!a) continue;
      const existing = map.get(a.id);
      if (existing) existing.count += 1;
      else
        map.set(a.id, {
          id: a.id,
          fullName: a.fullName,
          referenceId: a.referenceId ?? null,
          avatarUrl: a.avatar?.fileUrl ?? null,
          count: 1,
        });
    }
    return Array.from(map.values()).sort((x, y) =>
      x.fullName.localeCompare(y.fullName, 'vi'),
    );
  }

  async createTask(
    userId: string,
    dto: CreateUserTaskDto,
    onBehalfOfUserId?: string,
  ): Promise<BusinessFormTaskResponseDto> {
    // Làm thay: task thuộc về người được chăm (userId=effective); ghi FK
    // onBehalfOfId cho task/activity, còn onBehalfName cho snapshot item-history.
    const { effectiveUserId, actorId, onBehalfOfId, onBehalfName } =
      await this.resolveActingContext(userId, onBehalfOfUserId);
    userId = effectiveUserId;
    // Làm thay: chỉ được tạo việc đối tác, không tạo việc cá nhân/nội bộ hộ.
    this.assertOnBehalfPartnerOnly(onBehalfOfId, dto.type);
    if (dto.businessFormId) {
      const form = await this.prisma.businessForm.findUnique({
        where: { id: dto.businessFormId },
        select: { userId: true },
      });

      if (!form) {
        throw new NotFoundException('Không tìm thấy hồ sơ đối tác');
      }

      if (form.userId !== userId) {
        throw new ForbiddenException(
          'Bạn không có quyền thêm công việc cho hồ sơ này',
        );
      }
    }

    // Người phụ trách chính = bản thân người tạo. Người liên quan = relatedUserIds (loại bỏ trùng với người phụ trách chính).
    const relatedUserIds = (dto.relatedUserIds ?? []).filter(
      (id) => id !== userId,
    );

    // Trạng thái khởi tạo do người dùng chọn (chỉ chờ xử lý / đang làm), mặc định đang làm.
    const initialStatus = dto.status ?? BusinessFormTaskStatus.in_progress;

    const now = new Date();
    const actorBaseName = await this.getActorName(actorId);
    const actor: ItemActor = {
      id: actorId,
      // Làm thay: tên trong lịch sử việc con kèm "(thay cho {Baby})".
      name: this.withOnBehalf(actorBaseName, onBehalfName) ?? actorBaseName,
    };

    const task = await this.createTaskWithCode(
      {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        category: dto.category,
        priority: dto.priority ?? BusinessFormPriority.normal,
        status: initialStatus,
        businessFormId: dto.businessFormId,
        // Làm thay: người tạo = người thao tác (actor); phụ trách chính = người
        // được chăm (effective). Tự làm ⇒ actorId === userId nên trùng như cũ.
        createdById: actorId,
        mainAssigneeId: userId,
        // Làm thay: đánh dấu việc được tạo hộ người được chăm (badge trên header/card).
        onBehalfOfId: onBehalfOfId ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assignments:
          relatedUserIds.length > 0
            ? {
                create: relatedUserIds.map((id) => ({
                  userId: id,
                  assignedById: actorId,
                })),
              }
            : undefined,
        attachments: toAttachmentsJson(dto.attachments),
        items: buildItemsForCreate(
          dto.items,
          actor,
          now,
        ) as unknown as Prisma.InputJsonValue,
        activities: {
          create: {
            type: BusinessFormTaskActivityType.status_changed,
            newStatus: initialStatus,
            message: 'Đã tạo công việc',
            onBehalfOfId: onBehalfOfId ?? null,
            createdById: actorId,
          },
        },
      },
      TASK_INCLUDE,
    );

    // Mail người hỗ trợ (người tạo = phụ trách chính nên không mail lại).
    if (relatedUserIds.length > 0) {
      const assignerName = await this.getActorName(actorId);
      await this.dispatchAssignment(
        { id: task.id, title: task.title, dueDate: task.dueDate },
        { supportUserIds: relatedUserIds },
        assignerName,
        actorId,
      );
    }

    return BusinessFormTaskResponseDto.fromEntity(task);
  }

  async updateTask(
    userId: string,
    taskId: string,
    dto: UpdateUserTaskDto,
    onBehalfOfUserId?: string,
  ): Promise<BusinessFormTaskResponseDto> {
    const { effectiveUserId, actorId, onBehalfOfId, onBehalfName } =
      await this.resolveActingContext(userId, onBehalfOfUserId);
    userId = effectiveUserId;
    const task = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
      select: {
        type: true,
        status: true,
        createdById: true,
        mainAssigneeId: true,
        // Cần items cũ để so & ghi lịch sử theo từng việc con.
        items: true,
        businessForm: { select: { userId: true } },
        assignments: { select: { userId: true } },
      },
    });

    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc');
    }

    this.assertOnBehalfPartnerOnly(onBehalfOfId, task.type);
    if (!this.hasTaskAccess(task, userId)) {
      throw new ForbiddenException('Bạn không có quyền cập nhật công việc này');
    }
    await this.assertNotPendingMember(userId, taskId);

    const data: Prisma.BusinessFormTaskUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.startDate !== undefined)
      data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.dueDate !== undefined) {
      data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
      // Đổi hạn → reset cờ để vòng quét nhắc lại theo hạn mới.
      data.dueSoonNotifiedAt = null;
      data.overdueNotifiedAt = null;
    }
    if (dto.mainAssigneeId !== undefined)
      data.mainAssignee = dto.mainAssigneeId
        ? { connect: { id: dto.mainAssigneeId } }
        : { disconnect: true };

    if (
      dto.status === BusinessFormTaskStatus.done &&
      task.status !== BusinessFormTaskStatus.done
    ) {
      data.completedBy = { connect: { id: userId } };
      data.completedAt = new Date();
    } else if (
      dto.status &&
      dto.status !== BusinessFormTaskStatus.done &&
      task.status === BusinessFormTaskStatus.done
    ) {
      data.completedBy = { disconnect: true };
      data.completedAt = null;
    }

    // Mọi thay đổi việc đều là một hoạt động → đẩy lên đầu danh sách.
    const now = new Date();
    data.lastActivityAt = now;

    // Checklist: so với mảng cũ để ghi lịch sử theo từng việc con (thêm/sửa/tick/xoá mềm).
    let purgedItems: PurgedItem[] = [];
    if (dto.items !== undefined) {
      const merged = await this.applyItemMerge(
        task.items,
        dto.items,
        actorId,
        now,
        onBehalfName,
      );
      data.items = merged.itemsJson;
      purgedItems = merged.purged;

      if (
        purgedItems.length > 0 &&
        userId !== task.createdById &&
        userId !== task.mainAssigneeId
      ) {
        throw new ForbiddenException(
          'Chỉ người tạo việc hoặc người phụ trách chính mới xoá hẳn được việc con',
        );
      }
    }
    if (dto.attachments !== undefined)
      data.attachments = toAttachmentsJson(dto.attachments);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.relatedUserIds !== undefined) {
        const mainId =
          dto.mainAssigneeId !== undefined
            ? dto.mainAssigneeId
            : task.mainAssigneeId;
        const relatedUserIds = dto.relatedUserIds.filter((id) => id !== mainId);
        const existingIds = task.assignments.map((a) => a.userId);
        await this.syncAssignments(
          tx,
          taskId,
          existingIds,
          relatedUserIds,
          actorId,
        );
      }

      if (dto.status !== undefined && dto.status !== task.status) {
        await tx.businessFormTaskActivity.create({
          data: {
            taskId,
            type: BusinessFormTaskActivityType.status_changed,
            oldStatus: task.status,
            newStatus: dto.status,
            message: dto.message,
            onBehalfOfId: onBehalfOfId ?? null,
            attachments: toAttachmentsJson(dto.evidence),
            createdById: actorId,
          },
        });
      }

      // Việc con bị xoá hẳn không còn dấu vết trong `items` — timeline giữ lại.
      await this.logPurgedItems(tx, taskId, purgedItems, actorId, onBehalfOfId);

      return tx.businessFormTask.update({
        where: { id: taskId },
        data,
        include: {
          ...TASK_INCLUDE,
          pins: { where: { userId }, select: { userId: true } },
        },
      });
    });

    // Mail người MỚI được thêm (đổi phụ trách chính / thêm người hỗ trợ).
    const oldSupportIds = new Set(task.assignments.map((a) => a.userId));
    const newMainId =
      dto.mainAssigneeId !== undefined &&
      dto.mainAssigneeId &&
      dto.mainAssigneeId !== task.mainAssigneeId
        ? dto.mainAssigneeId
        : null;
    let newSupportIds: string[] = [];
    if (dto.relatedUserIds !== undefined) {
      const mainId =
        dto.mainAssigneeId !== undefined
          ? dto.mainAssigneeId
          : task.mainAssigneeId;
      newSupportIds = dto.relatedUserIds
        .filter((id) => id !== mainId)
        .filter((id) => !oldSupportIds.has(id));
    }
    if (newMainId || newSupportIds.length > 0) {
      const assignerName = await this.getActorName(actorId);
      await this.dispatchAssignment(
        { id: updated.id, title: updated.title, dueDate: updated.dueDate },
        { mainAssigneeId: newMainId, supportUserIds: newSupportIds },
        assignerName,
        actorId,
      );
    }

    return BusinessFormTaskResponseDto.fromEntity(updated, userId);
  }

  async getTaskById(
    userId: string,
    taskId: string,
    onBehalfOfUserId?: string,
  ): Promise<BusinessFormTaskResponseDto> {
    const { effectiveUserId, onBehalfOfId } = await this.resolveActingContext(
      userId,
      onBehalfOfUserId,
    );
    userId = effectiveUserId;
    const task = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
      include: {
        ...TASK_INCLUDE,
        pins: { where: { userId }, select: { userId: true } },
      },
    });

    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc');
    }

    this.assertOnBehalfPartnerOnly(onBehalfOfId, task.type);
    if (!this.hasTaskAccess(task, userId)) {
      throw new ForbiddenException('Bạn không có quyền xem công việc này');
    }

    return BusinessFormTaskResponseDto.fromEntity(task, userId);
  }

  /**
   * Ghim công việc — riêng tư theo người ghim. Không đụng `lastActivityAt`
   * (ghim là hành động cá nhân, không phải hoạt động chung của việc).
   */
  async pinTask(
    userId: string,
    taskId: string,
    onBehalfOfUserId?: string,
  ): Promise<BusinessFormTaskResponseDto> {
    const { effectiveUserId, onBehalfOfId } = await this.resolveActingContext(
      userId,
      onBehalfOfUserId,
    );
    userId = effectiveUserId;
    const task = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
      include: TASK_INCLUDE,
    });
    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc');
    }
    this.assertOnBehalfPartnerOnly(onBehalfOfId, task.type);
    if (!this.hasTaskAccess(task, userId)) {
      throw new ForbiddenException('Bạn không có quyền ghim công việc này');
    }

    await this.prisma.businessFormTaskPin.upsert({
      where: { taskId_userId: { taskId, userId } },
      create: { taskId, userId },
      update: {},
    });

    return BusinessFormTaskResponseDto.fromEntity(
      { ...task, isPinnedByMe: true },
      userId,
    );
  }

  /** Bỏ ghim công việc (idempotent). */
  async unpinTask(
    userId: string,
    taskId: string,
    onBehalfOfUserId?: string,
  ): Promise<BusinessFormTaskResponseDto> {
    const { effectiveUserId, onBehalfOfId } = await this.resolveActingContext(
      userId,
      onBehalfOfUserId,
    );
    userId = effectiveUserId;
    const task = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
      include: TASK_INCLUDE,
    });
    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc');
    }
    this.assertOnBehalfPartnerOnly(onBehalfOfId, task.type);

    await this.prisma.businessFormTaskPin.deleteMany({
      where: { taskId, userId },
    });

    return BusinessFormTaskResponseDto.fromEntity(
      { ...task, isPinnedByMe: false },
      userId,
    );
  }


  /**
   * Thành viên của một công việc (phụ trách chính + người hỗ trợ, kể cả người
   * còn chờ xác nhận), kèm số việc chung với người đang xem. Bỏ chính người xem.
   *
   * Số việc chung tính cả việc đang mở. Nếu chính người xem còn `pending` ở
   * việc này thì họ chưa "tham gia", mọi `sharedCount` sẽ là 0 — đúng định nghĩa.
   */
  async getTaskMembers(
    userId: string,
    taskId: string,
    onBehalfOfUserId?: string,
  ): Promise<BusinessFormTaskMemberDto[]> {
    const { effectiveUserId, onBehalfOfId } = await this.resolveActingContext(
      userId,
      onBehalfOfUserId,
    );
    userId = effectiveUserId;
    const task = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
      include: {
        businessForm: { select: { userId: true } },
        mainAssignee: {
          select: {
            id: true,
            fullName: true,
            referenceId: true,
            avatar: { select: { fileUrl: true } },
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                referenceId: true,
                avatar: { select: { fileUrl: true } },
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc');
    }
    this.assertOnBehalfPartnerOnly(onBehalfOfId, task.type);
    if (!this.hasTaskAccess(task, userId)) {
      throw new ForbiddenException('Bạn không có quyền xem công việc này');
    }

    // Một người có thể vừa là phụ trách chính vừa có dòng assignment — khử trùng theo id.
    const byId = new Map<
      string,
      { user: BusinessFormUserSummaryDto; isMainAssignee: boolean }
    >();

    if (task.mainAssignee && task.mainAssignee.id !== userId) {
      byId.set(task.mainAssignee.id, {
        user: {
          id: task.mainAssignee.id,
          fullName: task.mainAssignee.fullName,
          referenceId: task.mainAssignee.referenceId ?? null,
          avatarUrl: task.mainAssignee.avatar?.fileUrl ?? null,
          status: null,
        },
        isMainAssignee: true,
      });
    }

    for (const a of task.assignments) {
      if (a.userId === userId) continue;
      const existing = byId.get(a.userId);
      if (existing) {
        existing.user.status = a.status;
        continue;
      }
      byId.set(a.userId, {
        user: {
          id: a.user.id,
          fullName: a.user.fullName,
          referenceId: a.user.referenceId ?? null,
          avatarUrl: a.user.avatar?.fileUrl ?? null,
          status: a.status,
        },
        isMainAssignee: false,
      });
    }

    const members = Array.from(byId.values());

    // N truy vấn count, N = số thành viên của một việc (hàng chục). Đọc dễ hơn
    // hẳn một câu groupBy rồi tự gộp trong JS; tối ưu khi nào thấy chậm.
    const counts = await Promise.all(
      members.map((m) =>
        this.prisma.businessFormTask.count({
          where: {
            AND: [
              NOT_DELETED_FORM_TASK,
              participatesIn(userId),
              participatesIn(m.user.id),
            ],
          },
        }),
      ),
    );

    return members
      .map((m, i) => ({ ...m, sharedCount: counts[i] }))
      .sort(
        (a, b) =>
          Number(b.isMainAssignee) - Number(a.isMainAssignee) ||
          b.sharedCount - a.sharedCount ||
          a.user.fullName.localeCompare(b.user.fullName, 'vi'),
      );
  }

  /** Việc mà cả người xem lẫn `otherUserId` đều tham gia. */
  async getSharedTasksWith(
    userId: string,
    otherUserId: string,
    query: QuerySharedTasksDto,
    onBehalfOfUserId?: string,
  ): Promise<{
    data: BusinessFormTaskResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = query;
    const { effectiveUserId, onBehalfOfId } = await this.resolveActingContext(
      userId,
      onBehalfOfUserId,
    );
    // Làm thay chỉ còn việc đối tác → không có "việc chung với người khác".
    if (onBehalfOfId) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }
    userId = effectiveUserId;
    if (otherUserId === userId) {
      throw new BadRequestException('Không thể xem việc chung với chính mình');
    }

    const where: Prisma.BusinessFormTaskWhereInput = {
      AND: [
        NOT_DELETED_FORM_TASK,
        participatesIn(userId),
        participatesIn(otherUserId),
      ],
    };

    const [total, rows] = await Promise.all([
      this.prisma.businessFormTask.count({ where }),
      this.prisma.businessFormTask.findMany({
        where,
        include: TASK_INCLUDE,
        orderBy: { lastActivityAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rows.map((r) => BusinessFormTaskResponseDto.fromEntity(r, userId)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTaskActivities(
    userId: string,
    taskId: string,
    query: QueryTaskActivitiesDto,
    isAdmin = false,
    onBehalfOfUserId?: string,
  ): Promise<{
    data: BusinessFormTaskActivityResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    let onBehalfOfId: string | null = null;
    if (!isAdmin) {
      const ctx = await this.resolveActingContext(userId, onBehalfOfUserId);
      userId = ctx.effectiveUserId;
      onBehalfOfId = ctx.onBehalfOfId;
    }
    const { page = 1, limit = 20, filter = TaskActivityFilter.all } = query;

    const task = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
      include: {
        businessForm: { select: { userId: true } },
        assignments: { select: { userId: true } },
      },
    });

    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc');
    }

    this.assertOnBehalfPartnerOnly(onBehalfOfId, task.type);
    if (!isAdmin && !this.hasTaskAccess(task, userId)) {
      throw new ForbiddenException(
        'Bạn không có quyền xem lịch sử công việc này',
      );
    }

    const typeWhere: Prisma.BusinessFormTaskActivityWhereInput =
      filter === TaskActivityFilter.comment
        ? { type: BusinessFormTaskActivityType.comment }
        : filter === TaskActivityFilter.log
          ? {
              type: {
                in: [
                  BusinessFormTaskActivityType.status_changed,
                  BusinessFormTaskActivityType.member_changed,
                  BusinessFormTaskActivityType.item_purged,
                ],
              },
            }
          : {};

    // `count` và `findMany` phải dùng chung `where`: lệch nhau thì `totalPages`
    // đếm cả log trong khi `data` chỉ có comment, cuộn vô hạn treo ở trang rỗng.
    const where: Prisma.BusinessFormTaskActivityWhereInput = {
      taskId,
      parentId: null,
      ...typeWhere,
    };

    const [total, rows] = await Promise.all([
      this.prisma.businessFormTaskActivity.count({ where }),
      this.prisma.businessFormTaskActivity.findMany({
        where,
        include: {
          createdBy: { select: { id: true, fullName: true } },
          onBehalfOf: { select: { fullName: true } },
          reactions: {
            include: { user: { select: { id: true, fullName: true } } },
          },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rows.map((a) => this.mapActivityResponse(a, userId)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTaskActivityReplies(
    userId: string,
    activityId: string,
    query: QueryTaskActivitiesDto,
    isAdmin = false,
    onBehalfOfUserId?: string,
  ): Promise<{
    data: BusinessFormTaskActivityResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    let onBehalfOfId: string | null = null;
    if (!isAdmin) {
      const ctx = await this.resolveActingContext(userId, onBehalfOfUserId);
      userId = ctx.effectiveUserId;
      onBehalfOfId = ctx.onBehalfOfId;
    }
    const { page = 1, limit = 20 } = query;

    const parent = await this.prisma.businessFormTaskActivity.findUnique({
      where: { id: activityId },
      include: {
        task: {
          include: {
            businessForm: { select: { userId: true } },
            assignments: { select: { userId: true } },
          },
        },
      },
    });

    if (!parent) {
      throw new NotFoundException('Không tìm thấy bình luận');
    }

    this.assertOnBehalfPartnerOnly(onBehalfOfId, parent.task.type);
    if (!isAdmin && !this.hasTaskAccess(parent.task, userId)) {
      throw new ForbiddenException('Bạn không có quyền xem các phản hồi này');
    }

    const [total, rows] = await Promise.all([
      this.prisma.businessFormTaskActivity.count({
        where: { parentId: activityId },
      }),
      this.prisma.businessFormTaskActivity.findMany({
        where: { parentId: activityId },
        include: {
          createdBy: { select: { id: true, fullName: true } },
          onBehalfOf: { select: { fullName: true } },
          reactions: {
            include: { user: { select: { id: true, fullName: true } } },
          },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rows.map((a) => this.mapActivityResponse(a, userId)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async toggleActivityReaction(
    userId: string,
    activityId: string,
    dto: ReactTaskActivityDto,
    onBehalfOfUserId?: string,
  ): Promise<BusinessFormTaskActivityReactionSummaryDto[]> {
    const { effectiveUserId, onBehalfOfId } = await this.resolveActingContext(
      userId,
      onBehalfOfUserId,
    );
    userId = effectiveUserId;
    const activity = await this.prisma.businessFormTaskActivity.findUnique({
      where: { id: activityId },
      include: { task: { select: { type: true } } },
    });

    if (!activity) {
      throw new NotFoundException('Không tìm thấy hoạt động');
    }

    this.assertOnBehalfPartnerOnly(onBehalfOfId, activity.task.type);
    if (activity.type === BusinessFormTaskActivityType.member_changed) {
      throw new BadRequestException(
        'Không thể bày tỏ cảm xúc với hoạt động thay đổi thành viên',
      );
    }

    const existing =
      await this.prisma.businessFormTaskActivityReaction.findUnique({
        where: {
          activityId_userId: {
            activityId,
            userId,
          },
        },
      });

    if (existing) {
      if (existing.emoji === dto.emoji) {
        await this.prisma.businessFormTaskActivityReaction.delete({
          where: {
            activityId_userId: {
              activityId,
              userId,
            },
          },
        });
      } else {
        await this.prisma.businessFormTaskActivityReaction.update({
          where: {
            activityId_userId: {
              activityId,
              userId,
            },
          },
          data: {
            emoji: dto.emoji,
          },
        });
      }
    } else {
      await this.prisma.businessFormTaskActivityReaction.create({
        data: {
          activityId,
          userId,
          emoji: dto.emoji,
        },
      });
    }

    // Thả/đổi/gỡ cảm xúc không đụng tới row task → bump thủ công để việc nổi lên đầu.
    await this.prisma.businessFormTask.update({
      where: { id: activity.taskId },
      data: { lastActivityAt: new Date() },
    });

    const allReactions =
      await this.prisma.businessFormTaskActivityReaction.findMany({
        where: { activityId },
        include: { user: { select: { id: true, fullName: true } } },
      });

    const summary = this.mapReactionSummary(allReactions, userId);

    this.tasksGateway.emitReactionUpdated(activity.taskId, activityId, summary);

    return summary;
  }

  private mapReactionSummary(
    reactions: Array<{
      emoji: string;
      userId: string;
      user?: { id: string; fullName: string } | null;
    }>,
    currentUserId: string,
  ): BusinessFormTaskActivityReactionSummaryDto[] {
    const map = new Map<
      string,
      {
        count: number;
        isReactedByMe: boolean;
        users: Array<{ id: string; fullName: string }>;
      }
    >();

    for (const r of reactions) {
      const entry = map.get(r.emoji) || {
        count: 0,
        isReactedByMe: false,
        users: [],
      };
      entry.count++;
      if (r.userId === currentUserId) {
        entry.isReactedByMe = true;
      }
      if (r.user) {
        entry.users.push({ id: r.user.id, fullName: r.user.fullName });
      }
      map.set(r.emoji, entry);
    }

    return Array.from(map.entries()).map(([emoji, data]) => ({
      emoji,
      ...data,
    }));
  }

  private mapActivityResponse(
    a: {
      id: string;
      type: BusinessFormTaskActivityType;
      message: string | null;
      onBehalfOf?: { fullName: string } | null;
      attachments?: Prisma.JsonValue;
      oldStatus: BusinessFormTaskStatus | null;
      newStatus: BusinessFormTaskStatus | null;
      parentId: string | null;
      mentionedUserIds?: string[];
      _count?: { replies: number };
      reactions?: Array<{
        emoji: string;
        userId: string;
        user?: { id: string; fullName: string } | null;
      }>;
      createdById: string;
      createdBy: { id: string; fullName: string };
      createdAt: Date;
    },
    currentUserId: string,
  ): BusinessFormTaskActivityResponseDto {
    return {
      id: a.id,
      type: a.type,
      message: a.message,
      onBehalfName: a.onBehalfOf?.fullName ?? null,
      attachments:
        (a.attachments as { id: string; name: string; url: string }[] | null) ??
        [],
      oldStatus: a.oldStatus,
      newStatus: a.newStatus,
      parentId: a.parentId,
      mentionedUserIds: a.mentionedUserIds ?? [],
      replyCount: a._count?.replies ?? 0,
      reactionSummary: this.mapReactionSummary(
        a.reactions || [],
        currentUserId,
      ),
      createdById: a.createdById,
      createdBy: a.createdBy,
      createdAt: a.createdAt,
    };
  }

  async addTaskActivity(
    userId: string,
    taskId: string,
    dto: CreateTaskActivityDto,
    onBehalfOfUserId?: string,
  ): Promise<BusinessFormTaskResponseDto> {
    const { effectiveUserId, actorId, onBehalfOfId } =
      await this.resolveActingContext(userId, onBehalfOfUserId);
    userId = effectiveUserId;
    const task = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
      include: {
        businessForm: { select: { userId: true } },
        assignments: { select: { userId: true } },
      },
    });

    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc');
    }

    this.assertOnBehalfPartnerOnly(onBehalfOfId, task.type);
    if (!this.hasTaskAccess(task, userId)) {
      throw new ForbiddenException(
        'Bạn không có quyền bình luận công việc này',
      );
    }
    await this.assertNotPendingMember(userId, taskId);

    if (dto.parentId) {
      const parent = await this.prisma.businessFormTaskActivity.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.taskId !== taskId) {
        throw new NotFoundException('Không tìm thấy bình luận gốc');
      }
      if (parent.type === BusinessFormTaskActivityType.member_changed) {
        throw new BadRequestException(
          'Không thể bình luận hoạt động thay đổi thành viên',
        );
      }
    }

    // Chỉ cho phép nhắc (@mention) người liên quan tới việc.
    const allowedMentionIds = new Set<string>([
      ...(task.mainAssigneeId ? [task.mainAssigneeId] : []),
      ...task.assignments.map((a) => a.userId),
    ]);
    const mentionedUserIds = [...new Set(dto.mentionedUserIds ?? [])].filter(
      (id) => id !== userId && allowedMentionIds.has(id),
    );

    const updated = await this.prisma.businessFormTask.update({
      where: { id: taskId },
      data: {
        lastActivityAt: new Date(),
        activities: {
          create: {
            type: BusinessFormTaskActivityType.comment,
            // Làm thay: giữ nội dung bình luận sạch; "thay cho" hiển thị cạnh tên
            // qua FK onBehalfOfId (không nhét vào body).
            message: dto.message,
            onBehalfOfId: onBehalfOfId ?? null,
            parentId: dto.parentId,
            mentionedUserIds,
            attachments: toAttachmentsJson(dto.attachments),
            createdById: actorId,
          },
        },
      },
      include: TASK_INCLUDE,
    });

    const responseDto = BusinessFormTaskResponseDto.fromEntity(updated);

    const newActivityRow = await this.prisma.businessFormTaskActivity.findFirst(
      {
        where: {
          taskId,
          createdById: actorId,
          type: BusinessFormTaskActivityType.comment,
        },
        include: {
          createdBy: { select: { id: true, fullName: true } },
          onBehalfOf: { select: { fullName: true } },
          reactions: {
            include: { user: { select: { id: true, fullName: true } } },
          },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    );

    if (newActivityRow) {
      this.tasksGateway.emitActivityCreated(
        taskId,
        this.mapActivityResponse(newActivityRow, actorId),
      );
    }

    const actorName = await this.getActorName(actorId);
    await this.notifyTaskActivity(
      taskId,
      actorId,
      NotificationAction.task_commented,
      `${actorName} ${dto.parentId ? 'đã trả lời' : 'đã bình luận'} trong ${updated.title}`,
      userId,
    );

    if (mentionedUserIds.length > 0) {
      await this.notifyTaskMentions(
        taskId,
        mentionedUserIds,
        actorName,
        updated.title,
      );
    }

    return responseDto;
  }

  async updateTaskActivity(
    userId: string,
    activityId: string,
    dto: UpdateTaskActivityDto,
    onBehalfOfUserId?: string,
  ): Promise<BusinessFormTaskResponseDto> {
    // Làm thay: người chăm sửa được bình luận của CHÍNH MÌNH hoặc của người được chăm.
    const { effectiveUserId, actorId, onBehalfOfId } =
      await this.resolveActingContext(userId, onBehalfOfUserId);
    const activity = await this.prisma.businessFormTaskActivity.findUnique({
      where: { id: activityId },
      include: { task: { select: { type: true } } },
    });

    if (!activity) {
      throw new NotFoundException('Không tìm thấy hoạt động');
    }

    this.assertOnBehalfPartnerOnly(onBehalfOfId, activity.task.type);
    if (
      activity.createdById !== actorId &&
      activity.createdById !== effectiveUserId
    ) {
      throw new ForbiddenException('Bạn chỉ có thể sửa bình luận của mình');
    }

    if (activity.type !== BusinessFormTaskActivityType.comment) {
      throw new ForbiddenException('Không thể sửa nhật ký hệ thống tự tạo');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      return tx.businessFormTask.update({
        where: { id: activity.taskId },
        data: {
          lastActivityAt: new Date(),
          activities: {
            update: {
              where: { id: activityId },
              data: {
                message: dto.message,
                // Đính kèm là cột JSON: ghi đè cả mảng khi client gửi.
                ...(dto.attachments !== undefined
                  ? { attachments: toAttachmentsJson(dto.attachments) }
                  : {}),
              },
            },
          },
        },
        include: TASK_INCLUDE,
      });
    });

    return BusinessFormTaskResponseDto.fromEntity(updated);
  }

  async updateTaskStatus(
    userId: string,
    taskId: string,
    dto: UpdateTaskStatusDto,
    onBehalfOfUserId?: string,
  ): Promise<BusinessFormTaskResponseDto> {
    const { effectiveUserId, actorId, onBehalfOfId } =
      await this.resolveActingContext(userId, onBehalfOfUserId);
    userId = effectiveUserId;
    const task = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
      include: {
        businessForm: { select: { userId: true } },
        assignments: { select: { userId: true } },
      },
    });

    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc');
    }

    this.assertOnBehalfPartnerOnly(onBehalfOfId, task.type);
    if (!this.hasTaskAccess(task, userId)) {
      throw new ForbiddenException(
        'Bạn không có quyền cập nhật trạng thái công việc này',
      );
    }
    await this.assertNotPendingMember(userId, taskId);

    const data: Prisma.BusinessFormTaskUpdateInput = {
      status: dto.status,
      lastActivityAt: new Date(),
    };

    if (
      dto.status === BusinessFormTaskStatus.done &&
      task.status !== BusinessFormTaskStatus.done
    ) {
      data.completedBy = { connect: { id: userId } };
      data.completedAt = new Date();
    } else if (
      dto.status !== BusinessFormTaskStatus.done &&
      task.status === BusinessFormTaskStatus.done
    ) {
      data.completedBy = { disconnect: true };
      data.completedAt = null;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.status !== task.status) {
        await tx.businessFormTaskActivity.create({
          data: {
            taskId,
            type: BusinessFormTaskActivityType.status_changed,
            oldStatus: task.status,
            newStatus: dto.status,
            message: dto.message,
            onBehalfOfId: onBehalfOfId ?? null,
            attachments: toAttachmentsJson(dto.evidence),
            createdById: actorId,
          },
        });
      }

      return tx.businessFormTask.update({
        where: { id: taskId },
        data,
        include: TASK_INCLUDE,
      });
    });

    if (dto.status !== task.status) {
      const actorName = await this.getActorName(actorId);
      await this.notifyTaskActivity(
        taskId,
        actorId,
        NotificationAction.task_status_changed,
        `${actorName} đổi trạng thái ${updated.title} → ${TASK_STATUS_LABELS[dto.status]}`,
        userId,
      );
    }

    return BusinessFormTaskResponseDto.fromEntity(updated);
  }

  /**
   * Người hỗ trợ tự rời khỏi công việc chung. Xóa bản ghi assignment của chính họ, ghi nhận activity, và báo notification cho người liên quan.
   */
  async leaveTask(
    userId: string,
    taskId: string,
    dto: LeaveTaskDto,
    onBehalfOfUserId?: string,
  ): Promise<BusinessFormTaskResponseDto> {
    const { effectiveUserId, actorId, onBehalfOfId } =
      await this.resolveActingContext(userId, onBehalfOfUserId);
    userId = effectiveUserId;
    const task = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        type: true,
        mainAssigneeId: true,
        assignments: { select: { userId: true } },
      },
    });
    if (!task) throw new NotFoundException('Không tìm thấy công việc');

    this.assertOnBehalfPartnerOnly(onBehalfOfId, task.type);
    if (task.mainAssigneeId === userId) {
      throw new ForbiddenException(
        'Người phụ trách chính không thể rời công việc',
      );
    }
    const isSupport = task.assignments.some((a) => a.userId === userId);
    if (!isSupport) {
      throw new ForbiddenException(
        'Bạn không phải người hỗ trợ của công việc này',
      );
    }

    const leaver = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    const leaverName = leaver?.fullName ?? 'Một thành viên';

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.businessFormTaskAssignment.delete({
        where: { taskId_userId: { taskId, userId } },
      });
      await tx.businessFormTaskActivity.create({
        data: {
          taskId,
          type: BusinessFormTaskActivityType.member_changed,
          message: `Đã rời công việc${dto.reason ? `: ${dto.reason}` : ''}`,
          onBehalfOfId: onBehalfOfId ?? null,
          createdById: actorId,
        },
      });
      return tx.businessFormTask.update({
        where: { id: taskId },
        data: { lastActivityAt: new Date() },
        include: TASK_INCLUDE,
      });
    });

    const recipients = [
      ...new Set(
        [task.mainAssigneeId, ...task.assignments.map((a) => a.userId)].filter(
          (id): id is string => !!id && id !== userId,
        ),
      ),
    ];
    await this.notifyTaskLeave(
      taskId,
      recipients,
      leaverName,
      updated.title,
      dto.reason,
    );

    return BusinessFormTaskResponseDto.fromEntity(updated);
  }

  /**
   * Người được tag xác nhận tham gia công việc chung.
   * Idempotent: nếu đã accepted thì trả về task hiện tại.
   */
  async acceptTask(
    userId: string,
    taskId: string,
    onBehalfOfUserId?: string,
  ): Promise<BusinessFormTaskResponseDto> {
    const { effectiveUserId, actorId, onBehalfOfId } =
      await this.resolveActingContext(userId, onBehalfOfUserId);
    userId = effectiveUserId;
    const task = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        type: true,
        mainAssigneeId: true,
        createdById: true,
        assignments: { where: { userId }, select: { status: true } },
      },
    });
    if (!task) throw new NotFoundException('Không tìm thấy công việc');

    this.assertOnBehalfPartnerOnly(onBehalfOfId, task.type);
    const mine = task.assignments[0];
    if (!mine) {
      throw new ForbiddenException(
        'Bạn không phải người liên quan của công việc này',
      );
    }
    if (mine.status === BusinessFormTaskAssignmentStatus.accepted) {
      return this.getTaskById(userId, taskId);
    }

    // Người tham gia = người được chăm (effective); dòng log ghi actor (người chăm).
    const actorName = await this.getActorName(userId);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.businessFormTaskAssignment.update({
        where: { taskId_userId: { taskId, userId } },
        data: { status: BusinessFormTaskAssignmentStatus.accepted },
      });
      await tx.businessFormTaskActivity.create({
        data: {
          taskId,
          type: BusinessFormTaskActivityType.member_changed,
          // Không lặp tên: header (createdBy) + chip "thay cho" (onBehalfOf) đã đủ.
          message: 'Đã tham gia công việc',
          onBehalfOfId: onBehalfOfId ?? null,
          createdById: actorId,
        },
      });
      return tx.businessFormTask.update({
        where: { id: taskId },
        data: { lastActivityAt: new Date() },
        include: TASK_INCLUDE,
      });
    });

    await this.notifyTaskActivity(
      taskId,
      actorId,
      NotificationAction.updated,
      `${actorName} đã tham gia công việc ${updated.title}`,
      userId,
    );

    return BusinessFormTaskResponseDto.fromEntity(updated, userId);
  }

  /** Số lượng việc theo từng tab (cá nhân / đối tác / chung) — tổng, không áp bộ lọc. */
  async getMyTaskCounts(
    userId: string,
    onBehalfOfUserId?: string,
  ): Promise<{
    personal: number;
    partner: number;
    shared: number;
    sharedPending: number;
  }> {
    const { effectiveUserId, onBehalfOfId } = await this.resolveActingContext(
      userId,
      onBehalfOfUserId,
    );
    userId = effectiveUserId;
    const mine: Prisma.BusinessFormTaskWhereInput = {
      OR: [{ mainAssigneeId: userId }, { businessForm: { userId } }],
    };
    // Làm thay chỉ hiển thị tab đối tác → chỉ cần đếm việc đối tác.
    if (onBehalfOfId) {
      const partner = await this.prisma.businessFormTask.count({
        where: {
          AND: [
            mine,
            NOT_DELETED_FORM_TASK,
            { type: BusinessFormTaskType.partner_task },
          ],
        },
      });
      return { personal: 0, partner, shared: 0, sharedPending: 0 };
    }
    const sharedBase = sharedWithMe(userId);

    const [personal, partner, shared, sharedPending] = await Promise.all([
      this.prisma.businessFormTask.count({
        where: {
          AND: [
            mine,
            NOT_DELETED_FORM_TASK,
            { type: BusinessFormTaskType.personal },
          ],
        },
      }),
      this.prisma.businessFormTask.count({
        where: {
          AND: [
            mine,
            NOT_DELETED_FORM_TASK,
            { type: BusinessFormTaskType.partner_task },
          ],
        },
      }),
      // "Việc chung" = việc chia sẻ mình ĐÃ tham gia. Việc chờ xác nhận đếm riêng
      // vào `sharedPending` và nằm ở tab "Việc chờ tham gia".
      this.prisma.businessFormTask.count({
        where: {
          AND: [
            sharedBase,
            NOT_DELETED_FORM_TASK,
            {
              assignments: {
                some: {
                  userId,
                  status: BusinessFormTaskAssignmentStatus.accepted,
                },
              },
            },
          ],
        },
      }),
      this.prisma.businessFormTask.count({
        where: {
          AND: [
            sharedBase,
            NOT_DELETED_FORM_TASK,
            {
              assignments: {
                some: {
                  userId,
                  status: BusinessFormTaskAssignmentStatus.pending,
                },
              },
            },
          ],
        },
      }),
    ]);

    return { personal, partner, shared, sharedPending };
  }

  /**
   * Gửi 1 notification cá nhân cho từng người nhận (lọc rỗng + trùng), bọc
   * try/catch chung. Rút gọn các builder — mỗi builder chỉ còn tính người nhận
   * + message. `actorUserId` chỉ gắn khi có (giữ nguyên hành vi từng builder).
   */
  private async fanoutNotifications(
    recipientIds: (string | null | undefined)[],
    opts: {
      taskId: string;
      action: NotificationAction;
      message: string;
      actorUserId?: string;
      errorContext: string;
    },
  ): Promise<void> {
    const recipients = [
      ...new Set(recipientIds.filter((id): id is string => !!id)),
    ];
    if (recipients.length === 0) return;
    try {
      await Promise.all(
        recipients.map((uid) =>
          this.notificationService.createNotificationWithCounter({
            userId: uid,
            relatedModel: RelatedModel.system,
            relatedModelId: opts.taskId,
            action: opts.action,
            linkUrl: taskLink(opts.taskId),
            message: opts.message,
            scope: NotificationScope.personal,
            ...(opts.actorUserId ? { actorUserId: opts.actorUserId } : {}),
          }),
        ),
      );
    } catch (err) {
      this.logger.error(`${opts.errorContext}: ${String(err)}`);
    }
  }

  /** Notification cho người được nhắc (@mention) trong bình luận. */
  private async notifyTaskMentions(
    taskId: string,
    recipientIds: string[],
    actorName: string,
    title: string,
  ): Promise<void> {
    await this.fanoutNotifications(recipientIds, {
      taskId,
      action: NotificationAction.task_commented,
      message: `${actorName} đã nhắc đến bạn trong công việc ${title}`,
      errorContext: `Không tạo được notification nhắc tên (task=${taskId})`,
    });
  }

  /** Notification cho người liên quan khi một người rời việc. */
  private async notifyTaskLeave(
    taskId: string,
    recipientIds: string[],
    leaverName: string,
    title: string,
    reason?: string,
  ): Promise<void> {
    await this.fanoutNotifications(recipientIds, {
      taskId,
      action: NotificationAction.updated,
      message: `${leaverName} đã rời công việc ${title}${
        reason ? ` — Lý do: ${reason}` : ''
      }`,
      errorContext: `Không tạo được notification rời việc (task=${taskId})`,
    });
  }

  /**
   * Báo notification cho người liên quan khi có hoạt động trên công việc (đổi trạng thái / bình luận). Người nhận = phụ trách chính + người tạo + chủ hồ sơ đối tác + người hỗ trợ, trừ người thao tác.
   */
  private async notifyTaskActivity(
    taskId: string,
    actorId: string,
    action: NotificationAction,
    message: string,
    // Làm thay: người được chăm mà hành động thực hiện hộ. Loại khỏi người nhận
    // (coi như họ tự làm) — không báo cho họ về việc làm nhân danh chính họ.
    // Không làm thay ⇒ trùng actorId ⇒ vô hại.
    beneficiaryId?: string,
  ): Promise<void> {
    const task = await this.prisma.businessFormTask
      .findUnique({
        where: { id: taskId },
        select: {
          mainAssigneeId: true,
          createdById: true,
          businessForm: { select: { userId: true } },
          assignments: { select: { userId: true } },
        },
      })
      .catch(() => null);
    if (!task) return;

    const recipients = [
      task.mainAssigneeId,
      task.createdById,
      task.businessForm?.userId ?? null,
      ...task.assignments.map((a) => a.userId),
    ].filter((id) => id !== actorId && id !== beneficiaryId);

    await this.fanoutNotifications(recipients, {
      taskId,
      action,
      message,
      actorUserId: actorId,
      errorContext: `Không tạo được notification hoạt động (task=${taskId})`,
    });
  }

  /**
   * Báo notification khi xóa / khôi phục công việc.
   */
  private async notifyTaskLifecycle(opts: {
    taskId: string;
    title: string;
    actorId: string;
    recipientIds: (string | null | undefined)[];
    action: NotificationAction;
    message: string;
  }): Promise<void> {
    await this.fanoutNotifications(
      opts.recipientIds.filter((id) => id !== opts.actorId),
      {
        taskId: opts.taskId,
        action: opts.action,
        message: opts.message,
        actorUserId: opts.actorId,
        errorContext: `Notification xóa/khôi phục lỗi (task=${opts.taskId})`,
      },
    );
  }

  async deleteTaskActivity(
    userId: string,
    activityId: string,
    onBehalfOfUserId?: string,
  ): Promise<BusinessFormTaskResponseDto> {
    // Làm thay: người chăm xóa được bình luận của CHÍNH MÌNH hoặc của người được chăm.
    const { effectiveUserId, actorId, onBehalfOfId } =
      await this.resolveActingContext(userId, onBehalfOfUserId);
    const activity = await this.prisma.businessFormTaskActivity.findUnique({
      where: { id: activityId },
      include: { task: { select: { type: true } } },
    });

    if (!activity) {
      throw new NotFoundException('Không tìm thấy hoạt động');
    }

    this.assertOnBehalfPartnerOnly(onBehalfOfId, activity.task.type);
    if (
      activity.createdById !== actorId &&
      activity.createdById !== effectiveUserId
    ) {
      throw new ForbiddenException('Bạn chỉ có thể xóa bình luận của mình');
    }

    if (activity.type !== BusinessFormTaskActivityType.comment) {
      throw new ForbiddenException('Không thể xóa nhật ký hệ thống tự tạo');
    }

    const updated = await this.prisma.businessFormTask.update({
      where: { id: activity.taskId },
      data: {
        lastActivityAt: new Date(),
        activities: {
          delete: { id: activityId },
        },
      },
      include: TASK_INCLUDE,
    });

    return BusinessFormTaskResponseDto.fromEntity(updated);
  }

  async deleteTask(userId: string, taskId: string, onBehalfOfUserId?: string) {
    const { effectiveUserId, actorId, onBehalfOfId } =
      await this.resolveActingContext(userId, onBehalfOfUserId);
    userId = effectiveUserId;
    const task = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        type: true,
        createdById: true,
        createdByAdmin: true,
        assignments: { select: { userId: true } },
      },
    });

    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc');
    }

    this.assertOnBehalfPartnerOnly(onBehalfOfId, task.type);
    if (task.createdByAdmin) {
      throw new ForbiddenException(
        'Công việc do admin giao, bạn không thể xóa',
      );
    }

    // Làm thay: creator gốc = actor (người chăm); cho phép họ xoá dù đang thao
    // tác dưới danh nghĩa người được chăm (userId = effective).
    if (task.createdById !== userId && task.createdById !== actorId) {
      throw new ForbiddenException('Bạn không có quyền xóa công việc này');
    }

    // Xóa mềm: đánh dấu deletedAt thay vì xóa cứng.
    const result = await this.prisma.businessFormTask.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });

    // User tự xóa việc của mình: chỉ báo cho người hỗ trợ.
    await this.notifyTaskLifecycle({
      taskId,
      title: task.title,
      actorId,
      recipientIds: task.assignments.map((a) => a.userId),
      action: NotificationAction.task_deleted,
      message: `Công việc ${task.title} đã bị xóa`,
    });

    return result;
  }

  async restoreTask(userId: string, taskId: string, onBehalfOfUserId?: string) {
    const { effectiveUserId, actorId, onBehalfOfId } =
      await this.resolveActingContext(userId, onBehalfOfUserId);
    userId = effectiveUserId;
    const task = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        type: true,
        createdById: true,
        createdByAdmin: true,
        deletedAt: true,
        assignments: { select: { userId: true } },
      },
    });

    if (!task || !task.deletedAt) {
      throw new NotFoundException('Không tìm thấy công việc đã xóa');
    }

    this.assertOnBehalfPartnerOnly(onBehalfOfId, task.type);
    if (task.createdByAdmin) {
      throw new ForbiddenException(
        'Công việc do admin giao, bạn không thể khôi phục',
      );
    }

    // Làm thay: creator gốc = actor (người chăm) — cho khôi phục như deleteTask.
    if (task.createdById !== userId && task.createdById !== actorId) {
      throw new ForbiddenException(
        'Bạn không có quyền khôi phục công việc này',
      );
    }

    const result = await this.prisma.businessFormTask.update({
      where: { id: taskId },
      data: { deletedAt: null },
    });

    // User tự khôi phục: chỉ báo cho người hỗ trợ.
    await this.notifyTaskLifecycle({
      taskId,
      title: task.title,
      actorId,
      recipientIds: task.assignments.map((a) => a.userId),
      action: NotificationAction.task_restored,
      message: `Công việc ${task.title} đã được khôi phục`,
    });

    return result;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ADMIN METHODS
  // ────────────────────────────────────────────────────────────────────────────

  /** Mệnh đề lọc dùng chung cho danh sách admin và file Excel xuất ra. */
  private buildAdminTaskWhere(
    query: AdminQueryTasksDto,
  ): Prisma.BusinessFormTaskWhereInput {
    const {
      search,
      status,
      type,
      category,
      priority,
      assigneeId,
      shared,
      createdByAdmin,
      deleted,
      businessFormId,
      startFrom,
      startTo,
      dueFrom,
      dueTo,
    } = query;

    return {
      AND: [
        assigneeId
          ? shared
            ? {
                // Việc chia sẻ tới assigneeId: là người liên quan, không phải phụ trách chính.
                assignments: { some: { userId: assigneeId } },
                NOT: { mainAssigneeId: assigneeId },
              }
            : {
                OR: [
                  { mainAssigneeId: assigneeId },
                  { assignments: { some: { userId: assigneeId } } },
                ],
              }
          : {},
        // Thùng rác: mọi việc đã xóa mềm (admin toàn quyền khôi phục); ngược lại bỏ việc đã xóa.
        deleted
          ? {
              deletedAt: { not: null },
              OR: NOT_DELETED_FORM_TASK.OR,
            }
          : NOT_DELETED_FORM_TASK,
        businessFormId ? { businessFormId } : {},
        createdByAdmin ? { createdByAdmin: true } : {},
        status?.length ? { status: { in: status } } : {},
        type?.length ? { type: { in: type } } : {},
        category ? { category } : {},
        priority ? { priority } : {},
        search
          ? {
              OR: [
                { code: { contains: search, mode: 'insensitive' } },
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                {
                  businessForm: {
                    companyName: { contains: search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {},
        dateRangeFilter('startDate', startFrom, startTo),
        dateRangeFilter('dueDate', dueFrom, dueTo),
      ],
    };
  }

  async adminFindAll(query: AdminQueryTasksDto): Promise<{
    data: BusinessFormTaskResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = query;
    const where = this.buildAdminTaskWhere(query);

    const [total, rows] = await Promise.all([
      this.prisma.businessFormTask.count({ where }),
      this.prisma.businessFormTask.findMany({
        where,
        include: TASK_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rows.map((r) => BusinessFormTaskResponseDto.fromEntity(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Xuất Excel báo cáo công việc: mỗi người thực hiện một sheet. Trong sheet,
   * khối trên là việc người đó phụ trách chính, khối dưới (sau một dòng tiêu đề)
   * là việc chung họ hỗ trợ và đã chấp nhận.
   */
  async exportTasksXlsx(
    query: ExportTasksDto,
  ): Promise<{ buffer: Buffer; filename: string }> {
    // `assigneeId`/`shared` của danh sách admin không dùng ở đây: phạm vi người
    // thực hiện được ghép riêng cho từng sheet bằng `participatesIn` (việc người
    // đó phụ trách chính hoặc hỗ trợ đã chấp nhận).
    const baseWhere = this.buildAdminTaskWhere(query as AdminQueryTasksDto);

    const found = await this.prisma.user.findMany({
      where: { id: { in: query.assigneeIds } },
      select: { id: true, fullName: true },
    });
    const byId = new Map(found.map((u) => [u.id, u]));
    const missing = query.assigneeIds.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Không tìm thấy người dùng: ${missing.join(', ')}`,
      );
    }
    // Giữ đúng thứ tự người dùng đã chọn.
    const users = query.assigneeIds.map((id) => byId.get(id)!);

    // Một việc có thể nằm ở nhiều sheet; trần đếm theo tổng số dòng thật.
    const counts = await Promise.all(
      users.map((u) =>
        this.prisma.businessFormTask.count({
          where: { AND: [baseWhere, participatesIn(u.id)] },
        }),
      ),
    );
    const totalRows = counts.reduce((sum, n) => sum + n, 0);
    if (totalRows > MAX_EXPORT_ROWS) {
      throw new BadRequestException(
        `Tổng ${totalRows} dòng trên ${users.length} sheet vượt giới hạn ${MAX_EXPORT_ROWS}. Hãy thu hẹp bộ lọc hoặc bớt người.`,
      );
    }

    const wb = new ExcelJS.Workbook();
    const usedSheetNames = new Set<string>();

    for (const user of users) {
      const rows = await this.prisma.businessFormTask.findMany({
        where: { AND: [baseWhere, participatesIn(user.id)] },
        include: {
          mainAssignee: { select: { fullName: true } },
          // Người còn chờ xác nhận không tính là người hỗ trợ.
          assignments: {
            where: { status: BusinessFormTaskAssignmentStatus.accepted },
            include: { user: { select: { fullName: true } } },
          },
          businessForm: { select: { companyName: true, taxCode: true } },
        },
        // Việc chưa đặt ngày bắt đầu dồn xuống cuối mỗi khối.
        orderBy: { startDate: { sort: 'asc', nulls: 'last' } },
      });

      /** attachments là JSONB: { id, name, url }[] (xem toAttachmentsJson). */
      const attachmentsOf = (r: (typeof rows)[number]) =>
        (Array.isArray(r.attachments)
          ? (r.attachments as unknown as { name?: string; url?: string }[])
          : []
        ).filter((a) => !!a.url);

      // Excel chỉ gắn được một hyperlink cho mỗi ô, nên mỗi tệp phải có cột riêng
      // thì mới bấm được. Số cột = việc có nhiều tệp nhất.
      // Tối thiểu một cột để header không biến mất khi cả sheet không có tệp nào.
      const maxAttachments = rows.reduce(
        (max, r) => Math.max(max, attachmentsOf(r).length),
        1,
      );

      const ws = wb.addWorksheet(
        sheetName(user.fullName, usedSheetNames),
        // Cuộn xuống vẫn thấy hàng tiêu đề.
        { views: [{ state: 'frozen', ySplit: 1 }] },
      );
      ws.columns = [
        ...TASK_EXPORT_COLUMNS,
        // Số cột tệp thay đổi theo dữ liệu nên luôn nằm cuối, khỏi xô lệch cột khác.
        ...Array.from({ length: maxAttachments }, (_, i) => ({
          header: maxAttachments > 1 ? `Tệp đính kèm ${i + 1}` : 'Tệp đính kèm',
          key: `attachment${i}`,
          width: 30,
        })),
      ];
      const colCount = ws.columns.length;

      const headerRow = ws.getRow(1);
      headerRow.height = EXPORT_HEADER_HEIGHT;
      headerRow.font = {
        bold: true,
        size: EXPORT_HEADER_FONT_SIZE,
        color: { argb: EXPORT_COLORS.headerFont },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      for (let c = 1; c <= colCount; c++) {
        const cell = headerRow.getCell(c);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: EXPORT_COLORS.headerFill },
        };
        cell.border = THIN_BORDER;
      }

      const dmy = (d: Date | null | undefined) => (d ? this.formatDmy(d) : '');
      /**
       * Mỗi phần tử một dòng trong cùng một ô. Dùng `•` chứ không phải `-`:
       * ô mở đầu bằng dấu trừ bị Excel hiểu là công thức khi bấm vào sửa.
       */
      const bullets = (lines: string[]) =>
        lines.map((l) => `• ${l}`).join('\n');

      const writeTask = (r: (typeof rows)[number]) => {
        // Bỏ việc con đã xoá mềm, rồi tách theo trạng thái hoàn thành.
        const items = (
          Array.isArray(r.items) ? (r.items as unknown as StoredTaskItem[]) : []
        ).filter((i) => !i.deleted);

        const form = r.businessForm;
        const company = form
          ? [form.companyName, form.taxCode].filter(Boolean).join(' - ')
          : '';

        const row = ws.addRow({
          code: r.code ?? '',
          start: dmy(r.startDate),
          due: dmy(r.dueDate),
          assignee: r.mainAssignee?.fullName ?? '',
          related: bullets(r.assignments.map((a) => a.user.fullName)),
          title: r.title,
          description: r.description ?? '',
          itemsDone: bullets(items.filter((i) => i.done).map((i) => i.label)),
          itemsTodo: bullets(items.filter((i) => !i.done).map((i) => i.label)),
          company,
          status: TASK_STATUS_LABELS[r.status],
          category: COOPERATION_CATEGORY_LABELS[r.category] ?? r.category,
        });

        // Nhãn link là tên tệp; tệp không tên thì rơi về chính URL.
        attachmentsOf(r).forEach((a, i) => {
          const url = a.url as string;
          const cell = row.getCell(`attachment${i}`);
          cell.value = { text: a.name || url, hyperlink: url };
          cell.font = { color: { argb: EXPORT_COLORS.hyperlink }, underline: true };
        });

        row.alignment = { wrapText: true, vertical: 'top' };
        // Lặp theo `colCount` chứ không dùng `eachCell`: hàng chỉ chứa những ô
        // có giá trị, ô rỗng ở cuối sẽ không được duyệt và mất khung.
        for (let c = 1; c <= colCount; c++) {
          row.getCell(c).border = THIN_BORDER;
        }
      };

      const owned = rows.filter((r) => r.mainAssigneeId === user.id);
      const shared = rows.filter((r) => r.mainAssigneeId !== user.id);
      owned.forEach(writeTask);
      if (shared.length > 0) {
        ws.addRow([]);
        const header = ws.addRow([
          'VIỆC CHUNG (chỉ hỗ trợ, không phụ trách chính)',
        ]);
        header.font = { bold: true };
        header.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: EXPORT_COLORS.sharedFill },
        };
        // Viền phải đặt trước khi gộp, gộp xong ô con không nhận style nữa.
        for (let c = 1; c <= colCount; c++) {
          header.getCell(c).border = THIN_BORDER;
        }
        ws.mergeCells(header.number, 1, header.number, colCount);
        shared.forEach(writeTask);
      }
    }

    const now = new Date();
    const p2 = (n: number) => String(n).padStart(2, '0');
    // Có cả giây: hai lần xuất cùng bộ lọc trong một phút vẫn ra tên khác nhau.
    const stamp =
      `${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}` +
      `-${p2(now.getHours())}${p2(now.getMinutes())}${p2(now.getSeconds())}`;

    // Một người thì lấy tên; nhiều người thì bỏ hẳn, kẻo tên file dài vô tận.
    const who =
      users.length === 1
        ? `${slugify(users[0].fullName)}_`
        : '';

    const ymd = (iso: string) => iso.slice(0, 10).replace(/-/g, '');
    const period = query.startTo
      ? `${ymd(query.startFrom)}-${ymd(query.startTo)}`
      : `tu-${ymd(query.startFrom)}`;

    return {
      buffer: Buffer.from(await wb.xlsx.writeBuffer()),
      filename: `bao-cao-cong-viec_${who}${period}_${stamp}.xlsx`,
    };
  }

  async adminFindOne(taskId: string): Promise<BusinessFormTaskResponseDto> {
    const task = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
      include: TASK_INCLUDE,
    });

    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc');
    }

    return BusinessFormTaskResponseDto.fromEntity(task);
  }

  async adminCreateTask(
    dto: AdminCreateTaskDto,
    actor: JwtPayload,
  ): Promise<BusinessFormTaskResponseDto> {
    // Người phụ trách chính: ưu tiên dto.mainAssigneeId; nếu task đối tác mà không
    // chỉ định → mặc định là chủ hồ sơ đối tác (userId của BusinessForm).
    let mainAssigneeId = dto.mainAssigneeId ?? null;
    if (
      !mainAssigneeId &&
      dto.type === BusinessFormTaskType.partner_task &&
      dto.businessFormId
    ) {
      const form = await this.prisma.businessForm.findUnique({
        where: { id: dto.businessFormId },
        select: { userId: true },
      });
      if (form?.userId) {
        mainAssigneeId = form.userId;
      }
    }

    // Người liên quan = relatedUserIds (loại trùng với người phụ trách chính).
    const relatedUserIds = (dto.relatedUserIds ?? []).filter(
      (id) => id !== mainAssigneeId,
    );

    const now = new Date();
    const itemActor: ItemActor = {
      id: actor.id,
      name: await this.getActorName(actor.id),
    };

    const task = await this.createTaskWithCode(
      {
        title: dto.title,
        description: dto.description,
        type: dto.type ?? BusinessFormTaskType.admin_internal,
        category: dto.category,
        priority: dto.priority ?? BusinessFormPriority.normal,
        status: BusinessFormTaskStatus.pending,
        businessFormId: dto.businessFormId,
        createdById: actor.id,
        createdByAdmin: true,
        mainAssigneeId,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assignments:
          relatedUserIds.length > 0
            ? {
                create: relatedUserIds.map((id) => ({
                  userId: id,
                  assignedById: actor.id,
                })),
              }
            : undefined,
        attachments: toAttachmentsJson(dto.attachments),
        items: buildItemsForCreate(
          dto.items,
          itemActor,
          now,
        ) as unknown as Prisma.InputJsonValue,
        activities: {
          create: {
            type: BusinessFormTaskActivityType.status_changed,
            newStatus: BusinessFormTaskStatus.pending,
            message: 'Đã tạo công việc',
            createdById: actor.id,
          },
        },
      },
      TASK_INCLUDE,
    );

    if (dto.businessFormId) {
      this.logAdminAction(
        dto.businessFormId,
        actor,
        `Admin tạo task ${dto.title}`,
        { transition: 'admin-task-add', taskId: task.id },
      );
    }

    // Mail người phụ trách chính + người hỗ trợ.
    const assignerName = await this.getActorName(actor.id);
    await this.dispatchAssignment(
      { id: task.id, title: task.title, dueDate: task.dueDate },
      { mainAssigneeId, supportUserIds: relatedUserIds },
      assignerName,
      actor.id,
    );

    return BusinessFormTaskResponseDto.fromEntity(task);
  }

  async adminUpdateTask(
    taskId: string,
    dto: AdminUpdateTaskDto,
    actor: JwtPayload,
  ): Promise<BusinessFormTaskResponseDto> {
    const before = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
    });
    if (!before) throw new NotFoundException('Không tìm thấy công việc');

    // Tập người hỗ trợ cũ — để chỉ mail người MỚI khi đổi assignment.
    const oldSupport = await this.prisma.businessFormTaskAssignment.findMany({
      where: { taskId },
      select: { userId: true },
    });
    const oldSupportIds = new Set(oldSupport.map((a) => a.userId));

    const data: Prisma.BusinessFormTaskUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.startDate !== undefined)
      data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.dueDate !== undefined) {
      data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
      // Đổi hạn → reset cờ để vòng quét nhắc lại theo hạn mới.
      data.dueSoonNotifiedAt = null;
      data.overdueNotifiedAt = null;
    }
    if (dto.mainAssigneeId !== undefined) {
      data.mainAssignee = dto.mainAssigneeId
        ? { connect: { id: dto.mainAssigneeId } }
        : { disconnect: true };
    }
    if (dto.businessFormId !== undefined) {
      data.businessForm = dto.businessFormId
        ? { connect: { id: dto.businessFormId } }
        : { disconnect: true };
    }

    data.lastActivityAt = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.relatedUserIds !== undefined) {
        const mainId =
          dto.mainAssigneeId !== undefined
            ? dto.mainAssigneeId
            : before.mainAssigneeId;
        const relatedUserIds = dto.relatedUserIds.filter((id) => id !== mainId);
        await this.syncAssignments(
          tx,
          taskId,
          [...oldSupportIds],
          relatedUserIds,
          actor.id,
        );
      }

      // Checklist: so với mảng cũ để ghi lịch sử theo từng việc con.
      if (dto.items !== undefined) {
        const merged = await this.applyItemMerge(
          before.items,
          dto.items,
          actor.id,
          new Date(),
        );
        data.items = merged.itemsJson;
        // Admin không bị chặn quyền, nhưng vẫn phải để lại dấu vết.
        await this.logPurgedItems(tx, taskId, merged.purged, actor.id);
      }
      if (dto.attachments !== undefined)
        data.attachments = toAttachmentsJson(dto.attachments);

      return tx.businessFormTask.update({
        where: { id: taskId },
        data,
        include: TASK_INCLUDE,
      });
    });

    if (updated.businessFormId) {
      this.logAdminAction(
        updated.businessFormId,
        actor,
        `Admin cập nhật task ${updated.title}`,
        { transition: 'admin-task-update', taskId },
      );
    }

    // Mail người MỚI được giao (đổi phụ trách chính / thêm người hỗ trợ).
    const newMainId =
      dto.mainAssigneeId !== undefined &&
      dto.mainAssigneeId &&
      dto.mainAssigneeId !== before.mainAssigneeId
        ? dto.mainAssigneeId
        : null;
    let newSupportIds: string[] = [];
    if (dto.relatedUserIds !== undefined) {
      const mainId =
        dto.mainAssigneeId !== undefined
          ? dto.mainAssigneeId
          : before.mainAssigneeId;
      newSupportIds = dto.relatedUserIds
        .filter((id) => id !== mainId)
        .filter((id) => !oldSupportIds.has(id));
    }
    if (newMainId || newSupportIds.length > 0) {
      const assignerName = await this.getActorName(actor.id);
      await this.dispatchAssignment(
        { id: updated.id, title: updated.title, dueDate: updated.dueDate },
        { mainAssigneeId: newMainId, supportUserIds: newSupportIds },
        assignerName,
        actor.id,
      );
    }

    return BusinessFormTaskResponseDto.fromEntity(updated);
  }

  async adminSetAssignment(
    taskId: string,
    dto: AdminTaskAssignmentDto,
    actor: JwtPayload,
  ): Promise<BusinessFormTaskResponseDto> {
    const task = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Không tìm thấy công việc');

    // Tập người hỗ trợ cũ — chỉ mail người MỚI.
    const oldSupport = await this.prisma.businessFormTaskAssignment.findMany({
      where: { taskId },
      select: { userId: true },
    });
    const oldSupportIds = new Set(oldSupport.map((a) => a.userId));

    const mainId =
      dto.mainAssigneeId !== undefined
        ? dto.mainAssigneeId
        : task.mainAssigneeId;
    const relatedUserIds = (dto.relatedUserIds ?? []).filter(
      (id) => id !== mainId,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.BusinessFormTaskUpdateInput = {};
      if (dto.mainAssigneeId !== undefined) {
        data.mainAssignee = dto.mainAssigneeId
          ? { connect: { id: dto.mainAssigneeId } }
          : { disconnect: true };
      }
      if (Object.keys(data).length > 0) {
        await tx.businessFormTask.update({ where: { id: taskId }, data });
      }

      if (dto.relatedUserIds !== undefined) {
        await this.syncAssignments(
          tx,
          taskId,
          [...oldSupportIds],
          relatedUserIds,
          actor.id,
        );
      }

      await tx.businessFormTaskActivity.create({
        data: {
          taskId,
          type: BusinessFormTaskActivityType.status_changed,
          message: dto.note ?? `Đã cập nhật người phụ trách / liên quan`,
          createdById: actor.id,
        },
      });

      return tx.businessFormTask.update({
        where: { id: taskId },
        data: { lastActivityAt: new Date() },
        include: TASK_INCLUDE,
      });
    });

    // Mail người MỚI được giao.
    const newMainId =
      dto.mainAssigneeId !== undefined &&
      dto.mainAssigneeId &&
      dto.mainAssigneeId !== task.mainAssigneeId
        ? dto.mainAssigneeId
        : null;
    const newSupportIds =
      dto.relatedUserIds !== undefined
        ? relatedUserIds.filter((id) => !oldSupportIds.has(id))
        : [];
    if (newMainId || newSupportIds.length > 0) {
      const assignerName = await this.getActorName(actor.id);
      await this.dispatchAssignment(
        { id: updated.id, title: updated.title, dueDate: updated.dueDate },
        { mainAssigneeId: newMainId, supportUserIds: newSupportIds },
        assignerName,
        actor.id,
      );
    }

    return BusinessFormTaskResponseDto.fromEntity(updated);
  }

  async adminUpdateStatus(
    taskId: string,
    dto: UpdateTaskStatusDto,
    actor: JwtPayload,
  ): Promise<BusinessFormTaskResponseDto> {
    const task = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('Không tìm thấy công việc');

    const data: Prisma.BusinessFormTaskUpdateInput = {
      status: dto.status,
      lastActivityAt: new Date(),
    };

    if (
      dto.status === BusinessFormTaskStatus.done &&
      task.status !== BusinessFormTaskStatus.done
    ) {
      data.completedBy = { connect: { id: actor.id } };
      data.completedAt = new Date();
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.businessFormTaskActivity.create({
        data: {
          taskId,
          type: BusinessFormTaskActivityType.status_changed,
          oldStatus: task.status,
          newStatus: dto.status,
          message: dto.message,
          attachments: toAttachmentsJson(dto.evidence),
          createdById: actor.id,
        },
      });

      return tx.businessFormTask.update({
        where: { id: taskId },
        data,
        include: TASK_INCLUDE,
      });
    });

    if (dto.status !== task.status) {
      const actorName = await this.getActorName(actor.id);
      await this.notifyTaskActivity(
        taskId,
        actor.id,
        NotificationAction.task_status_changed,
        `${actorName} đổi trạng thái ${updated.title} → ${TASK_STATUS_LABELS[dto.status]}`,
      );
    }

    return BusinessFormTaskResponseDto.fromEntity(updated);
  }

  async adminAddActivity(
    taskId: string,
    dto: CreateTaskActivityDto,
    actor: JwtPayload,
  ): Promise<BusinessFormTaskResponseDto> {
    const task = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
      include: { assignments: { select: { userId: true } } },
    });

    if (!task) {
      throw new NotFoundException('Không tìm thấy công việc');
    }

    if (dto.parentId) {
      const parent = await this.prisma.businessFormTaskActivity.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.taskId !== taskId) {
        throw new NotFoundException('Không tìm thấy bình luận gốc');
      }
      if (parent.type === BusinessFormTaskActivityType.member_changed) {
        throw new BadRequestException(
          'Không thể bình luận hoạt động thay đổi thành viên',
        );
      }
    }

    // Chỉ cho phép nhắc (@mention) người liên quan tới việc (phụ trách chính + người hỗ trợ), trừ chính mình.
    const allowedMentionIds = new Set<string>([
      ...(task.mainAssigneeId ? [task.mainAssigneeId] : []),
      ...task.assignments.map((a) => a.userId),
    ]);
    const mentionedUserIds = [...new Set(dto.mentionedUserIds ?? [])].filter(
      (id) => id !== actor.id && allowedMentionIds.has(id),
    );

    const updated = await this.prisma.businessFormTask.update({
      where: { id: taskId },
      data: {
        lastActivityAt: new Date(),
        activities: {
          create: {
            type: BusinessFormTaskActivityType.comment,
            message: dto.message,
            parentId: dto.parentId,
            mentionedUserIds,
            attachments: toAttachmentsJson(dto.attachments),
            createdById: actor.id,
          },
        },
      },
      include: TASK_INCLUDE,
    });

    const responseDto = BusinessFormTaskResponseDto.fromEntity(updated);

    const newActivityRow = await this.prisma.businessFormTaskActivity.findFirst(
      {
        where: {
          taskId,
          createdById: actor.id,
          type: BusinessFormTaskActivityType.comment,
        },
        include: {
          createdBy: { select: { id: true, fullName: true } },
          onBehalfOf: { select: { fullName: true } },
          reactions: {
            include: { user: { select: { id: true, fullName: true } } },
          },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    );

    if (newActivityRow) {
      this.tasksGateway.emitActivityCreated(
        taskId,
        this.mapActivityResponse(newActivityRow, actor.id),
      );
    }

    const actorName = await this.getActorName(actor.id);
    await this.notifyTaskActivity(
      taskId,
      actor.id,
      NotificationAction.task_commented,
      `${actorName} ${dto.parentId ? 'đã trả lời' : 'đã bình luận'} trong ${updated.title}`,
    );

    if (mentionedUserIds.length > 0) {
      await this.notifyTaskMentions(
        taskId,
        mentionedUserIds,
        actorName,
        updated.title,
      );
    }

    return responseDto;
  }

  async getGlobalAnalytics(): Promise<AdminTaskAnalyticsDto> {
    const now = new Date();
    // Đếm theo trạng thái bằng groupBy (không kéo full-row vào bộ nhớ) —
    // khớp bảng "Tất cả trạng thái" (gồm đã hủy).
    const [grouped, overdue] = await Promise.all([
      this.prisma.businessFormTask.groupBy({
        by: ['status'],
        where: { AND: [NOT_DELETED_FORM_TASK] },
        _count: { _all: true },
      }),
      // Quá hạn: chưa xong và chưa hủy, đã quá dueDate.
      this.prisma.businessFormTask.count({
        where: {
          AND: [
            NOT_DELETED_FORM_TASK,
            {
              status: {
                notIn: [
                  BusinessFormTaskStatus.done,
                  BusinessFormTaskStatus.cancelled,
                ],
              },
              dueDate: { lt: now },
            },
          ],
        },
      }),
    ]);

    const countOf = (status: BusinessFormTaskStatus) =>
      grouped.find((g) => g.status === status)?._count._all ?? 0;

    return {
      total: grouped.reduce((sum, g) => sum + g._count._all, 0),
      pending: countOf(BusinessFormTaskStatus.pending),
      in_progress: countOf(BusinessFormTaskStatus.in_progress),
      done: countOf(BusinessFormTaskStatus.done),
      cancelled: countOf(BusinessFormTaskStatus.cancelled),
      overdue,
    };
  }

  async getUserTaskOverview(userId: string): Promise<AdminUserTaskOverviewDto> {
    const partners = await this.prisma.businessForm.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, companyName: true, status: true },
    });

    const tasks = await this.prisma.businessFormTask.findMany({
      where: {
        deletedAt: null,
        OR: [
          { mainAssigneeId: userId },
          { assignments: { some: { userId } } },
          { createdById: userId },
        ],
      },
      // Chỉ lấy cột cần cho các phép đếm/gộp (tránh kéo full-row).
      select: {
        status: true,
        dueDate: true,
        type: true,
        businessFormId: true,
        mainAssigneeId: true,
        // Chỉ bản ghi liên quan của chính user để biết user có phải "người liên quan" không.
        assignments: { where: { userId }, select: { userId: true } },
      },
    });

    const now = new Date();
    const activeTasks = tasks.filter(
      (t) => t.status !== BusinessFormTaskStatus.cancelled,
    );

    const analytics = {
      total: activeTasks.length,
      pending: activeTasks.filter(
        (t) => t.status === BusinessFormTaskStatus.pending,
      ).length,
      in_progress: activeTasks.filter(
        (t) => t.status === BusinessFormTaskStatus.in_progress,
      ).length,
      done: activeTasks.filter((t) => t.status === BusinessFormTaskStatus.done)
        .length,
      cancelled: tasks.filter(
        (t) => t.status === BusinessFormTaskStatus.cancelled,
      ).length,
      overdue: activeTasks.filter(
        (t) =>
          t.status !== BusinessFormTaskStatus.done &&
          t.dueDate &&
          t.dueDate < now,
      ).length,
    };

    // Việc cá nhân = task cá nhân do chính user phụ trách chính.
    const personalTasks = activeTasks.filter(
      (t) =>
        t.type === BusinessFormTaskType.personal &&
        t.businessFormId === null &&
        t.mainAssigneeId === userId,
    );
    const personalFolder = {
      taskCount: personalTasks.length,
    };

    // Việc chia sẻ chung = task user là NGƯỜI LIÊN QUAN (không phải phụ trách chính).
    const sharedTasks = activeTasks.filter(
      (t) => t.mainAssigneeId !== userId && t.assignments.length > 0,
    );
    const sharedFolder = {
      taskCount: sharedTasks.length,
    };

    const partnerFolders = partners.map((p) => {
      const partnerTasks = activeTasks.filter((t) => t.businessFormId === p.id);
      return {
        businessFormId: p.id,
        companyName: p.companyName,
        status: p.status,
        taskCount: partnerTasks.length,
      };
    });

    return {
      analytics,
      personalFolder,
      sharedFolder,
      partnerFolders,
    };
  }

  async adminDeleteTask(taskId: string, actor: JwtPayload) {
    const task = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
      include: { assignments: { select: { userId: true } } },
    });
    if (!task || task.deletedAt)
      throw new NotFoundException('Không tìm thấy công việc');

    // Xóa mềm
    const result = await this.prisma.businessFormTask.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });

    // Việc admin giao: báo cho người phụ trách chính + người hỗ trợ (trừ admin thao tác).
    if (task.createdByAdmin) {
      await this.notifyTaskLifecycle({
        taskId,
        title: task.title,
        actorId: actor.id,
        recipientIds: [
          task.mainAssigneeId,
          ...task.assignments.map((a) => a.userId),
        ],
        action: NotificationAction.task_deleted,
        message: `Admin đã xóa công việc ${task.title}`,
      });
    }

    if (task.businessFormId) {
      this.logAdminAction(
        task.businessFormId,
        actor,
        `Admin xóa task ${task.title}`,
        { transition: 'admin-task-delete', taskId },
      );
    }

    return result;
  }

  async adminRestoreTask(taskId: string, actor: JwtPayload) {
    const task = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
      include: { assignments: { select: { userId: true } } },
    });
    if (!task || !task.deletedAt)
      throw new NotFoundException('Không tìm thấy công việc đã xóa');

    const result = await this.prisma.businessFormTask.update({
      where: { id: taskId },
      data: { deletedAt: null },
    });

    // Báo cho người phụ trách chính + người hỗ trợ.
    await this.notifyTaskLifecycle({
      taskId,
      title: task.title,
      actorId: actor.id,
      recipientIds: [
        task.mainAssigneeId,
        ...task.assignments.map((a) => a.userId),
      ],
      action: NotificationAction.task_restored,
      message: `Admin đã khôi phục công việc ${task.title}`,
    });

    if (task.businessFormId) {
      this.logAdminAction(
        task.businessFormId,
        actor,
        `Admin khôi phục task ${task.title}`,
        { transition: 'admin-task-restore', taskId },
      );
    }

    return result;
  }

  private logAdminAction(
    formId: string,
    actor: JwtPayload,
    message: string,
    payload: Record<string, unknown>,
  ) {
    this.activityLogService
      .createActivityLog(
        formId,
        ActivityTargetType.BUSINESS_FORM,
        ActivityType.BUSINESS_FORM_STATUS_CHANGED,
        actor,
        message,
        payload,
      )
      .catch((err: unknown) =>
        this.logger.warn(
          `ActivityLog failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
  }
}
