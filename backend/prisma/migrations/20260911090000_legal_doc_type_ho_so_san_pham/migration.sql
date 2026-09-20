-- Mở rộng `LegalDocType` cho bộ hồ sơ pháp lý sản phẩm + ghi chú người nộp.
--
-- Hồ sơ pháp lý của doanh nghiệp là các dòng `business_compliance_docs` — mỗi
-- file một dòng, loại giấy là `docType`. Bảy giá trị dưới đây phủ các loại giấy
-- mà đơn đăng ký đối tác (`business_forms`) vẫn thu nhưng enum chưa có, để giấy
-- nộp kèm lúc tạo doanh nghiệp lưu được đúng loại.
--
-- IDEMPOTENT (§38): `ADD VALUE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`.
-- Không cần backfill: giá trị enum mới chưa dòng nào dùng, cột mới nullable.

ALTER TYPE "LegalDocType" ADD VALUE IF NOT EXISTS 'product_declaration';
ALTER TYPE "LegalDocType" ADD VALUE IF NOT EXISTS 'test_report';
ALTER TYPE "LegalDocType" ADD VALUE IF NOT EXISTS 'product_label';
ALTER TYPE "LegalDocType" ADD VALUE IF NOT EXISTS 'barcode_registration';
ALTER TYPE "LegalDocType" ADD VALUE IF NOT EXISTS 'base_standard';
ALTER TYPE "LegalDocType" ADD VALUE IF NOT EXISTS 'certificate_of_origin';
ALTER TYPE "LegalDocType" ADD VALUE IF NOT EXISTS 'gmp_cert';

-- Lời người nộp tự khai ("bản sao y", "bản dịch công chứng"…), tách khỏi
-- `reviewerNote` là lời người duyệt.
ALTER TABLE "business_compliance_docs" ADD COLUMN IF NOT EXISTS "submitterNote" TEXT;
