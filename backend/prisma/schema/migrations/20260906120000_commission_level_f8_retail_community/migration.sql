-- Thêm giá trị enum F8 cho rail hoa hồng "chia thêm cộng đồng" trên sản phẩm lẻ kho CTV.
--
-- F8 là phần chia thêm 5% cho quỹ cộng đồng (cùng người nhận với F0) trên các dòng
-- hàng lẻ bán ra từ kho CTV, tính trên base sau-VAT-sau-532. Đứng song song rail F7.
--
-- ĐỨNG RIÊNG MỘT MIGRATION: Postgres không cho dùng một giá trị enum vừa được
-- `ALTER TYPE ... ADD VALUE` trong CÙNG transaction đã thêm nó ("unsafe use of new
-- value"). Prisma bọc mỗi file migration trong một transaction. Migration này chỉ
-- THÊM giá trị, không UPDATE/ghi dữ liệu dùng F8, nên an toàn; đừng gộp thêm DDL/DML
-- có tham chiếu 'F8' vào file này.
--
-- Postgres 15+ (Supabase): `ALTER TYPE ... ADD VALUE` chạy được trong migration đơn
-- — cùng tiền lệ với 20260825000000_daily_report_question_kind_split.
-- Idempotent (IF NOT EXISTS) để `migrate deploy` an toàn bất kể trạng thái DB.

ALTER TYPE "CommissionLevel" ADD VALUE IF NOT EXISTS 'F8';
