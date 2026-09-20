'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * ⏳ CODE CHẾT CÓ HẠN — xoá được khi hết link cũ đang lưu hành.
 *
 * Báo cáo hằng ngày từng sống trong `/tasks?section=…`; nay nó có route riêng
 * `/daily-reports/*`. Hook này giữ cho những URL cũ **đã gửi đi rồi** không
 * chết: link trong thông báo hệ thống, link trong email, và link người dùng đã
 * bookmark.
 *
 * Nó đứng một file riêng có chủ ý. Gộp vào thân màn `/tasks` thì không ai dám
 * xoá vì không biết nó phục vụ gì; đứng riêng với cái tên `legacy` và khối chú
 * thích này thì người sau xoá được mà không phải đọc lại lịch sử.
 *
 * **Xoá khi nào:** khi không còn thông báo hay email nào trong hệ thống chứa
 * `/tasks?section=`. Kiểm bằng cách grep `dailyReportLink` và
 * `dailyReportBoardLink` ở `acta-main-server` — cả hai nay sinh thẳng
 * `/daily-reports/*`, nên chỉ còn các thông báo CŨ đã nằm trong hộp thư người
 * dùng là mang dạng cũ.
 *
 * **Xoá thế nào:** bỏ lời gọi hook này, bỏ file này, và bỏ hai `useQueryState`
 * chỉ-đọc `focusReportId` / `focusScopeId` ở màn `/tasks` — chúng chỉ tồn tại
 * để quyết `section` cho chính hook này.
 *
 * Đọc query thẳng từ `window.location.search` chứ không qua state: giá trị chỉ
 * cần đúng một lần, ngay lúc chuyển hướng.
 */
export function useLegacyReportRedirect(section: string) {
  const router = useRouter();

  useEffect(() => {
    if (section === 'tasks' || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const scopeId = params.get('scope') ?? params.get('focusScopeId');
    const reportId = params.get('focusReportId');
    const next = new URLSearchParams();
    const date = params.get('date') ?? params.get('focusDate');
    if (date) next.set('date', date);
    if (reportId) next.set('focusReportId', reportId);
    const suffix = next.size > 0 ? `?${next.toString()}` : '';
    if (section === 'history') {
      router.replace(`/daily-reports/history${suffix}`);
    } else if ((section === 'board' || section === 'summary') && scopeId) {
      router.replace(`/daily-reports/${scopeId}/${section}${suffix}`);
    } else {
      router.replace(`/daily-reports/today${suffix}`);
    }
  }, [router, section]);
}
