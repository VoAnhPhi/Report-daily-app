-- Dọn HỌ TÊN THẬT của cộng tác viên khỏi mặt công khai của bản đồ Thổ địa.
--
-- ── VÌ SAO CẦN MỘT MIGRATION DỮ LIỆU, KHI BẢN VÁ MÃ ĐÃ CÓ ────────────────────
-- `cheTenCongKhai()` (src/diem-cau/diem-cau.util.ts) có ba nhánh, theo thứ tự:
--   1. có `publicDisplayName`  ⇒ trả NGUYÊN XI, KHÔNG che  ← cố ý, tôn trọng
--      quyền của người vận hành khi họ tự đặt tên công khai;
--   2. `name` chứa `vn-NNNNN` ⇒ trả `Điểm cầu vn-NNNNN`   ← bản vá BUG-0298;
--   3. còn lại               ⇒ giữ nguyên `name`.
--
-- Nhánh 1 đứng TRƯỚC nhánh 2. Nên mọi dòng đã bị điền `publicDisplayName` bằng
-- CHÍNH tên nội bộ sẽ đi vòng qua bản vá và phơi họ tên ra công khai — bản vá
-- mã không với tới được chúng, vì với mã thì đó là "người vận hành đã chọn".
--
-- Đo 09/09/2026: `api.acta.vn/public/diem-cau` trả 30 điểm, trong đó **24** mang
-- dạng `VN-NNNNN - <Họ tên> - <TỈNH>`. Trên dev, sau khi rail backfill KYC chạy,
-- con số là **476/500**.
--
-- ── PHẠM VI HẸP, CÓ CHỦ Ý ────────────────────────────────────────────────────
-- CHỈ xoá khi thoả CẢ HAI:
--   (a) `publicDisplayName` bằng đúng `name` (so sau khi cắt khoảng trắng) —
--       tức nó là BẢN SAO máy tự điền, không phải một cái tên người ta nghĩ ra;
--   (b) `name` mang mã cộng tác viên `vn-NNNNN` — tức có thứ để nhánh 2 che.
-- Một tên công khai do người thật đặt (khác `name`) KHÔNG bị đụng. Một điểm cầu
-- không mang mã CTV cũng KHÔNG bị đụng — nhánh 2 không có gì để che, xoá đi chỉ
-- làm mất thông tin mà không thêm quyền riêng tư nào.
--
-- ⚠ `name` GIỮ NGUYÊN: quản trị viên vẫn cần đọc tên đầy đủ ở màn nội bộ. Thứ
-- thay đổi chỉ là mặt công khai, và nó đổi vì nhánh 2 nay nhận việc.
--
-- ⚠ KHÔNG hoàn tác được bằng migration ngược: giá trị cũ bằng đúng `name` nên
-- phục hồi được về mặt kỹ thuật, nhưng phục hồi nghĩa là phơi tên lại — đừng.
--
-- Idempotent theo nghĩa mạnh: chạy lần thứ hai khớp 0 dòng (điều kiện (a) không
-- còn đúng sau lần đầu), không dùng DDL nên không có gì để guard.

UPDATE "warehouses"
SET "publicDisplayName" = NULL
WHERE "publicDisplayName" IS NOT NULL
  AND btrim("publicDisplayName") = btrim("name")
  AND "name" ~* 'vn-[0-9]{4,}';
