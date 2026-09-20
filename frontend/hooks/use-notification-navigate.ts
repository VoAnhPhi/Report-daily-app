'use client';

/**
 * Điều hướng khi bấm vào một thông báo.
 *
 * Đích đến nội bộ đi qua `router.push` (giữ SPA, không tải lại trang); đích đến
 * xuyên miền đổi hẳn tên miền bằng `window.location.assign` — cùng cách
 * `useAdminNavigation` đã dùng để nhảy sang `admin.acta.vn`, nên trải nghiệm
 * nhất quán với phần còn lại của hệ sinh thái.
 *
 * ⚠ File này được NHÂN BẢN BYTE-IDENTICAL sang acta-social, acta-affiliate và
 * acta-admin — xem ghi chú ở `constants/notification-domains.ts`.
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

import type { NotificationTarget } from '@/constants/notification-domains';

export function useNotificationNavigate(): (
  target: NotificationTarget | null,
) => void {
  const router = useRouter();

  return useCallback(
    (target: NotificationTarget | null) => {
      // `linkUrl` rỗng — thông báo chỉ để đọc (điểm thưởng, nhắc sinh nhật…).
      if (!target) return;

      if (!target.isExternal) {
        router.push(target.path);
        return;
      }

      if (typeof window !== 'undefined') {
        window.location.assign(target.href);
      }
    },
    [router],
  );
}
