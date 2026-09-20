# 03 — Danh mục use case

> Phạm vi: hành vi đang triển khai trong `acta-social` và `acta-main-server` tại ngày 19/09/2026. “Thành công” ở đây nghĩa là API ghi nhận và giao diện tải lại dữ liệu mới; các quyền cụ thể luôn do server quyết định.

## Bản đồ use case

| ID | Use case | Actor khởi tạo | Kết quả |
| --- | --- | --- | --- |
| UC-T01 | Tạo và giao công việc | Người có quyền tạo việc | Task mới có mã, trạng thái khởi tạo và người liên quan |
| UC-T02 | Xác nhận tham gia công việc | Người được giao | Assignment chuyển từ chờ sang đã nhận |
| UC-T03 | Cập nhật tiến độ, checklist và trao đổi | Người có quyền trên task | Dữ liệu task và hoạt động được ghi |
| UC-T04 | Hoàn thành/hủy, xóa/khôi phục công việc | Người có quyền tương ứng | Trạng thái hoặc dấu xóa mềm thay đổi |
| UC-R01 | Bật và cấu hình báo cáo cho phạm vi | Quản lý phạm vi | Scope có lịch, bộ câu hỏi và giờ vận hành |
| UC-R02 | Viết, lưu nháp và nộp báo cáo | Thành viên hoặc người làm thay hợp lệ | Report được nộp, tạo revision |
| UC-R03 | Xem lịch sử cá nhân | Chủ báo cáo | Xem lại các ngày và phạm vi của mình |
| UC-R04 | Theo dõi báo cáo nhóm và tổng hợp | Quản lý/người duyệt theo quyền | Xem trạng thái nộp/duyệt và nội dung được cấp quyền |
| UC-R05 | Duyệt báo cáo | Quản lý hoặc người duyệt phụ được phân công | Một kết luận gắn với revision mới nhất |
| UC-R06 | Sửa và nộp lại bản bị trả | Chủ báo cáo | Revision mới và vòng duyệt mới |
| UC-R07 | Chuyển tiếp công việc | Chủ báo cáo hoặc người duyệt theo luồng | Dòng carry sang ngày làm việc kế tiếp |
| UC-R08 | Gửi và xử lý yêu cầu hỗ trợ | Thành viên, người có quyền xử lý | Yêu cầu hỗ trợ có trạng thái và lịch sử |

## UC-T01 — Tạo và giao công việc

**Tiền điều kiện:** người dùng đã đăng nhập; API cho phép tạo loại công việc đã chọn.

**Luồng chính:**

1. Mở `/tasks`, chọn tạo công việc và loại việc.
2. Nhập tên, mô tả, ưu tiên, thời gian, người liên quan, checklist và tệp nếu có.
3. Gửi form. API kiểm tra dữ liệu và tạo `BusinessFormTask` với trạng thái đầu `pending` hoặc `in_progress`.
4. Hệ thống cấp mã công việc và hiển thị task trong danh sách/board phù hợp.

**Ngoại lệ:** thiếu tên/loại; tên quá 200 ký tự; trạng thái đầu là `done`/`cancelled`; quá 20 tệp; người/hồ sơ liên kết không hợp lệ; API từ chối quyền. Form cần giữ dữ liệu người dùng đã nhập để sửa lỗi. Nhóm giao việc nhanh chỉ **sao chép danh sách người** vào assignment khi chọn; task không lưu `groupId` của nhóm đó.

## UC-T02 — Xác nhận tham gia

**Tiền điều kiện:** người dùng có assignment `pending` trên task. **Luồng chính:** mở task, đọc nội dung, chọn xác nhận; API đổi assignment sang `accepted`, task hiện trong ngữ cảnh tham gia tương ứng. **Ngoại lệ:** lời mời đã bị gỡ hoặc task bị xóa; API trả trạng thái mới và UI tải lại. Không đánh đồng assignment `accepted` với task `done`.

## UC-T03/T04 — Theo dõi và kết thúc công việc

Người có quyền trên task xem chi tiết, cập nhật trạng thái/checklist, thêm bình luận, phản hồi và tệp. Hoạt động được ghi vào timeline; việc con có thể có hạn đưa vào báo cáo và hạn hoàn thành riêng. Khi hoàn thành hoặc hủy, `status` là `done` hoặc `cancelled`. Xóa là thao tác khác: đặt `deletedAt`, và có luồng khôi phục theo quyền. Ghim chỉ ảnh hưởng danh sách của người ghim.

**Ngoại lệ cần thử:** nhiều người cập nhật gần nhau; task đã xóa; tệp lỗi; người dùng mất quyền trong lúc mở chi tiết; checklist bị thay đổi ID; thao tác hoàn thành thiếu bằng chứng nếu API yêu cầu. Không suy điều kiện này từ giao diện trước khi đọc phản hồi API.

## UC-R01 — Bật và cấu hình báo cáo

**Tiền điều kiện:** người dùng là quản lý hợp lệ của nhóm giao việc hoặc đội. **Luồng chính:** chọn phạm vi, bật Daily Report, chọn bộ câu hỏi và ngày trong tuần, cấu hình giờ nhắc/tổng hợp/khóa, KPI và cửa sổ duyệt; hệ thống tạo/cập nhật `DailyReportScope`. Giờ sinh 07:30 cố định. Đổi bộ câu hỏi tạo phiên bản mới cho các report tiếp theo; bản đã sinh giữ phiên bản cũ.

**Ngoại lệ:** chọn cả `assignGroupId` và `teamId`, hoặc không chọn đích nào; lịch rỗng; mốc giờ không thỏa thứ tự; scope đã có; không có quyền. Khi tạo/bật scope sau 07:30, cơ chế tạo bản đầu theo thời điểm thao tác đã được backend mô tả trong [contract](../../../../../acta-servers/acta-main-server/docs/features/task-management/15-contract-chot-truoc-test.md).

## UC-R02 — Viết, lưu nháp và nộp báo cáo

**Tiền điều kiện:** người dùng thuộc snapshot của phạm vi/ngày; report tồn tại và server trả quyền ghi. **Luồng chính:** mở `/daily-reports/today`, chọn phạm vi, rà soát nội dung nháp/gợi ý từ công việc, sửa câu trả lời, gắn việc/tệp và chọn KPI đạt được. Lưu nháp không đổi trạng thái nộp. Bấm Nộp, API kiểm tra câu bắt buộc và quyền, lưu `DailyReportRevision` bất biến, chuyển report sang `SUBMITTED` và bắt đầu hạn duyệt.

**Ngoại lệ:** chưa tới giờ sinh; ngày không báo cáo; người vào nhóm sau snapshot; câu bắt buộc còn trống; report đã khóa; mất quyền; gửi lặp. Giao diện cần hiện lý do thực do API trả. Nộp sau mốc tổng hợp 17:20 nhưng trước hard stop vẫn hợp lệ khi API cho phép.

## UC-R03/R04 — Xem lịch sử và theo dõi nhóm

Chủ báo cáo xem lịch sử của mình theo tháng/phạm vi và mở lại bản chi tiết. Quản lý xem board một ngày, tổng hợp theo khoảng ngày và chi tiết thành viên. Người duyệt phụ chỉ thấy dữ liệu thuộc phân công của mình; không suy quyền toàn phạm vi từ quyền duyệt. Bản chưa nộp hiển thị “Không nộp” theo dữ liệu server, không phải lỗi tải trang.

**Ngoại lệ:** scope lưu trữ/xóa, thành viên rời nhóm, deep link tới bản đã mất quyền, dữ liệu đang catch-up sau giờ sinh. Không chuyển người xem âm thầm sang ngày/nhóm khác.

## UC-R05 — Duyệt một lần nộp

**Tiền điều kiện:** bản `SUBMITTED`, có revision chưa có kết luận, chưa hết hạn duyệt; người xem được phân quyền với đúng chủ báo cáo và không phải chủ bản. UI dùng `review.canReview` do server trả.

1. Người duyệt mở bản cần xử lý và đọc câu trả lời, KPI, task liên kết.
2. Chọn **Đạt**, **Tiếp tục thực hiện**, hoặc **Chưa đạt**.
3. Với “Tiếp tục”, chọn ít nhất một dòng công việc đủ điều kiện; với “Chưa đạt”, nhập lý do. Gửi kết luận.
4. Hệ thống gắn một `DailyReportReview` vào revision đó; bản ra khỏi hàng chờ duyệt. “Chưa đạt” chuyển report sang `REOPENED` và cấp cửa sổ sửa; hai kết luận còn lại giữ `SUBMITTED`.

**Ngoại lệ:** hai người duyệt cùng lúc (người sau nhận xung đột); task đã hoàn thành/hủy/xóa trước lúc duyệt; quá hạn duyệt; người duyệt bị rút phân công. Danh sách ứng viên chuyển tiếp do server dựng lại tại thời điểm đọc/xử lý.

## UC-R06/R07 — Sửa lại và chuyển tiếp

Khi bị trả, chủ bản sửa nội dung rồi nộp lại trước `editableUntil`; lịch sử revision trước còn nguyên. Mỗi lần nộp mới chốt hạn duyệt mới. Với việc chuyển tiếp, chủ bản có thể tự kéo việc thuộc báo cáo của mình; người duyệt có thể chọn việc cần làm tiếp khi kết luận “Tiếp tục thực hiện”. `chainId` nối các lần chuyển qua nhiều ngày; cùng một dòng đã được kéo trước đó có thể được người duyệt xác nhận thay vì tạo dòng trùng.

**Ngoại lệ:** dòng đã hủy, task đã xong, không còn thuộc báo cáo/phạm vi, đã quá cửa sổ sửa. Các điều kiện này do API kiểm.

## UC-R08 — Yêu cầu hỗ trợ

Thành viên gửi nội dung cần hỗ trợ từ báo cáo/câu trả lời. Người được cấp quyền xem và đánh dấu đã tiếp nhận, giải quyết; yêu cầu có thể bị hủy theo quyền và trạng thái. Trạng thái lưu: `OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `CANCELLED`. Nội dung hỗ trợ tách khỏi kết luận duyệt và không tự đổi trạng thái nộp.

## Nguồn đối chiếu

Frontend: `components/tasks/`, `components/daily-report/`, `types/task.type.ts`, `types/daily-report.type.ts`. Backend: `src/business-forms/dto/user-task.dto.ts`, `src/daily-reports/dto/daily-report.dto.ts`, hai Prisma schema và tài liệu contract/vòng duyệt dẫn ở [mục lục](./README.md).
