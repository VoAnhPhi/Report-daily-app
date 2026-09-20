-- Báo cáo kho chuyển từ HẰNG NGÀY sang HẰNG TUẦN (2026-09-17).
-- Lịch mới: 23:00 UTC Chủ nhật = 06:00 sáng thứ Hai giờ Việt Nam, báo cáo tuần vừa kết thúc.
-- Cả hai câu đều chạy lại được an toàn: SET DEFAULT ghi đè cùng giá trị, UPDATE chỉ
-- chạm dòng còn giữ lịch hằng ngày MẶC ĐỊNH cũ — lịch quản trị viên đã tự chỉnh thì giữ nguyên.

ALTER TABLE "warehouse_report_configs" ALTER COLUMN "cronExpression" SET DEFAULT '0 23 * * 0';

UPDATE "warehouse_report_configs"
SET "cronExpression" = '0 23 * * 0',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "cronExpression" = '0 23 * * *';
