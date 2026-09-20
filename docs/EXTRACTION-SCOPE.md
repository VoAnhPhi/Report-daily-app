# Phạm vi tách mã nguồn

## Đã đưa vào

- Giao diện task: board, danh sách, chi tiết, nhóm task, assignee, file đính kèm, comment và các trạng thái.
- Giao diện daily report: hôm nay, lịch sử, nhóm, tổng quan, review, help request và cấu hình.
- API client và query hooks tương ứng.
- Backend business forms/task assignment và daily reports.
- Prisma schema được giữ nguyên đầy đủ để không làm gãy quan hệ dữ liệu của các entity dùng chung.
- Tài liệu BA ở `docs/ba/`.

## Không đưa vào phạm vi màn hình

- Feed xã hội, e-commerce, ví, gamification, video và các route sản phẩm khác.
- File môi trường, credential, `node_modules`, build output và dữ liệu upload.

Một số module dùng chung vẫn xuất hiện trong frontend/backend vì task và report đang phụ thuộc trực tiếp vào xác thực, thông báo, mail, Prisma và Zalo OA. Những module này là dependency kỹ thuật, không phải màn hình sản phẩm mới.

## Nguồn tách

- Frontend: branch `feat/daily-reports` của `acta-clients/acta-social`.
- Backend: branch `feat/daily-reports` của `acta-servers/acta-main-server`.
