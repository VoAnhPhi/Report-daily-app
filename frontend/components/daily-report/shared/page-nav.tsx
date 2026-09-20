'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

import { FOCUS_RING_SURFACE as FOCUS_RING } from '../utils/classes';

/**
 * Điều hướng trang kiểu `‹ 1 2 3 … 10 ›` cho danh sách phân trang PHÍA SERVER
 * (điểm 7 của UAT 16/09/2026).
 *
 * Vì sao không phải "Xem thêm": người duyệt cần quay lại đúng trang vừa xem sau
 * khi mở một bản rồi bấm back, và cần biết còn bao nhiêu trang - hai thứ mà nút
 * tải thêm không trả lời được.
 *
 * Cửa sổ số trang luôn có TRANG ĐẦU, TRANG CUỐI và trang đang xem kèm hai láng
 * giềng; chỗ gãy in dấu `…` không bấm được. Nhờ vậy bề ngang không đổi theo số
 * trang, nên ở 320px nó không bao giờ tràn.
 */
export function PageNav({
  page,
  totalPages,
  onChange,
  label,
  className,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  /** Tên danh sách, cho trình đọc màn hình: "Trang của danh sách …". */
  label: string;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const current = Math.min(Math.max(1, page), totalPages);
  const pages: (number | 'gap')[] = [];
  for (let i = 1; i <= totalPages; i += 1) {
    const near = Math.abs(i - current) <= 1;
    if (i === 1 || i === totalPages || near) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== 'gap') {
      pages.push('gap');
    }
  }

  /* `w-11`, KHÔNG `min-w-11`: khối `@media (max-width: 540px)` trong
     `app/globals.css` đặt `min-width: 0` cho `input, select, button`, nên ở đúng
     khổ điện thoại - nơi cần sàn chạm 44px - `min-w-*` bị vô hiệu và nút co về
     bề ngang của một chữ số (đo 16/09/2026: 21px ở 375px). `height` và
     `min-height` không bị khối đó chạm nên `h-11` giữ nguyên.

     `shrink-0` đi cùng khung cuộn ngang bên dưới: thiếu nó thì nút là flex item
     co được, và ở 320px cụm bảy phần tử (hai mũi tên + bốn số + dấu …) rớt
     xuống hai hàng - đo ngày 16/09/2026, ca D8 của UAT. */
  const stepClass = cn(
    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-ws-control border border-ws-line bg-ws-surface px-2 text-ws-chip font-semibold text-ws-ink-soft transition-colors hover:bg-ws-surface-alt disabled:pointer-events-none disabled:opacity-40 sm:h-9 sm:w-9',
    FOCUS_RING,
  );

  return (
    /* MỘT hàng ở mọi khổ: cụm phân trang rớt dòng thì hai mũi tên nằm hai hàng
       khác nhau, và người dùng bấm "Trang sau" ở chỗ vừa là "Trang trước" của
       hàng trên. Hẹp quá thì cuộn ngang trong chính khung của nó; `-m-1 p-1`
       bù trừ nhau nên hộp không đổi kích thước, chỉ chừa chỗ cho vòng focus
       khỏi bị `overflow` cắt. */
    <nav
      aria-label={`Trang của ${label}`}
      className={cn('-m-1 overflow-x-auto p-1', className)}
    >
      <span className='flex flex-nowrap items-center gap-1'>
        <button
          type='button'
          onClick={() => onChange(current - 1)}
          disabled={current === 1}
          aria-label='Trang trước'
          className={stepClass}
        >
          <ChevronLeft aria-hidden='true' className='h-4 w-4' />
        </button>
        {pages.map((item, index) =>
          item === 'gap' ? (
            <span
              // Khoá theo vị trí: hai dấu `…` của cùng một danh sách là hai chỗ
              // gãy khác nhau nên không dùng chung khoá được.
              key={`gap-${index}`}
              aria-hidden='true'
              className='shrink-0 px-1 text-ws-chip text-ws-ink-faint'
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type='button'
              onClick={() => onChange(item)}
              aria-current={item === current ? 'page' : undefined}
              aria-label={`Trang ${item}`}
              className={cn(
                stepClass,
                /* Trang hiện tại nói bằng nền chìm + viền đậm + chữ đậm, không
                   tô đen: đen dành cho hành động chính của màn (`MASTER.md`
                   mục 2). */
                item === current &&
                  'border-ws-line-strong bg-ws-surface-sunken text-ws-ink hover:bg-ws-surface-sunken',
              )}
            >
              {item}
            </button>
          ),
        )}
        <button
          type='button'
          onClick={() => onChange(current + 1)}
          disabled={current === totalPages}
          aria-label='Trang sau'
          className={stepClass}
        >
          <ChevronRight aria-hidden='true' className='h-4 w-4' />
        </button>
      </span>
    </nav>
  );
}
