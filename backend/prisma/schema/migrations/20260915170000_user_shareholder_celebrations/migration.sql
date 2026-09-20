-- Confetti CÁ NHÂN mừng đạt/lên cấp "Cổ đông lan tỏa" (login-time).
-- `celebratedLevel` = cấp sharing cao nhất đã bắn confetti cá nhân cho user ⇒ mỗi mốc
-- cấp chỉ hiện một lần (kể cả đa thiết bị). CHỈ hiển thị — không đụng cấp đồng chia.
-- Idempotent: rerun-safe (IF NOT EXISTS + guarded FK + backfill ON CONFLICT DO NOTHING).

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_shareholder_celebrations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "celebratedLevel" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_shareholder_celebrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (một hàng mỗi user)
CREATE UNIQUE INDEX IF NOT EXISTS "user_shareholder_celebrations_userId_key" ON "user_shareholder_celebrations"("userId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_shareholder_celebrations_userId_fkey') THEN
    ALTER TABLE "user_shareholder_celebrations" ADD CONSTRAINT "user_shareholder_celebrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; -- idempotency-ok: guarded by pg_constraint check
  END IF;
END
$$;

-- Backfill: khởi tạo celebratedLevel = cấp sharing ĐÃ ghi nhận (persisted) cho mọi cổ
-- đông hiện có, để cổ đông CŨ không bị bắn confetti "đạt lần đầu" nhầm lúc deploy. Ai
-- đang có display > persisted (pending level-up) sẽ nhận confetti level_up ở lần login
-- kế — đúng ý. `md5(...)` sinh id text duy nhất, không cần extension (tránh pgcrypto/
-- search_path). Rerun = no-op nhờ ON CONFLICT.
INSERT INTO "user_shareholder_celebrations" ("id", "userId", "celebratedLevel", "createdAt", "updatedAt")
SELECT
  'clb_' || md5(random()::text || clock_timestamp()::text || ur."userId"),
  ur."userId",
  ur."level",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "user_recognitions" ur
JOIN "recognition_types" rt ON rt."id" = ur."typeId" AND rt."code" = 'sharing'
ON CONFLICT ("userId") DO NOTHING;
