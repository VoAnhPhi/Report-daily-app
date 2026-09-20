-- Migration: doi hang "Uu dai" tu multiplier sang rate co dinh 6 diem / 1.000d
--
-- Ly do:
--   Sau migration 20260907130000, hai hang con lai da la rate co dinh
--   (uu-tien 9, thong-dung 3). Rieng uu-dai van luu multiplier = 2, buoc client
--   phai TU quy doi ra so diem, va de lam duoc viec do admin phai chep tay hang
--   so goc POINTS_PER_1000_VND = 3 vao frontend:
--     acta-admin/.../loyalty-tier-card-picker.tsx -> const BASE_POINTS_PER_1000VND = 3
--   Mot gia tri song o hai noi chinh la nguyen nhan sinh ra con so 2.5 truoc day.
--
--   Hai man hinh cung vi the noi hai kieu khac nhau cho cung mot hang:
--     admin      -> "6d / 1.000d mua"   (tu quy doi 3 x 2)
--     storefront -> "Tich diem x2"      (in thang multiplier)
--   Khach khong biet "x2" la gap doi cua cai gi.
--
--   Dat pointsPer1000VND = 6 giup ca ba hang deu la rate co dinh 3 / 6 / 9,
--   khop dung hang so backend trong GamificationService
--   (regular 3 / special 6 / priority 9). Sau migration nay hang so chep tay o
--   frontend khong con ly do ton tai va duoc go bo.
--
--   6 = POINTS_PER_1000_VND_SPECIAL, khop anh xa uu-dai -> ProductFlag.special
--   trong public-product.helper.ts. Gia tri hien thi KHONG doi so voi truoc
--   (3 x 2 = 6), nen day chi la doi CACH LUU, khong doi con so nguoi dung thay.
--
--   Rang buoc CHECK (pointsPer1000VND IS NOT NULL OR multiplier IS NOT NULL)
--   van thoa vi pointsPer1000VND duoc gan gia tri khac NULL.
--
-- Cache: xem ghi chu o migration 20260907130000. Tag `public:loyalty-tiers`
-- song toi da 5 phut sau khi deploy.
--
-- Chi UPDATE du lieu, khong lenh pha huy, khong dung schema.
-- Idempotent tu nhien: gan hang so co dinh nen chay lai cho cung ket qua.

UPDATE "loyalty_tier_configs"
SET "pointsPer1000VND" = 6,
    "multiplier" = NULL
WHERE "tierKey" = 'uu-dai';
