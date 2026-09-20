-- Thêm hai giá trị enum cho bộ 4 câu hỏi mới của Báo cáo hằng ngày.
--
-- Bộ cũ:  today · done_blocked · need_help · tomorrow
-- Bộ mới: done  · blocked      · need_help · tomorrow
--
-- `today` bị bỏ vai, `done_blocked` tách đôi. Hai giá trị cũ VẪN Ở LẠI trong
-- enum: `daily_report_answers.questionKind` là bản chụp tại thời điểm sinh
-- report, nên mọi báo cáo đã nộp từ 14/08 tới nay đang mang chúng. Bỏ khỏi enum
-- là làm hỏng toàn bộ lịch sử.
--
-- VÌ SAO ĐỨNG RIÊNG MỘT MIGRATION: Postgres không cho dùng một giá trị enum vừa
-- được `ALTER TYPE ... ADD VALUE` trong CÙNG transaction đã thêm nó
-- ("unsafe use of new value"). Prisma bọc mỗi file migration trong một
-- transaction, nên phần UPDATE dữ liệu phải nằm ở file kế tiếp
-- (`20260825010000_daily_report_four_questions_rework`). Gộp hai file lại là
-- migration chết ngay khi apply.
--
-- Postgres 15+ (Supabase): `ALTER TYPE ... ADD VALUE` chạy được trong migration
-- đơn — cùng tiền lệ với `20260528000002_add_checkout_hold_sweep_activity_type`.

ALTER TYPE "DailyReportQuestionKind" ADD VALUE IF NOT EXISTS 'done';
ALTER TYPE "DailyReportQuestionKind" ADD VALUE IF NOT EXISTS 'blocked';
