-- Sổ dấu "đã gửi" của cron cảnh báo reset ví (idempotent + audit).
--
-- Khoá dedup: (userId, resetMonth, milestone, channel) — mỗi người nhận mỗi mốc
-- mỗi tháng mỗi kênh tối đa một lần. Bảng chỉ ghi lần gửi THÀNH CÔNG; người gửi
-- lỗi không có dòng nên tự được thử lại lần quét sau (phục hồi lỡ nhịp).
--
-- Không FK tới "users" (tiền lệ bảng nhật ký ở repo này) — giữ dấu vết kể cả khi
-- tài khoản bị xoá. Tên index ghim tường minh để dưới 63 ký tự và khớp Prisma.
--
-- Idempotent (IF NOT EXISTS) để `migrate deploy` an toàn bất kể trạng thái DB.

CREATE TABLE IF NOT EXISTS "wallet_reset_warning_dispatches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resetMonth" TEXT NOT NULL,
    "milestone" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "windowDays" INTEGER NOT NULL,
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_reset_warning_dispatches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "wrwd_user_month_milestone_channel_key"
    ON "wallet_reset_warning_dispatches" ("userId", "resetMonth", "milestone", "channel");

CREATE INDEX IF NOT EXISTS "wrwd_month_milestone_channel_idx"
    ON "wallet_reset_warning_dispatches" ("resetMonth", "milestone", "channel");
