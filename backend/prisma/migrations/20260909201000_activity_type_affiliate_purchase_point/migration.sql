-- Thêm ActivityType cho điểm thưởng liên kết ("Phiếu ghi nhận điểm").
--
-- ĐỨNG RIÊNG MỘT MIGRATION: Postgres cấm dùng một giá trị enum vừa `ADD VALUE` trong
-- cùng transaction đã thêm nó, mà Prisma bọc mỗi file migration trong một transaction.
-- File này CHỈ thêm giá trị, không có DDL/DML nào tham chiếu nó.
-- Cùng tiền lệ với 20260906120000_commission_level_f8_retail_community.
--
-- ⚠ Thêm giá trị vào enum này KHÔNG phải thao tác trơ: `ACTIVITY_TYPE_TIERS` trong
-- src/logs-retention/retention-policy.config.ts khai `Record<ActivityType, RetentionTier>`
-- và tệp đó THROW ngay ở tầng module khi thiếu ánh xạ ⇒ quên khai là API KHÔNG BOOT.
-- Ánh xạ đã thêm trong cùng đợt này, tier HOT.

ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'AFFILIATE_PURCHASE_POINT_AWARDED';
