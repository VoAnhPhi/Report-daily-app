-- Thêm trạng thái `draft` cho Phiếu ghi nhận điểm (điểm thưởng liên kết).
--
-- Chủ điểm cầu được lưu NHÁP và trả phí dịch vụ sau bất kỳ lúc nào, nên phiếu cần
-- một trạng thái đứng TRƯỚC `pending`: chưa có mã phiếu, chưa tính phí, quản trị
-- chưa nhìn thấy.
--
-- ĐỨNG RIÊNG MỘT MIGRATION: Postgres không cho dùng một giá trị enum vừa được
-- `ALTER TYPE ... ADD VALUE` trong CÙNG transaction đã thêm nó ("unsafe use of new
-- value"), mà Prisma bọc mỗi file migration trong một transaction. File này CHỈ
-- thêm giá trị, không có DDL/DML nào tham chiếu 'draft' — đừng gộp thêm vào đây.
-- Cùng tiền lệ với 20260906120000_commission_level_f8_retail_community.
--
-- `BEFORE 'pending'` để thứ tự trong CSDL khớp thứ tự logic của vòng đời phiếu.
-- Idempotent (IF NOT EXISTS) để `migrate deploy` an toàn bất kể trạng thái DB.

ALTER TYPE "AffiliatePurchasePointRequestStatus" ADD VALUE IF NOT EXISTS 'draft' BEFORE 'pending';
