-- Khôi phục hàm `acta_immutable_unaccent` + 2 chỉ mục trigram phục vụ ô gợi ý
-- `@` của trang xã hội (mention-search).
--
-- BỐI CẢNH: migration gốc tạo các đối tượng này
-- (prisma/migrations-luu-tru/20260825000100_users_unaccent_mention_search)
-- nằm trong thư mục ARCHIVE, không phải `prisma/migrations/` đang active —
-- baseline chốt lại 27/08 (2 ngày sau) không mang theo nó. Kết quả: hàm chưa
-- từng được tạo trên các DB dựng từ baseline đó, trong khi
-- `user-search.service.ts#searchMentionCandidates` vẫn gọi raw SQL dùng hàm
-- này → mọi lượt gọi `/users/mention-search` lỗi 500
-- ("function acta_immutable_unaccent(unknown) does not exist"), khiến tính
-- năng gắn thẻ bằng `@` trong bài viết ngừng hoạt động hoàn toàn.
--
-- Nội dung SQL dưới đây giữ NGUYÊN bản gốc — vốn đã viết idempotent
-- (CREATE OR REPLACE FUNCTION, CREATE INDEX IF NOT EXISTS) nên chạy lại an
-- toàn kể cả trên một DB đã có sẵn các đối tượng này.

DO $$
DECLARE
  schema_unaccent text;
BEGIN
  SELECT n.nspname INTO schema_unaccent
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
   WHERE e.extname = 'unaccent';

  IF schema_unaccent IS NULL THEN
    RAISE EXCEPTION 'Chưa cài extension "unaccent" — không tạo được hàm bỏ dấu';
  END IF;

  EXECUTE format(
    'CREATE OR REPLACE FUNCTION public.acta_immutable_unaccent(text) '
    'RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT '
    'SET search_path = %I, public, pg_temp '
    'AS $fn$ SELECT unaccent($1) $fn$',
    schema_unaccent
  ); -- idempotency-ok: CREATE OR REPLACE
END
$$;

DO $$
DECLARE
  schema_trgm text;
BEGIN
  SELECT n.nspname INTO schema_trgm
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
   WHERE e.extname = 'pg_trgm';

  IF schema_trgm IS NULL THEN
    RAISE EXCEPTION 'Chưa cài extension "pg_trgm" — không tạo được chỉ mục trigram';
  END IF;

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS users_fullname_unaccent_trgm_idx '
    'ON users USING gin (lower(public.acta_immutable_unaccent("fullName")) %I.gin_trgm_ops)',
    schema_trgm
  ); -- idempotency-ok: IF NOT EXISTS

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS users_referenceid_lower_trgm_idx '
    'ON users USING gin (lower("referenceId") %I.gin_trgm_ops)',
    schema_trgm
  ); -- idempotency-ok: IF NOT EXISTS
END
$$;
