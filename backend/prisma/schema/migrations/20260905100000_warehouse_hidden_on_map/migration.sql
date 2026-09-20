-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  ẨN ĐIỂM CẦU KHỎI BẢN ĐỒ CÔNG KHAI — `warehouses.hiddenOnMap`              ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- Người trực bản đồ Thổ địa cần gỡ một điểm cầu khỏi acta-solutions ngay lập tức
-- (địa chỉ sai, ảnh sai, điểm chưa sẵn sàng đón khách) mà KHÔNG được đụng tới
-- nghiệp vụ kho.
--
-- ⚠ VÌ SAO KHÔNG MƯỢN `isActive`: `isActive` là cờ NGHIỆP VỤ — nó nằm trong
-- `CHI_KHO_CHINH = { isActive: true, type: MAIN }` (`diem-cau.service.ts:83`),
-- tức là bộ lọc quyết định kho có được chọn để bán, để xuất hàng và để tính điểm
-- cầu gần khách nhất hay không. Mượn nó làm công tắc bản đồ nghĩa là một thao
-- tác "giấu điểm khỏi bản đồ" sẽ âm thầm TẮT LUÔN kho khỏi luồng bán và giao
-- hàng. Hai ý nghĩa khác nhau thì phải là hai cột khác nhau.
--
-- ⚠ VÌ SAO KHÔNG DÙNG `business_locations.visibilityStatus` CỦA MẶT CÔNG KHAI:
-- mặt công khai chỉ tồn tại khi `warehouses.businessLocationId` khác NULL, mà
-- `taoMatCongKhai` còn đòi kho có ĐÚNG 1 `WarehouseBusinessScope`
-- (`diem-cau.service.ts:637-700`). Với mọi kho chưa mở mặt công khai — nhóm
-- đông nhất — cách đó không cho tay nắm nào cả.
--
-- Mặc định FALSE ⇒ mọi điểm đang chạy giữ nguyên hành vi. Migration này không
-- đổi thứ khách đang nhìn thấy.

ALTER TABLE "warehouses"
  ADD COLUMN IF NOT EXISTS "hiddenOnMap" BOOLEAN NOT NULL DEFAULT false;

-- Viết tường minh thay vì chỉ trông vào DEFAULT: chạy lại là no-op, và nó nói rõ
-- ý định cho người đọc migration sau này (cùng khuôn với `warehouses.level` ở
-- 20260903000000).
UPDATE "warehouses" SET "hiddenOnMap" = false WHERE "hiddenOnMap" IS NULL;

-- Chỉ số phục vụ đường ĐỌC công khai: `layDanhSachCongKhai` lọc kho theo
-- `isActive` + `type` rồi nay thêm `hiddenOnMap`. Kho ẩn là thiểu số nên chỉ số
-- một phần (partial) giữ được kích thước nhỏ mà vẫn cắt được đúng nhóm cần loại.
CREATE INDEX IF NOT EXISTS "warehouses_hiddenOnMap_idx"
  ON "warehouses"("hiddenOnMap")
  WHERE "hiddenOnMap" = true;
