'use client';

import { useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { DraftSource } from '@/types/daily-report.type';
// Import thẳng `../utils/<file>` chứ không qua barrel `daily-report-utils`:
// đó là luật ghi ngay trong đầu file barrel cho code mới bên trong thư mục này.
import { FOCUS_RING_SUNKEN, FOCUS_RING_SURFACE } from '../utils/classes';
import { draftReasonLabel } from '../utils/labels';

/**
 * Khuôn popup xem nhanh.
 *
 * Mọi lớp `ws-*` ở đây tự sống được ngoài portal: `--color-ws-*` khai trong khối
 * `@theme` ở GỐC `app/globals.css` (dòng 6; nhánh tối là khối `.dark` dòng 366,
 * nằm trên thẻ gốc), mà `@theme` của Tailwind v4 đổ biến lên `:root`. Node Radix
 * bắn ra `document.body` vẫn là con của gốc nên vẫn thấy đủ cả hai bảng màu —
 * KHÔNG có chuyện popup ra một tấm trắng trơn nếu thiếu `ws-scope`.
 *
 * `ws-scope` vẫn giữ, nhưng vì việc KHÁC: khối `.ws-scope` (globals.css dòng
 * 533) trỏ họ token NGỮ NGHĨA của shadcn — `--color-popover`, `--color-border`,
 * `--color-accent`, `--color-primary`… — sang bảng `ws-*`, và ĐÓ mới là thứ
 * portal bỏ lại phía sau. Riêng nội dung hiện tại thì chưa cần: mọi lớp bên
 * trong đều là token `ws-*` trực tiếp, còn ba lớp màu mặc định của
 * `components/ui/popover.tsx` đã bị đè hết. Nhưng thả một primitive dùng chung
 * vào popup này — Button, Badge, Separator — là nó đọc lại token ngữ nghĩa
 * ngay; bỏ `ws-scope` đi thì cái bẫy đó nằm im chờ sẵn.
 *
 * Các lớp còn lại đè bản mặc định của `components/ui/popover.tsx`
 * (`rounded-md border bg-popover p-4 text-popover-foreground shadow-md`) sang
 * token `ws-*` — `cn` dùng `tailwind-merge` nên lớp sau thắng lớp trước.
 */
const POPOVER_CLASS =
  'ws-scope w-72 rounded-ws-block border-ws-line bg-ws-surface p-3 text-ws-ink shadow-ws-raised';

/**
 * Trần bề ngang của nhãn TÊN việc, đặt trên chính NÚT chip. Tên dài hơn thì cắt
 * đuôi.
 *
 * Xuất ra ngoài vì dải chip "Có thể bạn đang vướng" trong
 * `daily-report-question.tsx` phải cắt theo đúng trần này: hai viên chip đứng
 * cách nhau vài dòng trong cùng "phần gợi ý", lệch trần là đọc ra hai kiểu.
 */
export const TASK_LABEL_MAX_WIDTH = 'max-w-[10rem]';

/**
 * Lớp của thẻ CON bọc tên việc — không đặt thẳng lên nút.
 *
 * `text-overflow: ellipsis` không ăn cho một hộp `inline-flex`: chữ trong đó
 * thành flex item vô danh. Đặt lên một `block` con thì dấu … mới hiện.
 * `min-w-0` là cặp bắt buộc của nó: flex item mặc định có `min-width: auto`,
 * tức sàn co bằng từ dài nhất — một cái tên dính liền sẽ TRÀN khỏi
 * `TASK_LABEL_MAX_WIDTH` thay vì bị cắt.
 */
export const TASK_LABEL_TEXT = 'block min-w-0 truncate';

/**
 * Tên hiển thị của một việc — cũng là nội dung của `title=` và `aria-label`.
 *
 * `source` có thể vắng mặt hoặc mang tên rỗng, mà cả ba chỗ dùng (popup, chip
 * việc đã gắn, chip gợi ý) đều phải rơi về CÙNG một chữ thay thế: ba chuỗi dự
 * phòng khác nhau là ba cách gọi cùng một việc.
 */
export function taskDisplayTitle(source?: DraftSource): string {
  return source?.title?.trim() || 'Công việc';
}

interface QuickViewProps {
  /**
   * Thông tin việc, lấy từ `sources` mà BE gắn sẵn trong báo cáo — KHÔNG gọi
   * thêm API. Có thể vắng mặt: `linkedTaskIds` là dữ liệu đã lưu, còn `sources`
   * được dựng lại theo hoạt động trong ngày, nên một việc gắn từ hôm qua có thể
   * không còn nằm trong danh sách gợi ý hôm nay.
   */
  source?: DraftSource;
  /** Mở màn công việc đầy đủ (`?focusTaskId=`). */
  onOpenTask: () => void;
  /**
   * Phần tử bấm để mở popup. Đi qua `asChild` của Radix nên phải là một thẻ
   * nhận được `ref` và các prop sự kiện — một `<button>` trần là đủ.
   */
  children: ReactNode;
}

/**
 * Popup xem nhanh một công việc: mã · tên · lý do được gợi ý · tiến độ việc con,
 * cộng một liên kết chữ "Mở công việc" cho ai thật sự cần màn đầy đủ.
 *
 * Tách khỏi `LinkedTaskChip` vì "phần gợi ý" có HAI chỗ cần đúng popup này:
 * viên chip việc đã gắn (ngay dưới) và nút "Xem nhanh" trong thẻ "Nội dung tham
 * khảo" của `daily-report-question.tsx`. Chép ra bản thứ hai là hai popup lệch
 * nhau ngay ở lần sửa sau.
 *
 * Dùng chung PHẦN POPUP thôi, không dùng chung cả viên chip: hai viên chip khác
 * VAI. Viên "đã gắn" bấm vào là XEM, kèm một nút gỡ. Viên "Có thể bạn đang
 * vướng" là nút THÊM nguồn — bấm vào là ghi thẳng vào câu trả lời. Gộp chúng
 * lại thì một trong hai mất hành vi chính của nó.
 */
export function TaskQuickViewPopover({
  source,
  onOpenTask,
  children,
}: QuickViewProps) {
  /**
   * Tự giữ trạng thái mở thay vì để Radix tự lo, chỉ vì một việc: bấm "Mở công
   * việc" phải ĐÓNG popup lại. Radix chỉ tự đóng khi bấm/focus ra NGOÀI nội
   * dung, mà nút đó nằm bên trong — không đóng thì popup treo lại đè lên màn
   * công việc vừa mở.
   */
  const [isOpen, setIsOpen] = useState(false);

  const code = source?.code ?? null;
  const title = taskDisplayTitle(source);
  /**
   * `itemsTotal` VẮNG MẶT = việc không có checklist (xem chú thích của
   * `DraftSource`): ẩn hẳn cụm tiến độ thay vì in `0/0`, cùng luật với thẻ việc.
   */
  const hasProgress =
    typeof source?.itemsTotal === 'number' && source.itemsTotal > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      {/* `align='start'` để mép trái popup thẳng với mép trái thứ vừa bấm: cả
          hai chỗ dùng popup này đều là một hàng nhiều nút xếp ngang, căn giữa
          thì popup lệch khỏi đúng cái nút người dùng vừa chạm. */}
      <PopoverContent align='start' className={POPOVER_CLASS}>
        {code && (
          <p className='font-mono text-ws-micro text-ws-ink-faint'>{code}</p>
        )}
        <p className='mt-0.5 text-ws-meta font-medium leading-snug text-ws-ink'>
          {title}
        </p>
        {source ? (
          <>
            <p className='mt-1.5 text-ws-micro leading-snug text-ws-ink-soft'>
              Được gợi ý vì: {draftReasonLabel(source.reason)}
            </p>
            {hasProgress && (
              <p className='mt-1 text-ws-micro tabular-nums text-ws-ink-soft'>
                Việc con: {source.itemsDone ?? 0}/{source.itemsTotal}
              </p>
            )}
            {/* Danh sách việc con kèm hạn ĐÃ CHUYỂN VỀ ĐÂY từ thẻ nguồn trong
                `daily-report-question.tsx`.
                Thẻ nguồn in mỗi việc con một dòng, nên một việc có bốn checklist
                là bảy dòng cho một gợi ý — với người có nhiều thẻ công việc thì
                khối "Nội dung tham khảo" dài hơn cả bốn câu trả lời cộng lại.
                Thẻ nay chỉ nói CÓ BAO NHIÊU việc con; muốn biết là việc con nào
                thì mở đúng cái popup này, nơi vốn đã là chỗ xem chi tiết một
                gợi ý. Không xoá thông tin, chỉ đổi chỗ. */}
            {source.items && source.items.length > 0 && (
              <ul className='mt-2 space-y-1 border-t border-ws-line pt-2'>
                {source.items.map((item) => (
                  <li
                    key={item.id}
                    className='text-ws-micro leading-snug text-ws-ink-soft'
                  >
                    <span>• {item.label}</span>
                    {(item.reportDueAt || item.completionDueAt) && (
                      <span className='ml-1 text-ws-ink-faint'>
                        {item.reportDueAt
                          ? `· báo cáo ${new Date(item.reportDueAt).toLocaleString('vi-VN')}`
                          : ''}
                        {item.completionDueAt
                          ? ` · hoàn thành ${new Date(item.completionDueAt).toLocaleString('vi-VN')}`
                          : ''}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          /* Không có `source` thì popup vẫn phải nói được một câu — một popup
             chỉ có mỗi chữ "Công việc" đọc như lỗi. */
          <p className='mt-1.5 text-ws-micro leading-snug text-ws-ink-soft'>
            Việc này không còn trong danh sách gợi ý hôm nay. Mở công việc để
            xem chi tiết.
          </p>
        )}
        {/* Đường vào màn công việc đầy đủ vẫn còn, nhưng hạ xuống một liên kết
            chữ: nó là lối thoát cho người cần, không phải hành động chính của
            popup.
            Vùng chạm 44px (`min-h-11`) mà KHÔNG có nền nút: chữ vẫn nhẹ đúng
            như thiết kế muốn, ngón tay vẫn có đủ chỗ bấm. */}
        <div className='mt-2 border-t border-ws-line'>
          <button
            type='button'
            onClick={() => {
              setIsOpen(false);
              onOpenTask();
            }}
            className={cn(
              'inline-flex min-h-11 items-center rounded-ws-tag text-ws-meta font-medium text-ws-accent hover:underline',
              /* Nút này đứng TRONG popup, nền `ws-surface` do `POPOVER_CLASS`
                 đặt — nên khe của `ring-offset` phải là `ws-surface`. */
              FOCUS_RING_SURFACE,
            )}
          >
            Mở công việc
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  /** Xem chú thích `source` của `QuickViewProps` — cùng nguồn, cùng cách vắng. */
  source?: DraftSource;
  readOnly: boolean;
  /** Gỡ việc khỏi câu trả lời. */
  onRemove: () => void;
  /** Mở màn công việc đầy đủ (`?focusTaskId=`). */
  onOpenTask: () => void;
}

/**
 * Chip một công việc gắn kèm câu trả lời: nhãn nhỏ chỉ có TÊN việc, bấm ra một
 * popup vài dòng.
 *
 * Bản cũ in MÃ việc (`CV260814001`) và bấm vào là mở thẳng `TaskDetailModal` —
 * đúng cái modal to của màn `/tasks`, với tab, bình luận, đính kèm. Người viết
 * báo cáo chỉ cần nhớ "việc này là việc gì" rồi quay lại gõ tiếp; một cái modal
 * chiếm hết màn hình là mất mạch viết. Nên: tên thay mã (mã không nói gì khi
 * đọc lướt), popup thay modal, và đường vào modal hạ xuống một liên kết chữ
 * trong popup cho ai thật sự cần.
 */
export function LinkedTaskChip({
  source,
  readOnly,
  onRemove,
  onOpenTask,
}: Props) {
  const code = source?.code ?? null;
  /** Tên đầy đủ — cũng là nội dung của `title=` và `aria-label`. */
  const title = taskDisplayTitle(source);

  return (
    <span
      className={cn(
        /* Chip là NHÃN, không phải control: bỏ hẳn đường bao, để nền
           `ws-surface-sunken` tách nó khỏi tấm. Một câu trả lời có thể kèm hàng
           chục chip — mỗi chip một viền 3:1 thì cả khối đọc thành lưới ô, át
           luôn phần chữ. */
        'inline-flex max-w-full items-center gap-1 rounded-full bg-ws-surface-sunken pl-2 text-ws-chip text-ws-ink-soft',
        /* Nút gỡ tự có 6px đệm mỗi bên nên chỉ chừa 4px mép phải; bản chỉ đọc
           không có nút đó nên trả lại 8px cho cân. */
        readOnly ? 'pr-2' : 'pr-1',
      )}
    >
      {/* Hai nút phải đủ 24x24 (WCAG 2.2 AA): chúng dính nhau 4px, gọn trong
          một đầu ngón tay, mà bấm nhầm là gỡ mất công việc. Chiều cao lấy từ
          chính nút nên viên chip chỉ cao thêm 3px, đệm dọc của chip bỏ đi để
          bù. */}
      <TaskQuickViewPopover source={source} onOpenTask={onOpenTask}>
        <button
          type='button'
          /* Tên bị `truncate` cắt là cắt bằng CSS, chữ trong DOM vẫn đủ — nên
             trình đọc màn hình không mất gì. `title=` là để người dùng chuột rê
             vào đọc được phần đuôi mà không phải mở popup; `aria-label` lặp lại
             tên đầy đủ VÀ nói rõ bấm vào thì được gì, vì một cái tên trần đọc
             rời ra không cho biết đây là nút. */
          title={title}
          aria-label={`Xem nhanh công việc ${title}`}
          className={cn(
            'inline-flex min-h-6 items-center rounded-ws-tag hover:text-ws-ink hover:underline',
            TASK_LABEL_MAX_WIDTH,
            /* Nền ngay dưới nút là `ws-surface-sunken` của chính viên chip
               (dòng đặt nền ở `<span>` bọc ngoài), KHÔNG phải `ws-surface` của
               thân bản báo cáo: khe 1px của `ring-offset` được TÔ màu, tô nhầm
               là để lại một vệt sáng cắt ngang vòng focus. */
            FOCUS_RING_SUNKEN,
          )}
        >
          <span className={TASK_LABEL_TEXT}>{title}</span>
        </button>
      </TaskQuickViewPopover>
      {!readOnly && (
        <button
          type='button'
          /* Nhãn giữ MÃ việc chứ không đổi sang tên: đây là câu cảnh báo cuối
             trước một thao tác phá hủy, mà mã là thứ định danh không trùng —
             hai việc có thể trùng tên. */
          aria-label={`Gỡ công việc ${code ?? 'đã gắn'} khỏi câu trả lời`}
          onClick={onRemove}
          className={cn(
            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ws-ink-faint hover:bg-ws-surface-sunken hover:text-ws-danger',
            /* Cùng nền `ws-surface-sunken` với nút nhãn bên trái — xem lý do ở
               đó. */
            FOCUS_RING_SUNKEN,
          )}
        >
          <X aria-hidden='true' className='h-3 w-3' />
        </button>
      )}
    </span>
  );
}
