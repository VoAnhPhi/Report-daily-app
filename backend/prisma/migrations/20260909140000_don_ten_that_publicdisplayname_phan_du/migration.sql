-- Phần dư của việc dọn họ tên CTV: những dòng mà `publicDisplayName` KHÔNG bằng
-- đúng `name`, nhưng vẫn mang mã CTV.
--
-- ── VÌ SAO CẦN LƯỢT THỨ HAI ─────────────────────────────────────────────────
-- Migration `20260909120000` chỉ xoá khi `btrim(publicDisplayName) = btrim(name)`
-- — cố ý hẹp, để không đụng vào một bí danh công khai do người vận hành nghĩ ra.
-- Đo sống trên dev sau lượt đầu: 476 dòng rò → còn **1**. Dòng sót có dạng
-- `VN-NNNNN- <Họ tên> - <TỈNH>`, thiếu đúng MỘT dấu cách so với `name`, nên phép
-- so bằng trượt. Một lỗi gõ đủ để giữ một cái tên thật trên bản đồ công khai.
--
-- ── LÝ LẼ ĐỂ NỚI, VÀ RANH GIỚI CỦA NÓ ───────────────────────────────────────
-- Một cái tên do người ta CHỌN để hiện ra cho khách thì **không chứa mã nội bộ
-- `vn-NNNNN`**. Mã ấy chỉ có mặt khi giá trị là bản chép từ tên nội bộ — kể cả
-- bản chép có lỗi gõ. Nên điều kiện mới đọc CHÍNH `publicDisplayName`, thôi so
-- nó với `name`.
--
-- ⚠ Vẫn giữ vế `name ~* 'vn-...'`, và đây là vế dễ bị bỏ nhất: nó bảo đảm sau
-- khi xoá thì nhánh 2 của `cheTenCongKhai()` CÓ mã để dựng ra `Điểm cầu
-- vn-NNNNN`. Thiếu vế này, một dòng có mã ở `publicDisplayName` mà không có ở
-- `name` sẽ rơi xuống nhánh 3 và phơi nguyên `name` — tức xoá xong lại rò theo
-- một đường khác, và lần này im lặng hơn.
--
-- KHÔNG đụng: bí danh thật (`Điểm cầu Queency Spa`), và mọi điểm cầu hạ tầng
-- không mang mã CTV (`Điểm cầu trung tâm miền bắc`…).
--
-- Idempotent: lần chạy thứ hai khớp 0 dòng. Không có DDL nên không cần guard.

UPDATE "warehouses"
SET "publicDisplayName" = NULL
WHERE "publicDisplayName" IS NOT NULL
  AND "publicDisplayName" ~* 'vn-[0-9]{4,}'
  AND "name" ~* 'vn-[0-9]{4,}';
