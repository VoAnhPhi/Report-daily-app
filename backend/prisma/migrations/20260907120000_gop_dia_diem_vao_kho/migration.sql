-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  GỘP "ĐỊA ĐIỂM KINH DOANH" VÀO "KHO" — `Warehouse` là gốc duy nhất       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Quyết định thiết kế đầy đủ: `.planning/research/gop-dia-diem-vao-kho/00-ADR.md`
-- (bản 2, 07/09/2026). Tóm tắt lý do có mặt của tệp này:
--
--   Mặt công khai của một điểm trên bản đồ Thổ địa từng sống ở `business_locations`,
--   nối vào kho qua cầu `warehouses."businessLocationId"`. Cầu đó đòi những khái
--   niệm KHÔNG áp dụng cho điểm cầu — `businessId` NOT NULL trước hết — nên đo được
--   0/23 kho từng mở nổi mặt công khai. Mọi tính năng dựng trên nó (lưu, ghim,
--   check-in, đánh giá, ưu đãi) chết cứng ở nhánh "chưa có địa điểm".
--
-- ĐO TRƯỚC KHI XOÁ (CSDL dev, 07/09/2026 — chủ dự án xác nhận prod ≈ dev):
--   business_locations 4 dòng (cả 4 là dữ liệu thử `[UAT-73] … có thể xoá`);
--   10 bảng vệ tinh business_location_* + saved_places 0 dòng; qr_tokens 0;
--   voucher_templates 13 (0 dòng trỏ địa điểm); posts."businessLocationId" 0 khác NULL;
--   warehouses 23 (0 kho có businessLocationId); warehouse_reviews 0 dòng
--   targetType='business_location'; permissions 6 mã 'business_locations.%'
--   (role_permissions 5 dòng trỏ tới, cascade).
--
-- ⚠ IDEMPOTENT (§38). `RENAME COLUMN` và `ADD CONSTRAINT` không có `IF NOT EXISTS`,
--   nên bọc khối `DO $khoi$ ... $khoi$` kiểm `information_schema.columns` /
--   `pg_constraint`.
--   ⚠ THẺ DOLLAR-QUOTE CÓ TÊN (`$khoi$`) LÀ BẮT BUỘC, KHÔNG PHẢI THẨM MỸ. Một cặp
--   dấu đô-la trần nằm trong chú thích `--` BÊN TRONG khối VẪN ĐÓNG khối đó: bộ
--   quét của Postgres tìm dấu đóng ở mức văn bản thô, trước cả khi biết dòng ấy là
--   chú thích. Đã vấp thật khi viết tệp này — dòng `-- idempotency-ok` nhắc lại cú
--   pháp DO đã cắt khối làm đôi, và lỗi báo ra là `syntax error at or near "kiểm"`
--   ở một dòng CÁCH ĐÓ 40 DÒNG, không liên quan gì tới nguyên nhân. Thẻ có tên làm
--   cả lớp lỗi này biến mất thay vì phải nhớ né nó ở từng dòng chú thích.
--   ⚠ Mọi lệnh XOÁ/NULL dữ liệu nằm BÊN TRONG khối kiểm cột cũ: chạy lượt hai trên
--   một CSDL đã đổi tên xong thì cột cũ không còn ⇒ khối bỏ qua ⇒ dữ liệu MỚI ghi
--   sau đợt gộp không bị lượt chạy lại quét sạch. Đặt `DELETE` ngoài khối là một
--   migration "idempotent" theo nghĩa hình thức mà vẫn phá dữ liệu thật.
--
-- ⚠ MIGRATE-01 (`scripts/check-migration-idempotency.sh`) MÙ với `RENAME`/`DROP`,
--   nên bộ thử chạy-hai-lần trên Postgres cục bộ là BẮT BUỘC, không phải tuỳ chọn.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. `warehouses` NHẬN 11 CỘT HỒ SƠ CÔNG KHAI
-- ─────────────────────────────────────────────────────────────────────────────
-- Chỉ những cột còn NGHĨA với một điểm cầu do chính ACTA vận hành. Phần bỏ lại
-- (`slug`, `industry`, `verifiedLevel`, `visibilityStatus`, `score*`, `priceRange`,
-- `tags[]`, toạ độ chép tay) ghi lý do ở ADR §3.
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "openingStatus" "OpeningStatus" NOT NULL DEFAULT 'open';
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "rating" DECIMAL(3,2) NOT NULL DEFAULT 0;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "totalRatings" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "totalCheckIns" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "totalSaved" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "attributes" JSONB;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "socialLinks" JSONB;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "featuredOnMap" BOOLEAN NOT NULL DEFAULT false;

-- Chỉ mục BỘ PHẬN: truy vấn duy nhất đọc cột này là `GET /public/locations/featured`,
-- và nó CHỈ hỏi các dòng `true`. Một chỉ mục đầy đủ trên cột boolean lệch nặng
-- (đo: 0/23 kho nổi bật) chỉ tốn chỗ và tốn công ghi mà bộ hoạch định vẫn quét bảng.
-- ⚠ Prisma KHÔNG khai được chỉ mục bộ phận, nên nó cố ý VẮNG MẶT trong
-- `prisma/schema` và chỉ sống ở migration này. Đã đo bằng `kiem-tra-nen-mong.sh`:
-- `migrate diff` bỏ qua chỉ mục có mệnh đề `WHERE`, không sinh ra dòng lệch nào.
CREATE INDEX IF NOT EXISTS "warehouses_featuredOnMap_idx" ON "warehouses"("featuredOnMap") WHERE "featuredOnMap" = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. BẢY BẢNG VỆ TINH MỚI (`business_location_*` → `warehouse_*`)
-- ─────────────────────────────────────────────────────────────────────────────
-- TẠO MỚI + XOÁ CŨ, cố ý KHÔNG `ALTER TABLE … RENAME`: khoá ngoại phải đổi ĐÍCH
-- (`business_locations` → `warehouses`) và cột `businessId` chép tay phải biến mất.
-- Cả 10 bảng cũ đo được 0 dòng, nên "chuyển dữ liệu" không phải là việc phải làm.

CREATE TABLE IF NOT EXISTS "warehouse_hours" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "openTime" TEXT,
    "closeTime" TEXT,
    "isClosedAllDay" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_hours_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "warehouse_hours_warehouseId_idx" ON "warehouse_hours"("warehouseId");
CREATE INDEX IF NOT EXISTS "warehouse_hours_warehouseId_dayOfWeek_idx" ON "warehouse_hours"("warehouseId", "dayOfWeek");
CREATE UNIQUE INDEX IF NOT EXISTS "warehouse_hours_warehouseId_dayOfWeek_sortOrder_key" ON "warehouse_hours"("warehouseId", "dayOfWeek", "sortOrder");

CREATE TABLE IF NOT EXISTS "warehouse_media" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "kind" "LocationMediaKind" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "uploadthingFileKey" TEXT,
    "uploadthingUrl" TEXT,
    "muxAssetId" TEXT,
    "muxPlaybackId" TEXT,
    "muxPosterUrl" TEXT,
    "caption" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_media_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "warehouse_media_warehouseId_idx" ON "warehouse_media"("warehouseId");
CREATE INDEX IF NOT EXISTS "warehouse_media_warehouseId_kind_idx" ON "warehouse_media"("warehouseId", "kind");
CREATE INDEX IF NOT EXISTS "warehouse_media_warehouseId_sortOrder_idx" ON "warehouse_media"("warehouseId", "sortOrder");

-- ⚠ KHÔNG có cột `businessId`. Bản cũ chép `businessLocation.businessId` xuống đây
-- để lọc nhanh theo doanh nghiệp; điểm cầu không có doanh nghiệp chủ quản nên cột
-- ấy sau gộp chỉ còn là một chỗ để dữ liệu nói dối.
CREATE TABLE IF NOT EXISTS "warehouse_check_ins" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestLeadId" TEXT,
    "warehouseId" TEXT NOT NULL,
    "checkInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkInDate" DATE NOT NULL,
    "status" "CheckInStatus" NOT NULL DEFAULT 'received',
    "source" "CheckInSource" NOT NULL DEFAULT 'web',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "qrTokenId" TEXT,
    "clientLatitude" DOUBLE PRECISION,
    "clientLongitude" DOUBLE PRECISION,
    "validationSignals" JSONB,
    "duplicateReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouse_check_ins_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "warehouse_check_ins_warehouseId_checkInDate_idx" ON "warehouse_check_ins"("warehouseId", "checkInDate");
CREATE INDEX IF NOT EXISTS "warehouse_check_ins_userId_checkInDate_idx" ON "warehouse_check_ins"("userId", "checkInDate");
CREATE INDEX IF NOT EXISTS "warehouse_check_ins_status_idx" ON "warehouse_check_ins"("status");
CREATE INDEX IF NOT EXISTS "warehouse_check_ins_qrTokenId_idx" ON "warehouse_check_ins"("qrTokenId");
CREATE UNIQUE INDEX IF NOT EXISTS "warehouse_check_ins_userId_warehouseId_checkInDate_key" ON "warehouse_check_ins"("userId", "warehouseId", "checkInDate");

-- ⚠ `reviewId` và `offerTemplateId` NAY LÀ KHOÁ NGOẠI THẬT (trước chỉ là hai cột
-- chuỗi trần): xoá một đánh giá hay một ưu đãi từng để lại báo cáo trỏ vào hư
-- không mà không cổng nào kêu. `SetNull` chứ không `Cascade` — báo cáo VẪN có giá
-- trị khi đối tượng bị gỡ, vì nó thường CHÍNH LÀ lý do đối tượng bị gỡ.
CREATE TABLE IF NOT EXISTS "warehouse_violation_reports" (
    "id" TEXT NOT NULL,
    "reportedById" TEXT,
    "reportedGuestContact" TEXT,
    "warehouseId" TEXT NOT NULL,
    "reviewId" TEXT,
    "offerTemplateId" TEXT,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "status" "LocationReportStatus" NOT NULL DEFAULT 'open',
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_violation_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "warehouse_violation_reports_warehouseId_status_idx" ON "warehouse_violation_reports"("warehouseId", "status");
CREATE INDEX IF NOT EXISTS "warehouse_violation_reports_status_createdAt_idx" ON "warehouse_violation_reports"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "warehouse_violation_reports_reportedById_idx" ON "warehouse_violation_reports"("reportedById");
CREATE INDEX IF NOT EXISTS "warehouse_violation_reports_reviewId_idx" ON "warehouse_violation_reports"("reviewId");
CREATE INDEX IF NOT EXISTS "warehouse_violation_reports_offerTemplateId_idx" ON "warehouse_violation_reports"("offerTemplateId");

CREATE TABLE IF NOT EXISTS "warehouse_views" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouse_views_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "warehouse_views_userId_viewedAt_idx" ON "warehouse_views"("userId", "viewedAt" DESC);
CREATE INDEX IF NOT EXISTS "warehouse_views_warehouseId_idx" ON "warehouse_views"("warehouseId");
CREATE UNIQUE INDEX IF NOT EXISTS "warehouse_views_userId_warehouseId_key" ON "warehouse_views"("userId", "warehouseId");

CREATE TABLE IF NOT EXISTS "warehouse_tags" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_tags_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "warehouse_tags_slug_key" ON "warehouse_tags"("slug");

CREATE TABLE IF NOT EXISTS "warehouse_tag_maps" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouse_tag_maps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "warehouse_tag_maps_warehouseId_idx" ON "warehouse_tag_maps"("warehouseId");
CREATE INDEX IF NOT EXISTS "warehouse_tag_maps_tagId_idx" ON "warehouse_tag_maps"("tagId");
CREATE UNIQUE INDEX IF NOT EXISTS "warehouse_tag_maps_warehouseId_tagId_key" ON "warehouse_tag_maps"("warehouseId", "tagId");

-- Khoá ngoại của bảy bảng mới. Tên phải khớp ĐÚNG cái Prisma sinh ra — đối chứng
-- bằng `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema --script`.
DO $khoi$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_hours_warehouseId_fkey') THEN
    ALTER TABLE "warehouse_hours" ADD CONSTRAINT "warehouse_hours_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE; -- idempotency-ok: bọc DO-block kiểm pg_constraint
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_media_warehouseId_fkey') THEN
    ALTER TABLE "warehouse_media" ADD CONSTRAINT "warehouse_media_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE; -- idempotency-ok: bọc DO-block kiểm pg_constraint
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_check_ins_userId_fkey') THEN
    ALTER TABLE "warehouse_check_ins" ADD CONSTRAINT "warehouse_check_ins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; -- idempotency-ok: bọc DO-block kiểm pg_constraint
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_check_ins_guestLeadId_fkey') THEN
    ALTER TABLE "warehouse_check_ins" ADD CONSTRAINT "warehouse_check_ins_guestLeadId_fkey" FOREIGN KEY ("guestLeadId") REFERENCES "guest_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE; -- idempotency-ok: bọc DO-block kiểm pg_constraint
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_check_ins_warehouseId_fkey') THEN
    ALTER TABLE "warehouse_check_ins" ADD CONSTRAINT "warehouse_check_ins_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE; -- idempotency-ok: bọc DO-block kiểm pg_constraint
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_check_ins_qrTokenId_fkey') THEN
    ALTER TABLE "warehouse_check_ins" ADD CONSTRAINT "warehouse_check_ins_qrTokenId_fkey" FOREIGN KEY ("qrTokenId") REFERENCES "qr_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE; -- idempotency-ok: bọc DO-block kiểm pg_constraint
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_violation_reports_reportedById_fkey') THEN
    ALTER TABLE "warehouse_violation_reports" ADD CONSTRAINT "warehouse_violation_reports_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; -- idempotency-ok: bọc DO-block kiểm pg_constraint
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_violation_reports_warehouseId_fkey') THEN
    ALTER TABLE "warehouse_violation_reports" ADD CONSTRAINT "warehouse_violation_reports_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE; -- idempotency-ok: bọc DO-block kiểm pg_constraint
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_violation_reports_reviewId_fkey') THEN
    ALTER TABLE "warehouse_violation_reports" ADD CONSTRAINT "warehouse_violation_reports_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "diem_cau_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE; -- idempotency-ok: bọc DO-block kiểm pg_constraint
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_violation_reports_offerTemplateId_fkey') THEN
    ALTER TABLE "warehouse_violation_reports" ADD CONSTRAINT "warehouse_violation_reports_offerTemplateId_fkey" FOREIGN KEY ("offerTemplateId") REFERENCES "voucher_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE; -- idempotency-ok: bọc DO-block kiểm pg_constraint
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_violation_reports_resolvedByUserId_fkey') THEN
    ALTER TABLE "warehouse_violation_reports" ADD CONSTRAINT "warehouse_violation_reports_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; -- idempotency-ok: bọc DO-block kiểm pg_constraint
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_views_userId_fkey') THEN
    ALTER TABLE "warehouse_views" ADD CONSTRAINT "warehouse_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; -- idempotency-ok: bọc DO-block kiểm pg_constraint
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_views_warehouseId_fkey') THEN
    ALTER TABLE "warehouse_views" ADD CONSTRAINT "warehouse_views_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE; -- idempotency-ok: bọc DO-block kiểm pg_constraint
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_tag_maps_warehouseId_fkey') THEN
    ALTER TABLE "warehouse_tag_maps" ADD CONSTRAINT "warehouse_tag_maps_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE; -- idempotency-ok: bọc DO-block kiểm pg_constraint
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_tag_maps_tagId_fkey') THEN
    ALTER TABLE "warehouse_tag_maps" ADD CONSTRAINT "warehouse_tag_maps_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "warehouse_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE; -- idempotency-ok: bọc DO-block kiểm pg_constraint
  END IF;
END $khoi$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. BỐN BẢNG CÓ DỮ LIỆU TIỀM NĂNG: ĐỔI TÊN CỘT, ĐỔI ĐÍCH KHOÁ NGOẠI
-- ─────────────────────────────────────────────────────────────────────────────
-- Ở đây `RENAME COLUMN` (không phải tạo-mới-xoá-cũ) vì bốn bảng này có thể mang dữ
-- liệu thật của các tính năng khác. Nhưng giá trị đang nằm trong cột là id của
-- `business_locations`, KHÔNG phải id kho — giữ nguyên thì khoá ngoại mới chắc chắn
-- đỏ ⇒ phải xoá (cột NOT NULL) hoặc NULL (cột nullable) TRƯỚC khi đổi tên.

-- 3.1 `saved_places` — cột NOT NULL ⇒ xoá dòng. Đo: 0 dòng.
DO $khoi$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'saved_places' AND column_name = 'businessLocationId'
  ) THEN
    DELETE FROM "saved_places";
    ALTER TABLE "saved_places" DROP CONSTRAINT IF EXISTS "saved_places_businessLocationId_fkey";
    ALTER TABLE "saved_places" RENAME COLUMN "businessLocationId" TO "warehouseId";
  END IF;
END $khoi$;
ALTER INDEX IF EXISTS "saved_places_businessLocationId_idx" RENAME TO "saved_places_warehouseId_idx";
ALTER INDEX IF EXISTS "saved_places_userId_businessLocationId_kind_key" RENAME TO "saved_places_userId_warehouseId_kind_key";
DO $khoi$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saved_places_warehouseId_fkey') THEN
    ALTER TABLE "saved_places" ADD CONSTRAINT "saved_places_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE; -- idempotency-ok: bọc DO-block kiểm pg_constraint
  END IF;
END $khoi$;

-- 3.2 `qr_tokens` — cột nullable ⇒ NULL hoá, giữ nguyên token. Đo: 0 dòng.
DO $khoi$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'qr_tokens' AND column_name = 'businessLocationId'
  ) THEN
    UPDATE "qr_tokens" SET "businessLocationId" = NULL WHERE "businessLocationId" IS NOT NULL;
    ALTER TABLE "qr_tokens" DROP CONSTRAINT IF EXISTS "qr_tokens_businessLocationId_fkey";
    ALTER TABLE "qr_tokens" RENAME COLUMN "businessLocationId" TO "warehouseId";
  END IF;
END $khoi$;
ALTER INDEX IF EXISTS "qr_tokens_businessLocationId_kind_idx" RENAME TO "qr_tokens_warehouseId_kind_idx";
DO $khoi$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qr_tokens_warehouseId_fkey') THEN
    ALTER TABLE "qr_tokens" ADD CONSTRAINT "qr_tokens_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE; -- idempotency-ok: bọc DO-block kiểm pg_constraint
  END IF;
END $khoi$;

-- 3.3 `voucher_templates` — 13 mẫu ưu đãi THẬT, nhưng 0 mẫu trỏ địa điểm ⇒ NULL hoá
-- an toàn. `businessId` GIỮ NGUYÊN (§1.4: cơ chế doanh nghiệp không đụng).
DO $khoi$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'voucher_templates' AND column_name = 'businessLocationId'
  ) THEN
    UPDATE "voucher_templates" SET "businessLocationId" = NULL WHERE "businessLocationId" IS NOT NULL;
    ALTER TABLE "voucher_templates" DROP CONSTRAINT IF EXISTS "voucher_templates_businessLocationId_fkey";
    ALTER TABLE "voucher_templates" RENAME COLUMN "businessLocationId" TO "warehouseId";
  END IF;
END $khoi$;
ALTER INDEX IF EXISTS "voucher_templates_businessLocationId_isActive_idx" RENAME TO "voucher_templates_warehouseId_isActive_idx";
DO $khoi$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'voucher_templates_warehouseId_fkey') THEN
    ALTER TABLE "voucher_templates" ADD CONSTRAINT "voucher_templates_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE; -- idempotency-ok: bọc DO-block kiểm pg_constraint
  END IF;
END $khoi$;

-- 3.4 `access_points` — cột NOT NULL ⇒ xoá dòng. Đo: 0 dòng.
-- `access_point_grants` theo Cascade, `card_tap_events` theo SetNull — không cần dọn tay.
DO $khoi$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'access_points' AND column_name = 'businessLocationId'
  ) THEN
    DELETE FROM "access_points";
    ALTER TABLE "access_points" DROP CONSTRAINT IF EXISTS "access_points_businessLocationId_fkey";
    ALTER TABLE "access_points" RENAME COLUMN "businessLocationId" TO "warehouseId";
  END IF;
END $khoi$;
ALTER INDEX IF EXISTS "access_points_businessId_businessLocationId_idx" RENAME TO "access_points_businessId_warehouseId_idx";
DO $khoi$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'access_points_warehouseId_fkey') THEN
    ALTER TABLE "access_points" ADD CONSTRAINT "access_points_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE; -- idempotency-ok: bọc DO-block kiểm pg_constraint
  END IF;
END $khoi$;

-- 3b. `posts` — NHÓM DROP, KHÔNG ĐỔI TÊN.
-- ⚠ `posts."warehouseId"` ĐÃ TỒN TẠI từ `20260903000000_post_warehouse_and_warehouse_level`,
-- nên đổi tên cột cũ thành `warehouseId` sẽ đụng ngay một cột cùng tên. Bài ưu đãi
-- nay neo duy nhất vào `warehouseId` + `postType = 'offer'`. Đo: 0 dòng khác NULL.
DROP INDEX IF EXISTS "posts_businessLocationId_idx";
DROP INDEX IF EXISTS "posts_businessLocationId_isPublished_deletedAt_publishedAt_idx";
ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_businessLocationId_fkey";
ALTER TABLE "posts" DROP COLUMN IF EXISTS "businessLocationId";

-- 3c. `warehouses` — gỡ CẦU NỐI.
-- ⚠ Phải gỡ TƯỜNG MINH: `DROP TABLE business_locations CASCADE` ở bước 4 gỡ được
-- khoá ngoại nhưng KHÔNG gỡ cột — cột sẽ nằm lại như một cột rác mà `migrate diff`
-- báo lệch mãi mãi.
ALTER TABLE "warehouses" DROP CONSTRAINT IF EXISTS "warehouses_businessLocationId_fkey";
DROP INDEX IF EXISTS "warehouses_businessLocationId_key";
ALTER TABLE "warehouses" DROP COLUMN IF EXISTS "businessLocationId";

-- 3d. DỌN DỮ LIỆU THAM CHIẾU KHÁI NIỆM ĐÃ BIẾN MẤT.
-- Cả hai lệnh vốn đã idempotent (chạy lần hai không còn dòng nào khớp).
-- `location_profile_update` từ nay chỉ còn đúng một đích là `'warehouse'`.
DELETE FROM "warehouse_reviews" WHERE "targetType" = 'business_location';
-- 6 mã quyền `business_locations.*`; `role_permissions` (5 dòng) và `user_permissions`
-- (0 dòng) đi theo bằng `ON DELETE CASCADE`.
DELETE FROM "permissions" WHERE "code" LIKE 'business_locations.%';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. XOÁ HỌ BẢNG `business_location*`
-- ─────────────────────────────────────────────────────────────────────────────
-- Thứ tự con-trước-cha để không phải dựa vào CASCADE ở chỗ không cần.
DROP TABLE IF EXISTS "business_location_review_replies";
DROP TABLE IF EXISTS "business_location_reviews";
DROP TABLE IF EXISTS "business_location_check_ins";
DROP TABLE IF EXISTS "business_location_reports";
DROP TABLE IF EXISTS "business_location_views";
DROP TABLE IF EXISTS "business_location_hours";
DROP TABLE IF EXISTS "business_location_media";
DROP TABLE IF EXISTS "business_location_tag_maps";
DROP TABLE IF EXISTS "business_location_tags";
-- CASCADE ở đúng một chỗ: mọi khoá ngoại còn sót trỏ vào bảng này đã được gỡ ở
-- bước 3, nên CASCADE ở đây chỉ là lưới an toàn cho môi trường lệch sổ.
DROP TABLE IF EXISTS "business_locations" CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. XOÁ HAI KIỂU ENUM KHÔNG CÒN CỘT NÀO DÙNG
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠ `OpeningStatus`, `LocationMediaKind`, `CheckInStatus`, `CheckInSource`,
-- `ReportReason`, `LocationReportStatus`, `DayOfWeek`, `ReviewModerationStatus`
-- KHÔNG bị drop — chúng chỉ đổi chỗ khai báo trong lược đồ Prisma và vẫn có cột dùng.
DROP TYPE IF EXISTS "BusinessLocationVisibility";
DROP TYPE IF EXISTS "VerifiedLevel";

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. GIÁ TRỊ NHẬT KÝ HOẠT ĐỘNG MỚI
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠ CỐ Ý KHÔNG `ALTER TYPE … RENAME VALUE` cho 14 giá trị `BUSINESS_LOCATION_*` và
-- 3 target cũ: (a) `RENAME VALUE` không có dạng idempotent, (b) đổi
-- `BUSINESS_LOCATION_UPDATED` sẽ đụng nhãn `WAREHOUSE_UPDATED` đã tồn tại,
-- (c) 27 dòng `activity_logs` lịch sử sẽ đọc ra một nhãn mô tả SAI việc đã xảy ra.
-- Giá trị cũ ở lại schema kèm chú thích `// lịch sử — không còn mã nào ghi`.
--
-- ⚠ Postgres 15+ cho `ALTER TYPE … ADD VALUE` chạy trong transaction, MIỄN LÀ giá
-- trị mới không được DÙNG trong cùng transaction. Migration này không dùng.
ALTER TYPE "ActivityTargetType" ADD VALUE IF NOT EXISTS 'WAREHOUSE_CHECK_IN';
ALTER TYPE "ActivityTargetType" ADD VALUE IF NOT EXISTS 'DIEM_CAU_REVIEW';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'WAREHOUSE_PROFILE_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'WAREHOUSE_FEATURED';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'WAREHOUSE_UNFEATURED';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'WAREHOUSE_CHECK_IN';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'DIEM_CAU_REVIEW_MODERATED';
