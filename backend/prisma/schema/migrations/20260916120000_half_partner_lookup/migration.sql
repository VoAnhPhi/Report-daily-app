-- Tra cứu ví HALF cho đối tác: cấu hình hạn mức + sổ ghi tra cứu + chỉ mục tra theo địa chỉ ví.

CREATE TABLE IF NOT EXISTS "half_partner_lookup_configs" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "limitPerLevel" DECIMAL(36,18) NOT NULL DEFAULT 50000,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "half_partner_lookup_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "half_partner_lookup_logs" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "partnerId" TEXT,
    "partnerName" TEXT,
    "walletAddress" TEXT NOT NULL,
    "amount" TEXT,
    "userId" TEXT,
    "shareholderLevel" INTEGER,
    "exist" BOOLEAN NOT NULL,
    "eligible" BOOLEAN NOT NULL,
    "errorCode" TEXT,
    "httpStatus" INTEGER NOT NULL,
    "receivedBefore" DECIMAL(36,18),
    "limitApplied" DECIMAL(36,18),
    "requestIp" TEXT,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "half_partner_lookup_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "half_partner_lookup_logs_requestId_key" ON "half_partner_lookup_logs"("requestId");
CREATE INDEX IF NOT EXISTS "half_partner_lookup_logs_createdAt_idx" ON "half_partner_lookup_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "half_partner_lookup_logs_partnerId_createdAt_idx" ON "half_partner_lookup_logs"("partnerId", "createdAt");
CREATE INDEX IF NOT EXISTS "half_partner_lookup_logs_userId_createdAt_idx" ON "half_partner_lookup_logs"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "half_partner_lookup_logs_errorCode_createdAt_idx" ON "half_partner_lookup_logs"("errorCode", "createdAt");

-- Tra cứu ví không phân biệt hoa/thường (địa chỉ EVM lưu dạng checksum hoa-thường lẫn lộn).
CREATE INDEX IF NOT EXISTS "half_wallets_lower_wallet_address_idx" ON "half_wallets" (lower("walletAddress"));

-- Dòng cấu hình mặc định: 50.000 HALF mỗi cấp.
INSERT INTO "half_partner_lookup_configs" ("id", "limitPerLevel", "updatedAt")
VALUES ('default', 50000, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
