# Report Daily App

Ứng dụng tách riêng phần **Công việc** và **Báo cáo hằng ngày** từ ACTA Social để phát triển như một app độc lập.

## Phạm vi

- Frontend: màn hình công việc, task group, chi tiết task và các luồng báo cáo hằng ngày.
- Backend: business forms/task assignment và daily reports, cùng các module dùng chung bắt buộc cho hai luồng.
- Tài liệu BA: các tài liệu Markdown trong `docs/`.

Mã nguồn được tách từ các branch `feat/daily-reports` của hai repository ACTA hiện tại. Repository gốc không bị thay đổi bởi quá trình tách.

## Cấu trúc

```text
frontend/   Next.js app cho task và daily report
backend/    NestJS API cho task và daily report
docs/       tài liệu phạm vi, nghiệp vụ và hướng dẫn
```

## Chạy bằng Docker

Docker Compose đã cấu hình sẵn frontend, backend, PostgreSQL và Redis:

```powershell
docker compose up --build
```

Mở `http://localhost:3000`, chọn **Tạo tài khoản**, sau đó đăng nhập để vào phần công việc. API chạy ở `http://localhost:4000`.

## Cấu hình local

Không đưa file `.env` hoặc thông tin đăng nhập vào repository. Hãy tạo file môi trường riêng cho `frontend` và `backend` dựa trên các biến mà hai service yêu cầu.

Luồng tài khoản của bản tách chỉ gồm đăng ký và đăng nhập bằng email/mật khẩu. Không có KYC, OTP, Zalo hoặc khôi phục mật khẩu trong app này.

## GitHub cá nhân

Sau khi kiểm tra mã nguồn, đăng nhập GitHub ngay tại thư mục repository này:

```powershell
cd D:\Work\ACTA\Report-daily-app
gh auth login -h github.com
gh auth status
```

Nếu repository GitHub đã được tạo sẵn, thêm remote rồi push:

```powershell
git remote add origin git@github.com:VoAnhPhi/Report-daily-app.git
git add .
git commit -m "chore: extract task and daily report app"
git push -u origin main
```

## Trạng thái tách mã nguồn

Repository đã có cấu hình Docker và auth tối giản cho app riêng. Các module ngoài task/daily report và các tích hợp KYC/OTP/Zalo không được mount trong `AppModule`.
