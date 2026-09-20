-- Nội dung chuyển khoản riêng cho khoản phí dịch vụ của Phiếu ghi nhận điểm.
--
-- `transferContent` = `PHI{YYMMDD}{NNN}{REF}` (không gạch ngang), sinh cùng lượt với
-- `code` ở lần NỘP đầu rồi đóng băng. Pay2S nhận nó làm `orderId` + `orderInfo`, và IPN
-- phí tra phiếu theo nó. Mọi phiếu có sẵn mang NULL và tiếp tục trả phí theo `code`
-- như cũ, nên cột KHÔNG cần backfill.
--
-- Idempotent theo §38: IF NOT EXISTS trên cả cột lẫn index.

ALTER TABLE "affiliate_purchase_point_requests"
  ADD COLUMN IF NOT EXISTS "transferContent" TEXT;

-- ⚠ TÊN INDEX PHẢI KHỚP TÊN PRISMA TỰ SINH (≤ 63 ký tự; tên này dài 53). Đối chứng bằng:
-- prisma migrate diff --from-empty --to-schema-datamodel prisma/schema --script
-- UNIQUE của Postgres cho phép nhiều NULL, nên các phiếu cũ cùng NULL không vi phạm.
CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_purchase_point_requests_transferContent_key"
  ON "affiliate_purchase_point_requests" ("transferContent");
