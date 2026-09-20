-- Migration: home_brand_logos + home_brand_marquee_config
-- Dải logo thương hiệu trên trang chủ storefront. GLOBAL config — không có
-- businessId, giống trending_search_configs (admin tự chọn, storefront chỉ đọc).
-- Apply via psql DIRECT_URL (:5432), NOT pgbouncer (:6543) — §7. Idempotent (IF NOT EXISTS).
-- gen_random_uuid()::text produces a stable-per-row cuid-equivalent TEXT id.

CREATE TABLE IF NOT EXISTS "home_brand_logos" (
  "id"        text NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"      text NOT NULL,
  "imageUrl"  text NOT NULL,
  -- Uploadthing file key, giữ lại để xoá đúng file khi gỡ logo.
  "imageKey"  text,
  -- Link khi bấm vào logo. NULL = logo không phải liên kết.
  "linkUrl"   text,
  -- 1 = hàng trên (chạy sang phải), 2 = hàng dưới (chạy sang trái, chậm hơn).
  "row"       integer NOT NULL DEFAULT 1,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "isActive"  boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- Đường đọc duy nhất của storefront: lọc isActive rồi sắp theo (row, sortOrder).
CREATE INDEX IF NOT EXISTS home_brand_logos_is_active_row_sort_order_idx
  ON "home_brand_logos"("isActive", "row", "sortOrder");

-- Cấu hình mức section — bảng MỘT DÒNG (singleton), theo tiền lệ gratitude config.
-- Tên bảng để SỐ ÍT theo hợp đồng đã chốt, khác thói quen số nhiều của các bảng
-- cấu hình anh em. Đổi tên về sau sẽ tốn thêm một migration nữa.
CREATE TABLE IF NOT EXISTS "home_brand_marquee_config" (
  "id"          text NOT NULL PRIMARY KEY DEFAULT 'singleton',
  "enabled"     boolean NOT NULL DEFAULT true,
  -- px/s. Hàng dưới cố ý chậm hơn hàng trên để hai dải không đọc thành một khối.
  "topSpeed"    integer NOT NULL DEFAULT 42,
  "bottomSpeed" integer NOT NULL DEFAULT 30,
  "createdAt"   timestamptz NOT NULL DEFAULT now(),
  "updatedAt"   timestamptz NOT NULL DEFAULT now()
);

-- Gieo sẵn hàng singleton NGAY TRONG migration để ĐƯỜNG ĐỌC CÔNG KHAI không bao
-- giờ phải GHI vào DB (một @Public() GET có cache mà lại ghi là sai về nguyên tắc,
-- và upsert sẽ nảy updatedAt ở mỗi lần đọc).
INSERT INTO "home_brand_marquee_config" ("id") VALUES ('singleton')
ON CONFLICT ("id") DO NOTHING;
