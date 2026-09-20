import { Prisma } from '@prisma/client';
import {
  VN_UTC_OFFSET_MS,
  startOfVietnamDay,
} from '../../admin/technical-activities/technical-activity.helpers';

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYMMDD` của ngày VN chứa `now`. */
function vnDayString(now: Date): string {
  // `startOfVietnamDay` trả mốc 00:00 VN dưới dạng Date UTC; cộng lại offset thì
  // các thành phần getUTC* đọc ra đúng ngày theo lịch VN.
  const vn = new Date(startOfVietnamDay(now).getTime() + VN_UTC_OFFSET_MS);
  const yy = String(vn.getUTCFullYear()).slice(-2);
  const mm = String(vn.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(vn.getUTCDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

/**
 * Sinh mã công việc dạng `CV` + `YYMMDD` + `NNN`:
 *   - YYMMDD: ngày theo giờ VN (UTC+7)
 *   - NNN: số thứ tự 3 chữ số của việc tạo trong ngày đó
 *
 * Số thứ tự = số việc đã tạo trong cửa sổ ngày VN + 1. Đếm cả việc đã xoá mềm
 * vì `code` unique toàn cục, không bao giờ tái sử dụng. Khoảng giữa lúc đếm và
 * lúc insert vẫn có thể đụng nhau khi ghi đồng thời — lúc đó unique constraint
 * trên `code` bung ra P2002 và caller phải thử lại (xem `createTaskWithCode`).
 *
 * Quá 999 việc/ngày thì `padStart` nhả ra 4 chữ số, mã vẫn unique và vẫn sắp đúng.
 */
export async function generateTaskCode(
  db: Pick<Prisma.TransactionClient, 'businessFormTask'>,
  now: Date = new Date(),
): Promise<string> {
  const from = startOfVietnamDay(now);
  const to = new Date(from.getTime() + DAY_MS);
  const sameDayCount = await db.businessFormTask.count({
    where: { createdAt: { gte: from, lt: to } },
  });
  const seq = String(sameDayCount + 1).padStart(3, '0');
  return `CV${vnDayString(now)}${seq}`;
}
