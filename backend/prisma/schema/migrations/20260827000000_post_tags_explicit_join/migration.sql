-- Chuyển quan hệ gắn thẻ bài viết từ m2m NGẦM (`_TaggedPosts`, chỉ hai cột khoá
-- ngoại) sang model nối TƯỜNG MINH `post_tags`, để mỗi lượt gắn thẻ mang được
-- quyết định riêng của người được gắn thẻ:
--   * hiddenFromProfileAt — ẩn bài khỏi trang cá nhân của mình (đảo được)
--   * removedAt           — gỡ thẻ hẳn (không đảo, giữ bia mộ để kiểm toán)
--
-- ⚠ Migration này CỐ Ý KHÔNG xoá `_TaggedPosts`. Bảng cũ chỉ được xoá ở một
-- migration SAU, khi mọi đường đọc/ghi đã chuyển hẳn và đã chạy ổn trên môi
-- trường thật. Xoá cùng lúc sẽ khiến phiên bản đang chạy mất dữ liệu ngay khi
-- migration apply, trong khoảng giữa lúc migrate và lúc mã mới lên.

-- 1. Bảng nối tường minh
CREATE TABLE IF NOT EXISTS "post_tags" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hiddenFromProfileAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "post_tags_pkey" PRIMARY KEY ("id")
);

-- 2. Ràng buộc duy nhất: một người chỉ có MỘT dòng thẻ trên một bài. Gắn thẻ lại
--    sau khi gỡ là cập nhật `removedAt = NULL`, không phải chèn dòng thứ hai.
CREATE UNIQUE INDEX IF NOT EXISTS "post_tags_postId_userId_key" ON "post_tags"("postId", "userId");

-- 3. Chỉ mục phục vụ đúng hai đường đọc
CREATE INDEX IF NOT EXISTS "post_tags_userId_removedAt_hiddenFromProfileAt_idx"
    ON "post_tags"("userId", "removedAt", "hiddenFromProfileAt");
CREATE INDEX IF NOT EXISTS "post_tags_postId_removedAt_idx"
    ON "post_tags"("postId", "removedAt");

-- 4. Khoá ngoại — Postgres không có `ADD CONSTRAINT IF NOT EXISTS`
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'post_tags_postId_fkey' AND t.relname = 'post_tags' AND n.nspname = 'public'
  ) THEN
    ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE; -- idempotency-ok: ADD CONSTRAINT khong co dang IF NOT EXISTS, da boc guard o tren
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'post_tags_userId_fkey' AND t.relname = 'post_tags' AND n.nspname = 'public'
  ) THEN
    ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; -- idempotency-ok: ADD CONSTRAINT khong co dang IF NOT EXISTS, da boc guard o tren
  END IF;
END $$;

-- 5. Backfill từ bảng nối ngầm. `_TaggedPosts."A"` = posts.id, `"B"` = users.id
--    (thứ tự cột do Prisma xếp theo tên model).
--
--    `id` sinh TẤT ĐỊNH từ cặp khoá bằng md5() — hàm lõi trong `pg_catalog`, nên
--    không phụ thuộc pgcrypto/uuid-ossp (các extension đó nằm ở schema
--    `extensions`, NGOÀI search_path, gọi không qualify sẽ lỗi). Tất định nghĩa
--    là chạy lại migration sinh đúng id cũ, nên `ON CONFLICT DO NOTHING` thực sự
--    là no-op chứ không nhân bản dòng với id mới.
INSERT INTO "post_tags" ("id", "postId", "userId", "createdAt")
SELECT
    md5('post_tag:' || tp."A" || ':' || tp."B")::uuid::text,
    tp."A",
    tp."B",
    COALESCE(p."createdAt", CURRENT_TIMESTAMP)
FROM "_TaggedPosts" tp
JOIN "posts" p ON p."id" = tp."A"
JOIN "users" u ON u."id" = tp."B"
ON CONFLICT ("postId", "userId") DO NOTHING;
