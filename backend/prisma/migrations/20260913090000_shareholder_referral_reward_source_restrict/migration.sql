-- REWARD-LEDGER-RESTRICT (chủ dự án chốt 13/09/2026)
--
-- `shareholder_referral_rewards` là SỔ TIỀN ĐÃ TRẢ cho upline: recompute ví cộng
-- Σ(amount) theo `beneficiaryId` vào `availableBalance`. Ràng buộc cũ trên
-- `sourceUserId` là ON DELETE CASCADE, nên xoá một downline sẽ XOÁ các dòng sổ
-- ấy và upline mất tiền đã được trả — im lặng, ở lượt recompute kế tiếp.
--
-- Đổi sang RESTRICT: CSDL từ chối xoá người đang là nguồn của một khoản đã trả.
-- Ứng dụng có cổng nói rõ lý do ở `user-deletion.service.ts`; ba đường xoá còn
-- lại (rollback đăng ký hỏng, `user.service.remove`, backfill) sẽ nhận P2003 —
-- ầm ĩ, và đó đúng là điều mong muốn so với mất tiền không dấu vết.
--
-- Tương thích ngược (quay lui container KHÔNG quay lui lược đồ): mã cũ chưa bao
-- giờ DỰA vào việc cascade xảy ra, nó chỉ vô tình hưởng hậu quả.

-- DropForeignKey + AddForeignKey (RESTRICT)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shareholder_referral_rewards_sourceUserId_fkey' AND confdeltype = 'c') THEN
    ALTER TABLE "shareholder_referral_rewards" DROP CONSTRAINT "shareholder_referral_rewards_sourceUserId_fkey"; -- idempotency-ok: guarded by pg_constraint check (chỉ gỡ khi còn là CASCADE)
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shareholder_referral_rewards_sourceUserId_fkey') THEN
    ALTER TABLE "shareholder_referral_rewards" ADD CONSTRAINT "shareholder_referral_rewards_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; -- idempotency-ok: guarded by pg_constraint check
  END IF;
END
$$;
