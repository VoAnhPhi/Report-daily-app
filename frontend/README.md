# Report Daily App — Frontend

Next.js frontend cho hai nhóm màn hình:

- `/tasks`
- `/daily-reports/today`, `/daily-reports/history`
- `/daily-reports/[scopeId]/board`
- `/daily-reports/[scopeId]/summary`
- `/daily-reports/[scopeId]/review-groups`
- `/daily-reports/[scopeId]/pending-review`
- `/daily-reports/[scopeId]/reports/[reportId]`

## Chạy local

```powershell
yarn install
yarn dev
```

Tạo `.env.local` theo `.env.example`. `/login` và `/register` dùng NextAuth Credentials để gọi API tài khoản của app mới. Luồng này không yêu cầu KYC, OTP hoặc tích hợp Zalo.

## Kiểm tra

```powershell
yarn tsc --noEmit
yarn build
```
