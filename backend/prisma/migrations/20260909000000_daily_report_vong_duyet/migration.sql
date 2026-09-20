-- Vòng duyệt báo cáo ngày và carry-over công việc.
-- Thiết kế: docs/features/task-management/20-vong-duyet-bao-cao.md
-- Plan: plans/260908-1126-vong-duyet-bao-cao-ngay/phase-01-nen-du-lieu-va-phan-quyen.md
--
-- Toàn bộ file này idempotent: chạy lại lần hai là no-op (acta-db-safety mục 2).

-- 1. Enum -------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DailyReportReviewDecision') THEN
    CREATE TYPE "DailyReportReviewDecision" AS ENUM ('ACCEPTED', 'CONTINUED', 'REJECTED'); -- idempotency-ok: guarded
  END IF;
END
$$;

ALTER TYPE "DailyReportOutboxKind" ADD VALUE IF NOT EXISTS 'REPORT_ACCEPTED';
ALTER TYPE "DailyReportOutboxKind" ADD VALUE IF NOT EXISTS 'REPORT_CONTINUED';
ALTER TYPE "DailyReportOutboxKind" ADD VALUE IF NOT EXISTS 'REPORT_REJECTED';
ALTER TYPE "DailyReportOutboxKind" ADD VALUE IF NOT EXISTS 'REVIEWER_PENDING_REVIEW_SUMMARY';

-- Hành động hiển thị trong trung tâm thông báo.
ALTER TYPE "NotificationAction" ADD VALUE IF NOT EXISTS 'daily_report_accepted';
ALTER TYPE "NotificationAction" ADD VALUE IF NOT EXISTS 'daily_report_continued';
ALTER TYPE "NotificationAction" ADD VALUE IF NOT EXISTS 'daily_report_rejected';
ALTER TYPE "NotificationAction" ADD VALUE IF NOT EXISTS 'daily_report_pending_review';

-- 2. Mười cột thêm vào ba bảng có sẵn ----------------------------------------

-- Cấu hình cửa sổ duyệt. Đổi giá trị chỉ áp cho lần nộp SAU đó.
ALTER TABLE "daily_report_scopes"
  ADD COLUMN IF NOT EXISTS "reviewWindowDays" INTEGER NOT NULL DEFAULT 3;

-- Nguồn sự thật của vòng duyệt: hạn và mốc đóng gắn với TỪNG LẦN NỘP.
ALTER TABLE "daily_report_revisions"
  ADD COLUMN IF NOT EXISTS "reviewDeadlineAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewExpiredAt"  TIMESTAMP(3);

-- Bản denormalize của revision mới nhất.
ALTER TABLE "daily_reports"
  ADD COLUMN IF NOT EXISTS "reviewDecision"         "DailyReportReviewDecision",
  ADD COLUMN IF NOT EXISTS "reviewedById"           TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedAt"             TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewedRevisionNumber" INTEGER,
  ADD COLUMN IF NOT EXISTS "editableUntil"          TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewExpiredAt"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewDeadlineAt"       TIMESTAMP(3);

-- Cron quét báo cáo hết cửa sổ duyệt.
CREATE INDEX IF NOT EXISTS "daily_reports_reviewDeadlineAt_idx"
  ON "daily_reports" ("reviewDeadlineAt");

-- 3. Ba bảng mới -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "daily_report_reviews" (
  "id"         TEXT NOT NULL,
  "reportId"   TEXT NOT NULL,
  "revisionId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "decision"   "DailyReportReviewDecision" NOT NULL,
  "comment"    TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "daily_report_reviews_pkey" PRIMARY KEY ("id")
);

-- Một revision chỉ có đúng một review: thứ chốt race giữa nhiều người duyệt.
CREATE UNIQUE INDEX IF NOT EXISTS "daily_report_reviews_revisionId_key"
  ON "daily_report_reviews" ("revisionId");
CREATE INDEX IF NOT EXISTS "daily_report_reviews_reportId_createdAt_idx"
  ON "daily_report_reviews" ("reportId", "createdAt");
CREATE INDEX IF NOT EXISTS "daily_report_reviews_reviewerId_createdAt_idx"
  ON "daily_report_reviews" ("reviewerId", "createdAt");

CREATE TABLE IF NOT EXISTS "daily_report_carry_overs" (
  "id"           TEXT NOT NULL,
  "chainId"      TEXT NOT NULL,
  "fromReportId" TEXT NOT NULL,
  "toReportDate" DATE NOT NULL,
  "reviewId"     TEXT,
  "taskId"       TEXT,
  "note"         TEXT,
  "createdById"  TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelledAt"  TIMESTAMP(3),

  CONSTRAINT "daily_report_carry_overs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "daily_report_carry_overs_fromReportId_idx"
  ON "daily_report_carry_overs" ("fromReportId");
CREATE INDEX IF NOT EXISTS "daily_report_carry_overs_toReportDate_cancelledAt_idx"
  ON "daily_report_carry_overs" ("toReportDate", "cancelledAt");
CREATE INDEX IF NOT EXISTS "daily_report_carry_overs_taskId_toReportDate_idx"
  ON "daily_report_carry_overs" ("taskId", "toReportDate");
CREATE INDEX IF NOT EXISTS "daily_report_carry_overs_chainId_toReportDate_idx"
  ON "daily_report_carry_overs" ("chainId", "toReportDate");

CREATE TABLE IF NOT EXISTS "daily_report_reviewer_assignments" (
  "scopeId"      TEXT NOT NULL,
  "reviewerId"   TEXT NOT NULL,
  "memberId"     TEXT NOT NULL,
  "assignedById" TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "daily_report_reviewer_assignments_pkey"
    PRIMARY KEY ("scopeId", "reviewerId", "memberId")
);

CREATE INDEX IF NOT EXISTS "daily_report_reviewer_assignments_scopeId_memberId_idx"
  ON "daily_report_reviewer_assignments" ("scopeId", "memberId");
CREATE INDEX IF NOT EXISTS "daily_report_reviewer_assignments_reviewerId_idx"
  ON "daily_report_reviewer_assignments" ("reviewerId");

-- 4. Hai ràng buộc Prisma không diễn đạt được --------------------------------

-- Không đẩy cùng một task hai lần từ cùng một báo cáo.
CREATE UNIQUE INDEX IF NOT EXISTS "daily_report_carry_overs_from_task_key"
  ON "daily_report_carry_overs" ("fromReportId", "taskId")
  WHERE "taskId" IS NOT NULL AND "cancelledAt" IS NULL;

-- Không đẩy cùng một CHUỖI hai lần từ cùng một báo cáo. Ràng buộc này áp được
-- cho cả việc gõ tay, thứ mà index trên không với tới vì taskId là NULL.
CREATE UNIQUE INDEX IF NOT EXISTS "daily_report_carry_overs_from_chain_key"
  ON "daily_report_carry_overs" ("fromReportId", "chainId")
  WHERE "cancelledAt" IS NULL;

-- 5. Khóa ngoại. Postgres không có IF NOT EXISTS cho ADD CONSTRAINT ----------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_report_reviews_reportId_fkey'
  ) THEN
    ALTER TABLE "daily_report_reviews"
      ADD CONSTRAINT "daily_report_reviews_reportId_fkey" -- idempotency-ok: guarded DO-block
      FOREIGN KEY ("reportId") REFERENCES "daily_reports"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_report_reviews_revisionId_fkey'
  ) THEN
    ALTER TABLE "daily_report_reviews"
      ADD CONSTRAINT "daily_report_reviews_revisionId_fkey" -- idempotency-ok: guarded DO-block
      FOREIGN KEY ("revisionId") REFERENCES "daily_report_revisions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_report_carry_overs_fromReportId_fkey'
  ) THEN
    ALTER TABLE "daily_report_carry_overs"
      ADD CONSTRAINT "daily_report_carry_overs_fromReportId_fkey" -- idempotency-ok: guarded DO-block
      FOREIGN KEY ("fromReportId") REFERENCES "daily_reports"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- Cascade chứ KHÔNG phải SetNull: reviewId là thứ phân biệt nguồn gốc dòng
  -- carry, SetNull làm nó âm thầm mất nghĩa.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_report_carry_overs_reviewId_fkey'
  ) THEN
    ALTER TABLE "daily_report_carry_overs"
      ADD CONSTRAINT "daily_report_carry_overs_reviewId_fkey" -- idempotency-ok: guarded DO-block
      FOREIGN KEY ("reviewId") REFERENCES "daily_report_reviews"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_report_reviewer_assignments_scopeId_fkey'
  ) THEN
    ALTER TABLE "daily_report_reviewer_assignments"
      ADD CONSTRAINT "daily_report_reviewer_assignments_scopeId_fkey" -- idempotency-ok: guarded DO-block
      FOREIGN KEY ("scopeId") REFERENCES "daily_report_scopes"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
