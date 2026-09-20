/**
 * Định dạng ngày/giờ tiếng Việt và số học lịch trên chuỗi `YYYY-MM-DD`.
 *
 * Mọi phép "bây giờ" đều đi qua múi giờ nghiệp vụ chứ không dùng giờ máy —
 * lệch múi giờ là cách chắc chắn nhất để một bản báo cáo nhảy sang ngày khác.
 */

import {
  MAX_HISTORY_RANGE_DAYS,
  REPORT_TIMEZONE,
} from './constants';

/** 'YYYY-MM-DD' → 'DD/MM/YYYY'. */
export function formatDateVi(dayStr: string): string {
  const [y, m, d] = String(dayStr ?? '').split('-');
  // Chuỗi hỏng thì trả rỗng, KHÔNG ghép ra 'undefined/undefined/undefined' —
  // chuỗi đó từng chảy thẳng vào nhãn trợ năng của ô lịch.
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

/** '17/08' — dạng ngắn cho hàng ngày, nơi năm đã hiển thị ở tiêu đề tháng. */
export function formatDayMonthVi(dayStr: string): string {
  const [, m, d] = String(dayStr ?? '').split('-');
  if (!m || !d) return '';
  return `${d}/${m}`;
}

/** ISO → 'HH:mm' theo giờ Việt Nam. Chuỗi rỗng khi không có mốc thời gian. */
export function formatTimeVi(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: REPORT_TIMEZONE,
  });
}

/**
 * Khoảng trắng KHÔNG NGẮT DÒNG giữa giờ và ngày: "23:00" và "17/09" là một mốc,
 * xuống dòng giữa hai nửa là người đọc thấy thành hai thông tin (dải trạng thái
 * ở 320px, đo 15/09/2026).
 */
const TIME_DAY_SEPARATOR = ' ';

/**
 * Mốc HẠN ISO → 'HH:mm dd/MM' theo giờ Việt Nam.
 *
 * Hạn duyệt và hạn nộp lại hầu như không rơi vào hôm nay: hạn nộp lại là giờ
 * khoá của ngày làm việc kế tiếp, hạn duyệt là ngày thứ N của cửa sổ. In riêng
 * giờ như `formatTimeVi` là để người đọc hiểu "23:00" thành 23:00 hôm nay.
 */
export function formatDeadlineVi(iso: string | null | undefined): string {
  if (!iso) return '';
  // Ngày lấy qua `todayStrVi` (khuôn `YYYY-MM-DD` theo giờ nghiệp vụ) rồi
  // `formatDayMonthVi`, không qua `vi-VN` của ICU: bản ICU của Chrome in riêng
  // ngày + tháng thành "10-09" chứ không phải "10/09" (đo ngày 10/09/2026).
  return `${formatTimeVi(iso)}${TIME_DAY_SEPARATOR}${formatDayMonthVi(todayStrVi(new Date(iso)))}`;
}

/**
 * Giờ của một mốc ISO, KÈM NGÀY khi mốc đó rơi vào ngày khác `dayStr`.
 *
 * "Đã nộp lúc 08:15" trên bản của ngày 09/09 mà thật ra nộp lại sáng 10/09 là
 * nói sai ngày bằng cách không nói gì - nộp lại sau khi bị trả lại gần như luôn
 * rơi sang ngày làm việc kế tiếp.
 */
export function formatTimeOnDayVi(
  iso: string | null | undefined,
  dayStr: string,
): string {
  if (!iso) return '';
  const day = todayStrVi(new Date(iso));
  return day === dayStr
    ? formatTimeVi(iso)
    : `${formatTimeVi(iso)}${TIME_DAY_SEPARATOR}${formatDayMonthVi(day)}`;
}

/** Phút từ 00:00 → 'HH:mm'. */
export function formatMinuteOfDay(minute: number): string {
  const h = Math.floor(minute / 60)
    .toString()
    .padStart(2, '0');
  const m = (minute % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** 1 = thứ Hai … 7 = Chủ nhật (ISO-8601). */
export const WEEKDAY_LABEL_VI: Record<number, string> = {
  1: 'T2',
  2: 'T3',
  3: 'T4',
  4: 'T5',
  5: 'T6',
  6: 'T7',
  7: 'CN',
};

/**
 * Hôm nay dạng `YYYY-MM-DD` **theo giờ Việt Nam**, không theo giờ máy.
 *
 * `toISOString().slice(0,10)` là bẫy quen thuộc: nó cắt theo UTC, nên từ 00:00
 * tới 07:00 giờ VN nó trả về ngày hôm trước. Ngày báo cáo do server chốt theo
 * `scope.timezone`, hỏi sai ngày là lệch nguyên một hàng dữ liệu.
 */
export function todayStrVi(now: Date = new Date()): string {
  // `en-CA` cho ra đúng khuôn `YYYY-MM-DD`.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Tách 'YYYY-MM-DD' thành ba số. Trả `null` khi chuỗi không đọc được.
 *
 * Có hàm này vì mọi hàm ngày bên dưới đều từng tin tưởng đầu vào một cách mù
 * quáng: `Number('bậy')` cho `NaN`, `Date.UTC(NaN, …)` cho `Invalid Date`, và
 * `.toISOString()` trên đó NÉM `RangeError`. Một chuỗi ngày hỏng — từ URL, từ
 * dữ liệu cũ, từ một API đổi khuôn — vì thế làm sập cả cây render thay vì
 * hiện một màn rỗng.
 */
function parseDayStr(dayStr: string): [number, number, number] | null {
  if (typeof dayStr !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayStr.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return [y, mo, d];
}

/**
 * Dịch một chuỗi ngày `YYYY-MM-DD` đi `delta` ngày (âm = lùi).
 *
 * Chuỗi hỏng thì trả lại NGUYÊN chuỗi đó, không ném lỗi: nơi gọi là vòng lặp
 * dựng lịch, ném ở đây nghĩa là mất trắng cả màn.
 */
export function shiftDayStr(dayStr: string, delta: number): string {
  const parts = parseDayStr(dayStr);
  if (!parts) return dayStr;
  const [y, m, d] = parts;
  // Dựng ở UTC rồi cộng ngày: không dính DST, và VN vốn không có DST.
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + delta);
  return base.toISOString().slice(0, 10);
}

/**
 * Thứ ISO (1 = T2 … 7 = CN) của MỘT CHUỖI NGÀY `YYYY-MM-DD`.
 *
 * Khác `isoWeekdayVi` ở chỗ nhận ngày dương lịch thuần chứ không nhận thời
 * điểm: chuỗi ngày không mang giờ nên không có gì để quy đổi múi giờ, đọc
 * thẳng ở UTC là đúng. Đưa chuỗi này qua `new Date('2026-08-19')` rồi hỏi
 * `getDay()` mới là chỗ sai — trình duyệt hiểu nó là nửa đêm UTC rồi trả về
 * thứ theo giờ máy, nên máy ở múi âm sẽ lùi một ngày.
 */
export function isoWeekdayOfDayStr(dayStr: string): number {
  const parts = parseDayStr(dayStr);
  if (!parts) return 1;
  const [y, m, d] = parts;
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 ? 7 : dow;
}

/** 'YYYY-MM-DD' → 'Tháng 8/2026'. Dùng cho tiêu đề mỗi khối lịch. */
export function monthLabelVi(dayStr: string): string {
  const parts = parseDayStr(dayStr);
  if (!parts) return '';
  return `Tháng ${parts[1]}/${parts[0]}`;
}

/** Nhãn tháng từ cặp số, cho thanh điều hướng không có chuỗi ngày trong tay. */
export function monthLabelViOf(year: number, month: number): string {
  return `Tháng ${month}/${year}`;
}

/** Dịch cặp (năm, tháng) đi `delta` tháng. `month` là 1–12, không phải 0–11. */
export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  // Quy về chỉ số tháng tuyệt đối rồi chia lại — tránh tự xử lý tràn 12/1.
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/**
 * Khoảng ngày của MỘT tháng, đã kẹp ở hôm nay.
 *
 * Kẹp `to` vì hỏi API tới ngày cuối tháng của tháng hiện tại là hỏi cả những
 * ngày CHƯA TỚI. Server không có bản cho chúng, và lịch sẽ vẽ chúng thành ô
 * "không có bản báo cáo" — một khẳng định vô nghĩa về tương lai.
 *
 * Trả `null` khi cả tháng nằm sau hôm nay: nơi gọi dùng đó làm tín hiệu để
 * KHÔNG gọi API, thay vì gọi một khoảng ngược (from > to) rồi ăn 422.
 */
export function monthRange(
  year: number,
  month: number,
  today: string = todayStrVi(),
): { from: string; to: string } | null {
  const p = (n: number) => String(n).padStart(2, '0');
  const from = `${year}-${p(month)}-01`;
  // Ngày 0 của tháng KẾ TIẾP = ngày cuối của tháng này, có tính năm nhuận.
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = `${year}-${p(month)}-${p(lastDayOfMonth)}`;

  if (from > today) return null;
  return { from, to: to > today ? today : to };
}

/**
 * Liệt kê MỌI ngày trong khoảng, cũ nhất trước.
 *
 * Lịch sử báo cáo phải vẽ được cả những ngày KHÔNG có bản nào — đó chính là
 * thông tin người dùng cần ("hôm đó tôi có nộp không"). Danh sách trả về từ
 * API chỉ chứa ngày CÓ bản, nên phải tự dựng dải ngày rồi mới ghép dữ liệu
 * vào; ngày không ghép được thì bỏ trống, KHÔNG kết luận là chưa nộp — có thể
 * hôm đó nhóm không có lịch báo cáo, hoặc người dùng chưa ở trong nhóm.
 */
export function listDayStrs(from: string, to: string): string[] {
  const out: string[] = [];
  const total = daysBetweenInclusive(from, to);
  if (total <= 0) return out;
  for (let i = 0; i < total; i++) out.push(shiftDayStr(from, i));
  return out;
}

/** Thứ ISO (1 = T2 … 7 = CN) của một thời điểm, theo giờ Việt Nam. */
export function isoWeekdayVi(now: Date = new Date()): number {
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone: REPORT_TIMEZONE,
    weekday: 'short',
  }).format(now);
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[short] ?? 1;
}

/** Phút từ 00:00 của một thời điểm, theo giờ Việt Nam. */
export function minuteOfDayVi(now: Date = new Date()): number {
  const [h, m] = new Intl.DateTimeFormat('en-GB', {
    timeZone: REPORT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(now)
    .split(':');
  return Number(h) * 60 + Number(m);
}

/** Số ngày inclusive giữa hai chuỗi 'YYYY-MM-DD'. */
export function daysBetweenInclusive(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.floor((b - a) / 86_400_000) + 1;
}

/** Khoảng hợp lệ để gọi API lịch sử — chặn trước khi BE trả 422. */
export function isHistoryRangeValid(from: string, to: string): boolean {
  const days = daysBetweenInclusive(from, to);
  return days > 0 && days <= MAX_HISTORY_RANGE_DAYS;
}

// ── Điều hướng theo nhóm ────────────────────────────────────────────────────
