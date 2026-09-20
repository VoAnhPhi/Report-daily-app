-- Đổi tên unique index của shareholder_referral_rewards cho khớp tên Prisma sinh.
--
-- Migration 20260910210000_shareholder_referral_reward đặt tên
-- "shareholder_referral_rewards_beneficiaryId_sourceUserId_level_key" (65 ký tự).
-- Postgres cắt định danh còn 63 ký tự, nên index thật trên CSDL mang tên
-- "shareholder_referral_rewards_beneficiaryId_sourceUserId_level_k", trong khi
-- Prisma (@@unique([beneficiaryId, sourceUserId, level])) sinh
-- "shareholder_referral_rewards_beneficiaryId_sourceUserId_lev_key" — đo bằng
-- `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema --script`.
-- Lệch tên ⇒ `migrate diff` báo drift mãi mãi, và một lần `migrate dev` sau sẽ tạo
-- THÊM một unique index trùng nội dung. Không sửa migration đã commit (§38): đổi
-- tên ở migration mới này.
--
-- Các tên còn lại của migration gốc đều ≤ 63 ký tự và khớp từng ký tự với Prisma:
-- shareholder_referral_rewards_pkey, _beneficiaryId_createdAt_idx,
-- _sourceUserId_idx, _beneficiaryId_fkey, _sourceUserId_fkey.
--
-- Idempotent: chỉ đổi tên khi tên CŨ (bản đã bị cắt) còn trên bảng này VÀ tên MỚI
-- chưa bị quan hệ nào trong schema chiếm. Chạy lại, hoặc chạy trên CSDL đã mang tên
-- đúng, là no-op.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema()
      AND tablename = 'shareholder_referral_rewards'
      AND indexname = 'shareholder_referral_rewards_beneficiaryId_sourceUserId_level_k'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = current_schema()
      AND c.relname = 'shareholder_referral_rewards_beneficiaryId_sourceUserId_lev_key'
  ) THEN
    ALTER INDEX "shareholder_referral_rewards_beneficiaryId_sourceUserId_level_k" RENAME TO "shareholder_referral_rewards_beneficiaryId_sourceUserId_lev_key";
  END IF;
END
$$;
