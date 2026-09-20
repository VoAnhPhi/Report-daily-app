# Report Daily App — Backend

NestJS API được tách theo phạm vi:

- `business-forms`: biểu mẫu nghiệp vụ và task được giao.
- `daily-reports`: phạm vi báo cáo, mẫu báo cáo, bản nháp, review và KPI.
- các module dùng chung bắt buộc: Prisma, cache, notification, mail và activity log.

`src/app.module.ts` là module rút gọn cho app này. `src/auth/simple-auth.module.ts` cung cấp đăng ký, đăng nhập, refresh token và current user; `feature-auth.module.ts` giữ phần kiểm tra JWT cho API công việc/báo cáo.

Các endpoint tài khoản chính:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/current-user`

## Chạy local

```powershell
Copy-Item .env.example .env
yarn install
yarn prisma:generate
yarn dev
```

Không commit `.env`. Cần có PostgreSQL và Redis theo các biến môi trường trước khi gọi API.

## Kiểm tra

```powershell
yarn tsc --noEmit
yarn build
```
