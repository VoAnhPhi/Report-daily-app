-- Migration: Thiên Sứ — giai đoạn 2 (trò chuyện chữ, nhiều nhà cung cấp mô hình)
-- Lược đồ: prisma/schema/thien-su.prisma. Quyết định: acta-agents/docs/adr/0002 + 0003,
-- acta-agents/docs/HAN-MUC-VA-RAO-CHAN.md.
--
-- Phần DDL sinh bằng `prisma migrate diff --from-schema-datamodel … --to-schema-datamodel …
-- --script` (không chạm CSDL nào — §40), rồi bọc IF NOT EXISTS / DO-block cho idempotent
-- (§38). Tên ràng buộc/chỉ mục giữ ĐÚNG tên Prisma sinh, nếu không là lệch lược đồ vĩnh viễn.
-- Chỉ áp bằng `prisma migrate deploy` (DIRECT_URL :5432), không bao giờ `psql -f`.

-- ─── Kiểu liệt kê ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ThienSuVaiTro') THEN
    CREATE TYPE "ThienSuVaiTro" AS ENUM ('nguoi_dung', 'thien_su'); -- idempotency-ok: guarded by pg_type check
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ThienSuHang') THEN
    CREATE TYPE "ThienSuHang" AS ENUM ('thuong', 'da_xac_minh', 'nhan_vien', 'quan_tri'); -- idempotency-ok: guarded by pg_type check
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ThienSuNhaCungCap') THEN
    CREATE TYPE "ThienSuNhaCungCap" AS ENUM ('anthropic', 'openai'); -- idempotency-ok: guarded by pg_type check
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ThienSuMucSuyNghi') THEN
    CREATE TYPE "ThienSuMucSuyNghi" AS ENUM ('nhanh', 'can_bang', 'ky_luong', 'sau'); -- idempotency-ok: guarded by pg_type check
  END IF;
END
$$;

-- ─── Danh tính ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "thien_su" (
    "id" TEXT NOT NULL,
    "maDinhDanh" VARCHAR(60) NOT NULL,
    "ten" VARCHAR(80) NOT NULL,
    "tenDayDu" VARCHAR(160) NOT NULL,
    "anhDaiDienUrl" TEXT,
    "laMacDinh" BOOLEAN NOT NULL DEFAULT false,
    "chuSoHuuId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thien_su_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "thien_su_nhan_cach" (
    "id" TEXT NOT NULL,
    "thienSuId" TEXT NOT NULL,
    "phienBan" INTEGER NOT NULL,
    "noiDung" JSONB NOT NULL,
    "ghiChu" TEXT,
    "taoBoiId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thien_su_nhan_cach_pkey" PRIMARY KEY ("id")
);

-- ─── Trò chuyện ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "thien_su_hoi_thoai" (
    "id" TEXT NOT NULL,
    "thienSuId" TEXT NOT NULL,
    "nguoiDungId" TEXT NOT NULL,
    "tieuDe" VARCHAR(200),
    "tinNhanCuoiLuc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thien_su_hoi_thoai_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "thien_su_tin_nhan" (
    "id" TEXT NOT NULL,
    "hoiThoaiId" TEXT NOT NULL,
    "nguoiDungId" TEXT NOT NULL,
    "vaiTro" "ThienSuVaiTro" NOT NULL,
    "noiDung" TEXT NOT NULL,
    "moHinhYeuCau" VARCHAR(80),
    "mucSuyNghi" "ThienSuMucSuyNghi",
    "nhaCungCap" "ThienSuNhaCungCap",
    "moHinh" VARCHAR(80),
    "thamSoSuyNghi" VARCHAR(20),
    "nhanCachPhienBan" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "cacheReadTokens" INTEGER,
    "cacheWriteTokens" INTEGER,
    "reasoningTokens" INTEGER,
    "latencyMs" INTEGER,
    "chiPhiUocTinhUSD" DECIMAL(12,6),
    "luotQuyDoi" INTEGER,
    "lyDoDung" VARCHAR(40),
    "loi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thien_su_tin_nhan_pkey" PRIMARY KEY ("id")
);

-- ─── Rào chắn ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "thien_su_mo_hinh" (
    "maMoHinh" VARCHAR(80) NOT NULL,
    "nhaCungCap" "ThienSuNhaCungCap" NOT NULL,
    "tenHienThi" VARCHAR(80) NOT NULL,
    "moTaNgan" VARCHAR(200),
    "bac" INTEGER NOT NULL,
    "giaVaoMoiTrieu" DECIMAL(10,4) NOT NULL,
    "giaRaMoiTrieu" DECIMAL(10,4) NOT NULL,
    "giaDocDemMoiTrieu" DECIMAL(10,4),
    "giaGhiDemMoiTrieu" DECIMAL(10,4),
    "heSoLuot" INTEGER NOT NULL DEFAULT 1,
    "banDoSuyNghi" JSONB,
    "hangToiThieu" "ThienSuHang" NOT NULL DEFAULT 'thuong',
    "dungChoTuDong" BOOLEAN NOT NULL DEFAULT true,
    "batTat" BOOLEAN NOT NULL DEFAULT true,
    "thuTu" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "thien_su_mo_hinh_pkey" PRIMARY KEY ("maMoHinh")
);

CREATE TABLE IF NOT EXISTS "thien_su_han_muc" (
    "hang" "ThienSuHang" NOT NULL,
    "luotMoiNgay" INTEGER,
    "luotMoi5Phut" INTEGER,
    "luotDongThoi" INTEGER NOT NULL,
    "anhMoiNgay" INTEGER,
    "ttsMoiNgay" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "thien_su_han_muc_pkey" PRIMARY KEY ("hang")
);

CREATE TABLE IF NOT EXISTS "thien_su_cau_hinh" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "canhBaoUSDNgay" DECIMAL(10,2),
    "cauDaoUSDNgay" DECIMAL(10,2),
    "heSoMucSuyNghi" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "thien_su_cau_hinh_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "thien_su_nhat_ky_cau_hinh" (
    "id" TEXT NOT NULL,
    "doiTuong" VARCHAR(120) NOT NULL,
    "giaTriTruoc" JSONB,
    "giaTriSau" JSONB NOT NULL,
    "nguoiSuaId" TEXT NOT NULL,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thien_su_nhat_ky_cau_hinh_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "thien_su_luot_chan" (
    "id" TEXT NOT NULL,
    "nguoiDungId" TEXT,
    "loai" VARCHAR(30) NOT NULL,
    "chiTiet" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thien_su_luot_chan_pkey" PRIMARY KEY ("id")
);

-- ─── Chỉ mục ─────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "thien_su_maDinhDanh_key" ON "thien_su"("maDinhDanh");
CREATE INDEX IF NOT EXISTS "thien_su_chuSoHuuId_deletedAt_idx" ON "thien_su"("chuSoHuuId", "deletedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "thien_su_nhan_cach_thienSuId_phienBan_key" ON "thien_su_nhan_cach"("thienSuId", "phienBan");
CREATE INDEX IF NOT EXISTS "thien_su_hoi_thoai_nguoiDungId_deletedAt_tinNhanCuoiLuc_idx" ON "thien_su_hoi_thoai"("nguoiDungId", "deletedAt", "tinNhanCuoiLuc" DESC);
CREATE INDEX IF NOT EXISTS "thien_su_tin_nhan_hoiThoaiId_createdAt_idx" ON "thien_su_tin_nhan"("hoiThoaiId", "createdAt");
CREATE INDEX IF NOT EXISTS "thien_su_tin_nhan_nguoiDungId_vaiTro_createdAt_idx" ON "thien_su_tin_nhan"("nguoiDungId", "vaiTro", "createdAt");
CREATE INDEX IF NOT EXISTS "thien_su_tin_nhan_vaiTro_createdAt_idx" ON "thien_su_tin_nhan"("vaiTro", "createdAt");
CREATE INDEX IF NOT EXISTS "thien_su_mo_hinh_batTat_thuTu_idx" ON "thien_su_mo_hinh"("batTat", "thuTu");
CREATE INDEX IF NOT EXISTS "thien_su_nhat_ky_cau_hinh_createdAt_idx" ON "thien_su_nhat_ky_cau_hinh"("createdAt");
CREATE INDEX IF NOT EXISTS "thien_su_nhat_ky_cau_hinh_doiTuong_createdAt_idx" ON "thien_su_nhat_ky_cau_hinh"("doiTuong", "createdAt");
CREATE INDEX IF NOT EXISTS "thien_su_luot_chan_loai_createdAt_idx" ON "thien_su_luot_chan"("loai", "createdAt");
CREATE INDEX IF NOT EXISTS "thien_su_luot_chan_createdAt_idx" ON "thien_su_luot_chan"("createdAt");

-- ─── Khoá ngoại ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'thien_su_nhan_cach_thienSuId_fkey') THEN
    ALTER TABLE "thien_su_nhan_cach" ADD CONSTRAINT "thien_su_nhan_cach_thienSuId_fkey" FOREIGN KEY ("thienSuId") REFERENCES "thien_su"("id") ON DELETE CASCADE ON UPDATE CASCADE; -- idempotency-ok: guarded by pg_constraint check
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'thien_su_hoi_thoai_thienSuId_fkey') THEN
    ALTER TABLE "thien_su_hoi_thoai" ADD CONSTRAINT "thien_su_hoi_thoai_thienSuId_fkey" FOREIGN KEY ("thienSuId") REFERENCES "thien_su"("id") ON DELETE RESTRICT ON UPDATE CASCADE; -- idempotency-ok: guarded by pg_constraint check
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'thien_su_tin_nhan_hoiThoaiId_fkey') THEN
    ALTER TABLE "thien_su_tin_nhan" ADD CONSTRAINT "thien_su_tin_nhan_hoiThoaiId_fkey" FOREIGN KEY ("hoiThoaiId") REFERENCES "thien_su_hoi_thoai"("id") ON DELETE CASCADE ON UPDATE CASCADE; -- idempotency-ok: guarded by pg_constraint check
  END IF;
END
$$;

-- ═══ DỮ LIỆU KHỞI TẠO ═══════════════════════════════════════════════════════
-- Mọi INSERT đều `ON CONFLICT DO NOTHING`: chạy lại không ghi đè thứ admin đã sửa.
-- Gieo ngay trong migration để đường đọc không bao giờ phải ghi (tiền lệ
-- `home_brand_marquee_config`), và để tuyến chat có đủ dữ liệu từ lượt đầu.

-- Cattleya — Thiên Sứ mặc định của hệ thống. Ảnh do acta-agents tự phục vụ theo
-- `maDinhDanh`, nên `anhDaiDienUrl` để trống.
INSERT INTO "thien_su" ("id", "maDinhDanh", "ten", "tenDayDu", "laMacDinh", "updatedAt")
VALUES ('c4771e7a-0000-4000-8000-000000000001', 'cattleya', 'Cattleya', 'Thiên Sứ Hoa Lan Cattleya', true, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Nhân cách v1. Nguồn giọng điệu: `acta-agents/lib/thien-su.ts` (`CATTLEYA`,
-- `KICH_BAN_CHAO`) — Cattleya xưng "tôi", gọi "bạn".
INSERT INTO "thien_su_nhan_cach" ("id", "thienSuId", "phienBan", "noiDung", "ghiChu")
VALUES (
  'c4771e7a-0000-4000-8000-000000000101',
  'c4771e7a-0000-4000-8000-000000000001',
  1,
  '{
    "gioiThieu": "Cattleya — Thiên Sứ Hoa Lan, người đồng hành AI mặc định và gương mặt đại diện của ACTA.",
    "xungHo": { "tuXung": "tôi", "goiNguoiDung": "bạn" },
    "giongDieu": ["ấm", "thanh lịch", "rõ ràng", "điềm đạm", "hiện đại"],
    "tranhGiongDieu": ["trẻ con", "nhập vai thái quá", "ve vãn", "máy móc", "nói dài"],
    "tinhCach": [
      "lắng nghe trước khi khuyên",
      "thẳng thắn khi điều đó giúp được người dùng",
      "tò mò một cách tôn trọng về điều người dùng đang quan tâm",
      "kiên nhẫn, không phán xét"
    ],
    "cachTraLoi": [
      "câu ngắn, tự nhiên như người thật nói chuyện",
      "trả lời thẳng vào điều được hỏi trước, giải thích sau nếu cần",
      "dùng gạch đầu dòng khi liệt kê từ ba ý trở lên, còn lại viết thành đoạn",
      "khi người dùng buồn hay lo, ghi nhận cảm xúc trước rồi mới gợi ý"
    ],
    "dieuLuonLam": [
      "trả lời bằng tiếng Việt có dấu, trừ khi người dùng viết bằng ngôn ngữ khác",
      "nói rõ khi không chắc chắn",
      "hỏi lại khi câu hỏi mơ hồ thay vì đoán"
    ],
    "dieuKhongBaoGioLam": [
      "tự nhận là con người",
      "bịa ra điều người dùng chưa từng kể",
      "đưa lời khuyên y tế, pháp lý hay tài chính như thể thay thế chuyên gia",
      "ve vãn, gợi dục hay xây dựng quan hệ lãng mạn"
    ]
  }'::jsonb,
  'Bản đầu tiên, gieo từ migration giai đoạn 2.'
)
ON CONFLICT DO NOTHING;

-- Hạn mức theo hạng — số CHỐT 16/09/2026 (ADR 0003, HAN-MUC §5.1).
-- `null` = không trần. Sửa được bất kỳ lúc nào trong acta-admin.
INSERT INTO "thien_su_han_muc" ("hang", "luotMoiNgay", "luotMoi5Phut", "luotDongThoi", "anhMoiNgay", "ttsMoiNgay", "updatedAt")
VALUES
  ('thuong',      40,   10,   1, 5,    30,   CURRENT_TIMESTAMP),
  ('da_xac_minh', 120,  15,   2, 10,   90,   CURRENT_TIMESTAMP),
  ('nhan_vien',   300,  20,   3, 20,   200,  CURRENT_TIMESTAMP),
  ('quan_tri',    NULL, NULL, 5, NULL, NULL, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Ngân sách hệ thống (HAN-MUC §5.3) + hệ số lượt theo nấc suy nghĩ.
INSERT INTO "thien_su_cau_hinh" ("id", "canhBaoUSDNgay", "cauDaoUSDNgay", "heSoMucSuyNghi", "updatedAt")
VALUES ('singleton', 30.00, 120.00, '{"nhanh": 1, "can_bang": 1, "ky_luong": 2, "sau": 4}'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Danh mục mô hình. Giá đo 16/09/2026 (acta-agents/docs/HUONG-DAN-API-KEY.md §1.4, §2.4).
-- Tham số suy nghĩ Claude: chỉ Sonnet 5 / Opus 5 nhận `output_config.effort`
-- (Haiku 4.5 trả 400) — nên Haiku mang `banDoSuyNghi = NULL`.
-- GPT: mỗi mô hình nhận một TẬP CON của `reasoning.effort` và tài liệu không liệt
-- kê tập con từng mô hình, nên ánh xạ dùng các giá trị phổ biến nhất; chỉnh được
-- trong acta-admin. Mô hình của hãng chưa có khoá trên máy chủ tự ẩn khỏi ô chọn.
INSERT INTO "thien_su_mo_hinh"
  ("maMoHinh", "nhaCungCap", "tenHienThi", "moTaNgan", "bac",
   "giaVaoMoiTrieu", "giaRaMoiTrieu", "giaDocDemMoiTrieu", "giaGhiDemMoiTrieu",
   "heSoLuot", "banDoSuyNghi", "hangToiThieu", "dungChoTuDong", "batTat", "thuTu", "updatedAt")
VALUES
  ('claude-haiku-4-5', 'anthropic', 'Claude Haiku 4.5', 'Nhanh, hợp với trò chuyện hằng ngày.', 1,
   1.0000, 5.0000, 0.1000, 1.2500,
   1, NULL, 'thuong', true, true, 10, CURRENT_TIMESTAMP),
  ('claude-sonnet-5', 'anthropic', 'Claude Sonnet 5', 'Cân bằng giữa tốc độ và chiều sâu.', 2,
   2.0000, 10.0000, 0.2000, 2.5000,
   2, '{"nhanh": "low", "can_bang": "medium", "ky_luong": "high", "sau": "max"}'::jsonb, 'thuong', true, true, 20, CURRENT_TIMESTAMP),
  ('claude-opus-5', 'anthropic', 'Claude Opus 5', 'Mạnh nhất cho câu hỏi khó, trả lời chậm hơn.', 3,
   5.0000, 25.0000, 0.5000, 6.2500,
   5, '{"nhanh": "low", "can_bang": "medium", "ky_luong": "high", "sau": "max"}'::jsonb, 'thuong', true, true, 30, CURRENT_TIMESTAMP),
  ('gpt-5.6-luna', 'openai', 'GPT-5.6 Luna', 'Nhanh và nhẹ của OpenAI.', 1,
   0.2000, 1.2000, 0.0200, NULL,
   1, '{"nhanh": "low", "can_bang": "low", "ky_luong": "medium", "sau": "high"}'::jsonb, 'thuong', true, true, 40, CURRENT_TIMESTAMP),
  ('gpt-5.6-terra', 'openai', 'GPT-5.6 Terra', 'Cân bằng của OpenAI.', 2,
   2.0000, 12.0000, 0.2000, NULL,
   2, '{"nhanh": "low", "can_bang": "medium", "ky_luong": "high", "sau": "high"}'::jsonb, 'thuong', true, true, 50, CURRENT_TIMESTAMP),
  ('gpt-5.6-sol', 'openai', 'GPT-5.6 Sol', 'Mạnh của OpenAI.', 3,
   4.0000, 20.0000, 0.4000, NULL,
   5, '{"nhanh": "low", "can_bang": "medium", "ky_luong": "high", "sau": "high"}'::jsonb, 'thuong', true, true, 60, CURRENT_TIMESTAMP),
  -- Đắt nhất bảng ($10/$50): TẮT mặc định, chỉ quản trị viên chọn được khi bật.
  ('claude-fable-5-1', 'anthropic', 'Claude Fable 5.1', 'Cao cấp nhất, chi phí rất cao.', 3,
   -- Đọc đệm ghi 1,00 (= 10% giá vào) dù bảng giá đo ghi 0,25: con số đó lệch
   -- hẳn quy luật 10% của mọi dòng khác nên nghi là nhầm; ước tính là CẬN TRÊN,
   -- chọn số lớn hơn là sai theo hướng an toàn.
   10.0000, 50.0000, 1.0000, 12.5000,
   10, '{"nhanh": "low", "can_bang": "medium", "ky_luong": "high", "sau": "max"}'::jsonb, 'quan_tri', false, false, 70, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
