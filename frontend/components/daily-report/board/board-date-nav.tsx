'use client';

import { useState } from 'react';
import { vi } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { FOCUS_RING_SURFACE } from '../utils/classes';
import {
  formatDateVi,
  isoWeekdayOfDayStr,
  shiftDayStr,
  todayStrVi,
  WEEKDAY_LABEL_VI,
} from '../utils/date';

/**
 * Lùi / tiến một ngày, và mở lịch để nhảy thẳng tới một ngày bất kỳ.
 *
 * Bảng theo dõi vốn đã ĐỌC được ngày cũ (`?date=` / `?focusDate=` của thông
 * báo tổng hợp gửi tối qua), nhưng cách duy nhất để đổi ngày là sửa URL bằng
 * tay. Cụm này là mặt trước của khả năng đã có sẵn đó.
 *
 * KHÔNG có ngày tương lai. Bảng dựng từ bản báo cáo đã snapshot lúc 07:30 của
 * chính ngày đó, nên ngày chưa tới không có dòng nào — mở được vào đó là hứa
 * một màn rỗng và để trưởng nhóm tự đoán vì sao.
 */

/**
 * Vì sao KHÔNG dùng `components/unified-date-picker.tsx` dù nó đã có sẵn một
 * bộ chọn ngày trong `Popover`:
 *   1. Nó chạy trên `Date` và trả về một KHOẢNG `{from, to}`; cả cụm Báo cáo
 *      chạy trên chuỗi `'YYYY-MM-DD'` theo giờ nghiệp vụ. Bọc qua `Date` là
 *      mở thêm một đường quy đổi múi giờ — đúng chỗ mà `utils/date.ts` dựng
 *      cả một họ hàm để tránh.
 *   2. Bảng chỉ xem MỘT ngày, còn hộp bung ra của nó luôn kèm cột "Chế độ"
 *      (Ngày / Tuần / Tháng) và nút "Xóa". Xóa ngày ở đây không có nghĩa gì,
 *      mà tuần/tháng thì bảng không đọc được.
 *   3. Nút mở của nó là `min-w-45` kèm icon Phễu — rộng gần nửa bề ngang máy
 *      375px và nói nhầm rằng đây là bộ LỌC.
 * Nên chỉ dùng lại hai primitive mà chính nó dùng: `Popover` + `Calendar`.
 * `components/month-year-picker.tsx` càng không hợp — lý do đầy đủ đã ghi ở
 * `daily-report-history.tsx`, và nó chỉ chọn tới tháng.
 */

/** 44px trên điện thoại, hạ về 36px từ `sm` — cùng khuôn với màn Lịch sử. */
const NAV_BUTTON =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-ws-control text-ws-ink-soft transition-colors hover:bg-ws-surface-alt hover:text-ws-ink disabled:pointer-events-none disabled:opacity-35 sm:h-9 sm:w-9';

/**
 * `'YYYY-MM-DD'` → `Date` nửa đêm THEO GIỜ MÁY.
 *
 * Giờ máy là đúng ở đây chứ không phải giờ nghiệp vụ: `react-day-picker` so
 * sánh và tô ô lịch bằng `getFullYear/getMonth/getDate`, tức toàn bộ nội bộ
 * nó chạy trên lịch địa phương. Đưa vào một `Date` dựng ở UTC
 * (`new Date('2026-08-17')`) thì máy ở múi âm sẽ tô sáng ngày 16.
 */
function dayStrToDate(dayStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dayStr ?? '').trim());
  // Chuỗi hỏng (từ URL, từ dữ liệu cũ) thì rơi về hôm nay thay vì dựng
  // `Invalid Date` — lịch nhận `Invalid Date` sẽ ném khi tính tháng hiển thị.
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** `Date` (giờ máy) → `'YYYY-MM-DD'`. Nghịch đảo của `dayStrToDate`. */
function dateToDayStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

interface Props {
  /** Ngày đang xem, `'YYYY-MM-DD'`. */
  value: string;
  onChange: (dayStr: string) => void;
  /**
   * Ngày muộn nhất chọn được. Mặc định là hôm nay theo GIỜ NGHIỆP VỤ, không
   * theo giờ máy: máy đặt lệch múi giờ sẽ mở khoá thêm một ngày chưa tới.
   */
  maxDay?: string;
}

export function BoardDateNav({ value, onChange, maxDay }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const lastDay = maxDay ?? todayStrVi();
  /* So sánh CHUỖI được vì `'YYYY-MM-DD'` xếp theo từ điển trùng với xếp theo
     thời gian — không cần dựng `Date` chỉ để hỏi "đã tới ngày cuối chưa". */
  const canGoNext = value < lastDay;

  return (
    <div className='flex items-center gap-0.5'>
      <button
        type='button'
        aria-label='Xem ngày trước'
        onClick={() => onChange(shiftDayStr(value, -1))}
        className={cn(NAV_BUTTON, FOCUS_RING_SURFACE)}
      >
        <ChevronLeft className='h-4 w-4' aria-hidden='true' />
      </button>

      {/* Chính ô NGÀY là nút mở lịch, không thêm một nút icon thứ tư: ở 375px
          cụm này đứng chung hàng với tên nhóm và giờ khóa, mỗi ô 44px thêm vào
          là một mảnh nữa bị đẩy xuống dòng. Icon lịch nằm trong ô để nói rằng
          bấm được.
          Chú thích PHẢI đứng ngoài `PopoverTrigger`: `asChild` chỉ nhận đúng
          MỘT phần tử con. */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type='button'
            aria-label={`Đang xem ngày ${formatDateVi(value)} — mở lịch để chọn ngày khác`}
            className={cn(
              'inline-flex min-h-11 items-center gap-1.5 rounded-ws-control px-2 text-ws-body font-semibold text-ws-ink transition-colors hover:bg-ws-surface-alt sm:min-h-9',
              FOCUS_RING_SURFACE,
            )}
          >
            <CalendarDays
              className='h-4 w-4 shrink-0 text-ws-ink-faint'
              aria-hidden='true'
            />
            <span className='whitespace-nowrap tabular-nums'>
              {WEEKDAY_LABEL_VI[isoWeekdayOfDayStr(value)]} ·{' '}
              {formatDateVi(value)}
            </span>
          </button>
        </PopoverTrigger>
        {/* `ws-scope` là bắt buộc: Radix render `PopoverContent` qua portal ra
            thẳng `document.body`, tức RA NGOÀI lớp bọc token của màn /tasks.
            Thiếu nó thì lịch bung ra vẫn mang bảng màu cũ. */}
        <PopoverContent align='start' className='ws-scope w-auto p-0'>
          <Calendar
            mode='single'
            locale={vi}
            selected={dayStrToDate(value)}
            defaultMonth={dayStrToDate(value)}
            /* `disabled` khoá từng ô, `endMonth` khoá luôn mũi tên sang tháng
               sau — thiếu vế thứ hai thì người dùng lật được tới tháng 12 rồi
               mới phát hiện cả tháng đều mờ. */
            disabled={{ after: dayStrToDate(lastDay) }}
            endMonth={dayStrToDate(lastDay)}
            onSelect={(picked) => {
              if (!picked) return;
              onChange(dateToDayStr(picked));
              setIsOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>

      <button
        type='button'
        aria-label='Xem ngày sau'
        disabled={!canGoNext}
        onClick={() => onChange(shiftDayStr(value, 1))}
        className={cn(NAV_BUTTON, FOCUS_RING_SURFACE)}
      >
        <ChevronRight className='h-4 w-4' aria-hidden='true' />
      </button>
    </div>
  );
}
