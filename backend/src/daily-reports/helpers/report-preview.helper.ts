/**
 * Chọn câu trả lời dùng làm DÒNG XEM TRƯỚC của một bản báo cáo — dùng ở bảng
 * theo dõi nhóm, màn lịch sử và danh sách bản gần đây.
 *
 * Tách khỏi `daily-reports.service.ts` vì ba nơi gọi trước đây là ba bản sao của
 * cùng một phép `find`, và ba bản sao thì sớm muộn cũng lệch nhau.
 */

import { DailyReportQuestionKind } from '@prisma/client';

/**
 * Ưu tiên `done` — câu số 1 của bộ hiện hành, "Những việc đã hoàn thành".
 *
 * Nhánh rơi về `today` là BẮT BUỘC chứ không phải phòng xa: `questionKind` trên
 * `daily_report_answers` là BẢN CHỤP tại thời điểm sinh report, nên mọi bản nộp
 * từ 14/08 tới 25/08/2026 vĩnh viễn mang kind `today` và không có cách nào đổi
 * (sửa vào là viết lại lịch sử — xem `20260825010000_daily_report_four_questions_rework`).
 * Bỏ nhánh này đi thì toàn bộ lịch sử hiện dòng xem trước RỖNG, mà không lỗi nào
 * báo lên.
 */
export const pickPreviewAnswer = <
  T extends { questionKind: DailyReportQuestionKind },
>(
  answers: T[],
): T | undefined =>
  answers.find((a) => a.questionKind === DailyReportQuestionKind.done) ??
  answers.find((a) => a.questionKind === DailyReportQuestionKind.today);
