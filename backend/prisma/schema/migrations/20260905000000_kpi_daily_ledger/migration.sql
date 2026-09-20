-- Sổ chốt KPI ngày (Đợt 2) — "chốt số + ô nhập tay".
--
-- ⚠ MIGRATION NÀY CHỈ TẠO HAI BẢNG RỖNG. Không `ALTER TABLE`, không `CREATE INDEX`
--   trên bảng đang có dữ liệu, không `ADD COLUMN`, không `CREATE TYPE`,
--   không `ADD CONSTRAINT`. Vì thế:
--     * KHÔNG cần một dấu `-- idempotency-ok` nào. Nhánh duy nhất có thể bắt là
--       `CREATE TABLE ... && !infe` (`scripts/check-migration-idempotency.sh:238`),
--       và cả hai lệnh đều có `IF NOT EXISTS`. Mọi PRIMARY KEY khai INLINE trong
--       ngoặc nên regex `ADD[ \t]+CONSTRAINT` (:243) không khớp.
--     * Thời gian áp gần như bằng 0 và KHÔNG khoá bảng nào đang phục vụ.
--
-- ⚠ BẢN NHÁP TỪNG CÓ HAI DÒNG `CREATE INDEX ... ON "products"/"orders"` — ĐÃ BỎ HẲN.
--   Lý do không phải khẩu vị: `.omc/scripts/trien-khai/apps.d/api-prod.conf:50-52` và
--   `api-dev.conf:25-27` đều đặt `CHAY_MIGRATE=1` + `LENH_MIGRATE=(npx prisma migrate
--   deploy)` + `HAN_MIGRATE=600`, tức lệnh này chạy KHÔNG NGƯỜI XEM, mỗi 2 phút, ngay
--   khi ảnh mới lên Harbor. `CREATE INDEX` (không CONCURRENTLY) giữ ACCESS EXCLUSIVE, và
--   vì Prisma chạy CẢ TỆP trong MỘT transaction, bảng đầu bị khoá tới tận COMMIT — tức
--   TỔNG thời gian dựng cả hai chỉ mục. Quá 600s thì `timeout` giết giữa chừng ⇒
--   `_prisma_migrations` còn `finished_at IS NULL` ⇒ P3009 CHẶN MỌI lượt deploy sau đó
--   (playbook: `docs/guides/implementation/PRISMA_MIGRATIONS_RUNBOOK.md:84`), và
--   `acta-trien-khai.sh:418` sẽ in chẩn đoán SAI ("nghi CSDL treo, hoặc DIRECT_URL trỏ
--   pgbouncer"). Muốn cắm chỉ mục thì làm việc đó TÁCH RIÊNG, bằng tay, ngoài giờ, với
--   `CREATE INDEX CONCURRENTLY` — không nhét vào đường CD.
--
-- ⚠ TƯƠNG THÍCH NGƯỢC: quay lui container KHÔNG quay lui lược đồ (§48). Migration này
--   chỉ THÊM bảng mới, nên bản mã CŨ chạy trên lược đồ MỚI hoàn toàn bình thường.

-- 1. Sổ chốt: một dòng mỗi (ngày, mã chỉ tiêu).
--
--    Dòng VẮNG MẶT = chưa chốt (đọc sống).
--    Dòng CÓ MẶT, "value" NOT NULL = đã chốt, có số.
--    Dòng CÓ MẶT, "value" NULL     = đã chốt, phép đo chạy SẠCH và kết luận "không có
--                                    mẫu số trong kỳ" (TT21 kpi.service.ts:526,
--                                    CN05 :753). Đây là kết luận thật, không phải lỗi.
--    KHÔNG có cột "error": ô đo HỎNG không bao giờ được chốt — nó ở lại trạng thái
--    VẮNG MẶT để đêm sau thử lại. Nhờ đó cron chỉ CHÈN, không bao giờ SỬA.
CREATE TABLE IF NOT EXISTS "kpi_daily_values" (
    "day" DATE NOT NULL,
    "kpiCode" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "secondaryValue" DOUBLE PRECISION,
    "ranking" JSONB,
    "source" TEXT NOT NULL,
    "frozenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_daily_values_pkey" PRIMARY KEY ("day", "kpiCode")
);

-- ⚠ KHÔNG khai chỉ mục phụ. Hai đường đọc duy nhất của Đợt 2 đều đi qua khoá chính:
--   `findMany where day = X`      → tiền tố ("day") của PK.
--   `findFirst orderBy day desc`  → cùng tiền tố, quét ngược.
--   Đường đọc "lịch sử một chỉ tiêu qua nhiều ngày" CHƯA TỒN TẠI ở Đợt 2; cắm chỉ mục
--   cho nó bây giờ là cắm cho một truy vấn chưa ai viết.

-- 2. Phụ lục kiểm toán nhập tay — chỉ ghi thêm. Sửa một số đã nhập là ghi THÊM một dòng.
--    KHÔNG khai chỉ mục: bảng tối đa 7 mã × số lần sửa/ngày, và Đợt 2 không có đường đọc.
CREATE TABLE IF NOT EXISTS "kpi_manual_entry_logs" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "kpiCode" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousValue" DOUBLE PRECISION,
    "newValue" DOUBLE PRECISION,
    "enteredById" TEXT NOT NULL,
    "enteredByName" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_manual_entry_logs_pkey" PRIMARY KEY ("id")
);

-- ⚠ CỘT "frozenAt"/"createdAt" CÓ `DEFAULT CURRENT_TIMESTAMP` vì chúng map với
--   `@default(now())`. KHÔNG có cột `updatedAt` nào trong hai bảng này — bản nháp có,
--   và nó khai `DEFAULT CURRENT_TIMESTAMP` cho một cột `@updatedAt`, thứ Prisma KHÔNG
--   BAO GIỜ sinh default. Đo trong `prisma/migrations/0_nen_mong_20260826/migration.sql`:
--   287 dòng `"updatedAt" TIMESTAMP(3) NOT NULL,` và ĐÚNG 0 dòng có DEFAULT, so với 388
--   dòng `"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`. Lệch đó sẽ làm
--   `migrate diff --from-migrations --to-schema-datamodel` sinh `ALTER COLUMN ... DROP
--   DEFAULT` vĩnh viễn — mà §40 cấm chạy phép so đó trên CSDL sống nên KHÔNG cổng nào
--   đo được. Đợt 2 bỏ hẳn cột `updatedAt`: `frozenAt` đã trả lời "số này đặt lúc nào",
--   và mọi lần sửa đều có một dòng trong `kpi_manual_entry_logs`.
-- ⚠ KHÔNG khoá ngoại nào: `kpiCode` là mã ứng dụng; `enteredById` là khoá LỎNG tới
--   `users.id` (tiền lệ `contract_issuances.issuedById`) để xoá tài khoản không kéo theo
--   mất bằng chứng kiểm toán.
