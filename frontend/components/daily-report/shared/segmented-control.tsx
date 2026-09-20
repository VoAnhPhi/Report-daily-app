'use client';

import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import {
  CHIP_TRACK_CLASS,
  filterChipClass,
  FOCUS_RING_SUNKEN,
} from '../utils/classes';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

/**
 * Cụm chọn MỘT trong vài chế độ xem ("Toàn nhóm / Theo thành viên", "Tỉ lệ nộp /
 * Bộ phận"). Một khuôn cho mọi cụm chuyển chế độ của Báo cáo, để người dùng
 * nhận ra ngay đây là công tắc chế độ chứ không phải bộ lọc.
 *
 * `aria-pressed` trên từng nút thay vì `role='radiogroup'`: nút bấm là thứ bàn
 * phím và trình đọc màn hình của repo đã quen, và không phải tự làm phím mũi
 * tên.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  iconOnlyOnMobile = false,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Tên cụm cho trình đọc màn hình, ví dụ "Cách xem danh sách". */
  label: string;
  /**
   * Dưới `sm` chỉ hiện icon, chữ rút vào `sr-only`. Dùng khi cụm này phải đứng
   * CÙNG HÀNG với một nút khác trong đầu một khối: ở 375px đầu khối Thành viên
   * chỉ còn 275px, mà "Bộ lọc" 109px + cụm đủ chữ 203px là rớt thành ba hàng
   * (đo 18/09/2026). Chỉ bật khi MỖI mục đều có icon.
   */
  iconOnlyOnMobile?: boolean;
  className?: string;
}) {
  return (
    <div
      role='group'
      aria-label={label}
      className={cn(CHIP_TRACK_CLASS, 'flex-nowrap text-ws-chip', className)}
    >
      {options.map((option) => {
        const isOn = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type='button'
            aria-pressed={isOn}
            onClick={() => onChange(option.value)}
            className={cn(
              filterChipClass(isOn),
              'inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap sm:min-h-9',
              FOCUS_RING_SUNKEN,
            )}
          >
            {Icon && <Icon aria-hidden='true' className='h-3.5 w-3.5' />}
            {iconOnlyOnMobile ? (
              <>
                <span className='sr-only'>{option.label}</span>
                <span className='hidden sm:inline'>{option.label}</span>
              </>
            ) : (
              option.label
            )}
          </button>
        );
      })}
    </div>
  );
}
