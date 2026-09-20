-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  GIỜ HOẠT ĐỘNG MẶC ĐỊNH CHO ĐIỂM CẦU ĐANG CÓ — 8h00→17h30, nghỉ CN       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Chủ dự án chốt 09/09/2026. Đường TẠO MỚI đã điền sẵn bảy dòng này
-- (`diem-cau-kyc.helper.ts`); migration lo phần điểm cầu ĐÃ CÓ mà chưa khai giờ.
--
-- ⚠ VÌ SAO PHẢI ĐIỀN, KHÔNG PHẢI "ĐỂ TRỐNG CHO AN TOÀN": hợp đồng công khai quy
--   ước **kho KHÔNG có dòng giờ nào ⇒ `isOpenNow = true`**. Để trống không phải
--   trạng thái trung tính "chưa biết" — nó là lời khẳng định "mở 24/7". Mọi điểm
--   cầu chưa khai giờ đang nói với khách rằng nó mở lúc 2 giờ sáng Chủ nhật.
--
-- ⚠ Chủ nhật ghi thành MỘT DÒNG `isClosedAllDay = true` với hai giờ `NULL`, chứ
--   không bỏ dòng ấy đi: vắng dòng rơi vào nhánh "không có bảng giờ" (⇒ mở),
--   còn dòng `isClosedAllDay` mới thật sự nói "hôm nay nghỉ". Ghi kèm giờ mở
--   trong một dòng đóng cả ngày là dữ liệu tự mâu thuẫn.
--
-- §38: chạy lại được nhiều lần.

INSERT INTO "warehouse_hours"
  ("id", "warehouseId", "dayOfWeek", "openTime", "closeTime", "isClosedAllDay", "sortOrder", "createdAt", "updatedAt")
SELECT
  -- `cuid()` do Prisma sinh ở tầng ứng dụng, không có ở CSDL. Chuỗi dưới đây chỉ
  -- cần DUY NHẤT và ổn định trong một lượt chạy; băm theo (kho, thứ) nên hai
  -- dòng của cùng lượt không thể đụng nhau, và không phụ thuộc extension nào
  -- (`gen_random_uuid` chỉ có sẵn từ PG13 — không đánh cược vào phiên bản).
  'seed' || substr(md5(w."id" || ng."thu" || clock_timestamp()::text), 1, 21),
  w."id",
  ng."thu"::"DayOfWeek",
  ng."mo",
  ng."dong",
  ng."nghi",
  0,
  NOW(),
  NOW()
FROM "warehouses" w
CROSS JOIN (
  VALUES
    ('MON', '08:00', '17:30', false),
    ('TUE', '08:00', '17:30', false),
    ('WED', '08:00', '17:30', false),
    ('THU', '08:00', '17:30', false),
    ('FRI', '08:00', '17:30', false),
    ('SAT', '08:00', '17:30', false),
    ('SUN', NULL,    NULL,    true)
) AS ng("thu", "mo", "dong", "nghi")
WHERE w."type" = 'MAIN'
  -- ⚠ Mệnh đề này làm câu lệnh TỰ idempotent VÀ bảo vệ dữ liệu người dùng: kho
  --   đã khai DÙ CHỈ MỘT dòng giờ thì không đụng tới. Lọc theo từng (kho, thứ)
  --   thay vì theo kho sẽ chèn xen vào một bảng giờ người ta đã sửa tay — ví dụ
  --   kho chỉ khai Thứ Hai sẽ bị thêm sáu ngày mà họ cố ý bỏ trống.
  AND NOT EXISTS (
    SELECT 1 FROM "warehouse_hours" h WHERE h."warehouseId" = w."id"
  );
