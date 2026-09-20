-- Thù lao giới thiệu cổ đông (shareholder-referral reward) ledger.
-- Ledger vừa lưu lịch sử per-event vừa là nguồn cộng vào availableBalance.
-- Idempotent: rerun-safe (IF NOT EXISTS + guarded FK).

-- CreateTable
CREATE TABLE IF NOT EXISTS "shareholder_referral_rewards" (
    "id" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "sourceUserId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "depth" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shareholder_referral_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent unique: mỗi (beneficiary, source, level) trả một lần)
CREATE UNIQUE INDEX IF NOT EXISTS "shareholder_referral_rewards_beneficiaryId_sourceUserId_level_key" ON "shareholder_referral_rewards"("beneficiaryId", "sourceUserId", "level");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shareholder_referral_rewards_beneficiaryId_createdAt_idx" ON "shareholder_referral_rewards"("beneficiaryId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shareholder_referral_rewards_sourceUserId_idx" ON "shareholder_referral_rewards"("sourceUserId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shareholder_referral_rewards_beneficiaryId_fkey') THEN
    ALTER TABLE "shareholder_referral_rewards" ADD CONSTRAINT "shareholder_referral_rewards_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; -- idempotency-ok: guarded by pg_constraint check
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shareholder_referral_rewards_sourceUserId_fkey') THEN
    ALTER TABLE "shareholder_referral_rewards" ADD CONSTRAINT "shareholder_referral_rewards_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; -- idempotency-ok: guarded by pg_constraint check
  END IF;
END
$$;
