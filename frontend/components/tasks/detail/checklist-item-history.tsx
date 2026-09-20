'use client';

import { History } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
/* Cùng vòng focus với các nút 44px khác trong hàng việc con của
   `task-edit-form.tsx`. Hàng đó có HAI nền chứ không phải một: `ws-surface-alt`
   lúc bình thường và `ws-void-bg` khi việc con đã xoá mềm (xem chỗ khai báo
   `isDeleted` đầu vòng lặp) — nút này hiện ở cả hai trạng thái, và đó chính là
   lý do phải chọn vòng focus cẩn thận. Đừng lấy nút "đặt hạn" làm mốc: nút đó
   nằm trong nhánh `!isDeleted` nên ở hàng đã xoá nó biến mất, còn nút này thì
   không. Họ `FOCUS_RING*`
   (`components/daily-report/utils/classes.ts`) mới có bốn bản: `ws-surface-alt`,
   `ws-surface`, `ws-ground`, `ws-surface-sunken`; chưa có bản lấy offset theo
   `ws-void-bg`. Nên chọn `FOCUS_RING`: đúng cho trạng thái thường, còn ở hàng đã
   xoá thì khe 1px chỉ lệch một sắc rất nhẹ (#fafaf8 trên #f6ecea, chế độ tối là
   #202329 trên #2e1d1a) chứ không thành vệt TRẮNG như khi bỏ trống
   `ring-offset-*`. Muốn khớp tuyệt đối thì thêm một hằng `FOCUS_RING_VOID` vào
   file hằng nói trên — ngoài phạm vi lần sửa này.
   Import qua barrel vì file này nằm ngoài `components/daily-report/`. */
import { FOCUS_RING } from '@/components/daily-report/daily-report-utils';
import type { TaskItemEvent } from '@/types/task.type';
import { ITEM_ACTION_LABEL, formatTaskTime } from '../task-utils';

/**
 * Nút + popover lịch sử một việc con.
 *
 * Đây là NGUỒN DUY NHẤT của thông tin "ai chạm vào việc con này, lúc nào". Bản
 * rút gọn cũ (`ItemLastEdit` — một dòng `<tên> đã thêm · <giờ>` in ngay dưới ô
 * nhập) đã bỏ: nó lặp lại đúng dòng ĐẦU — dòng TRÊN CÙNG — của popover này. Bản
 * cũ lấy phần tử CUỐI của mảng `events`, mà phần render bên dưới đảo mảng
 * (`[...events].reverse()`), nên phần tử cuối ấy, tức sự kiện mới nhất, rơi
 * đúng vào dòng đầu popover. Nó lại còn chiếm thêm một dòng ở MỌI hàng việc
 * con, kể cả những hàng chẳng ai quan tâm lịch sử.
 *
 * Vì đã là nguồn duy nhất, nút phải thực sự mở được:
 * — `aria-label` chứ không chỉ `title`. `title` không hiện khi tab tới bằng bàn
 *   phím và không bao giờ hiện trên màn cảm ứng, nên nút chỉ có icon mà chỉ có
 *   `title` là nút không tên với hai nhóm người dùng đó. Giữ luôn `title` cho
 *   chú giải chuột — nó chỉ còn đóng vai mô tả phụ khi đã có `aria-label`.
 * — 44×44px, không phải hộp 26px (`p-1.5` quanh icon 14px) như bản cũ.
 */
export function ChecklistItemHistory({
  events,
  itemId,
}: {
  events: TaskItemEvent[];
  itemId?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type='button'
          title='Lịch sử'
          aria-label='Xem lịch sử việc cần làm'
          /* Khuôn giống HỆT nút "đặt hạn" của hàng CHƯA xoá: cùng 44px, cùng bo
             góc, cùng cặp màu. Ở hàng ĐÃ xoá mềm thì nút đặt hạn không render,
             mốc so sánh lúc đó là hai nút khôi phục/xoá hẳn bên phải — cũng
             44px, nên khuôn vẫn khớp. Bản cũ `p-1.5 mt-1` cao 26px và bị đẩy
             xuống 4px, nên tâm nó nằm ở 17px trong khi ô tick, ô nhập và nút
             đặt hạn — cả ba đều cao 44px trong một hàng `items-start` — có tâm
             ở 22px: lệch 5px, đọc ra như icon bị tụt. */
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-ws-control text-ws-ink-faint transition-colors hover:bg-ws-surface-sunken hover:text-ws-ink',
            FOCUS_RING,
          )}
        >
          <History className='h-4 w-4' />
        </button>
      </PopoverTrigger>
      <PopoverContent align='end' className='ws-scope w-72 p-3'>
        <p className='text-ws-micro font-bold uppercase text-ws-ink-faint mb-2'>
          Lịch sử
        </p>
        {events.length === 0 ? (
          /* `leading-snug` viết tường minh, không thừa: thang `--text-ws-*`
             trong `app/globals.css` (khối `@theme`, dòng 283–294) chỉ khai CỠ
             CHỮ, không khai kèm `line-height`, nên `text-ws-chip` đổi mỗi
             font-size và để nguyên chiều cao dòng thừa kế. Radix portal popover
             ra `document.body`, mà `body` (`app/globals.css` dòng 584) không đặt
             `line-height` — tức rơi về `normal`, xấp xỉ 1.2 tuỳ font, sát ngay
             trên sàn 1.15 của repo. Hai câu dưới đây đầy dấu ("Chưa", "sẽ",
             "việc"), nên kéo hẳn lên 1.375 cho chắc. Dòng sự kiện phía dưới đã
             viết kèm `leading-snug` vì đúng lý do này. */
          <p className='text-ws-chip leading-snug text-ws-ink-faint py-1'>
            {itemId
              ? 'Chưa có lịch sử.'
              : 'Việc con mới — lịch sử sẽ có sau khi lưu.'}
          </p>
        ) : (
          <div className='ws-scroll space-y-2 max-h-64 overflow-y-auto'>
            {[...events].reverse().map((e, i) => (
              <div key={i} className='text-ws-chip leading-snug'>
                {/* Ba bậc chữ ĐẬM → THƯỜNG → MỜ giữ nguyên thứ bậc mà bộ
                    `zinc-800 / 500 / 400` cũ dựng ra. Không dồn cả hai vế sau
                    vào `ws-ink-faint`: tên người và hành động phải tách khỏi
                    mốc giờ, nếu không cả dòng đọc thành một mảng chữ xám. */}
                <span className='font-semibold text-ws-ink'>{e.byName}</span>{' '}
                <span className='text-ws-ink-soft'>
                  {ITEM_ACTION_LABEL[e.action]}
                </span>
                <span className='text-ws-ink-faint'>
                  {' · '}
                  {formatTaskTime(e.at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
