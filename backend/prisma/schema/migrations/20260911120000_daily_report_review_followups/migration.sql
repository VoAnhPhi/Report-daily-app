-- Vòng duyệt báo cáo ngày: phần bổ sung sau lượt soát QA/UX ngày 11/09/2026.
-- Thiết kế: docs/features/task-management/20-vong-duyet-bao-cao.md
--
-- 1. Index cho hai cột FK của bảng carry. Postgres không tự tạo index cho cột
--    FK, nên mỗi review bị xoá (cron dọn phạm vi lưu trữ quá hạn xoá cascade
--    xuống review) là một lượt quét cả bảng cho ON DELETE CASCADE ("reviewId")
--    và một lượt nữa cho ON DELETE SET NULL ("confirmedByReviewId").
-- 2. Loại thông báo mới: trưởng nhóm giao người duyệt phụ phụ trách thành viên.
--    Trước đây phân công không gửi gì, người được giao chỉ biết khi có bản nộp.
--
-- Toàn bộ file idempotent: chạy lại lần hai là no-op (acta-db-safety mục 2).
-- Postgres 15 cho `ALTER TYPE ... ADD VALUE` chạy trong transaction, miễn là
-- giá trị mới không được DÙNG trong cùng transaction - file này không dùng.

CREATE INDEX IF NOT EXISTS "daily_report_carry_overs_reviewId_idx"
  ON "daily_report_carry_overs" ("reviewId");

CREATE INDEX IF NOT EXISTS "daily_report_carry_overs_confirmedByReviewId_idx"
  ON "daily_report_carry_overs" ("confirmedByReviewId");

ALTER TYPE "DailyReportOutboxKind" ADD VALUE IF NOT EXISTS 'REVIEWER_ASSIGNED';

ALTER TYPE "NotificationAction" ADD VALUE IF NOT EXISTS 'daily_report_reviewer_assigned';
