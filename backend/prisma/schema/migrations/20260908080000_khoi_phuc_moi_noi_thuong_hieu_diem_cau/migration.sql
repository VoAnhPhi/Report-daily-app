-- Khôi phục mối nối THƯƠNG HIỆU ↔ ĐIỂM CẦU (chủ dự án chốt 08/09/2026).
--
-- Cột `brandId` từng nằm trên thực thể "địa điểm kinh doanh" và bị bỏ trong đợt
-- gộp 07/09 (`20260907120000_gop_dia_diem_vao_kho`) theo ADR §3. Bỏ nó kéo theo
-- việc xoá HẲN thư viện ảnh/video của thương hiệu ở CẢ HAI kho
-- (`GET /public/brands/:slug/media` bên acta-api, `brands.getMedia` +
-- `BrandMediaItemSchema` + khối "Thư viện thương hiệu" bên acta-solutions).
-- Nay dựng lại mối nối, với `warehouses` làm GỐC.
--
-- ⚠ Migration này KHÔNG đổi hành vi của bất kỳ điểm cầu nào đang chạy: cột
-- nullable, mặc định NULL, và không đường đọc nào hiện có lọc theo nó.
--
-- §38: mọi câu đều idempotent, chạy lại lần hai không đổi gì.

-- 1) Cột. `IF NOT EXISTS` là idempotent sẵn.
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "brandId" TEXT;

-- 2) Khoá ngoại. `ADD CONSTRAINT` KHÔNG có dạng `IF NOT EXISTS` nên phải bọc
--    trong một DO-block tự kiểm `pg_constraint`.
--
--    ⚠ Cổng MIGRATE-01 xét TỪNG DÒNG, nó không thấy được khối `DO` bao quanh —
--    nên dấu `-- idempotency-ok:` phải nằm NGAY TRÊN DÒNG `ADD CONSTRAINT`, chứ
--    đặt ở đây thì cổng vẫn đỏ (đã vấp một lần).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'warehouses_brandId_fkey'
       AND conrelid = '"warehouses"'::regclass
  ) THEN
    -- ⚠ ON DELETE SET NULL, KHÔNG phải CASCADE: xoá một thương hiệu tuyệt đối
    -- không được xoá theo điểm cầu. Điểm cầu là hạ tầng vận hành (kho hàng,
    -- đơn, phiếu); thương hiệu chỉ là một nhãn gắn lên nó.
    ALTER TABLE "warehouses"
      ADD CONSTRAINT "warehouses_brandId_fkey" -- idempotency-ok: đã bọc trong DO-block kiểm pg_constraint ở trên
      FOREIGN KEY ("brandId") REFERENCES "business_brands"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 3) Chỉ mục. Truy vấn thư viện ảnh lọc `warehouse.brandId = ?` rồi mới join
--    sang `warehouse_media`, nên không có chỉ mục này là quét toàn bảng kho.
CREATE INDEX IF NOT EXISTS "warehouses_brandId_idx" ON "warehouses"("brandId");
