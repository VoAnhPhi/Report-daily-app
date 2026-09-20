-- Nhân cách Cattleya phiên bản 2 — GỠ luật ngôn ngữ khỏi nhân cách.
--
-- Vì sao: ngày 18/09/2026 người dùng gõ 「こんにちは」 và Cattleya đáp bằng tiếng
-- Việt kèm câu "Hiện tại tôi chủ yếu hỗ trợ bằng tiếng Việt có dấu" rồi XIN
-- người dùng đổi sang tiếng Việt. Câu ấy KHÔNG có trong lời nhắc: khung bất
-- biến đã nói "trả lời bằng ngôn ngữ người dùng đang viết", và khối tri thức
-- nền không nhắc chữ "Việt" một lần nào (đo: 0 lần). Mô hình tự bịa ra giới
-- hạn đó, và thứ tiếp tay cho nó là dòng đầu trong `dieuLuonLam` của nhân cách:
-- "trả lời bằng tiếng Việt có dấu, trừ khi người dùng viết bằng ngôn ngữ khác".
-- Ngoại lệ nằm ở vế sau, còn vế trước lại là câu mở đầu của một mục mang tên
-- "điều LUÔN làm" — đọc lướt thì nó là một mệnh lệnh tiếng-Việt-trước.
--
-- Luật ngôn ngữ nay sống DUY NHẤT ở điều 2 của khung bất biến (trong mã), viết
-- lại cho hết mơ hồ. Hai chỗ cùng nói một luật là hai chỗ để chúng lệch nhau.
--
-- ⚠ Không sửa hàng phiên bản 1: nhân cách CÓ PHIÊN BẢN, sửa là thêm hàng mới.
--   Dịch vụ đọc hàng có `phienBan` LỚN NHẤT (đã kiểm: `orderBy phienBan desc`).

-- idempotency-ok: câu lệnh tự vô hiệu sau lần chạy đầu — điều kiện WHERE đòi
-- hàng MỚI NHẤT vẫn còn chứa dòng ngôn ngữ; chạy lại thì hàng mới nhất là bản
-- vừa chèn (đã bỏ dòng ấy) nên không khớp và không chèn gì thêm.
INSERT INTO "thien_su_nhan_cach" ("id", "thienSuId", "phienBan", "noiDung", "ghiChu")
SELECT
  gen_random_uuid(),
  nc."thienSuId",
  nc."phienBan" + 1,
  jsonb_set(
    nc."noiDung"::jsonb,
    '{dieuLuonLam}',
    COALESCE(
      (
        SELECT jsonb_agg(muc)
        FROM jsonb_array_elements(nc."noiDung"::jsonb -> 'dieuLuonLam') AS muc
        WHERE muc #>> '{}' NOT LIKE '%tiếng Việt%'
      ),
      '[]'::jsonb
    )
  ),
  'Gỡ luật ngôn ngữ khỏi nhân cách; ngôn ngữ nay do điều 2 khung bất biến quyết. Lý do: mô hình tự bịa "chủ yếu hỗ trợ tiếng Việt" và xin người dùng đổi ngôn ngữ (18/09/2026).'
FROM "thien_su_nhan_cach" nc
WHERE nc."phienBan" = (
    SELECT MAX(n2."phienBan") FROM "thien_su_nhan_cach" n2 WHERE n2."thienSuId" = nc."thienSuId"
  )
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(nc."noiDung"::jsonb -> 'dieuLuonLam') AS muc
    WHERE muc #>> '{}' LIKE '%tiếng Việt%'
  );
