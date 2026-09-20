'use client';

import { cn } from '@/lib/utils';
import { SHEET_GRID } from './sheet-grid';

/** Hàng tiêu đề bảng — dính đỉnh ngay dưới hàng nhóm trạng thái. */
export function SheetHeaderRow() {
  return (
    <div
      className={cn(
        /* `border-l-[3px] border-l-transparent` bù đúng vạch trạng thái mà
           `SheetRow` vẽ bằng inline style. Với `box-sizing: border-box`, hàng
           dữ liệu bắt đầu nội dung ở 3+12 = 15px còn hàng tiêu đề ở 12px —
           chữ "TÊN VIỆC", "TRẠNG THÁI"… lệch trái 3px so với ô ngay dưới,
           suốt cả bảng, và tổng bề rộng hai hộp cũng chênh đúng 3px.
           Bù bằng viền trong suốt chứ không bằng `pl-[15px]`: đổi padding thì
           tổng bề rộng vẫn thiếu 3px, và lần sau ai sửa padding là lệch lại. */
        'sticky top-11 z-10 hidden h-10 w-full items-center gap-3 border-b border-l-[3px] border-ws-line border-l-transparent bg-ws-surface-alt px-3 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-ws-ink-faint md:grid',
        SHEET_GRID,
      )}
    >
      <span>Tên việc</span>
      <span className='hidden xl:block'>Hồ sơ</span>
      <span>Trạng thái</span>
      <span>Phụ trách</span>
      <span>Hạn</span>
      <span>Tiến độ</span>
      <span>Ưu tiên</span>
      <span className='hidden xl:block'>Thẻ</span>
    </div>
  );
}
