-- Suy đoán luồng đăng ký cho tài khoản CŨ, đánh cờ 'inferred'.
-- Chủ dự án chốt 2026-09-11: được suy đoán, NHƯNG phải ghi kèm mức độ chắc chắn.
--
-- Ba luật tự áp cho mình ở đây:
--   1. Chỉ đụng hàng còn 'unknown' ⇒ chạy lại bao nhiêu lần cũng ra một kết quả, và
--      KHÔNG BAO GIỜ đè lên giá trị 'declared' do mã mới ghi thật.
--   2. Thứ tự các lệnh CHÍNH LÀ thứ tự ưu tiên: dấu hiệu chắc nhất chạy trước.
--   3. Không có dấu hiệu thì để nguyên 'unknown'. Một ô trống trung thực hơn một ô
--      điền bừa — đây là chỗ dễ sa nhất, vì bảng trông "đầy đủ" luôn hấp dẫn hơn.
--
-- ⚠ Đọc cột "changes", KHÔNG phải "metadata": createActivityLog(targetId, targetType,
-- activityType, user, description, changes) — tham số thứ 6 rơi vào cột `changes`.
-- (activity-log.service.ts:113-121). Nhìn nhầm sang `metadata` thì mọi mệnh đề EXISTS
-- dưới đây lặng lẽ không khớp gì cả, và cả bước suy đoán trả về đúng 0 hàng mà không kêu.

-- 1. Đồng bộ từ KiotViet — dấu hiệu chắc chắn nhất, là cột khoá ngoại của chính KiotViet.
UPDATE "users"
SET "registrationChannel" = 'kiotviet_import',
    "registrationChannelConfidence" = 'inferred'
WHERE "registrationChannel" = 'unknown'
  AND "kiotVietUserId" IS NOT NULL;

-- 2. Nhập từ dữ liệu cũ — backfill.service.ts ghi cứng bio = '[Backfill]'.
UPDATE "users"
SET "registrationChannel" = 'backfill_import',
    "registrationChannelConfidence" = 'inferred'
WHERE "registrationChannel" = 'unknown'
  AND "bio" = '[Backfill]';

-- 3. Partner API — có loại nhật ký riêng, không lẫn với luồng nào khác.
UPDATE "users" u
SET "registrationChannel" = 'partner_api',
    "registrationChannelConfidence" = 'inferred'
WHERE u."registrationChannel" = 'unknown'
  AND EXISTS (
    SELECT 1 FROM "activity_logs" a
    WHERE a."targetId" = u."id"
      AND a."targetType" = 'USER'
      AND a."activityType" = 'PARTNER_API_USER_REGISTERED'
  );

-- 4. Admin tạo tay — auth.service.ts:3184 ghi changes.createdByAdmin = true.
--    Phải đứng TRƯỚC luật đăng ký thường: cả hai cùng dùng USER_REGISTERED.
UPDATE "users" u
SET "registrationChannel" = 'admin_created',
    "registrationChannelConfidence" = 'inferred'
WHERE u."registrationChannel" = 'unknown'
  AND EXISTS (
    SELECT 1 FROM "activity_logs" a
    WHERE a."targetId" = u."id"
      AND a."targetType" = 'USER'
      AND a."activityType" = 'USER_REGISTERED'
      AND a."changes" ->> 'createdByAdmin' = 'true'
  );

-- 5. OTP marketing của game — otp.service.ts:541 ghi changes.referralInfo.
UPDATE "users" u
SET "registrationChannel" = 'game_otp',
    "registrationChannelConfidence" = 'inferred'
WHERE u."registrationChannel" = 'unknown'
  AND EXISTS (
    SELECT 1 FROM "activity_logs" a
    WHERE a."targetId" = u."id"
      AND a."targetType" = 'USER'
      AND a."activityType" = 'USER_REGISTERED'
      AND a."changes" ? 'referralInfo'
  );

-- 6. Đăng ký thường — auth.service.ts:926 ghi changes.step = 'user_created'.
UPDATE "users" u
SET "registrationChannel" = 'register_web',
    "registrationChannelConfidence" = 'inferred'
WHERE u."registrationChannel" = 'unknown'
  AND EXISTS (
    SELECT 1 FROM "activity_logs" a
    WHERE a."targetId" = u."id"
      AND a."targetType" = 'USER'
      AND a."activityType" = 'USER_REGISTERED'
      AND a."changes" ->> 'step' = 'user_created'
  );

-- 7. Khách vãng lai đặt hàng — tài khoản, bản ghi khách hàng và ĐƠN HÀNG sinh ra trong
--    cùng một transaction, nên đơn ra đời ngay sau tài khoản vài trăm mili-giây.
--    (Ca VN-19984: tài khoản 03:46:40.202Z, đơn 03:46:40.535Z — cách 333 ms.)
--    Cửa sổ 60 giây đủ rộng cho máy chậm mà vẫn hẹp hơn nhiều so với một người đăng ký
--    xong rồi mới đi mua hàng. Luật này đứng CUỐI: mọi luồng có nhật ký đã lấy phần của
--    mình trước, kể cả luồng backfill cũng tạo bản ghi khách hàng.
UPDATE "users" u
SET "registrationChannel" = 'guest_checkout',
    "registrationChannelConfidence" = 'inferred'
WHERE u."registrationChannel" = 'unknown'
  AND EXISTS (
    SELECT 1
    FROM "customers" c
    JOIN "orders" o ON o."customerId" = c."id"
    WHERE c."userId" = u."id"
      AND o."createdAt" >= u."createdAt"
      AND o."createdAt" < u."createdAt" + INTERVAL '60 seconds'
  );

-- 8. Cách gắn người giới thiệu, cho hàng cũ.
--    CHỈ điền chỗ nào suy được; phần còn lại để NULL = "không biết".
--    ⚠ Cố ý KHÔNG điền cho hàng mang người giới thiệu là chính tài khoản nhà
--    (vn-11188 "Liên minh ACTA"): ở đó không có cách nào phân biệt "khách thật sự vào
--    bằng link của Liên minh ACTA" với "Partner API tự gán vì khách không có mã".
--    Điền bừa vào đó là tự tay tạo ra con số hoa hồng sai.
UPDATE "users"
SET "referrerAssignment" = 'admin_assigned'
WHERE "referrerAssignment" IS NULL
  AND "referrerId" IS NOT NULL
  AND "bio" = '[Backfill]';

UPDATE "users"
SET "referrerAssignment" = 'user_link'
WHERE "referrerAssignment" IS NULL
  AND "referrerId" IS NOT NULL
  AND "referrerId" <> 'vn-11188';
