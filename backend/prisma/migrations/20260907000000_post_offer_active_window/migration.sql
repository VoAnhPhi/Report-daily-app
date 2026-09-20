-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  KHOẢNG THỜI GIAN HOẠT ĐỘNG CỦA TIN ƯU ĐÃI                                 ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- Trước migration này, hạn dùng của một tin ưu đãi chỉ tồn tại dưới dạng CHỮ
-- trong `posts.content`. Hệ quả: không truy vấn nào trả lời được câu "nơi này có
-- đang chạy ưu đãi không", nên chip lọc trên bản đồ không có gì để dựa vào.
--
-- Hai cột dưới đây CHỈ có nghĩa khi `postType = 'offer'`. Bài social thường không
-- bao giờ được ghi vào chúng (đường ghi chặn ở `posts.service.ts`).
--
-- ⚠ NULL Ở HAI CỘT NÀY CÓ NGHĨA KHÁC NHAU, và cả hai đều là "CÒN hiệu lực":
--   • `offerStartAt` NULL = tin đăng TRƯỚC migration này. Coi như đã hiệu lực từ
--     đầu. Đây là lý do KHÔNG có câu `UPDATE` nào ở dưới: để nguyên NULL chính là
--     giữ đúng hành vi hiện tại của tin cũ (đang hiện vô thời hạn).
--   • `offerEndAt` NULL = người đăng CHỌN không đặt hạn kết thúc.
--
--   ⇒ Vị từ lọc phải là `(offerEndAt IS NULL OR offerEndAt >= now)`. Viết trần
--     `offerEndAt >= now` là loại sạch cả tin cũ lẫn tin không hạn.
--
-- Vị từ ấy khai MỘT lần ở `src/posts/offer-post-window.helper.ts`. Đừng chép bản
-- thứ hai — `activeOfferFilter` / `loUuDaiConHieuLuc` (cùng một bộ lọc voucher,
-- hai bản sao) là bài học đã trả giá.

ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "offerStartAt" TIMESTAMP(3);
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "offerEndAt" TIMESTAMP(3);

-- Bộ lọc "nơi này ĐANG có ưu đãi" cần một chỉ số theo neo của bài. Thiếu nó thì
-- mỗi lần bật chip lọc là một lượt quét toàn bảng `posts` nhân với số điểm trong
-- khung nhìn.
--
-- ⚠ CHỈ SỐ THEO `businessLocationId` ĐÃ BỎ KHỎI TỆP NÀY (08/09/2026), và đây là
-- một lần SỬA MIGRATION ĐÃ VIẾT chứ không phải viết thêm — ghi lại lý do vì luật
-- chung là không đụng migration cũ:
--
--   • Bản đầu tạo HAI chỉ số đối xứng, cho hai loại neo. Nhánh gộp địa điểm vào
--     kho (`20260907120000_gop_dia_diem_vao_kho`, mục 3b) DROP hẳn cột
--     `posts."businessLocationId"` — nên neo thứ hai không còn tồn tại.
--   • Trên staging, nhánh gộp lên TRƯỚC nhánh này, nên câu `CREATE INDEX` kia
--     nổ `42703: column "businessLocationId" does not exist` và chặn đứng mọi
--     migration sau đó. Thứ tự dấu thời gian không bảo đảm thứ tự triển khai
--     giữa hai nhánh.
--   • Sửa tại chỗ chứ không viết một migration thứ ba để gỡ chỉ số: chỉ số ấy
--     CHƯA từng tồn tại ở bất kỳ môi trường nào (staging nổ ngay tại câu tạo
--     nó, còn dev đã chạy nhánh gộp), nên không có gì để gỡ. Một migration
--     "sửa lỗi" ở đây chỉ để lại dấu vết của một thứ chưa bao giờ có thật.
--
-- Trên một CSDL dựng lại từ đầu, thứ tự là: nhánh này tạo chỉ số theo
-- `warehouseId` (cột có từ `20260903000000_post_warehouse_and_warehouse_level`),
-- rồi nhánh gộp xoá cột địa điểm cùng các chỉ số của nó. Kết quả giống hệt
-- staging.
CREATE INDEX IF NOT EXISTS "posts_warehouseId_postType_offerEndAt_idx"
  ON "posts"("warehouseId", "postType", "offerEndAt");
