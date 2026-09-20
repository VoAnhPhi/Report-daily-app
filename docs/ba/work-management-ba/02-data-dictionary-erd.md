# 02 — Từ điển dữ liệu và ERD

> Bản đọc chung cho PO/khách hàng/dev. Tên cột giữ theo schema để có thể đối chiếu chính xác; các field hiển thị và quyền có thể là dữ liệu API tính toán, không phải cột DB.

## 1. Quy ước

- `?`: có thể để trống. `FK`: khóa liên kết; `soft FK`: lưu ID nhưng schema không khai báo quan hệ DB.
- `DateTime` là thời điểm; `reportDate` và `toReportDate` là ngày theo lịch phạm vi. Phạm vi mặc định dùng `Asia/Ho_Chi_Minh`.
- `status` của công việc, `status` của báo cáo và `decision` duyệt là **ba bộ giá trị khác nhau**.
- ERD bên dưới rút gọn theo đối tượng nghiệp vụ chính. Quan hệ đầy đủ, index và bảng email/outbox nằm trong Prisma schema.

## 2. Công việc

**`BusinessFormTask` → bảng `business_form_tasks`**

| Field | Kiểu / giá trị | Ý nghĩa / quy tắc |
| --- | --- | --- |
| `id` | String, PK | Định danh công việc |
| `code` | String?, unique | Mã `CV` theo ngày và số thứ tự; có thể rỗng ở dữ liệu cũ |
| `title` | String | Tên công việc |
| `description` | String? | Nội dung chi tiết |
| `type` | `personal`, `partner_task`, `admin_internal` | Loại công việc |
| `status` | `pending`, `in_progress`, `done`, `cancelled` | Vòng đời công việc; schema mặc định `pending`, nhưng luồng người dùng tạo việc mặc định `in_progress`; quản trị tạo việc ở `pending` |
| `priority` | `low`, `normal`, `high`, `urgent` | Mức ưu tiên; mặc định `normal` |
| `category` | `CooperationCategory` | Nhóm hợp tác/nghiệp vụ |
| `businessFormId` | String?, FK | Hồ sơ đối tác liên quan, nếu có |
| `mainAssigneeId` | String?, FK User | Người phụ trách chính |
| `createdById` | String, FK User | Người tạo |
| `onBehalfOfId` | String?, FK User | Người được thao tác hộ |
| `startDate`, `dueDate` | DateTime? | Ngày bắt đầu và hạn của task |
| `items` | JSON[] | Checklist; mỗi mục có `id`, `label`, `done`; API còn quản lý `reportDueAt`, `completionDueAt`, lịch sử và dấu xóa |
| `attachments` | JSON[] | Tệp của task: `id`, `name`, `url` |
| `completedById`, `completedAt` | String?, DateTime? | Người và thời điểm hoàn thành |
| `deletedAt` | DateTime? | Xóa mềm; khác với `cancelled` |
| `createdAt`, `updatedAt`, `lastActivityAt` | DateTime | Truy vết tạo/sửa/hoạt động |

**Bảng liên quan**

| Đối tượng | Khóa / field chính | Ý nghĩa |
| --- | --- | --- |
| `BusinessFormTaskAssignment` | PK `(taskId, userId)`; `status=pending/accepted`, `assignedAt`, `assignedById` | Người được giao/tham gia; khác `mainAssigneeId` |
| `BusinessFormTaskActivity` | `id`, `taskId`, `type`, `message`, `createdById`, `createdAt`, `parentId`, `attachments` | Bình luận, đổi trạng thái/thành viên, phản hồi và lịch sử |
| `BusinessFormTaskPin` | PK `(taskId, userId)`, `pinnedAt` | Ghim riêng theo người |
| `TaskAssignGroup` | `id`, `name`, `ownerId` | Danh sách người để giao việc nhanh; không phải quan hệ trực tiếp của task |
| `TaskAssignGroupMember` | PK `(groupId, userId)` | Thành viên của nhóm giao việc |

## 3. Báo cáo hằng ngày

| Đối tượng / bảng | Field cốt lõi | Ý nghĩa / ràng buộc |
| --- | --- | --- |
| `DailyReportTemplate` / `daily_report_templates` | `id`, `name`, `isSystemDefault`, `ownerId`, `deletedAt` | Bộ câu hỏi; bản hệ thống có các câu lõi |
| `DailyReportTemplateVersion` / `daily_report_template_versions` | `id`, `templateId`, `version`, `nameSnapshot`, `publishedAt` | Phiên bản bất biến; report giữ phiên bản lúc sinh |
| `DailyReportQuestion` / `daily_report_questions` | `id`, `templateId`, `templateVersionId`, `kind`, `label`, `isRequired`, `allowTaskLink`, `sortOrder` | Câu hỏi của một phiên bản; `kind` hiện hành: `done`, `blocked`, `need_help`, `tomorrow`, `custom`; giá trị cũ `today`, `done_blocked` còn để đọc lịch sử |
| `DailyReportScope` / `daily_report_scopes` | `id`, `scopeType`, `assignGroupId?`, `teamId?`, `templateId`, `currentTemplateVersionId?`, `isEnabled`, `weekdays`, `timezone` | Cấu hình của đúng một nhóm giao việc **hoặc** đội |
| `DailyReport` / `daily_reports` | `id`, `scopeId`, `userId`, `reportDate`, `status`, `templateVersionId`, `participantSnapshotAt` | Một người × một phạm vi × một ngày; unique `(scopeId,userId,reportDate)` |
| `DailyReportAnswer` / `daily_report_answers` | `id`, `reportId`, `questionId`, `questionKind`, `questionLabel`, `content`, `linkedTaskIds`, `attachments` | Câu trả lời; lưu nhãn/kind câu hỏi dạng snapshot để xem lịch sử |
| `DailyReportKpi` / `daily_report_kpis` | `id`, `scopeId`, `name`, `isActive`, `sortOrder` | Danh mục KPI dạng checklist của phạm vi |
| `DailyReportKpiAchievement` / `daily_report_kpi_achievements` | `reportId`, `kpiId`, `nameSnapshot`, `selectedById` | KPI do thành viên xác nhận đã đạt; tên snapshot giữ lịch sử |
| `DailyReportRevision` / `daily_report_revisions` | `id`, `reportId`, `revisionNumber`, `submittedAt`, `answersSnapshot`, `reviewDeadlineAt`, `reviewExpiredAt` | Mỗi lần nộp là một bản chụp bất biến; unique `(reportId,revisionNumber)` |
| `DailyReportReview` / `daily_report_reviews` | `id`, `reportId`, `revisionId` unique, `reviewerId`, `decision`, `comment` | Một kết luận cho một revision; `decision=ACCEPTED/CONTINUED/REJECTED` |
| `DailyReportCarryOver` / `daily_report_carry_overs` | `id`, `chainId`, `fromReportId`, `toReportDate`, `taskId?`, `note?`, `reviewId?`, `confirmedByReviewId?`, `cancelledAt?` | Một việc chuyển sang ngày sau; có thể do member tự kéo hoặc người duyệt tạo/xác nhận |
| `DailyReportReviewGroup` và hai bảng nối | `scopeId`, `name`; người duyệt và thành viên | Nhóm phân công duyệt; một thành viên có thể thuộc nhiều nhóm duyệt |
| `DailyReportHelpRequest` / `daily_report_help_requests` | `reportId`, `answerId?`, `requesterId`, `status`, `content`, các mốc xử lý | Yêu cầu hỗ trợ từ báo cáo |

**Các field cấu hình thời gian của `DailyReportScope`:** `cutoffMinute` mặc định 1380 (23:00), `reminderBeforeMinutes` mặc định 390, `leaderSummaryMinute` mặc định 1040 (17:20), `reviewWindowDays` mặc định 3 ngày làm việc tính cả ngày nộp. `remindMinutes` cũng có trong schema; cần theo API/contract hiện hành khi đặc tả màn cấu hình. Mốc sinh bản 07:30 là cố định theo contract, không phải field chỉnh trong scope.

**Các field trạng thái của `DailyReport`:** `status=DRAFT/SUBMITTED/REOPENED/ARCHIVED`, `firstSubmittedAt`, `lastSubmittedAt`, `submittedById`, `reopenedAt`, `reopenReason`, `reviewDecision`, `reviewedById`, `editableUntil`, `reviewDeadlineAt`, `reviewExpiredAt`. `isResponse` và `isLate` còn trong DB vì lịch sử tương thích; giao diện mới đọc `status`, `permissions` và thông tin review từ API. `isMissed`/`isLocked` là ý nghĩa hiển thị do server trả, không phải status mới trong enum.

## 4. Data field trên màn hình

| Màn / field người dùng thấy | Field lưu hoặc API | Bắt buộc / kiểm tra | Ghi chú nghiệp vụ |
| --- | --- | --- | --- |
| Tạo công việc — Tên | `BusinessFormTask.title` | Bắt buộc, sau trim 1–200 ký tự | Tên ngắn để nhận diện trên danh sách/board |
| Tạo công việc — Mô tả | `description` | Tùy chọn, tối đa 2.000 ký tự | Nội dung chi tiết |
| Tạo công việc — Loại | `type` | Bắt buộc khi tạo | Cá nhân / đối tác / nội bộ |
| Tạo công việc — Ưu tiên | `priority` | Có mặc định `normal` | Không thay đổi trạng thái thực hiện |
| Tạo công việc — Người phụ trách | `mainAssigneeId` | Theo loại việc và quyền API | Khác danh sách người liên quan (`assignments`) |
| Tạo công việc — Ngày bắt đầu, hạn | `startDate`, `dueDate` | Tùy chọn | Hạn task khác hạn hai loại của checklist |
| Tạo công việc — Việc con | `items[]` | Tùy chọn; nhãn từng mục bắt buộc, tối đa 255 ký tự | Mỗi mục có nhãn, hoàn thành, hạn đưa vào báo cáo và hạn hoàn thành |
| Tạo công việc — Tệp | `attachments[]` | Tùy chọn, tối đa 20 tệp | Metadata tệp gồm tên và URL; lưu trữ vật lý ở dịch vụ khác |
| Báo cáo — Ngày/nhóm | `reportDate`, `scopeId` | Server xác định | Người dùng chọn ngữ cảnh xem, không tự tạo khóa báo cáo |
| Báo cáo — Câu trả lời | `answers[].content` | Tối đa 5.000 ký tự; yêu cầu có nội dung khi nộp phụ thuộc `questionIsRequired` | Nháp có thể chưa hoàn chỉnh; câu hỏi được snapshot |
| Báo cáo — Công việc liên kết | `answers[].linkedTaskIds` | Tùy chọn khi câu hỏi cho phép, tối đa 50 ID mỗi câu | Liên kết tham chiếu, không tự đổi trạng thái task |
| Báo cáo — Người được nhắc | `answers[].mentionedUserIds` | Tùy chọn, tối đa 50 ID mỗi câu | Người liên quan tới nội dung câu trả lời |
| Báo cáo — Tệp của câu trả lời | `answers[].attachments` | Tùy chọn, tối đa 20 tệp mỗi câu | Tách với tệp của task |
| Báo cáo — KPI đã đạt | `DailyReportKpiAchievement` | Tùy chọn | Thành viên xác nhận KPI active của scope |
| Duyệt — Kết luận | `DailyReportReview.decision` | Bắt buộc khi duyệt | Đạt / Tiếp tục thực hiện / Chưa đạt |
| Duyệt — Nhận xét | `DailyReportReview.comment` | Bắt buộc với `REJECTED` | Lý do trả lại cho thành viên; hai kết luận kia tùy chọn |
| Duyệt — Việc chuyển tiếp | `DailyReportCarryOver` | Ít nhất một dòng với `CONTINUED` | Có thể là task liên kết hoặc nội dung nhập tay |

Giới hạn ở bảng lấy từ DTO backend hiện tại. Định dạng và kích thước upload thực tế cần kiểm thêm ở dịch vụ tệp khi lập kịch bản kiểm thử chi tiết. `SaveDailyReportDto` cho tối đa 20 câu trả lời mỗi lần lưu và tối đa 100 KPI ID; đây là giới hạn payload, không phải số câu/KPI được hiển thị mặc định.

## 5. ERD lõi

ERD đã được tách thành [Công việc](./05-business-models.md), [Báo cáo](./05-business-models.md), và [Lần nộp/duyệt/chuyển tiếp](./05-business-models.md). Mỗi hình có entity, field chính, bội số quan hệ và một ví dụ đọc bằng lời. Bảng trong tài liệu này là nơi tra cứu field đầy đủ hơn.

`linkedTaskIds` trong câu trả lời và `taskId` trong dòng chuyển tiếp là **mã tham chiếu mềm** đến `BusinessFormTask`, không vẽ như khóa ngoại vật lý. `DailyReportScope` chỉ dùng một trong hai đích `TaskAssignGroup`/`Team`. Các sơ đồ lõi không gồm bảng notification/email, archive và membership history.

## 6. Field API cần phân biệt với field lưu trữ

| Field API / UI | Nguồn ý nghĩa |
| --- | --- |
| `permissions.canEdit`, `canSubmit`, `canReopen`, `review.canReview` | Server tính theo actor, chủ bản, trạng thái, mốc thời gian và phân công duyệt |
| `isLocked`, `isMissed`, `emptyReason` | Server diễn giải lịch/snapshot/trạng thái để UI hiển thị |
| `reviewState` trên board | Server suy từ trạng thái nộp, kết luận và mốc hết hạn; không phải cột DB riêng |
| `carryCandidates` | Server chọn việc đủ điều kiện chuyển tiếp tại lúc người duyệt mở bản |
| `generationLabel`, `hardStopLabel` | Chuỗi đọc từ server; field ghi cấu hình là các giá trị phút trong scope |

## 7. Nguồn kiểm chứng

Schema hiện tại: `acta-main-server/prisma/schema/business-form.prisma`, `task-assign-group.prisma`, `daily-report.prisma`. Kiểu API client: `acta-social/types/task.type.ts`, `daily-report.type.ts`. Quy tắc chi tiết: backend `docs/features/task-management/15-contract-chot-truoc-test.md` và `20-vong-duyet-bao-cao.md`.
