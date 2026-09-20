/**
 * Lịch trong ngày của một nhóm: đọc nhãn `HH:mm` server trả về, dựng câu gợi ý
 * ngày bắt đầu, và validate + đóng gói payload lịch theo đúng luật nghiệp vụ.
 */

/**
 * Bật báo cáo với bộ ngày này thì bao giờ có hiệu lực thật?
 *
 * Nói ra thay vì để người dùng đoán. Server sinh snapshot theo giờ sinh của
 * CHÍNH nhóm đó, nên giờ ấy phải đi vào đây qua tham số `generationLabel`
 * (`scope.generationLabel`), không được đọc một hằng số trong client.
 *
 * Thiếu nhãn thì rơi về `REPORT_GENERATE_MINUTE`. Được phép ở riêng chỗ này vì
 * đúng ca thiếu nhãn là ca "nhóm chưa tồn tại" — người dùng đang bật báo cáo
 * cho một nhóm chưa có scope, nên chưa có gì để đọc, và giờ sinh là hằng số
 * sản phẩm đã bị gỡ khỏi DTO nên không nhóm nào đặt khác được.
 *
 * `now` CHỈ chọn cách diễn đạt câu ("hôm nay" hay "ngày mai"), tuyệt đối không
 * cấp hay thu quyền gì: mọi quyền ghi vẫn đọc `permissions` từ server.
 *
 * @param weekdays ISO 1–7, không rỗng.
 * @param generationLabel `'HH:mm'` từ server; `null`/thiếu thì dùng dự phòng.
 */
import {
  REPORT_CUTOFF_MINUTE,
  REPORT_GENERATE_MINUTE,
  REPORT_MAX_REMINDER_BEFORE,
} from './constants';
import {
  formatMinuteOfDay,
  isoWeekdayVi,
  minuteOfDayVi,
  todayStrVi,
  WEEKDAY_LABEL_VI,
} from './date';

export function reportStartsHint(
  weekdays: number[],
  generationLabel?: string | null,
  {
    now = new Date(),
    missedTodaysGeneration = false,
  }: {
    now?: Date;
    /**
     * Nhóm đã lỡ lượt sinh bản của hôm nay - xem `missedTodaysGeneration()`.
     * Khi đó "Đã áp dụng cho hôm nay" là nói ngược lại sự thật.
     */
    missedTodaysGeneration?: boolean;
  } = {},
): string {
  if (weekdays.length === 0) return 'Chọn ít nhất một ngày báo cáo.';

  const generateMinute =
    parseMinuteOfDay(generationLabel) ?? REPORT_GENERATE_MINUTE;
  const at = formatMinuteOfDay(generateMinute);
  const today = isoWeekdayVi(now);
  const isReportingToday = weekdays.includes(today);
  const pastGeneration = minuteOfDayVi(now) >= generateMinute;

  if (isReportingToday && !pastGeneration) {
    return `Bắt đầu áp dụng lúc ${at} hôm nay.`;
  }
  if (isReportingToday && !missedTodaysGeneration) {
    return `Đã áp dụng cho hôm nay (sinh lúc ${at}).`;
  }

  // Ngày báo cáo gần nhất kể từ mai. Vòng đủ 7 bước nên luôn tìm ra khi mảng
  // khác rỗng (bước 7 là chính thứ này của tuần sau).
  let next = '';
  for (let step = 1; step <= 7; step++) {
    const day = ((today - 1 + step) % 7) + 1;
    if (!weekdays.includes(day)) continue;
    const label = WEEKDAY_LABEL_VI[day];
    /* Tuần ISO bắt đầu từ T2: ngày đích có số thứ tự không lớn hơn hôm nay là
       đã vòng sang tuần sau. Bản trước luôn ghi "tuần này", nên thứ Bảy chọn
       lịch T2 thì câu gợi ý chỉ về một ngày đã qua. */
    next =
      step === 1
        ? `${at} ngày mai (${label})`
        : `${at} ${label} ${day <= today ? 'tuần sau' : 'tuần này'}`;
    break;
  }
  if (!next) return '';

  if (isReportingToday) {
    return `Hôm nay đã qua giờ sinh bản (${at}) nên chưa ai có bản. Bản đầu tiên có từ ${next}; cần ngay hôm nay thì sau khi lưu, bấm "Mở cấu hình báo cáo" rồi "Tạo ngay".`;
  }
  return `Bắt đầu từ ${next}.`;
}

/**
 * Nhóm này đã LỠ lượt sinh bản của hôm nay chưa: chưa có cấu hình nào (đang
 * bật lần đầu), hoặc cấu hình được tạo hôm nay từ giờ sinh trở đi.
 *
 * Server chỉ sinh bản cho nhóm có ảnh chụp danh sách lúc giờ sinh, và sinh bù
 * khi đọc cũng đòi ảnh chụp đó (`requireExistingSnapshot` trong
 * `ensureReportsForRead`). Nhóm bật sau giờ sinh vì thế không có bản nào cả
 * ngày, trừ khi trưởng nhóm bấm "Tạo ngay".
 *
 * Nhóm TẠM DỪNG lúc giờ sinh rồi bật lại cũng lỡ lượt, nhưng client không có
 * mốc bật lại để biết - ca đó giữ câu cũ.
 */
export function missedTodaysGeneration(
  scope: { createdAt: string; generationLabel?: string | null } | null,
  now: Date = new Date(),
): boolean {
  if (!scope) return true;
  const created = new Date(scope.createdAt);
  if (Number.isNaN(created.getTime())) return false;
  const generateMinute =
    parseMinuteOfDay(scope.generationLabel) ?? REPORT_GENERATE_MINUTE;
  return (
    todayStrVi(created) === todayStrVi(now) &&
    minuteOfDayVi(created) >= generateMinute
  );
}

/** "T2 T3 T4 T5 T6 T7" — liệt kê ngày báo cáo theo đúng thứ tự trong tuần. */
export function formatWeekdayList(weekdays: number[]): string {
  return [...weekdays]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_LABEL_VI[d])
    .filter(Boolean)
    .join(' ');
}

/**
 * 'HH:mm' → số phút từ 00:00. Trả `null` khi chuỗi không đọc được.
 *
 * Cần vì server trả bốn mốc dưới dạng NHÃN CHUỖI (`reminderLabel`,
 * `leaderSummaryLabel`…) chứ không phải số — muốn đổ ngược vào ô chọn giờ thì
 * phải parse. Chỉ `hardStopMinute` là có sẵn dạng số.
 */
export function parseMinuteOfDay(
  label: string | null | undefined,
): number | null {
  if (!label) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(label.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return h * 60 + mi;
}

export interface ReportScheduleDraft {
  /** Giờ nhắc người còn thiếu. */
  remindMinute: number;
  /** Giờ gửi tổng hợp. Chốt số liệu, KHÔNG chặn nộp — mốc chặn là `cutoffMinute` 23:00. */
  summaryMinute: number;
  /** Giờ khóa cứng. Mặc định 23:00; hiện chưa cho nhóm đổi. */
  cutoffMinute?: number;
  /**
   * Giờ sinh bản báo cáo của nhóm, phút từ 00:00 — đọc từ
   * `parseMinuteOfDay(scope.generationLabel)`. Chỉ dùng để DỰNG CÂU LỖI "không
   * nhắc trước HH:mm"; thiếu thì rơi về `REPORT_GENERATE_MINUTE`.
   */
  generateMinute?: number;
}

export interface ReportScheduleErrors {
  remind?: string;
  summary?: string;
}

/**
 * Kiểm lịch TRƯỚC khi gửi, bằng đúng ba luật của `assertValidSchedule` phía
 * server — chép luật sang đây để người dùng thấy lỗi ngay tại ô đang chỉnh,
 * thay vì ăn 422 với một câu chung chung sau khi đã bấm lưu.
 *
 * Người dùng nhập GIỜ nhắc; `reminderBeforeMinutes` mà server cần là hiệu số
 * `cutoff - remind`. Bắt trưởng nhóm tự trừ nhẩm "nhắc trước 3,5 giờ" rồi tự
 * suy ra 19:30 là chỗ bản cũ làm hỏng.
 */
export function validateReportSchedule(
  draft: ReportScheduleDraft,
): ReportScheduleErrors {
  const cutoff = draft.cutoffMinute ?? REPORT_CUTOFF_MINUTE;
  const generateMinute = draft.generateMinute ?? REPORT_GENERATE_MINUTE;
  const { remindMinute, summaryMinute } = draft;
  const err: ReportScheduleErrors = {};

  if (!Number.isFinite(remindMinute)) {
    err.remind = 'Chưa chọn giờ nhắc.';
  } else if (cutoff - remindMinute > REPORT_MAX_REMINDER_BEFORE) {
    err.remind =
      `Sớm nhất là ${formatMinuteOfDay(cutoff - REPORT_MAX_REMINDER_BEFORE)}` +
      ` — hệ thống chỉ mở cửa sổ nhắc trong vòng 12 giờ trước giờ khóa ` +
      `${formatMinuteOfDay(cutoff)}.`;
  } else if (remindMinute < generateMinute) {
    err.remind =
      `Không nhắc trước ${formatMinuteOfDay(generateMinute)} vì lúc đó` +
      ' bản báo cáo chưa tồn tại.';
  }

  if (!Number.isFinite(summaryMinute)) {
    err.summary = 'Chưa chọn giờ tổng hợp.';
  } else if (summaryMinute >= cutoff) {
    err.summary = `Phải trước giờ khóa ${formatMinuteOfDay(cutoff)}.`;
  } else if (Number.isFinite(remindMinute) && summaryMinute <= remindMinute) {
    err.summary =
      'Phải muộn hơn giờ nhắc — nhắc xong mới chốt được ai chưa nộp.';
  }

  return err;
}

/** Lịch hợp lệ thì đổi sang đúng bộ trường server chờ. */
export function toSchedulePayload(draft: ReportScheduleDraft): {
  reminderBeforeMinutes: number;
  leaderSummaryMinute: number;
} {
  const cutoff = draft.cutoffMinute ?? REPORT_CUTOFF_MINUTE;
  return {
    reminderBeforeMinutes: cutoff - draft.remindMinute,
    leaderSummaryMinute: draft.summaryMinute,
  };
}

// ── Lịch sử: gom dữ liệu theo ngày ──────────────────────────────────────────
//
// Toàn bộ phần dưới đây là HÀM THUẦN, cố ý tách khỏi component.
//
// Không phải để cho gọn: bản trước chôn logic này trong JSX, và chính ở đó có
// sáu lỗi khiến màn hình khẳng định sai — ô ngày tô "Đã nộp" khi mới nộp 1
// trong 3 bản, `REOPENED` bị đọc thành "chưa nộp", bản mở ra khi bấm phụ thuộc
// thứ tự mà server không hề đảm bảo. Không chỗ nào trong số đó test được.
// Tách ra thì mỗi luật trở thành một hàm gọi được từ test.
