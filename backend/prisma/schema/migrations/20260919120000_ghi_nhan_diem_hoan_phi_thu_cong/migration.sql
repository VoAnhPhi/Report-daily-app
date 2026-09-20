-- Phiếu ghi nhận điểm — GHI NHẬN hoàn phí dịch vụ THỦ CÔNG.
--
-- Phiếu đã thu phí 5% nhưng bị từ chối thì kế toán chuyển khoản trả lại TAY,
-- ngoài hệ thống. Trước migration này hệ thống không có chỗ nào ghi "đã trả
-- lại", nên phiếu nằm VĨNH VIỄN trong làn «Cần hoàn tiền» dù tiền đã về tay
-- điểm cầu. Bốn cột dưới đây chỉ ghi nhận việc đã xảy ra: ai xác nhận, lúc nào,
-- ghi chú, và ảnh bằng chứng chuyển khoản.
--
-- `serviceFeeStatus` CỐ Ý không đổi (vẫn `paid`): tiền ĐÃ vào tài khoản công ty,
-- sao kê kế toán phải thấy cả chiều thu lẫn chiều hoàn.
--
-- ⚠ IDEMPOTENT (§38): `ADD COLUMN IF NOT EXISTS`; `ADD CONSTRAINT` bọc trong
--   DO-block kiểm `pg_constraint`. Chỉ THÊM cột rỗng được — không đụng dòng cũ.

ALTER TABLE "affiliate_purchase_point_requests"
  ADD COLUMN IF NOT EXISTS "serviceFeeRefundedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "serviceFeeRefundedById" TEXT,
  ADD COLUMN IF NOT EXISTS "serviceFeeRefundNote" TEXT,
  ADD COLUMN IF NOT EXISTS "serviceFeeRefundEvidence" TEXT[] DEFAULT ARRAY[]::TEXT[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'affiliate_purchase_point_requests_serviceFeeRefundedById_fkey'
  ) THEN
    ALTER TABLE "affiliate_purchase_point_requests"
      ADD CONSTRAINT "affiliate_purchase_point_requests_serviceFeeRefundedById_fkey" -- idempotency-ok: đã bọc trong DO-block có kiểm pg_constraint ngay trên
      FOREIGN KEY ("serviceFeeRefundedById") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
