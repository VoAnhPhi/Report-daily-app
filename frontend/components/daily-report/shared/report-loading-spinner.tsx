'use client';

import { Loader2 } from 'lucide-react';

interface ReportLoadingSpinnerProps {
  /**
   * Câu trình đọc màn hình đọc lên. BẮT BUỘC, và cố ý không có giá trị mặc
   * định: có mặc định thì một chỗ gọi quên truyền sẽ âm thầm đọc sai cho người
   * dùng trình đọc màn hình, mà `tsc` không kêu một tiếng nào.
   */
  label: string;
}

/**
 * Vòng xoay "đang tải" giữa vùng nội dung của Báo cáo hằng ngày.
 *
 * CHỈ dùng cho hai chỗ đang chờ ở cấp vùng. Đừng mở rộng nó sang:
 * - vòng xoay bên trong `<Button>` (cỡ `h-3.5 w-3.5`, không có `role='status'`
 *   riêng, nằm trong ngữ cảnh nút);
 * - các màn đang tải của Lịch sử và Tổng hợp — hai chỗ đó từng là spinner và đã
 *   được **cố ý** thay bằng skeleton; đưa spinner quay lại là đảo ngược một
 *   quyết định giao diện có chủ đích.
 */
export function ReportLoadingSpinner({ label }: ReportLoadingSpinnerProps) {
  return (
    <div
      role='status'
      aria-busy='true'
      aria-label={label}
      className='flex items-center justify-center py-16 text-ws-ink-faint'
    >
      <Loader2 className='h-5 w-5 animate-spin' />
    </div>
  );
}
