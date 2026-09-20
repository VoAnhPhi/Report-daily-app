-- Đối tác báo đã chuyển HALF: bảng lượt chuyển + phân loại sổ ghi theo hành động.

CREATE TABLE IF NOT EXISTS "half_partner_transfers" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "partnerName" TEXT,
    "txHash" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "halfWalletId" TEXT NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "lookupRequestId" TEXT,
    "transferredAt" TIMESTAMP(3) NOT NULL,
    "checkErrorCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'recorded',
    "voidedAt" TIMESTAMP(3),
    "voidedBy" TEXT,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "half_partner_transfers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "half_partner_transfers_partnerId_txHash_key" ON "half_partner_transfers"("partnerId", "txHash");
CREATE INDEX IF NOT EXISTS "half_partner_transfers_userId_status_idx" ON "half_partner_transfers"("userId", "status");
CREATE INDEX IF NOT EXISTS "half_partner_transfers_createdAt_idx" ON "half_partner_transfers"("createdAt");

ALTER TABLE "half_partner_lookup_logs" ADD COLUMN IF NOT EXISTS "action" TEXT NOT NULL DEFAULT 'lookup';
ALTER TABLE "half_partner_lookup_logs" ADD COLUMN IF NOT EXISTS "txHash" TEXT;
CREATE INDEX IF NOT EXISTS "half_partner_lookup_logs_action_createdAt_idx" ON "half_partner_lookup_logs"("action", "createdAt");
