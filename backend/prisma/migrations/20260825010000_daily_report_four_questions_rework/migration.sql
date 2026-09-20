-- Đưa bộ câu hỏi lõi sang bộ 4 câu mới. Giá trị enum `done`/`blocked` đã được
-- thêm ở `20260825000000` — xem file đó để biết vì sao phải tách hai migration.
--
--   sortOrder 1: today        → done      "Những việc đã hoàn thành"
--   sortOrder 2: done_blocked → blocked   "Những việc còn tồn đọng"
--   sortOrder 3: need_help    → need_help "Yêu cầu hỗ trợ"
--   sortOrder 4: tomorrow     → tomorrow  "Công việc dự kiến ngày mai"
--
-- `sortOrder` KHÔNG đổi nên không đụng ràng buộc `(templateVersionId, sortOrder)`.
--
-- Lọc theo `templateId` + `kind` chứ không theo id cố định của từng câu — cùng
-- lý do đã ghi ở `20260820000000_daily_report_relabel_core_questions`: nếu bộ
-- mặc định từng được phát hành thêm phiên bản thì mỗi phiên bản có một bản sao
-- câu hỏi với id khác, lọc theo id sẽ bỏ sót đúng những bản đang được dùng.
--
-- Idempotent: mọi mệnh đề `WHERE` đều lọc theo kind CŨ hoặc so với giá trị đích,
-- nên lần chạy thứ hai không còn hàng nào khớp.

-- 1) Bộ câu hỏi gốc — quyết định câu hỏi của MỌI bản báo cáo sinh ra từ đây về sau.
UPDATE "daily_report_questions" AS q
SET "kind" = v.new_kind::"DailyReportQuestionKind",
    "label" = v.new_label,
    "hint" = v.new_hint,
    "updatedAt" = CURRENT_TIMESTAMP
FROM (VALUES
  ('today',        'done',      'Những việc đã hoàn thành',   'Liệt kê những đầu việc bạn đã làm xong trong hôm nay'),
  ('done_blocked', 'blocked',   'Những việc còn tồn đọng',    'Nêu những việc còn dang dở và lý do chưa xong'),
  ('need_help',    'need_help', 'Yêu cầu hỗ trợ',             'Nêu vướng mắc và nhắc tên người có thể giúp. Để trống nếu không vướng gì'),
  ('tomorrow',     'tomorrow',  'Công việc dự kiến ngày mai', 'Dự kiến các đầu việc chính cho ngày làm việc kế tiếp')
) AS v(old_kind, new_kind, new_label, new_hint)
WHERE q."templateId" = 'a0000000-0000-4000-8000-000000000001'
  AND q."kind"::text = v.old_kind
  AND (
    q."kind"::text <> v.new_kind
    OR q."label" <> v.new_label
    OR q."hint" IS DISTINCT FROM v.new_hint
  );

-- 2) Bản chụp trên các báo cáo CHƯA NỘP, kèm dọn nội dung gợi ý đã lỗi thời.
--
-- CỐ Ý chỉ đụng bản chưa nộp. Bản đã SUBMITTED/ARCHIVED giữ nguyên câu hỏi tại
-- thời điểm nộp — đó chính là lý do ba cột snapshot này tồn tại, sửa vào là viết
-- lại lịch sử. Chúng tiếp tục mang `today`/`done_blocked`, và đó là lý do hai
-- giá trị đó phải ở lại trong enum.
--
-- `reset_content` — khác hẳn đợt đổi nhãn 20/08, lần này VAI của câu hỏi đổi nên
-- nội dung sinh sẵn bên dưới không còn khớp câu hỏi mới:
--   · câu `today` cũ liệt kê việc "đã bắt tay vào hôm nay" (gồm cả việc CHƯA
--     xong) mà nhãn mới là "Những việc đã hoàn thành";
--   · câu `done_blocked` cũ chứa CẢ hai khối "Đã xong:" và "Tồn đọng:" trong một
--     ô mà nhãn mới chỉ còn là "Những việc còn tồn đọng".
-- Giữ nguyên là để bản báo cáo tự nói sai. Hai câu `need_help`/`tomorrow` chỉ đổi
-- chữ nên `reset_content = false`.
--
-- CHỈ xoá khi `isAutoDrafted = true` — người dùng chưa sửa chữ nào. Nội dung đã
-- gõ thì KHÔNG BAO GIỜ đụng tới, dù nhãn phía trên đã đổi. Ô trống sẽ nhận GỢI Ý
-- mới ở lần mở kế tiếp, và chữ chỉ vào ô khi người dùng bấm "Chèn" — auto-draft
-- KHÔNG tự điền. Xem `attachDrafts` trong `daily-reports.service.ts`: nó chỉ gắn
-- `draftSuggestionsByKind` + `draftSourcesByKind` rồi trả `answers` với `content`
-- nguyên vẹn rỗng. Đây là hợp đồng đã chốt và có test khoá.
--
-- Việc dọn nội dung nằm CHUNG lệnh với đổi kind (không tách thành lệnh thứ ba) là
-- có chủ ý: mệnh đề `q."kind" = v.old_kind` khiến lần chạy lại không khớp hàng
-- nào. Một lệnh riêng lọc theo kind MỚI sẽ xoá nhầm gợi ý vừa sinh nếu migration
-- này được chạy lại trong một kịch bản phục hồi.
UPDATE "daily_report_answers" AS a
SET "questionKind" = v.new_kind::"DailyReportQuestionKind",
    "questionLabel" = v.new_label,
    "questionHint" = v.new_hint,
    "content" = CASE
      WHEN v.reset_content AND a."isAutoDrafted" THEN ''
      ELSE a."content"
    END,
    "linkedTaskIds" = CASE
      WHEN v.reset_content AND a."isAutoDrafted" THEN ARRAY[]::text[]
      ELSE a."linkedTaskIds"
    END,
    "updatedAt" = CURRENT_TIMESTAMP
FROM (VALUES
  ('today',        'done',      'Những việc đã hoàn thành',   'Liệt kê những đầu việc bạn đã làm xong trong hôm nay',                    true),
  ('done_blocked', 'blocked',   'Những việc còn tồn đọng',    'Nêu những việc còn dang dở và lý do chưa xong',                           true),
  ('need_help',    'need_help', 'Yêu cầu hỗ trợ',             'Nêu vướng mắc và nhắc tên người có thể giúp. Để trống nếu không vướng gì', false),
  ('tomorrow',     'tomorrow',  'Công việc dự kiến ngày mai', 'Dự kiến các đầu việc chính cho ngày làm việc kế tiếp',                    false)
) AS v(old_kind, new_kind, new_label, new_hint, reset_content)
WHERE a."questionKind"::text = v.old_kind
  AND a."questionId" IN (
    SELECT "id" FROM "daily_report_questions"
    WHERE "templateId" = 'a0000000-0000-4000-8000-000000000001'
  )
  AND a."reportId" IN (
    SELECT "id" FROM "daily_reports" WHERE "status" IN ('DRAFT', 'REOPENED')
  )
  AND (
    a."questionKind"::text <> v.new_kind
    OR a."questionLabel" <> v.new_label
    OR a."questionHint" IS DISTINCT FROM v.new_hint
  );
