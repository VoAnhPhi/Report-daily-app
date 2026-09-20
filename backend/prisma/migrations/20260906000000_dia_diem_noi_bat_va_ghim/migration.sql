-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  ĐỐI TÁC NỔI BẬT + GHIM ĐỊA ĐIỂM — hai khái niệm TÁCH RỜI                 ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- Chủ dự án chốt 06/09/2026: "đánh dấu đối tác nổi bật" và "ghim địa điểm" là
-- HAI tính năng khác nhau, không được gộp.
--
--   • ĐỐI TÁC NỔI BẬT — quyết định của QUẢN TRỊ, MỌI người nhìn thấy. Ghi vào
--     `business_locations.verifiedLevel = 'featured'`; marker và giao diện của
--     điểm đó trông đặc biệt trên acta-solutions.
--   • GHIM ĐỊA ĐIỂM — quyết định của TỪNG NGƯỜI DÙNG, chỉ họ nhìn thấy. Ghi vào
--     `saved_places` với `kind = 'pinned'`.
--
-- ── 1. `verifiedLevelBeforeFeature` ────────────────────────────────────────
-- `featured` là một GIÁ TRỊ trên chính thang `VerifiedLevel`
-- (none < claimed < verified < premium < featured), nên đánh dấu nổi bật là GHI
-- ĐÈ cấp xác minh cũ. Không nhớ lại cấp cũ thì "bỏ nổi bật" buộc phải ĐOÁN, và
-- mọi phương án đoán đều sai với một nhóm điểm nào đó: trả `none` là xoá lần xác
-- minh tài liệu đã làm thật; trả `verified` là tự phong xác minh cho điểm chưa
-- hề nộp giấy tờ nào. Một cột nullable rẻ hơn cả hai lựa chọn sai đó.
--
-- NULL với mọi hàng đang có ⇒ migration này KHÔNG đổi thứ khách đang nhìn thấy.
ALTER TABLE "business_locations"
  ADD COLUMN IF NOT EXISTS "verifiedLevelBeforeFeature" "VerifiedLevel";

-- Chỉ số phần (partial) phục vụ đúng một câu hỏi vận hành: "những điểm nào đang
-- được đánh dấu nổi bật?". Điểm nổi bật là thiểu số tuyệt đối nên chỉ số này
-- nhỏ, trong khi một chỉ số đầy đủ trên `verifiedLevel` gần như toàn bộ là
-- `none` và không cắt được gì.
CREATE INDEX IF NOT EXISTS "business_locations_featured_idx"
  ON "business_locations"("verifiedLevel")
  WHERE "verifiedLevel" = 'featured';

-- ── 2. Hai loại hoạt động mới ──────────────────────────────────────────────
-- RIÊNG chứ không dùng chung `BUSINESS_LOCATION_UPDATED`: khi có tranh cãi "ai
-- cho điểm này nổi bật, lúc nào" thì phải tra được bằng một bộ lọc, không phải
-- bằng cách đọc tay hàng nghìn dòng "đã cập nhật".
--
-- ⚠ Postgres 15 (Supabase) cho `ALTER TYPE ... ADD VALUE` chạy trong transaction
-- của Prisma, VỚI ĐIỀU KIỆN giá trị vừa thêm không được DÙNG trong cùng
-- transaction. Tệp này chỉ THÊM, không `UPDATE` hàng nào theo giá trị mới —
-- cùng tiền lệ với `20260825000000_daily_report_question_kind_split`.
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'BUSINESS_LOCATION_FEATURED';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'BUSINESS_LOCATION_UNFEATURED';

-- ── 3. `SavedPlaceKind.pinned` ─────────────────────────────────────────────
-- Dùng lại chính bảng `saved_places` thay vì dựng bảng thứ hai: ràng buộc
-- `@@unique([userId, businessLocationId, kind])` đã sẵn sàng cho việc một người
-- vừa LƯU vừa GHIM cùng một điểm (hai hàng, hai `kind`), và chỉ số
-- `[userId, kind, savedAt desc]` đã phục vụ đúng truy vấn "danh sách ghim của
-- tôi". Một bảng mới sẽ phải chép lại cả hai thứ đó.
ALTER TYPE "SavedPlaceKind" ADD VALUE IF NOT EXISTS 'pinned';
