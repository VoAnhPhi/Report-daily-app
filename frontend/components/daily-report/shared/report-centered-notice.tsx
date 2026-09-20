'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface ReportCenteredNoticeProps {
  /** Component icon của lucide — vỏ tự áp class, đừng truyền class từ ngoài. */
  icon: LucideIcon;
  /**
   * Câu chính. Là `ReactNode` chứ không phải `string` vì có chỗ nội suy giá trị
   * vào giữa câu (`… ở {activeItem?.name ?? 'nhóm này'}.`).
   */
  title: ReactNode;
  detail: ReactNode;
  /**
   * Nút hoặc liên kết, do chỗ gọi tự dựng và tự đặt class.
   *
   * KHÔNG hardcode `<Button>` bên trong: các chỗ dùng đặt class khác nhau
   * (`mt-4` chỗ này, `mt-4 text-xs` chỗ kia, và có chỗ kèm icon phía trước).
   * Cố định nút ở đây là lặng lẽ đổi cỡ chữ hoặc lề của một trong số chúng.
   */
  action?: ReactNode;
}

/**
 * Khối thông báo căn giữa vùng nội dung của Báo cáo hằng ngày — icon, một câu
 * chính, một câu giải thích, và một hành động tuỳ chọn.
 *
 * **Thang chữ ở đây là thang CŨ (`text-sm` 14px / `text-xs`) có chủ ý.** Trong
 * cùng thư mục còn một họ khối trông y hệt nhưng dùng token mới
 * (`text-ws-body` 13.5px / `text-ws-chip`) — ở `daily-report-board.tsx`,
 * `daily-report-summary.tsx`, `daily-report-history.tsx` và
 * `shared/report-error-state.tsx`. **Đừng gộp hai họ đó vào đây**: chênh 0.5px
 * là thay đổi quan sát được, và việc chuyển thang chữ là một đợt riêng.
 *
 * Cũng đừng dùng nó cho khối nào có **nhiều nhánh nội dung** với icon nằm ngoài
 * nhánh (ví dụ `EmptyToday` bên dưới, hay `EmptyNoScopesBody`): ở đó vỏ và icon
 * dùng chung cho mọi nhánh, nhét vào component này sẽ thành div lồng div và hai
 * icon chồng nhau.
 */
export function ReportCenteredNotice({
  icon: Icon,
  title,
  detail,
  action,
}: ReportCenteredNoticeProps) {
  return (
    <div className='flex flex-col items-center justify-center px-6 py-16 text-center'>
      <Icon className='mb-2 h-8 w-8 text-ws-ink-ghost' />
      <p className='text-sm text-ws-ink-soft'>{title}</p>
      <p className='mt-1 text-xs text-ws-ink-faint'>{detail}</p>
      {action}
    </div>
  );
}
