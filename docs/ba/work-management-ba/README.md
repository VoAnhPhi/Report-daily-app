# Hồ sơ nghiệp vụ — Công việc và Báo cáo hằng ngày

> Bản nháp đối chiếu code ngày 19/09/2026 · Đối tượng đọc: khách hàng, PO, dev/QA · Trạng thái: **chờ xác nhận nghiệp vụ**.

## Cách dùng bộ tài liệu

| Tài liệu | Nội dung | Người đọc chính |
| --- | --- | --- |
| [00 — Tổng quan cho khách hàng](./00-customer-overview.md) | Giá trị, quy trình, mốc giờ và vai trò bằng ngôn ngữ phổ thông | Khách hàng, PO |
| [01 — Tổng quan và luồng người dùng](./01-user-flows.md) | Mục tiêu, actor, user flow, quy tắc, ngoại lệ | Khách hàng, PO, QA |
| [02 — Từ điển dữ liệu và ERD](./02-data-dictionary-erd.md) | Khái niệm, field, quan hệ dữ liệu | PO, dev, QA |
| [03 — Danh mục use case](./03-use-cases.md) | Tiền điều kiện, luồng chính, ngoại lệ, hậu điều kiện | PO, dev, QA |
| [04 — Quy tắc và nghiệm thu](./04-business-rules-acceptance.md) | Ma trận quyền, business rules, acceptance, câu hỏi mở | PO, khách hàng, QA |
| [05 — Bộ mô hình](./05-business-models.md) | UML Use Case, BPMN, trạng thái và ERD có entity/field chính/quan hệ | Khách hàng, PO, dev |

**Phạm vi:** màn Công việc `/tasks` dùng `BusinessFormTask`, và Báo cáo hằng ngày `/daily-reports/*`. “Task” tích điểm của gamification là tính năng khác. Bộ này mô tả hành vi đang có trong code, không thay thế biên bản chấp thuận nghiệp vụ.

**Nguồn đối chiếu chính:** [schema công việc](../../../../../acta-servers/acta-main-server/prisma/schema/business-form.prisma), [schema báo cáo](../../../../../acta-servers/acta-main-server/prisma/schema/daily-report.prisma), [kiểu dữ liệu frontend công việc](../../../types/task.type.ts), [kiểu dữ liệu frontend báo cáo](../../../types/daily-report.type.ts), [contract backend](../../../../../acta-servers/acta-main-server/docs/features/task-management/15-contract-chot-truoc-test.md), [vòng duyệt](../../../../../acta-servers/acta-main-server/docs/features/task-management/20-vong-duyet-bao-cao.md). Hai đặc tả backend chi tiết hơn tài liệu này; nếu có khác biệt cần đối chiếu code hiện tại trước khi chốt.

## Định dạng và nơi lưu

- Giữ **Markdown trong `acta-social/docs/features/work-management-ba/`** làm bản nguồn: có lịch sử Git, review theo thay đổi, liên kết tới code.
- Mô hình có tệp nguồn riêng: **BPMN 2.0** (`.bpmn`) cho quy trình, **UML Use Case** (`.puml`) cho actor/chức năng, **Crow's Foot ERD** (`.mmd`) cho entity/field chính/quan hệ. Các hình SVG đã render nằm ngay trong [05 — Bộ mô hình](./05-business-models.md) để khách hàng đọc không cần mở mã sơ đồ. Có thể dùng công cụ hỗ trợ BPMN hoặc draw.io để trình bày thêm khi họp; sửa bản nguồn trước khi xuất lại hình.
- Sau khi PO xác nhận nội dung, xuất **PDF hoặc DOCX** làm bản bàn giao cố định cho khách hàng. Không cần vẽ tay vì khó sửa và khó truy vết phiên bản.

## Trạng thái duyệt

| Phiên bản | Ngày | Nội dung | Trạng thái |
| --- | --- | --- | --- |
| 0.1 | 19/09/2026 | Tổng hợp as-is từ frontend, backend, schema và contract | Bản nháp chờ PO xác nhận |
| 0.2 | 19/09/2026 | Sửa mô hình theo từng ký pháp, tách trạng thái, bổ sung ERD có field và ví dụ đọc | Bản nháp chờ PO xác nhận |

Trình tự chốt: PO đối chiếu [luồng](./01-user-flows.md) và [quy tắc](./04-business-rules-acceptance.md) → dev xác nhận [field/ERD](./02-data-dictionary-erd.md) → QA rà [use case và acceptance](./03-use-cases.md) → xuất bản bàn giao. Khi có thay đổi, sửa Markdown trước rồi xuất lại bản cố định.

## Điểm cần PO/khách hàng xác nhận

1. Khách hàng có được xem chi tiết quy trình duyệt và các trường kỹ thuật trong cùng gói bàn giao, hay cần bản rút gọn riêng?
2. Quy ước “nhóm” trong hợp đồng là **nhóm giao việc** (`TaskAssignGroup`), **đội/phòng ban** (`Team`), hay cả hai?
3. Có rule phân quyền, SLA hoặc ngoại lệ vận hành nào đã thống nhất bên ngoài code không? Đặc biệt là người làm thay, người duyệt phụ, ngày nghỉ và quá hạn duyệt.
4. Tên hiển thị chính thức cho ba kết luận `ACCEPTED`, `CONTINUED`, `REJECTED` và trạng thái “Không nộp” có cần theo văn phong khách hàng không?

> Khi các câu trên được trả lời, cập nhật hồ sơ và đổi trạng thái thành “Đã xác nhận”.
