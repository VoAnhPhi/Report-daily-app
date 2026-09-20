-- Truy vết nguồn gốc tài khoản + ghi lại CÁCH người giới thiệu được gắn.
-- Quyết định chủ dự án 2026-09-11, sau ca VN-19984 (tài khoản tự sinh từ đơn khách
-- vãng lai, không ai biết nó đến từ luồng nào cho tới khi phải đi suy từ ngày sinh giả).
--
-- Vì sao phải là CỘT chứ không phải nhật ký: `activity_logs` xoá sau 365 ngày
-- (logs-retention/retention-policy.config.ts), và luồng khách vãng lai KHÔNG ghi log nào.
--
-- Idempotent theo §38: IF NOT EXISTS trên mọi đối tượng; enum bọc trong DO guard.

-- CreateEnum: luồng đã tạo ra tài khoản.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RegistrationChannel') THEN
    CREATE TYPE "RegistrationChannel" AS ENUM ('register_web', 'guest_checkout', 'admin_created', 'business_owner', 'game_otp', 'partner_api', 'backfill_import', 'kiotviet_import', 'unknown'); -- idempotency-ok: guarded by pg_type check
  END IF;
END
$$;

-- CreateEnum: giá trị luồng là KHAI lúc tạo hay SUY ĐOÁN về sau.
-- Tách riêng là cố ý — gộp vào cùng một cột thì vĩnh viễn không phân biệt được
-- "đo được" với "đoán", đúng lớp lỗi số-0-im-lặng đã trả giá nhiều lần ở kho này.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RegistrationChannelConfidence') THEN
    CREATE TYPE "RegistrationChannelConfidence" AS ENUM ('declared', 'inferred', 'unknown'); -- idempotency-ok: guarded by pg_type check
  END IF;
END
$$;

-- CreateEnum: người giới thiệu đến từ đâu.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReferrerAssignment') THEN
    CREATE TYPE "ReferrerAssignment" AS ENUM ('user_link', 'house_default', 'admin_assigned', 'none'); -- idempotency-ok: guarded by pg_type check
  END IF;
END
$$;

-- Cột mới. Mặc định 'unknown' là CỐ Ý: hàng cũ chưa suy đoán phải nói "không biết",
-- không được mang một giá trị cụ thể mà không ai đo.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "registrationChannel" "RegistrationChannel" NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "registrationChannelConfidence" "RegistrationChannelConfidence" NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "referrerAssignment" "ReferrerAssignment";

-- ⚠ TÊN INDEX PHẢI KHỚP TÊN PRISMA TỰ SINH (Postgres cắt còn 63 ký tự). Hai tên dưới
-- đây được lấy từ chính đầu ra của:
--   prisma migrate diff --from-empty --to-schema-datamodel prisma/schema --script
CREATE INDEX IF NOT EXISTS "users_registrationChannel_createdAt_idx"
  ON "users" ("registrationChannel", "createdAt");

CREATE INDEX IF NOT EXISTS "users_referrerAssignment_createdAt_idx"
  ON "users" ("referrerAssignment", "createdAt");
