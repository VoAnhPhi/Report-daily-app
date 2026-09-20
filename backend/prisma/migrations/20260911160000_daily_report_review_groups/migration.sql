-- Nhóm duyệt CÓ TÊN thay cho phân công từng cặp (người duyệt, thành viên).
-- Thiết kế: docs/features/task-management/20-vong-duyet-bao-cao.md mục 19.
--
-- Vì sao đổi: trưởng nhóm chia thành viên theo miền, theo ca, theo dự án - cách
-- chia đó có TÊN, và cái tên là thứ họ đọc để biết mình chia đúng chưa. Bảng
-- theo cặp không có chỗ nào giữ tên, và cùng một cụm người phải nhập lại cho
-- từng người duyệt. Ba bảng ở đây cho một nhóm NHIỀU người duyệt và một thành
-- viên thuộc NHIỀU nhóm; quan hệ (người duyệt × thành viên) suy ra từ hai bảng
-- nối chứ không lưu thành bảng thứ ba phải giữ đồng bộ.
--
-- Dữ liệu cũ được CHUYỂN sang trước khi bỏ bảng: mỗi người duyệt thành một
-- nhóm mang tên "Nhóm của <tên người duyệt>", giữ nguyên thành viên họ đang
-- phụ trách. Bảng cũ chỉ tồn tại trên nhánh tính năng (chưa có ở development
-- hay main), nên không có dữ liệu thật nào ngoài DB dev.
--
-- Toàn bộ file idempotent: chạy lại lần hai là no-op (acta-db-safety mục 2).

CREATE TABLE IF NOT EXISTS "daily_report_review_groups" (
  "id"          TEXT         NOT NULL,
  "scopeId"     TEXT         NOT NULL,
  "name"        VARCHAR(60)  NOT NULL,
  "createdById" TEXT         NOT NULL,
  "updatedById" TEXT         NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "daily_report_review_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "daily_report_review_group_reviewers" (
  "groupId"    TEXT         NOT NULL,
  "reviewerId" TEXT         NOT NULL,
  "addedById"  TEXT         NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "daily_report_review_group_reviewers_pkey" PRIMARY KEY ("groupId", "reviewerId")
);

CREATE TABLE IF NOT EXISTS "daily_report_review_group_members" (
  "groupId"   TEXT         NOT NULL,
  "memberId"  TEXT         NOT NULL,
  "addedById" TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "daily_report_review_group_members_pkey" PRIMARY KEY ("groupId", "memberId")
);

CREATE INDEX IF NOT EXISTS "daily_report_review_groups_scopeId_idx"
  ON "daily_report_review_groups" ("scopeId");

-- Dựng rail phạm vi và danh sách phải duyệt của một người duyệt.
CREATE INDEX IF NOT EXISTS "daily_report_review_group_reviewers_reviewerId_idx"
  ON "daily_report_review_group_reviewers" ("reviewerId");

-- Fan-out thông báo nộp bài: ai đang duyệt thành viên này.
CREATE INDEX IF NOT EXISTS "daily_report_review_group_members_memberId_idx"
  ON "daily_report_review_group_members" ("memberId");

-- Postgres không có IF NOT EXISTS cho ADD CONSTRAINT.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_report_review_groups_scopeId_fkey'
  ) THEN
    ALTER TABLE "daily_report_review_groups"
      ADD CONSTRAINT "daily_report_review_groups_scopeId_fkey" -- idempotency-ok: nằm trong DO-block có guard pg_constraint
      FOREIGN KEY ("scopeId") REFERENCES "daily_report_scopes"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_report_review_group_reviewers_groupId_fkey'
  ) THEN
    ALTER TABLE "daily_report_review_group_reviewers"
      ADD CONSTRAINT "daily_report_review_group_reviewers_groupId_fkey" -- idempotency-ok: nằm trong DO-block có guard pg_constraint
      FOREIGN KEY ("groupId") REFERENCES "daily_report_review_groups"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_report_review_group_members_groupId_fkey'
  ) THEN
    ALTER TABLE "daily_report_review_group_members"
      ADD CONSTRAINT "daily_report_review_group_members_groupId_fkey" -- idempotency-ok: nằm trong DO-block có guard pg_constraint
      FOREIGN KEY ("groupId") REFERENCES "daily_report_review_groups"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- Chuyển phân công cũ thành nhóm duyệt, rồi bỏ bảng cũ.
--
-- Cả khối nằm trong PL/pgSQL và gác bằng `to_regclass`: chạy lần hai thì bảng
-- cũ đã bị bỏ, nhánh không vào, và câu lệnh bên trong không bao giờ được planner
-- soi tới (PL/pgSQL plan từng câu lúc THỰC THI, không phải lúc đọc file).
--
-- Id nhóm suy từ md5(scopeId, reviewerId) nên chạy lại cho ra đúng id cũ; kèm
-- ON CONFLICT DO NOTHING để lần hai là no-op ngay cả khi bảng cũ vẫn còn.
DO $$
BEGIN
  IF to_regclass('public.daily_report_reviewer_assignments') IS NOT NULL THEN
    WITH cap AS (
      SELECT
        a."scopeId",
        a."reviewerId",
        MIN(a."createdAt")                                            AS "createdAt",
        (array_agg(a."assignedById" ORDER BY a."createdAt"))[1]        AS "assignedById"
      FROM "daily_report_reviewer_assignments" a
      GROUP BY a."scopeId", a."reviewerId"
    ),
    dat_ten AS (
      SELECT
        c.*,
        -- Chừa chỗ cho hậu tố " (n)" khi hai người duyệt trùng tên nhau.
        left(
          'Nhóm của ' || COALESCE(NULLIF(btrim(u."fullName"), ''), 'người duyệt'),
          50
        ) AS ten_goc
      FROM cap c
      LEFT JOIN "users" u ON u."id" = c."reviewerId"
    ),
    xep_hang AS (
      SELECT
        t.*,
        row_number() OVER (
          PARTITION BY t."scopeId", lower(t.ten_goc)
          ORDER BY t."createdAt", t."reviewerId"
        ) AS hang
      FROM dat_ten t
    )
    INSERT INTO "daily_report_review_groups"
      ("id", "scopeId", "name", "createdById", "updatedById", "createdAt", "updatedAt")
    SELECT
      md5('review-group:' || x."scopeId" || ':' || x."reviewerId")::uuid::text,
      x."scopeId",
      CASE WHEN x.hang = 1 THEN x.ten_goc ELSE x.ten_goc || ' (' || x.hang || ')' END,
      x."assignedById",
      x."assignedById",
      x."createdAt",
      CURRENT_TIMESTAMP
    FROM xep_hang x
    ON CONFLICT ("id") DO NOTHING;

    INSERT INTO "daily_report_review_group_reviewers"
      ("groupId", "reviewerId", "addedById", "createdAt")
    SELECT
      md5('review-group:' || a."scopeId" || ':' || a."reviewerId")::uuid::text,
      a."reviewerId",
      (array_agg(a."assignedById" ORDER BY a."createdAt"))[1],
      MIN(a."createdAt")
    FROM "daily_report_reviewer_assignments" a
    GROUP BY a."scopeId", a."reviewerId"
    ON CONFLICT ("groupId", "reviewerId") DO NOTHING;

    INSERT INTO "daily_report_review_group_members"
      ("groupId", "memberId", "addedById", "createdAt")
    SELECT
      md5('review-group:' || a."scopeId" || ':' || a."reviewerId")::uuid::text,
      a."memberId",
      a."assignedById",
      a."createdAt"
    FROM "daily_report_reviewer_assignments" a
    ON CONFLICT ("groupId", "memberId") DO NOTHING;

    DROP TABLE IF EXISTS "daily_report_reviewer_assignments";
  END IF;
END
$$;
