/**
 * Ranh giới ngày cho Báo cáo hằng ngày — MỌI tính toán ngày của tính năng này
 * (auto-draft, cron sinh bản, tính nộp trễ) đều phải đi qua file này để không
 * bao giờ có hai nơi tính lệch nhau (docs 05 mục 2).
 *
 * Máy chủ chạy UTC; múi giờ nghiệp vụ mặc định Asia/Ho_Chi_Minh (UTC+7, không
 * có giờ mùa hè). Dùng Intl để không phụ thuộc thư viện timezone ngoài.
 */

import {
  DAILY_REPORT_GENERATE_MINUTE,
  DAILY_REPORT_HARD_STOP_MINUTE,
} from '../constants/daily-report.constants';

export const DEFAULT_REPORT_TIMEZONE = 'Asia/Ho_Chi_Minh';

/** 'YYYY-MM-DD' của một thời điểm theo múi giờ cho trước. */
export function dayStrInTz(
  instant: Date,
  timezone: string = DEFAULT_REPORT_TIMEZONE,
): string {
  // en-CA cho ra đúng định dạng YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** Số phút đã trôi từ 00:00 của ngày địa phương (so với cutoffMinute). */
export function minutesOfDayInTz(
  instant: Date,
  timezone: string = DEFAULT_REPORT_TIMEZONE,
): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

/**
 * Thứ trong tuần ISO-8601 (1 = thứ Hai … 7 = Chủ nhật) của một thời điểm theo
 * múi giờ cho trước — dùng để khớp DailyReportScope.weekdays.
 */
export function isoWeekdayInTz(
  instant: Date,
  timezone: string = DEFAULT_REPORT_TIMEZONE,
): number {
  const dayStr = dayStrInTz(instant, timezone);
  // Ngày UTC cùng nhãn → getUTCDay ổn định, không lệch bởi giờ địa phương máy chủ.
  const utcDay = new Date(`${dayStr}T00:00:00.000Z`).getUTCDay(); // 0=CN…6=T7
  return utcDay === 0 ? 7 : utcDay;
}

/**
 * Mốc chụp ảnh nghĩa vụ cố định 07:30 theo timezone của scope, quy về `Date`
 * tuyệt đối. Dò offset tại chính ngày đang xét để vẫn đúng với vùng có DST.
 */
export function snapshotInstant(
  dayStr: string,
  scope: { timezone: string },
): Date {
  assertDayStr(dayStr);
  const naiveUtc =
    new Date(`${dayStr}T00:00:00.000Z`).getTime() +
    DAILY_REPORT_GENERATE_MINUTE * 60_000;
  // Offset của timezone tại chính mốc đó: chênh lệch giữa giờ địa phương và UTC.
  const probe = new Date(naiveUtc);
  const localMinutes = minutesOfDayInTz(probe, scope.timezone);
  const utcMinutes = probe.getUTCHours() * 60 + probe.getUTCMinutes();
  let offset = localMinutes - utcMinutes;
  // Chuẩn hoá khi hai bên rơi khác ngày (offset thực nằm trong ±14 giờ).
  if (offset > 12 * 60) offset -= 24 * 60;
  if (offset < -12 * 60) offset += 24 * 60;
  return new Date(naiveUtc - offset * 60_000);
}

/**
 * Giá trị lưu vào cột `reportDate` (@db.Date): mốc 00:00 UTC mang nhãn ngày đó.
 * Cột DATE của Postgres chỉ giữ nhãn ngày nên unique hoạt động đúng.
 */
export function reportDateValue(dayStr: string): Date {
  assertDayStr(dayStr);
  return new Date(`${dayStr}T00:00:00.000Z`);
}

/** Lấy lại nhãn 'YYYY-MM-DD' từ giá trị cột reportDate. */
export function reportDateLabel(reportDate: Date): string {
  return reportDate.toISOString().slice(0, 10);
}

/**
 * Khoảng UTC [start, end) của MỘT ngày địa phương — nền của mọi truy vấn
 * auto-draft ("hôm nay", "ngày mai").
 *
 * Cách tính không cần thư viện: offset của múi giờ tại thời điểm đó suy ra từ
 * chênh lệch giữa nhãn giờ địa phương và nhãn giờ UTC của cùng một instant.
 * VN cố định UTC+7 nên vòng lặp hội tụ ngay lần đầu.
 */
export function dayBoundsUtc(
  dayStr: string,
  timezone: string = DEFAULT_REPORT_TIMEZONE,
): { start: Date; end: Date } {
  assertDayStr(dayStr);
  const start = zonedMidnightUtc(dayStr, timezone);
  const nextDay = addDays(dayStr, 1);
  const end = zonedMidnightUtc(nextDay, timezone);
  return { start, end };
}

/** Cộng n ngày vào nhãn 'YYYY-MM-DD' (số học UTC thuần, không dính múi giờ). */
export function addDays(dayStr: string, n: number): string {
  assertDayStr(dayStr);
  const d = new Date(`${dayStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Reminder chỉ hợp lệ từ đúng mốc nhắc đến ngay trước cutoff. */
export function isReminderWindow(
  instant: Date,
  timezone: string,
  cutoffMinute: number,
  reminderBeforeMinutes: number,
): boolean {
  const minute = minutesOfDayInTz(instant, timezone);
  return (
    minute >= cutoffMinute - reminderBeforeMinutes && minute < cutoffMinute
  );
}

/** Leader summary bắt đầu từ mốc cấu hình riêng của scope. */
export function isLeaderSummaryDue(
  instant: Date,
  timezone: string,
  leaderSummaryMinute: number,
): boolean {
  return minutesOfDayInTz(instant, timezone) >= leaderSummaryMinute;
}

/** Report ngày cũ hoặc report hôm nay từ đúng cutoff của scope trở đi read-only. */
export function isReportLockedAt(
  reportDay: string,
  instant: Date,
  timezone: string,
  cutoffMinute: number = DAILY_REPORT_HARD_STOP_MINUTE,
): boolean {
  assertDayStr(reportDay);
  const today = dayStrInTz(instant, timezone);
  if (today > reportDay) return true;
  if (today < reportDay) return false;
  return minutesOfDayInTz(instant, timezone) >= cutoffMinute;
}

/** Thứ ISO (1 = thứ Hai … 7 = Chủ nhật) của một nhãn 'YYYY-MM-DD'. */
export function isoWeekdayOfDayStr(dayStr: string): number {
  assertDayStr(dayStr);
  const weekday = reportDateValue(dayStr).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

/**
 * Ngày làm việc kế tiếp SAU `dayStr`, theo `weekdays` của phạm vi.
 *
 * "Ngày làm việc" là `scope.weekdays`, KHÔNG tính ngày lễ Việt Nam - hệ thống
 * không có holiday calendar.
 */
export function nextWorkingDate(dayStr: string, weekdays: number[]): string {
  assertDayStr(dayStr);
  if (weekdays.length === 0) {
    throw new Error('Phạm vi không có ngày làm việc nào');
  }
  let candidate = addDays(dayStr, 1);
  // Tối đa 7 bước là chạm mọi thứ trong tuần; vòng lặp không thể chạy mãi.
  for (let step = 0; step < 7; step += 1) {
    if (weekdays.includes(isoWeekdayOfDayStr(candidate))) return candidate;
    candidate = addDays(candidate, 1);
  }
  throw new Error('Không tìm được ngày làm việc kế tiếp');
}

/** Instant UTC của phút thứ `minute` trong ngày `dayStr` theo `timezone`. */
export function minuteOfDayInstant(
  dayStr: string,
  minute: number,
  timezone: string = DEFAULT_REPORT_TIMEZONE,
): Date {
  assertDayStr(dayStr);
  return new Date(
    zonedMidnightUtc(dayStr, timezone).getTime() + minute * 60_000,
  );
}

/**
 * Hạn duyệt của MỘT lần nộp: cutoff của ngày làm việc thứ N, đếm từ
 * `submittedAt`, trong đó **ngày nộp là ngày thứ 1**.
 *
 * ⚠ Hàm này chỉ được gọi ở đường SUBMIT, và kết quả ghi vào
 * `DailyReportRevision.reviewDeadlineAt`. Mọi đường đọc phải đọc cột đó chứ
 * KHÔNG gọi lại hàm này: `reviewWindowDays` đổi được bất cứ lúc nào, nên tính
 * lại lúc đọc sẽ kéo dài hạn của mọi báo cáo đang chờ duyệt khi ai đó sửa 3
 * thành 5, và giết hàng loạt vòng duyệt đang chạy khi sửa ngược lại.
 * Thiết kế: docs/features/task-management/20-vong-duyet-bao-cao.md mục 6.5.
 *
 * Ví dụ N = 3, nộp thứ Sáu: thứ Sáu là ngày 1, thứ Hai ngày 2, thứ Ba ngày 3,
 * hết hạn cuối thứ Ba. N = 1 thì hết hạn ngay cuối ngày nộp.
 */
export function reviewDeadlineAt(
  submittedAt: Date,
  scope: {
    weekdays: number[];
    timezone: string;
    cutoffMinute: number;
    reviewWindowDays: number;
  },
): Date {
  const windowDays = Math.max(1, scope.reviewWindowDays);
  // Ngày nộp luôn là ngày thứ 1, kể cả khi nó rơi vào ngày nghỉ của phạm vi:
  // đó là ngày người duyệt thực sự nhận được bài.
  let day = dayStrInTz(submittedAt, scope.timezone);
  for (let counted = 1; counted < windowDays; counted += 1) {
    day = nextWorkingDate(day, scope.weekdays);
  }
  return minuteOfDayInstant(day, scope.cutoffMinute, scope.timezone);
}

/** Instant UTC ứng với 00:00 địa phương của dayStr trong timezone. */
function zonedMidnightUtc(dayStr: string, timezone: string): Date {
  // Đoán ban đầu: 00:00 UTC, rồi hiệu chỉnh bằng offset thực tế của timezone.
  let guess = new Date(`${dayStr}T00:00:00.000Z`);
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(guess);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
    const localAsUtc = new Date(
      `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}.000Z`,
    );
    const target = new Date(`${dayStr}T00:00:00.000Z`);
    const diffMs = localAsUtc.getTime() - target.getTime();
    if (diffMs === 0) return guess;
    guess = new Date(guess.getTime() - diffMs);
  }
  return guess;
}

function assertDayStr(dayStr: string): void {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(dayStr)
    ? new Date(`${dayStr}T00:00:00.000Z`)
    : null;
  if (
    !parsed ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== dayStr
  ) {
    throw new Error(`Nhãn ngày không hợp lệ: ${dayStr} (cần YYYY-MM-DD)`);
  }
}
