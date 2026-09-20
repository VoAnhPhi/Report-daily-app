-- Migration: sua rate hien thi cua hang "Thong dung" tu 2.5 -> 3 diem / 1.000d
--
-- Boi canh:
--   Seed goc (30-02) dat thong-dung = 5 diem/1.000d, trong khi hang so tinh diem
--   that trong code luc do la POINTS_PER_1000_VND = 6. Hai con so da lech san.
--   Migration 79 (20260702000000_79_halve_gamification_point_values) chia doi moi
--   rate trong DB: 5 -> 2.5, dong thoi chia doi hang so code 6 -> 3. Cai lech cu
--   vi the lo ra thanh so le 2.5 tren UI.
--
--   loyalty_tier_configs.pointsPer1000VND KHONG tham gia tinh diem don hang.
--   GamificationService.calculateOrderPoints doc Product.flag voi hang so cung
--   (regular 3 / special 6 / priority 9). Bang nay chi nuoi phan HIEN THI:
--   card picker "Muc tich diem" o admin va tier card o storefront.
--   Vi vay day la sua NHAN cho khop hanh vi that, khong doi so diem khach nhan.
--
--   3 = POINTS_PER_1000_VND (regular) trong gamification.service.ts, khop voi
--   anh xa thong-dung -> ProductFlag.regular o public-product.helper.ts.
--
-- Cache: GET /loyalty-tiers duoc cache 5 phut duoi tag `public:loyalty-tiers`,
-- chi invalidate qua publishLoyaltyTierChanged. Migration SQL thuan KHONG kich
-- hoat ham do, nen sau khi deploy gia tri cu co the con song them toi da 5 phut.
--
-- Chi UPDATE du lieu, khong lenh pha huy, khong dung schema.
-- Idempotent tu nhien: gan mot hang so co dinh nen chay lai cho cung ket qua.

UPDATE "loyalty_tier_configs"
SET "pointsPer1000VND" = 3
WHERE "tierKey" = 'thong-dung';
