'use client';

import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import {
  FOCUS_RING_SURFACE as FOCUS_RING,
  TOOLTIP_CONTENT_CLASS,
} from '../utils/classes';

/**
 * Dấu hỏi cạnh một nhãn: câu giải thích dài nằm trong chú giải, không nằm trên
 * màn (vòng sửa 16/09/2026, điểm 1 của UAT).
 *
 * Luật đi kèm, để không chuyển sạch mọi câu vào đây: chữ nói HIỆU LỰC của một
 * hành động ("Lưu là áp dụng ngay trong hôm nay") phải ở lại trên màn, vì người
 * dùng cần biết TRƯỚC khi bấm; chữ ĐỊNH NGHĨA hoặc kể ca biên thì vào chú giải.
 *
 * Trigger là `button` chứ không phải `span`: Radix mở chú giải khi phần tử nhận
 * focus, nên chạm trên điện thoại cũng mở được - `title=` native thì không bao
 * giờ hiện trên cảm ứng. 28px là vùng chạm nhỏ nhất còn đạt ngưỡng 24px của
 * WCAG 2.2 mà không lấn chỗ của chính nhãn nó đi kèm.
 */
export function InfoHint({
  label,
  children,
  className,
  maxWidth = 260,
}: {
  /** Tên của chính nút này cho trình đọc màn hình, ví dụ "Giải thích về bộ phận". */
  label: string;
  children: ReactNode;
  className?: string;
  /** Bề ngang tối đa của khung chú giải, px. Nới ra cho nội dung không phải
   *  một câu, ví dụ bảng chú giải hai cột. Áp bằng inline style, xem
   *  `TOOLTIP_CONTENT_STYLE` để biết vì sao không dùng class `max-w-*`. */
  maxWidth?: number;
}) {
  /* Radix mở chú giải khi RÊ CHUỘT hoặc khi phần tử nhận focus, nhưng CHẠM
     trên điện thoại thì không mở (đo 375px, 18/09/2026: chạm xong không có
     khung chú giải nào trong DOM). Tự giữ trạng thái mở để cú bấm cũng bật
     được - đúng yêu cầu "nhấn vào sẽ hiện ra hoặc hover cũng được". */
  const [open, setOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type='button'
            aria-label={label}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className={cn(
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ws-ink-faint transition-colors hover:bg-ws-surface-sunken hover:text-ws-ink',
              FOCUS_RING,
              className,
            )}
          >
            <Info aria-hidden='true' className='h-3.5 w-3.5' />
          </button>
        </TooltipTrigger>
        <TooltipContent
          className={TOOLTIP_CONTENT_CLASS}
          style={{ maxWidth: `min(${maxWidth}px, calc(100vw - 2rem))` }}
        >
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
