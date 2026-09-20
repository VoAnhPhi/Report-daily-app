# Tổng quan tính năng Công việc và Báo cáo hằng ngày

> Bản giới thiệu cho khách hàng · Ngày đối chiếu: 19/09/2026 · Chờ PO xác nhận tên gọi và quy định vận hành chính thức.

## Hai phần của cùng quy trình

**Công việc** là nơi người dùng tạo đầu việc, giao người thực hiện, theo dõi tiến độ và trao đổi trong quá trình làm. Mỗi công việc có người phụ trách, trạng thái, mức ưu tiên, thời hạn và có thể có danh sách việc con, tệp đính kèm.

**Báo cáo hằng ngày** là nơi từng thành viên ghi lại kết quả trong ngày theo nhóm/đội mình tham gia. Báo cáo dùng bộ câu hỏi đã cấu hình, có thể tham chiếu công việc liên quan, ghi nhận KPI đã đạt và gửi yêu cầu hỗ trợ. Một người tham gia nhiều nhóm có một bản báo cáo riêng cho mỗi nhóm trong cùng ngày.

## Một ngày làm việc điển hình

1. Người phụ trách cập nhật công việc và các việc con trong ngày.
2. Hệ thống chuẩn bị báo cáo theo lịch của nhóm, mặc định lúc 07:30, kèm nội dung nháp tham khảo từ công việc liên quan.
3. Thành viên đọc, sửa nội dung, chọn KPI đã đạt rồi nộp báo cáo. Có thể lưu nháp trước khi nộp.
4. Quản lý theo dõi bảng của nhóm: ai đã nộp, ai chưa nộp, ai cần hỗ trợ.
5. Người có quyền duyệt đọc báo cáo và chọn **Đạt**, **Tiếp tục thực hiện**, hoặc **Chưa đạt**. Trường hợp “Chưa đạt”, thành viên nhận lý do, sửa và nộp lại trong thời hạn được cấp.

## Các mốc mặc định

| Mốc | Ý nghĩa |
| --- | --- |
| 07:30 | Hệ thống chuẩn bị báo cáo cho những thành viên có nghĩa vụ trong ngày |
| 16:30 | Nhắc những người chưa nộp, theo cấu hình mặc định |
| 17:20 | Gửi số liệu tổng hợp tại thời điểm đó cho quản lý; thành viên vẫn có thể nộp tiếp |
| 23:00 | Khóa thao tác nộp/sửa thông thường; ngoại lệ sửa bản bị trả theo hạn do hệ thống cấp |

Giờ nhắc, tổng hợp và khóa có thể được cấu hình theo phạm vi trong giới hạn hệ thống. Ngày không thuộc lịch báo cáo hoặc người chưa có nghĩa vụ tại thời điểm hệ thống chụp danh sách sẽ không bị tính là “Không nộp”.

## Trách nhiệm của từng vai trò

| Vai trò | Việc thường làm |
| --- | --- |
| Thành viên | Theo dõi task được giao; viết, lưu và nộp báo cáo của mình; xem lịch sử cá nhân |
| Quản lý nhóm/đội | Thiết lập lịch và nội dung báo cáo; xem bảng/tổng hợp; xử lý báo cáo cần duyệt |
| Người duyệt phụ | Duyệt báo cáo của các thành viên được quản lý phân công |
| Người làm thay | Thao tác hộ người khác khi hệ thống xác nhận quan hệ hợp lệ |

Quyền thao tác được kiểm trên từng công việc và từng bản báo cáo. Vai trò trên bảng chỉ mô tả trách nhiệm thông thường.

## Phạm vi cần xác nhận trước bàn giao

- Tên chính thức của “nhóm giao việc” và “đội/phòng ban” trong tài liệu khách hàng.
- Cách diễn đạt ba kết luận duyệt và trạng thái “Không nộp” có đúng thuật ngữ đang dùng trong hợp đồng/UAT không.
- Có lịch nghỉ, SLA xử lý hoặc trường hợp phân quyền đặc biệt nào cần bổ sung ngoài tính năng hiện tại không.

Bạn có thể xem [các sơ đồ và ví dụ đọc](./05-business-models.md) trước khi đi vào chi tiết. [Luồng người dùng](./01-user-flows.md), [từ điển dữ liệu](./02-data-dictionary-erd.md), [use case](./03-use-cases.md) và [quy tắc nghiệm thu](./04-business-rules-acceptance.md) dành cho PO/dev/QA khi rà soát sâu.
