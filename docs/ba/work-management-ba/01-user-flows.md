# 01 — Tổng quan và luồng người dùng

## 1. Mục đích và ranh giới

**Công việc** giúp tạo, giao, theo dõi trạng thái và trao đổi về một đầu việc. **Báo cáo hằng ngày** ghi nhận nội dung làm việc của từng người theo từng phạm vi và ngày. Một báo cáo có thể liên kết công việc; trạng thái công việc và kết luận duyệt báo cáo là hai thông tin độc lập.

Một phạm vi báo cáo (`DailyReportScope`) gắn với đúng một **nhóm giao việc** hoặc một **đội/phòng ban**, một bộ câu hỏi và lịch báo cáo. Một người có thể có nhiều báo cáo trong cùng ngày nếu thuộc nhiều phạm vi.

## 2. Actor

| Actor | Nhu cầu / thao tác chính | Ranh giới quyền |
| --- | --- | --- |
| Người tạo/giao công việc | Tạo, sửa, giao người phụ trách/người liên quan, theo dõi công việc | Quyền sửa/xóa do API kiểm theo quan hệ với công việc |
| Người phụ trách/người liên quan | Xem việc, xác nhận tham gia khi được giao, cập nhật phần được phép, bình luận/checklist | Không tự có quyền quản lý mọi công việc |
| Thành viên phạm vi báo cáo | Xem bản hôm nay; lưu nội dung, chọn KPI, nộp, xem lịch sử của mình | Chỉ thao tác khi server trả permission tương ứng |
| Quản lý phạm vi | Cấu hình lịch/bộ câu hỏi/KPI; xem bảng nhóm, tổng hợp; duyệt báo cáo trong phạm vi | Không duyệt bản của chính mình; API kiểm quyền trên từng bản |
| Người duyệt phụ | Duyệt báo cáo của các thành viên được phân công qua nhóm duyệt | Quyền theo cặp người duyệt–chủ báo cáo, không mặc nhiên thấy toàn nhóm |
| Admin | Các thao tác quản trị được hệ thống cấp | Không bỏ qua luật khóa hoặc kiểm tra API |
| Người làm thay | Thao tác hộ người được chăm khi quan hệ hợp lệ | Báo cáo/công việc vẫn thuộc người được làm thay |

**Nguyên tắc:** giao diện đọc cờ quyền do server trả; API xác thực lại ở từng thao tác. Bảng này là tóm tắt, không dùng để suy quyền từ nhãn vai trò trên client.

## 3. Luồng công việc

Xem [use case Công việc và mô hình trạng thái](./05-business-models.md). Lời mời tham gia có trạng thái riêng; người được giao bấm “Nhận tham gia” **không tự chuyển** công việc từ “Chờ xử lý” sang “Đang làm”. Người có quyền mới đổi trạng thái task bằng thao tác cập nhật.

`BusinessFormTask.status`: `pending`, `in_progress`, `done`, `cancelled`. Người dùng có thể xem ở dạng bảng/board; thao tác cập nhật có thể bị từ chối tùy quyền và trạng thái. Công việc xóa mềm có thể xuất hiện trong thùng rác và được khôi phục theo API. Ghim công việc là lựa chọn riêng của từng người.

Checklist có **hạn đưa vào báo cáo** (`reportDueAt`) và **hạn hoàn thành** (`completionDueAt`) riêng. Hai mốc không đồng nghĩa. Công việc có thể liên kết một hồ sơ đối tác (`BusinessForm`), nhưng không phải mọi công việc đều có hồ sơ đó.

## 4. Luồng báo cáo cá nhân

Xem [BPMN quy trình nộp và duyệt](./05-business-models.md). Quy trình đó bắt đầu sau khi bản báo cáo đã sẵn sàng; việc sinh bản 07:30, nhắc nộp và gửi tổng hợp là các lịch vận hành riêng.

Mỗi bản có khóa duy nhất `scopeId + userId + reportDate`. Nội dung câu hỏi và KPI cần giữ được ngữ cảnh lịch sử khi cấu hình thay đổi. Người dùng xem lịch sử cá nhân xuyên phạm vi ở `/daily-reports/history`; quản lý xem board, tổng hợp và bản của thành viên theo quyền.

Khi tạo báo cáo, hệ thống có thể dựng **nội dung nháp tự động** từ công việc liên quan và việc chuyển tiếp. Người nộp đọc, chỉnh sửa và chịu trách nhiệm về nội dung trước khi bấm Nộp. Gợi ý/nháp không đồng nghĩa công việc đã hoàn thành; trạng thái task vẫn theo dữ liệu task. Các câu trả lời ghi lại `isAutoDrafted` để phân biệt nội dung còn nguyên gợi ý với nội dung đã được người dùng sửa.

Lịch mặc định theo múi giờ phạm vi: **07:30** sinh báo cáo; nhắc mặc định **16:30**; tổng hợp gửi quản lý mặc định **17:20**; khóa thao tác thường mặc định **23:00**. 17:20 không phải hạn nộp: bản nộp sau mốc đó vẫn hợp lệ nếu còn quyền và chưa tới giờ khóa. Server quyết định `isLocked`, `isMissed` và cờ quyền; client không tự suy từ đồng hồ thiết bị. Ngày không thuộc lịch, người chưa nằm trong snapshot hoặc phạm vi chưa bật không bị tính “Không nộp”.

## 5. Luồng duyệt và chuyển tiếp

Ba nhánh kết luận và nhánh quá hạn được mô tả trong [BPMN](./05-business-models.md). [Mô hình trạng thái](./05-business-models.md) tách trạng thái bản báo cáo khỏi kết luận của từng lần nộp.

Quyết định duyệt gắn với **một lần nộp** (`DailyReportRevision`), không gắn vĩnh viễn với cả báo cáo. `CONTINUED` tạo hoặc xác nhận dòng chuyển việc sang ngày làm việc tiếp theo; việc có thể liên kết task hoặc là nội dung nhập tay. Người nộp cũng có thể tự kéo việc của mình theo luật server. Chuỗi chuyển tiếp có `chainId` để theo dõi nhiều ngày.

Quyết định và trạng thái nộp là hai trục khác nhau: `REOPENED` có thể còn lưu kết luận của revision trước; sau khi nộp lại, vòng duyệt mới bắt đầu. Hạn duyệt được chốt tại thời điểm nộp, không tính lại khi quản lý sửa cấu hình `reviewWindowDays`. Bản bị trả lại có `editableUntil` hợp lệ là ngoại lệ cho phép sửa/nộp lại sau giờ khóa thường; các ngoại lệ mở lại sau giờ khóa do server kiểm.

## 6. Luồng hỗ trợ và ngoại lệ cần hiển thị

- Thành viên có thể tạo yêu cầu hỗ trợ gắn với báo cáo/câu trả lời; vòng đời `OPEN → ACKNOWLEDGED → RESOLVED`, hoặc `CANCELLED`.
- Lỗi mạng, chưa tới giờ sinh, đang đồng bộ, ngày không báo cáo, chưa có phạm vi và bản đã khóa là các tình huống khác nhau; giao diện cần nói đúng lý do server trả.
- Khi người dùng mở deep link tới bản hoặc task đã mất quyền, API có thể trả 403/404; không tự chuyển sang bản hoặc ngày khác.
- Report không nộp đúng hạn là trạng thái hiển thị trong lịch sử/board, không phải thao tác “nộp bù” sau giờ khóa.

## 7. Điểm kiểm thử nghiệm thu gợi ý

1. Tạo việc → giao người → xác nhận → cập nhật checklist/trạng thái → thấy lịch sử hoạt động.
2. Một người thuộc hai phạm vi → thấy hai bản báo cáo riêng cùng ngày, không trộn câu trả lời.
3. Nộp sau 17:20 nhưng trước giờ khóa → vẫn nộp được; board trực tiếp cập nhật.
4. Người duyệt phụ chỉ duyệt đúng thành viên được phân công; không duyệt bản của mình.
5. Ba kết luận duyệt có ràng buộc riêng: Đạt không có carry; Tiếp tục có ít nhất một carry; Chưa đạt có lý do và cửa sổ sửa.
6. Nộp lại sau khi bị trả → revision cũ còn; hạn duyệt mới được chốt cho revision mới.

## 8. Nguồn kiểm chứng

Màn và kiểu dữ liệu: `app/(routes)/tasks`, `app/(routes)/daily-reports`, `components/tasks`, `components/daily-report`, `types/task.type.ts`, `types/daily-report.type.ts`. Luật lịch và phân quyền: backend `docs/features/task-management/15-contract-chot-truoc-test.md`. Vòng duyệt và chuyển tiếp: backend `docs/features/task-management/20-vong-duyet-bao-cao.md`; cấu trúc lưu trữ: hai schema được dẫn ở [README](./README.md).
