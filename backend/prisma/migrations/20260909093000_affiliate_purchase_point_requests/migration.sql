-- Affiliate purchase point request workflow tables.
-- Idempotent per DB-safety rules: guarded enum/FK, IF NOT EXISTS on tables/indexes.

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AffiliatePurchasePointRequestStatus') THEN
    CREATE TYPE "AffiliatePurchasePointRequestStatus" AS ENUM ('pending', 'needs_more_info', 'approved', 'rejected'); -- idempotency-ok: guarded by pg_type check
  END IF;
END
$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "affiliate_purchase_point_requests" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "warehouseId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "purchaseAmount" DECIMAL(15,2) NOT NULL,
    "pointsRatePer1000" INTEGER NOT NULL DEFAULT 3,
    "computedPoints" INTEGER NOT NULL,
    "status" "AffiliatePurchasePointRequestStatus" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "evidenceImages" TEXT[],
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "needsMoreInfoReason" TEXT,
    "awardedTransactionId" TEXT,
    "awardedPoints" INTEGER,
    "awardedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_purchase_point_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "affiliate_purchase_point_request_audit_logs" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_purchase_point_request_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_purchase_point_requests_awardedTransactionId_key" ON "affiliate_purchase_point_requests"("awardedTransactionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "affiliate_purchase_point_requests_targetUserId_status_idx" ON "affiliate_purchase_point_requests"("targetUserId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "affiliate_purchase_point_requests_warehouseId_status_idx" ON "affiliate_purchase_point_requests"("warehouseId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "affiliate_purchase_point_requests_createdById_idx" ON "affiliate_purchase_point_requests"("createdById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "affiliate_purchase_point_requests_businessId_status_created_idx" ON "affiliate_purchase_point_requests"("businessId", "status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "affiliate_purchase_point_requests_status_idx" ON "affiliate_purchase_point_requests"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "affiliate_purchase_point_request_audit_logs_requestId_idx" ON "affiliate_purchase_point_request_audit_logs"("requestId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "affiliate_purchase_point_request_audit_logs_actorId_idx" ON "affiliate_purchase_point_request_audit_logs"("actorId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliate_purchase_point_requests_warehouseId_fkey') THEN
    ALTER TABLE "affiliate_purchase_point_requests" ADD CONSTRAINT "affiliate_purchase_point_requests_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE; -- idempotency-ok: guarded by pg_constraint check
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliate_purchase_point_requests_createdById_fkey') THEN
    ALTER TABLE "affiliate_purchase_point_requests" ADD CONSTRAINT "affiliate_purchase_point_requests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; -- idempotency-ok: guarded by pg_constraint check
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliate_purchase_point_requests_targetUserId_fkey') THEN
    ALTER TABLE "affiliate_purchase_point_requests" ADD CONSTRAINT "affiliate_purchase_point_requests_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; -- idempotency-ok: guarded by pg_constraint check
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliate_purchase_point_requests_reviewedById_fkey') THEN
    ALTER TABLE "affiliate_purchase_point_requests" ADD CONSTRAINT "affiliate_purchase_point_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; -- idempotency-ok: guarded by pg_constraint check
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliate_purchase_point_request_audit_logs_requestId_fkey') THEN
    ALTER TABLE "affiliate_purchase_point_request_audit_logs" ADD CONSTRAINT "affiliate_purchase_point_request_audit_logs_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "affiliate_purchase_point_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE; -- idempotency-ok: guarded by pg_constraint check
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliate_purchase_point_request_audit_logs_actorId_fkey') THEN
    ALTER TABLE "affiliate_purchase_point_request_audit_logs" ADD CONSTRAINT "affiliate_purchase_point_request_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; -- idempotency-ok: guarded by pg_constraint check
  END IF;
END
$$;
