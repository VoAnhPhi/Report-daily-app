-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  BÀI VIẾT GẮN ĐIỂM CẦU + CẤP ĐỘ KHO                                        ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- Tin đăng lên một điểm cầu KHÔNG có bảng riêng: nó là một `Post` của mạng xã
-- hội, chỉ khác ở chỗ có gắn kho. Nhờ vậy cảm xúc, bình luận, lưu bài, đăng lại,
-- kiểm duyệt và realtime dùng chung một hệ — không phải làm lần thứ hai.

-- ── 1. posts.warehouseId ────────────────────────────────────────────────────
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "warehouseId" TEXT;

CREATE INDEX IF NOT EXISTS "posts_warehouseId_idx" ON "posts"("warehouseId");

-- Khớp đúng khuôn chỉ số feed đang có (`isPublished, deletedAt, publishedAt`).
-- Thiếu nó thì mở tab Tin của một điểm cầu là một lượt quét toàn bảng `posts`.
CREATE INDEX IF NOT EXISTS "posts_warehouseId_isPublished_deletedAt_publishedAt_idx"
  ON "posts"("warehouseId", "isPublished", "deletedAt", "publishedAt");

-- Postgres không có `IF NOT EXISTS` cho `ADD CONSTRAINT` ⇒ bọc trong DO có guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_warehouseId_fkey'
  ) THEN
    -- ⚠ ON DELETE SET NULL, KHÔNG phải CASCADE: xoá một điểm cầu không được kéo
    -- theo bài viết của người dùng. Bài mất dấu điểm cầu thì vẫn là một bài
    -- social hợp lệ, còn xoá nó là xoá nội dung của người khác vì một thao tác
    -- quản trị họ không liên quan.
    --
    -- ⚠ `idempotency-ok` PHẢI nằm ngay trên dòng `ADD CONSTRAINT`, không phải ở
    -- khối chú thích phía trên. `scripts/check-migration-idempotency.sh` quét
    -- theo TỪNG DÒNG và chỉ tha khi thấy marker trên chính dòng bị bắt.
    ALTER TABLE "posts"
      ADD CONSTRAINT "posts_warehouseId_fkey" -- idempotency-ok: guarded bằng pg_constraint ở IF NOT EXISTS ngay trên.
      FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- ── 2. warehouses.level ─────────────────────────────────────────────────────
-- Cấp độ kho 1–5, chỉ quản trị viên sửa được. Khoảng giá trị chốt ở tầng validate
-- của ứng dụng, KHÔNG ở kiểu dữ liệu — nới trần sau này thì không phải chạy
-- migration cho một con số.
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "level" INTEGER NOT NULL DEFAULT 1;

-- Kho đã có từ trước nhận cấp 1. Viết tường minh thay vì chỉ dựa vào DEFAULT:
-- chạy lại là no-op, và nó nói rõ ý định cho người đọc migration sau này.
UPDATE "warehouses" SET "level" = 1 WHERE "level" IS NULL;
