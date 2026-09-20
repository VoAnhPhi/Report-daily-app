/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  BIÊN NGÀY VIỆT NAM — một phép tính duy nhất cho cả hệ                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Việt Nam KHÔNG có giờ mùa hè, nên một độ lệch cố định `+07:00` là đủ và an
 * toàn cho mọi phép cắt ngày. Không cần thư viện múi giờ nào.
 *
 * ⚠ Trước đây phép tính này nằm ở `src/admin/technical-activities/technical-activity.helpers.ts`
 * và được KTV, bảng xếp hạng video, wallet-reset, bug-reports dùng chung. Nó
 * được chuyển về đây vì `src/common/**` nằm trong `.split/shared-base.manifest`
 * (tệp `*.helpers.ts` SỐ NHIỀU thì không khớp manifest — bản ở workers đang phải
 * mirror tay). Tệp cũ nay chỉ xuất lại từ đây; đừng chép một bản thứ hai ở đâu
 * nữa, hai phép tính ngày song song là hai kết quả lệch nhau chờ sẵn.
 */

/** Việt Nam không có DST — độ lệch cố định `+07:00` an toàn cho biên ngày. */
export const VN_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Số thứ tự ngày lịch Việt Nam của một thời điểm. Dùng nội bộ tệp này. */
function vietnamDayIndex(at: Date): number {
  return Math.floor((at.getTime() + VN_UTC_OFFSET_MS) / DAY_MS);
}

/**
 * THỜI ĐIỂM nửa đêm giờ Việt Nam, trả về dưới dạng `Date` UTC.
 *
 * Dùng để so sánh với các cột `DateTime` (ví dụ `checkInAt`, `createdAt`):
 * `where: { createdAt: { gte: startOfVietnamDay(now) } }`.
 *
 * ⚠ ĐỪNG ghi giá trị này vào một cột `@db.Date`. Nửa đêm VN là 17:00 UTC của
 * NGÀY HÔM TRƯỚC, nên Postgres sẽ lưu lùi đúng một ngày. Cột chỉ-ngày cần
 * `vietnamDateOnly()` bên dưới.
 */
export function startOfVietnamDay(now: Date, daysBack = 0): Date {
  return new Date((vietnamDayIndex(now) - daysBack) * DAY_MS - VN_UTC_OFFSET_MS);
}

/**
 * NGÀY LỊCH Việt Nam của một thời điểm, dưới dạng nửa đêm UTC.
 *
 * Đây là giá trị dành cho cột `@db.Date`: Postgres cắt phần giờ theo UTC, nên
 * nửa đêm UTC của ngày N sẽ được lưu đúng bằng ngày N.
 *
 * Ví dụ, một lượt lúc 22:00 giờ VN ngày 07/09 (tức 15:00 UTC ngày 07/09):
 *   startOfVietnamDay → 2026-09-06T17:00:00Z ⇒ cột `@db.Date` lưu **06/09** ✗
 *   vietnamDateOnly   → 2026-09-07T00:00:00Z ⇒ cột `@db.Date` lưu **07/09** ✓
 */
export function vietnamDateOnly(at: Date, daysBack = 0): Date {
  return new Date((vietnamDayIndex(at) - daysBack) * DAY_MS);
}

/** Chênh lệch giữa hai NGÀY LỊCH Việt Nam, tính bằng số ngày. */
export function vietnamDaysBetween(earlier: Date, later: Date): number {
  return vietnamDayIndex(later) - vietnamDayIndex(earlier);
}
