-- Nhật ký cho thao tác "người vận hành gán người giới thiệu".
-- Thao tác đó DỜI CẢ NHÁNH trong cây tuyến nên phải để lại dấu vết ai làm, lúc nào,
-- từ ai sang ai, vì lý do gì.
--
-- ⚠ Chỉ ADD VALUE, KHÔNG BAO GIỜ `RENAME VALUE` (§38/§49): rename không idempotent và
-- nó viết đè lên các dòng lịch sử đã mang nhãn cũ.
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'USER_REFERRER_ASSIGNED'; -- idempotency-ok: IF NOT EXISTS
