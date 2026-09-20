-- Member tự kéo việc sang ngày làm việc kế tiếp (phase 05, phương án A).
-- Thiết kế: docs/features/task-management/20-vong-duyet-bao-cao.md mục 18
-- Plan: plans/260908-1126-vong-duyet-bao-cao-ngay/phase-05-backlog-member-tu-carry.md
--
-- Người duyệt chọn "Tiếp tục thực hiện" cho một việc member đã tự kéo thì XÁC
-- NHẬN dòng của member, không tạo dòng thứ hai (dòng thứ hai vỡ partial unique
-- `(fromReportId, taskId) WHERE cancelledAt IS NULL`). Lượt xác nhận ghi vào cột
-- riêng để `reviewId != null` giữ nguyên nghĩa "dòng do người duyệt tạo".
--
-- Toàn bộ file này idempotent: chạy lại lần hai là no-op (acta-db-safety mục 2).

ALTER TABLE "daily_report_carry_overs"
  ADD COLUMN IF NOT EXISTS "confirmedByReviewId" TEXT;

DO $$
BEGIN
  -- SetNull chứ không Cascade: mất một lần xác nhận không được kéo theo mất ý
  -- định của member.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_report_carry_overs_confirmedByReviewId_fkey'
  ) THEN
    ALTER TABLE "daily_report_carry_overs"
      ADD CONSTRAINT "daily_report_carry_overs_confirmedByReviewId_fkey" -- idempotency-ok: guarded DO-block
      FOREIGN KEY ("confirmedByReviewId") REFERENCES "daily_report_reviews"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
