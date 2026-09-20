-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  LĨNH VỰC CỦA ĐIỂM CẦU — NHIỀU GIÁ TRỊ, TỐI ĐA 5                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Khôi phục khái niệm "ngành nghề" đã bị gỡ ngày 07/09/2026 cùng thực thể "địa
-- điểm kinh doanh", nhưng ở hình dạng KHÁC: mảng, không phải một giá trị.
--
-- ⚠ KHÔNG phải phục hồi cột cũ. `business_locations.industry` là `TEXT` một
--   giá trị; cột này là `TEXT[]`. Một kho hàng bán nhiều thứ cùng lúc, ép chọn
--   một là ép khai sai rồi bộ lọc trả thiếu.
--
-- ⚠ Lý lẽ xoá hồi 07/09 ("không còn hàng dữ liệu nào để áp lên") sai ở tiền đề:
--   `main` production vẫn đang chạy bộ lọc danh mục ngành nghề với đúng 17 mã
--   ấy. Soát đầy đủ: `.planning/research/gop-dia-diem-vao-kho/04-SOAT-TRUONG-BI-BO.md`
--
-- §38: mọi câu lệnh dưới đây phải chạy lại được nhiều lần mà không hỏng.

-- 1. Cột. `NOT NULL DEFAULT '{}'` — "chưa khai" và "khai rỗng" là một thứ, và
--    một cột mảng nullable bắt mọi nơi đọc xử lý ba trạng thái thay vì hai.
ALTER TABLE "warehouses"
  ADD COLUMN IF NOT EXISTS "industries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- 2. GIN. Bộ lọc bản đồ hỏi `industries && ARRAY[...]` (giao mảng); B-tree không
--    phục vụ được toán tử đó, thiếu index là quét toàn bảng mỗi lần lọc.
CREATE INDEX IF NOT EXISTS "warehouses_industries_idx"
  ON "warehouses" USING GIN ("industries");

-- 3. Trần 5 ở TẦNG CSDL.
--
--    ⚠ Cố ý trùng với `@ArrayMaxSize(5)` bên DTO, không phải thừa. DTO chỉ đứng
--    trên đường HTTP; backfill, nhập hàng loạt và mọi script chạy tay đều đi
--    thẳng vào đây. Một trần chỉ có ở tầng ứng dụng là một trần có cửa sau.
--
--    `cardinality` chứ không `array_length(x, 1)`: với mảng RỖNG `array_length`
--    trả NULL, và `NULL <= 5` là NULL — mà CHECK coi NULL là ĐẠT, nên nó vô
--    tình vẫn đúng ở đây; nhưng dựa vào điều đó là dựa vào một sự trùng hợp.
--    `cardinality('{}')` trả 0, thẳng thắn.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'warehouses_industries_toi_da_5'
  ) THEN
    ALTER TABLE "warehouses"
      ADD CONSTRAINT "warehouses_industries_toi_da_5" -- idempotency-ok: đã bọc trong DO-block có kiểm pg_constraint ngay trên
      CHECK (cardinality("industries") <= 5);
  END IF;
END $$;

-- 4. Điểm cầu đang có mà CHƯA khai lĩnh vực nào ⇒ đặt mặc định `ban-le`.
--
--    ⚠ Vì sao gán mặc định thay vì để rỗng: một điểm có mảng rỗng **rơi khỏi
--    mọi bộ lọc**, tức người ta mất khách vì một ô trống chứ không phải vì chọn
--    sai danh mục. Đại đa số hồ sơ KYC cộng tác viên là bán lẻ, nên phỏng đoán
--    này có nhiều cơ hội đúng; người phụ trách sửa lại được bất cứ lúc nào.
--
--    ⚠ Chỉ `type = 'MAIN'` — đó là điều kiện để một kho lên được bản đồ
--    (`CHI_KHO_CHINH` ở `src/diem-cau/diem-cau.service.ts`). Kho tạm không bao
--    giờ hiện ra nên gán lĩnh vực cho nó là ghi rác.
--
--    ⚠ KHÔNG lọc theo `hiddenOnMap`: điểm đang ẩn vẫn phải có lĩnh vực, vì nó
--    có thể được bỏ ẩn bất cứ lúc nào và lúc ấy không ai chạy lại migration này.
--
--    Mệnh đề `cardinality = 0` làm câu lệnh tự nó idempotent: chạy lần hai
--    không đụng dòng nào, và KHÔNG ghi đè lựa chọn người dùng đã khai.
UPDATE "warehouses"
   SET "industries" = ARRAY['ban-le']::TEXT[]
 WHERE "type" = 'MAIN'
   AND cardinality("industries") = 0;
