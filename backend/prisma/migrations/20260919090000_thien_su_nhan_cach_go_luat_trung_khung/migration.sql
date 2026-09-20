-- Nhân cách Cattleya — GỠ các luật trùng với KHUNG BẤT BIẾN khỏi nhân cách.
--
-- Vì sao: đợt rà soát 19/09/2026 thấy bốn luật của khung bất biến (sống trong
-- mã, `thien-su-nhan-cach.service.ts`) bị chép lại vào nhân cách, và một luật
-- thứ năm đã LỆCH khỏi khung:
--   • dieuKhongBaoGioLam "tự nhận là con người"                  ↔ khung điều 1
--   • dieuKhongBaoGioLam "bịa ra điều người dùng chưa từng kể"   ↔ khung điều 3
--   • dieuKhongBaoGioLam "đưa lời khuyên y tế, pháp lý hay tài chính như thể
--     thay thế chuyên gia"                                        ↔ khung điều 5 (trùng từng chữ)
--   • dieuKhongBaoGioLam "ve vãn, gợi dục …" + tranhGiongDieu "ve vãn"
--                                                                 ↔ khung điều 7 (ba chỗ cho một luật)
--   • cachTraLoi "dùng gạch đầu dòng khi liệt kê từ ba ý trở lên …" — khung
--     điều 9 nói "gạch đầu dòng khi liệt kê" KHÔNG kèm ngưỡng, và khung tự
--     tuyên bố nó thắng. Đo trên dev: 4/8 danh sách chỉ có 2 ý — nhân cách thua
--     im lặng mà vẫn tốn token ở mọi lượt.
--
-- Cách gỡ: ngưỡng ba ý nay sống DUY NHẤT ở điều 9 của khung (cùng đợt sửa mã);
-- năm mục trên bị bỏ khỏi nhân cách. Cùng lý lẽ migration 20260918160000 đã
-- dùng cho luật ngôn ngữ: hai chỗ cùng nói một luật là hai chỗ để chúng lệch
-- nhau.
--
-- ⚠ Không sửa hàng cũ: nhân cách CÓ PHIÊN BẢN, sửa là thêm hàng mới dựng từ
--   hàng MỚI NHẤT (dịch vụ đọc `orderBy phienBan desc`). Chỉ bỏ đúng các mục
--   khớp mẫu; mọi mục và khoá khác — kể cả thứ quản trị viên đã thêm — giữ
--   nguyên, mảng giữ nguyên thứ tự. Khoá vắng mặt hay không phải mảng thì để
--   yên, không tạo mới.

-- idempotency-ok: câu lệnh tự vô hiệu sau lần chạy đầu — điều kiện WHERE đòi
-- hàng MỚI NHẤT vẫn còn ít nhất một mục trùng; chạy lại thì hàng mới nhất là
-- bản vừa chèn (đã bỏ hết các mục ấy) nên không khớp và không chèn gì thêm.
WITH moi_nhat AS (
  SELECT nc."id", nc."thienSuId", nc."phienBan", nc."noiDung"::jsonb AS "noiDung"
  FROM "thien_su_nhan_cach" nc
  WHERE nc."phienBan" = (
    SELECT MAX(n2."phienBan") FROM "thien_su_nhan_cach" n2 WHERE n2."thienSuId" = nc."thienSuId"
  )
),
muc AS (
  -- Mọi phần tử của ba mảng liên quan, kèm cờ `trung` — mẫu trùng định nghĩa
  -- ĐÚNG MỘT LẦN ở đây, dùng chung cho cả bộ lọc lẫn điều kiện chèn.
  SELECT
    mn."id" AS nc_id,
    k.khoa,
    m.phan_tu,
    m.thu_tu,
    (
      (k.khoa = 'dieuKhongBaoGioLam' AND (
            m.phan_tu #>> '{}' LIKE '%tự nhận là con người%'
         OR m.phan_tu #>> '{}' LIKE '%bịa ra điều người dùng chưa từng kể%'
         OR m.phan_tu #>> '{}' LIKE '%lời khuyên y tế, pháp lý hay tài chính%'
         OR m.phan_tu #>> '{}' LIKE '%ve vãn%'))
      OR (k.khoa = 'tranhGiongDieu' AND m.phan_tu #>> '{}' LIKE '%ve vãn%')
      OR (k.khoa = 'cachTraLoi' AND m.phan_tu #>> '{}' LIKE '%gạch đầu dòng%')
    ) AS trung
  FROM moi_nhat mn
  CROSS JOIN LATERAL jsonb_each(mn."noiDung") AS k(khoa, gia_tri)
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(k.gia_tri) = 'array' THEN k.gia_tri ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS m(phan_tu, thu_tu)
  WHERE k.khoa IN ('dieuKhongBaoGioLam', 'tranhGiongDieu', 'cachTraLoi')
)
INSERT INTO "thien_su_nhan_cach" ("id", "thienSuId", "phienBan", "noiDung", "ghiChu")
SELECT
  gen_random_uuid(),
  mn."thienSuId",
  mn."phienBan" + 1,
  mn."noiDung" || (
    SELECT jsonb_object_agg(g.khoa, g.mang)
    FROM (
      SELECT
        muc.khoa,
        COALESCE(
          jsonb_agg(muc.phan_tu ORDER BY muc.thu_tu) FILTER (WHERE NOT muc.trung),
          '[]'::jsonb
        ) AS mang
      FROM muc
      WHERE muc.nc_id = mn."id"
      GROUP BY muc.khoa
    ) g
  ),
  'Gỡ năm mục trùng khung bất biến (điều 1, 3, 5, 7, 9) khỏi nhân cách; ngưỡng gạch đầu dòng từ ba ý nay sống ở điều 9 của khung. Đợt rà soát 19/09/2026.'
FROM moi_nhat mn
WHERE EXISTS (SELECT 1 FROM muc WHERE muc.nc_id = mn."id" AND muc.trung);
