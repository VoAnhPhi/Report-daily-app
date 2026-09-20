# 04 — Quy tắc nghiệp vụ, quyền và tiêu chí nghiệm thu

> Ma trận này là cách đọc nghiệp vụ. Backend là nơi quyết định quyền cuối cùng; các cờ `permissions` và `review.canReview` trong response là dữ liệu để giao diện hiển thị hành động.

## 1. Ma trận quyền theo đối tượng

Ký hiệu: **Có** = thao tác thuộc vai trò khi các điều kiện trạng thái còn hợp lệ; **Theo quyền API** = cần kiểm tra quan hệ cụ thể trên bản/task; **Không** = không cấp chỉ vì vai trò đó.

| Thao tác | Chủ task / người liên quan | Chủ báo cáo | Quản lý phạm vi | Người duyệt phụ | Admin nền tảng |
| --- | --- | --- | --- | --- | --- |
| Xem/cập nhật task | Theo quyền API | Theo quyền API | Theo quyền API | Theo quyền API | Theo quyền API |
| Viết/lưu/nộp báo cáo của mình | Không suy từ task | Có, khi `canEdit/canSubmit` | Có cho bản của chính mình | Có cho bản của chính mình | Theo quyền API |
| Xem lịch sử báo cáo của mình | Không suy từ task | Có | Có | Có | Có |
| Xem board/summary toàn phạm vi | Không | Không | Có | Không mặc nhiên; dữ liệu có thể được lọc theo phân công | Theo quyền API |
| Duyệt bản của người khác | Không | Không | Có khi `review.canReview` | Có với người được phân công khi `review.canReview` | Theo quyền API; không duyệt bản của mình |
| Bật/tắt scope, đổi lịch/KPI/bộ câu hỏi | Không | Không | Có | Không | Theo quyền quản trị của API |
| Quản lý nhóm duyệt | Không | Không | Có | Không | Theo quyền quản trị của API |
| Gửi yêu cầu hỗ trợ trên bản | Không suy từ task | Theo quyền API | Theo quyền API trên bản của mình | Theo quyền API trên bản của mình | Theo quyền API |

**Người làm thay:** chỉ thao tác khi quan hệ chăm sóc hợp lệ, và dữ liệu vẫn thuộc người được làm thay. Quyền quản lý/duyệt không truyền theo vai này.

## 2. Quy tắc có mã truy vết

| Mã | Quy tắc | Chứng cứ triển khai |
| --- | --- | --- |
| BR-01 | Task công việc là `BusinessFormTask`, tách với task tích điểm. | Prisma `business-form.prisma`, `gamification.prisma` |
| BR-02 | Task có bốn trạng thái `pending/in_progress/done/cancelled`; xóa mềm là `deletedAt`, không phải `cancelled`. | Prisma `business-form.prisma` |
| BR-03 | Chọn nhóm giao việc để giao người là thao tác chép danh sách thành viên; task không tham chiếu `TaskAssignGroup`. | Prisma `task-assign-group.prisma` và service task |
| BR-04 | Hạn đưa checklist vào báo cáo khác hạn hoàn thành checklist và hạn task. | `TaskItemDto`, `types/task.type.ts` |
| BR-05 | Một report duy nhất cho một `scope × user × reportDate`; một người có thể có nhiều report cùng ngày ở nhiều scope. | Unique index `DailyReport` |
| BR-06 | Phạm vi báo cáo gắn đúng một nhóm giao việc hoặc một đội. | `DailyReportScope`, `CreateReportScopeDto` và service |
| BR-07 | 07:30 chụp thành viên và phiên bản câu hỏi; người gia nhập sau snapshot không có nghĩa vụ của ngày đó. | Contract backend §1–2 |
| BR-08 | Mốc tổng hợp quản lý mặc định 17:20 không khóa nộp; hard stop mặc định 23:00. | Contract backend §1, §3 |
| BR-09 | Report mới có thể có nháp tự dựng từ task; người nộp có thể sửa. Gợi ý không tự đổi trạng thái task. | `DailyReportDraftService`, `DailyReportAnswer.isAutoDrafted` |
| BR-10 | Lưu nháp không tạo lần nộp. Mỗi lần nộp tạo `DailyReportRevision` để giữ lịch sử. | `DailyReportRevision`, API save/submit |
| BR-11 | `DRAFT/SUBMITTED/REOPENED/ARCHIVED` là trạng thái report; “Không nộp” và “Khóa” là trạng thái hiển thị do server tính. | Schema, `types/daily-report.type.ts` |
| BR-12 | Hạn duyệt được chốt trên revision lúc nộp; đổi `reviewWindowDays` không sửa hạn cũ. | `DailyReportRevision.reviewDeadlineAt` |
| BR-13 | Mỗi revision chỉ có một kết luận. Người duyệt không tự duyệt bản của mình. | Unique `DailyReportReview.revisionId`, `review.canReview` |
| BR-14 | `ACCEPTED`: giữ `SUBMITTED`, không có carry. `CONTINUED`: giữ `SUBMITTED`, cần ít nhất một carry. `REJECTED`: `REOPENED`, cần lý do. | Đặc tả vòng duyệt §7.1, DTO/API |
| BR-15 | Bản bị trả có cửa sổ sửa `editableUntil` hợp lệ, là ngoại lệ được server kiểm với hard stop thông thường. | Contract backend §3, đặc tả vòng duyệt §7.8 |
| BR-16 | Việc chuyển tiếp có `chainId`; `taskId` có thể rỗng cho việc nhập tay. Dòng bị hủy vẫn giữ lịch sử. | `DailyReportCarryOver` |
| BR-17 | Phân quyền xem board khác phân quyền duyệt một bản. Người duyệt phụ chỉ được xử lý chủ bản được phân công. | `DailyReportScopeService`, đặc tả vòng duyệt §8 |
| BR-18 | Quyền, lý do rỗng/khóa và ứng viên carry lấy từ server; UI không tự tính lại. | `types/daily-report.type.ts`, response API |

## 3. Tiêu chí nghiệm thu trọng tâm

| ID | Tình huống | Kết quả mong đợi |
| --- | --- | --- |
| AC-T01 | Người dùng tạo task với tên hợp lệ và loại việc, không chọn trạng thái | Task mới ở `in_progress`, có mã công việc và hiển thị trong danh sách thích hợp; task do quản trị tạo ở `pending` |
| AC-T02 | Tạo task với tên rỗng, quá 200 ký tự hoặc trạng thái khởi tạo `done` | API từ chối với lỗi validation; không tạo task |
| AC-T03 | Người được giao chưa nhận mở task | Assignment là `pending`; xác nhận xong thành `accepted`, không đổi status task |
| AC-T04 | Xóa task, sau đó mở thùng rác/khôi phục | `deletedAt` được đặt rồi xóa; trạng thái `cancelled` không bị dùng thay thế |
| AC-R01 | Một user ở hai scope cùng ngày | Hai report khác `scopeId`; câu trả lời và KPI không trộn |
| AC-R02 | User vào scope sau snapshot 07:30 | Không tự bị tính “Không nộp” cho ngày đó |
| AC-R03 | Nộp lúc sau 17:20 và trước cutoff khi còn `canSubmit` | Nộp thành công; board trực tiếp cập nhật, số liệu email đã chốt không bị viết lại |
| AC-R04 | Lưu nháp, thoát và vào lại | Nội dung nháp còn; status chưa thành `SUBMITTED` |
| AC-R05 | Người không có quyền mở deep link bản của thành viên khác | API từ chối; UI hiển thị không có quyền/không tìm thấy, không rò nội dung |
| AC-R06 | Hai người duyệt cùng kết luận một revision | Chỉ một kết luận được ghi; thao tác sau nhận xung đột |
| AC-R07 | Duyệt `CONTINUED` không chọn dòng carry; hoặc `REJECTED` không nhập lý do | API từ chối, không tạo kết luận dở dang |
| AC-R08 | Bị trả, sửa và nộp lại trong `editableUntil` | Tạo revision mới; revision cũ và kết luận cũ còn tra cứu được |
| AC-R09 | Đổi `reviewWindowDays` sau khi một bản đã nộp | Hạn duyệt của revision đã nộp giữ nguyên |
| AC-R10 | Cùng một việc đã được member kéo và người duyệt xác nhận lại | Không tạo hai dòng carry trùng cho cùng quyết định/chuỗi |

## 4. Những điểm chưa được xác nhận bằng thông tin ngoài code

| Mã | Cần xác nhận với PO/khách hàng | Mặc định đang dùng để biên soạn |
| --- | --- | --- |
| OQ-01 | Đây là tài liệu mô tả **as-is** hay cũng bao gồm thay đổi mong muốn? | As-is; thay đổi mới sẽ ghi thành mục riêng sau khi có yêu cầu |
| OQ-02 | Gói gửi khách hàng có cần ẩn phần DB/API hay gửi cùng một bản? | Bản luồng cho khách hàng; từ điển dữ liệu/ERD cho dev/PO |
| OQ-03 | Các từ “nhóm”, “đội”, “người duyệt phụ”, “Không nộp” có tên chính thức trong hợp đồng/UAT không? | Dùng nhãn hiện tại của sản phẩm |
| OQ-04 | Có quy tắc ngoại tuyến về ngày nghỉ, phân quyền làm thay, quá hạn duyệt hoặc SLA thông báo không? | Chỉ mô tả rule thấy trong code/contract |

## 5. Thứ tự nguồn khi có mâu thuẫn

1. API/service và schema hiện tại cho hành vi đang chạy.
2. Tài liệu backend [contract](../../../../../acta-servers/acta-main-server/docs/features/task-management/15-contract-chot-truoc-test.md) và [vòng duyệt](../../../../../acta-servers/acta-main-server/docs/features/task-management/20-vong-duyet-bao-cao.md) cho ý định nghiệp vụ.
3. Tài liệu UI/thiết kế cũ để hiểu lý do và lịch sử; không dùng thay cho code hiện tại.

Nếu code và quyết định PO khác nhau, ghi thành issue riêng rồi chốt lại trước khi chuyển trạng thái hồ sơ sang “Đã xác nhận”.
