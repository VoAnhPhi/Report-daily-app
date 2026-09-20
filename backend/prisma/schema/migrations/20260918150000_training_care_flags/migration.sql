-- Danh sách cần chăm sóc (Video rèn luyện, 2026-09-18).
-- Số dư ví video >= 10.000.000đ ⇒ không nhận thêm thưởng khi hoàn thành video
-- cho tới khi admin gỡ cờ. Migration idempotent (§38).

DO $$ BEGIN
  CREATE TYPE "TrainingCareStatus" AS ENUM ('needs_care', 'unlocked'); -- idempotency-ok: bọc DO-block bắt duplicate_object
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "training_care_flags" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "TrainingCareStatus" NOT NULL DEFAULT 'needs_care',
    "flaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "balanceAtFlagVnd" INTEGER NOT NULL,
    "flagSource" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3),
    "unlockedBy" TEXT,
    "relockedBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_care_flags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "training_care_flags_userId_key" ON "training_care_flags"("userId");
CREATE INDEX IF NOT EXISTS "training_care_flags_status_flaggedAt_idx" ON "training_care_flags"("status", "flaggedAt");

DO $$ BEGIN
  ALTER TABLE "training_care_flags" ADD CONSTRAINT "training_care_flags_userId_fkey" -- idempotency-ok: bọc DO-block bắt duplicate_object
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Gắn cờ sẵn cho mọi người đang có số dư ví video >= 10.000.000đ lúc tính năng
-- lên (chủ dự án chốt: người đang đủ 10 triệu trở lên không nhận thưởng nữa).
-- ON CONFLICT DO NOTHING ⇒ chạy lại không đổi gì, và không đè cờ admin đã gỡ.
INSERT INTO "training_care_flags" ("id", "userId", "status", "flaggedAt", "balanceAtFlagVnd", "flagSource", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, w."userId", 'needs_care', NOW(), w."balanceVnd", 'backfill', NOW(), NOW()
FROM "training_wallets" w
WHERE w."balanceVnd" >= 10000000
ON CONFLICT ("userId") DO NOTHING;
