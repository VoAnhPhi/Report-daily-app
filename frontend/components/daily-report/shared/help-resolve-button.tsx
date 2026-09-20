'use client';

import { Check, Loader2, RotateCcw } from 'lucide-react';

import {
  useReopenHelpRequest,
  useResolveHelpRequest,
} from '@/hooks/queries/daily-report-queries';
import { cn } from '@/lib/utils';

import { FOCUS_RING_SURFACE as FOCUS_RING } from '../utils/classes';

/**
 * Nút đổi trạng thái MỘT yêu cầu hỗ trợ, dùng chung cho dòng dưới câu 3 của
 * bản và danh sách trong Tổng quan (UAT 16/09/2026 lượt 2).
 *
 * Thay cho ô tích 16px kèm chữ "Xong": ô tích nhỏ khó bấm, và "Xong" không nói
 * bấm vào thì chuyện gì xảy ra. Nút nói đúng hành động - "Đã giải quyết" khi
 * còn mở, "Mở lại" khi đã xong - và là nút thường nên phím Enter/Space dùng
 * được như mọi nút khác.
 *
 * Hai hook sống ở đây, không ở component cha: vòng xoay hiện đúng ở nút vừa
 * bấm. File này kéo theo `daily-report-queries` (và qua đó `next-auth`), nên
 * component thuần hiển thị không được import nó - truyền vào qua slot.
 */
export function HelpResolveButton({
  helpId,
  reportId,
  resolved,
  subject,
  className,
}: {
  helpId: string;
  reportId: string;
  resolved: boolean;
  /** Đọc cho trình đọc màn hình, ví dụ "yêu cầu của An ngày 16/09/2026". */
  subject: string;
  className?: string;
}) {
  const resolve = useResolveHelpRequest();
  const reopen = useReopenHelpRequest();
  const isSaving = resolve.isPending || reopen.isPending;
  const Icon = isSaving ? Loader2 : resolved ? RotateCcw : Check;

  return (
    <button
      type='button'
      disabled={isSaving}
      aria-busy={isSaving}
      aria-label={
        resolved ? `Mở lại ${subject}` : `Đánh dấu đã giải quyết ${subject}`
      }
      onClick={() => {
        const vars = { id: helpId, reportId };
        if (resolved) reopen.mutate(vars);
        else resolve.mutate(vars);
      }}
      className={cn(
        'inline-flex h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-ws-control border px-3 text-ws-chip font-semibold transition-colors disabled:opacity-60 sm:h-8',
        /* Nút viền nhẹ, không nền màu: trên danh sách nhiều yêu cầu, mỗi dòng
           một khối xanh đặc làm nút nặng hơn chính nội dung (rà `/fe-redesign`
           17/09/2026). Màu xanh chỉ ở icon và khi rê chuột. */
        resolved
          ? 'border-transparent text-ws-ink-soft hover:bg-ws-surface-sunken hover:text-ws-ink'
          : 'border-ws-line-strong bg-ws-surface text-ws-ink hover:border-ws-done-fg hover:text-ws-done-fg [&>svg]:text-ws-done-fg',
        FOCUS_RING,
        className,
      )}
    >
      <Icon
        aria-hidden='true'
        className={cn('h-3.5 w-3.5', isSaving && 'animate-spin')}
      />
      {resolved ? 'Mở lại' : 'Đã giải quyết'}
    </button>
  );
}
