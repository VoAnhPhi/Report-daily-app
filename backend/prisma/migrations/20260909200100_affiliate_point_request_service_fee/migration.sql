-- Phí dịch vụ 5% cho Phiếu ghi nhận điểm, + chốt chống cấp điểm trùng ở tầng CSDL.
-- Idempotent theo §38: IF NOT EXISTS trên mọi đối tượng; enum/FK bọc trong DO guard.

-- CreateEnum: trạng thái khoản phí. Tách RIÊNG khỏi trạng thái duyệt một cách cố ý —
-- gộp hai trục sẽ tạo hai chỗ cùng nói "đã trả phí".
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AffiliatePurchaseServiceFeeStatus') THEN
    CREATE TYPE "AffiliatePurchaseServiceFeeStatus" AS ENUM ('unpaid', 'processing', 'paid'); -- idempotency-ok: guarded by pg_type check
  END IF;
END
$$;

-- Cột mới trên bảng phiếu.
ALTER TABLE "affiliate_purchase_point_requests"
  ADD COLUMN IF NOT EXISTS "code" TEXT,
  ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "serviceFeeRatePercent" DECIMAL(5,2) NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS "serviceFeeAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "serviceFeePaidAt" TIMESTAMP(3);

-- Cột enum tách riêng: cần DEFAULT theo kiểu vừa tạo ở trên.
ALTER TABLE "affiliate_purchase_point_requests"
  ADD COLUMN IF NOT EXISTS "serviceFeeStatus" "AffiliatePurchaseServiceFeeStatus" NOT NULL DEFAULT 'unpaid';

CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_purchase_point_requests_code_key"
  ON "affiliate_purchase_point_requests" ("code");

-- ⚠ TÊN INDEX PHẢI KHỚP TÊN PRISMA TỰ SINH (bị CẮT còn 63 ký tự — giới hạn định danh
-- của Postgres). Đặt tên "đầy đủ" cho dễ đọc là CSDL mang một tên, lược đồ mong một
-- tên khác ⇒ drift vĩnh viễn, và lần `migrate dev` sau sẽ tạo THÊM index trùng.
-- Đối chứng bằng: prisma migrate diff --from-empty --to-schema-datamodel prisma/schema --script
CREATE INDEX IF NOT EXISTS "affiliate_purchase_point_requests_warehouseId_status_create_idx"
  ON "affiliate_purchase_point_requests" ("warehouseId", "status", "createdAt");

-- Hàng đợi quản trị lọc theo cặp (trạng thái duyệt × trạng thái phí). Cũng là index đỡ
-- cho ô "đã thu phí nhưng bị TỪ CHỐI": hệ thống KHÔNG hoàn tiền, kế toán hoàn tay ngoài
-- hệ thống, nên trạng thái đó bắt buộc phải tra ra được chứ không được chìm.
CREATE INDEX IF NOT EXISTS "affiliate_purchase_point_requests_status_serviceFeeStatus_c_idx"
  ON "affiliate_purchase_point_requests" ("status", "serviceFeeStatus", "createdAt");

-- Nối khoản phí vào bảng `payments` sẵn có, cùng khuôn cha-tuỳ-chọn với
-- `orderPaymentId`/`invoicePaymentId`. RESTRICT: đây là bản ghi TIỀN, xoá phiếu
-- không được phép kéo theo nó.
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "affiliatePointRequestId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "payments_affiliatePointRequestId_key"
  ON "payments" ("affiliatePointRequestId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_affiliatePointRequestId_fkey'
  ) THEN
    ALTER TABLE "payments"
      ADD CONSTRAINT "payments_affiliatePointRequestId_fkey" -- idempotency-ok: guarded by pg_constraint check ở IF NOT EXISTS bên trên
      FOREIGN KEY ("affiliatePointRequestId")
      REFERENCES "affiliate_purchase_point_requests"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- CHỐT CHỐNG CẤP ĐIỂM TRÙNG Ở TẦNG CSDL.
--
-- `awardedTransactionId @unique` trên bảng phiếu KHÔNG chặn được việc này: nó cấm
-- HAI PHIẾU dùng chung MỘT dòng sổ cái, trong khi chiều cần chặn là MỘT PHIẾU sinh
-- HAI dòng sổ cái — mà lần cấp thứ hai sinh `cuid()` mới nên unique không bao giờ nổ,
-- `update` thứ hai ghi đè, và phiếu trông SẠCH với đúng một transaction id trong khi
-- `user_activity_stats` đã cộng hai lần. Đối soát bằng bảng phiếu sẽ không thấy chênh.
--
-- Index từng phần này là chốt cuối cùng, đặt đúng chiều cần chặn. Chỉ phủ
-- sourceType='affiliate_purchase' nên không đụng mọi nguồn điểm sẵn có (bảng sổ cái
-- hiện có 8 index thường, 0 unique).
CREATE UNIQUE INDEX IF NOT EXISTS "activity_point_transactions_affiliate_purchase_source_key"
  ON "activity_point_transactions" ("sourceId")
  WHERE "sourceType" = 'affiliate_purchase' AND "sourceId" IS NOT NULL;
