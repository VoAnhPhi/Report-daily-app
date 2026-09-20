-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  BÀI ƯU ĐÃI — một cột neo trên `posts`                                     ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- Ưu đãi của một địa điểm KHÔNG có bảng riêng và KHÔNG có trường dữ liệu riêng:
-- nó là một `Post` bình thường mang cờ `postType = 'offer'`. Tiêu đề, mức giảm,
-- hạn dùng đều viết trong `content` như mọi bài khác. Nhờ vậy cảm xúc, bình
-- luận, lưu bài, kiểm duyệt và realtime dùng chung một hệ — cùng lý do như tin
-- điểm cầu ở migration 20260903000000.
--
-- Ưu đãi của ĐIỂM CẦU neo vào `posts.warehouseId` (đã có sẵn); cột thêm dưới đây
-- chỉ phục vụ ưu đãi của ĐỊA ĐIỂM KINH DOANH, thứ không có kho nào để trỏ tới.
--
-- ⚠ ĐỪNG nhầm với `voucher_templates` (ưu đãi do quản trị viên phát hành, có mã
-- voucher và hàng đợi duyệt `voucher_reviews`). Hai thứ cùng hiện trong tab
-- "Ưu đãi" của acta-solutions nhưng không thay thế nhau.
--
-- Cột NULLABLE và KHÔNG có backfill — `posts` là bảng dùng chung với acta-social,
-- nên mọi thứ thêm vào đây phải vô hại với đường đọc đang chạy.

ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "businessLocationId" TEXT;

CREATE INDEX IF NOT EXISTS "posts_businessLocationId_idx"
  ON "posts"("businessLocationId");

-- Khớp đúng khuôn chỉ số feed đang có (`isPublished, deletedAt, publishedAt`),
-- y như cặp chỉ số của `warehouseId`. Thiếu nó thì mỗi lần mở tab Ưu đãi của
-- một địa điểm là một lượt quét toàn bảng `posts`.
CREATE INDEX IF NOT EXISTS "posts_businessLocationId_isPublished_deletedAt_publishedAt_idx"
  ON "posts"("businessLocationId", "isPublished", "deletedAt", "publishedAt");

-- Postgres không có `IF NOT EXISTS` cho `ADD CONSTRAINT` ⇒ bọc trong DO có guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_businessLocationId_fkey'
  ) THEN
    -- ⚠ ON DELETE SET NULL, KHÔNG phải CASCADE — cùng lập luận với
    -- `posts_warehouseId_fkey`: gỡ một địa điểm không được xoá nội dung mà
    -- người dùng đã viết.
    --
    -- ⚠ `idempotency-ok` PHẢI nằm ngay trên dòng `ADD CONSTRAINT`.
    -- `scripts/check-migration-idempotency.sh` quét theo TỪNG DÒNG.
    ALTER TABLE "posts"
      ADD CONSTRAINT "posts_businessLocationId_fkey" -- idempotency-ok: guarded bằng pg_constraint ở IF NOT EXISTS ngay trên.
      FOREIGN KEY ("businessLocationId") REFERENCES "business_locations"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
