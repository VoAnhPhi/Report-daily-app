-- Thù lao giới thiệu cổ đông: loại thông báo gửi người nhận khi được cộng tiền.
--
-- ĐỨNG RIÊNG MỘT MIGRATION, cùng lý do với 20260909201000: Postgres cấm dùng một
-- giá trị enum trong CÙNG transaction đã `ADD VALUE` nó ("unsafe use of new value").
-- Migration này chỉ THÊM giá trị; mã chạy mới dùng nó, ở một transaction khác.
-- Postgres 15+ (Supabase) cho `ALTER TYPE ... ADD VALUE` chạy trong transaction
-- của `prisma migrate deploy`, và `IF NOT EXISTS` làm nó chạy lại được (§38).
ALTER TYPE "NotificationAction" ADD VALUE IF NOT EXISTS 'shareholder_referral_rewarded';
