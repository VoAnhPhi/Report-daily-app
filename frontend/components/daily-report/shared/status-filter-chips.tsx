'use client';

import { cn } from '@/lib/utils';

import { FOCUS_RING_SUNKEN } from '../utils/classes';

export interface StatusFilterOption<K extends string> {
  key: K;
  label: string;
  /** Vắng = chưa có số (đang tải) hoặc mục không đếm. */
  count?: number;
  /** Đếm hỏng, khác hẳn "đếm ra 0": in "?" thay vì im lặng. */
  countUnknown?: boolean;
  /** Đốm màu trạng thái, ví dụ `bg-ws-progress-fg`. Màu chỉ là kênh phụ. */
  dotClass?: string;
}

/**
 * Dải lọc theo trạng thái, dùng chung cho bảng nhóm và khối "Trạng thái duyệt"
 * của Tổng quan.
 *
 * Cùng hình dạng với cụm chuyển màn `SEGMENT_*` của workspace: một track nền
 * chìm, mục đang chọn NỔI LÊN bằng nền trắng + bóng nghỉ. Không tô đen mục đang
 * chọn - đen là màu của MỘT hành động chính mỗi màn (`MASTER.md` mục 2), bản
 * tô đen trước (16/09/2026) làm dải lọc giành mắt với nút chính.
 *
 * - Track được xuống dòng: chip giấu sau mép phải là bộ lọc người dùng không
 *   biết là có (`Chip Collection Reflow`, ui-ux-pro-max).
 * - Số đếm `tabular-nums`, nhạt hơn nhãn; mục có số 0 mờ đi nhưng vẫn bấm được.
 * - `aria-pressed` trên nút thật, số đếm nằm trong tên đọc được.
 */
export function StatusFilterChips<K extends string>({
  options,
  value,
  onChange,
  label,
  fill = false,
  gridOnMobile = false,
  className,
}: {
  options: StatusFilterOption<K>[];
  value: K | null;
  onChange: (key: K) => void;
  label: string;
  /** Khổ hẹp: các mục chia đều một hàng (dùng cho cụm 2-3 tab ngắn). */
  fill?: boolean;
  /** Khổ hẹp: lưới hai cột thay vì xuống dòng tự do. Dùng cho dải nhiều mục
   *  (bảng nhóm có sáu): xuống dòng tự do để lại các hàng lệch nhau trong một
   *  khối nền chìm (đo 375px, 17/09/2026). */
  gridOnMobile?: boolean;
  className?: string;
}) {
  return (
    <div
      role='group'
      aria-label={label}
      className={cn(
        'inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-ws-block border border-ws-line bg-ws-surface-sunken p-0.5',
        fill && 'flex w-full flex-nowrap sm:inline-flex sm:w-auto',
        gridOnMobile && 'grid w-full grid-cols-2 sm:inline-flex sm:w-auto',
        className,
      )}
    >
      {options.map((option) => {
        const isOn = option.key === value;
        const countText = option.countUnknown
          ? '?'
          : option.count !== undefined
            ? String(option.count)
            : null;
        const isEmpty = !isOn && option.count === 0 && !option.countUnknown;
        return (
          <button
            key={option.key}
            type='button'
            aria-pressed={isOn}
            aria-label={
              countText === null
                ? option.label
                : option.countUnknown
                  ? `${option.label}, chưa đếm được`
                  : `${option.label}, ${countText}`
            }
            onClick={() => onChange(option.key)}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-ws-control px-2.5 text-ws-cell transition-colors sm:min-h-8',
              fill &&
                'min-w-0 flex-1 shrink justify-center px-1.5 sm:flex-none sm:px-2.5',
              isOn
                ? 'bg-ws-surface font-semibold text-ws-ink shadow-ws-rest'
                : 'font-medium text-ws-ink-soft hover:text-ws-ink',
              isEmpty && 'text-ws-ink-faint',
              FOCUS_RING_SUNKEN,
            )}
          >
            {option.dotClass && (
              <span
                aria-hidden='true'
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full',
                  option.dotClass,
                  isEmpty && 'opacity-40',
                )}
              />
            )}
            {option.label}
            {countText !== null && (
              <span
                aria-hidden='true'
                className={cn(
                  'tabular-nums',
                  isOn ? 'text-ws-ink-soft' : 'text-ws-ink-faint',
                )}
              >
                {countText}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
