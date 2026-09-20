'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReportErrorStateProps {
  /** Chuyện gì đã hỏng — một câu, nói đúng thứ không tải được. */
  title: string;
  /**
   * Câu thứ hai, và nó gánh phần việc quan trọng nhất của khối này: nói rõ đây
   * là lỗi TẢI, không phải kết luận về dữ liệu. Thiếu nó thì trưởng nhóm đọc
   * màn hình trống thành "cả nhóm chưa ai nộp" trong khi API còn chưa trả lời.
   */
  detail: string;
  onRetry: () => void;
}

/**
 * Khối "tải hỏng + nút Thử lại" dùng chung trong Báo cáo hằng ngày.
 *
 * Giữ khối tự viết chứ KHÔNG dùng `components/server-error.tsx`: component đó
 * là màn lỗi TOÀN TRANG (nền gradient, framer-motion, nút tải lại trang) — nhét
 * nó vào giữa một hộp thoại là thay cả ngữ cảnh của người dùng.
 *
 * `min-h-11` trên nút là vùng chạm 44px, không phải khoảng cách trang trí. Có
 * những khối lỗi khác trong thư mục này dùng `mt-3 text-ws-chip` — đừng đồng bộ
 * theo chúng, làm vậy là bỏ vùng chạm ở đúng hai màn hình có nút này.
 */
export function ReportErrorState({
  title,
  detail,
  onRetry,
}: ReportErrorStateProps) {
  return (
    <div className='flex flex-col items-center justify-center px-6 py-16 text-center'>
      <AlertTriangle
        className='mb-2 h-8 w-8 text-ws-ink-ghost'
        aria-hidden='true'
      />
      <p className='text-ws-body text-ws-ink-soft'>{title}</p>
      <p className='mt-1 text-ws-chip text-ws-ink-faint'>{detail}</p>
      <Button
        variant='outline'
        size='sm'
        className='mt-3 min-h-11'
        onClick={onRetry}
      >
        Thử lại
      </Button>
    </div>
  );
}
