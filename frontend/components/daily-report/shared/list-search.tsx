'use client';

import { Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';

import { FOCUS_RING_SURFACE as FOCUS_RING } from '../utils/classes';

/** Bỏ dấu và hạ chữ thường để "quynh" tìm được "Quỳnh". */
export function normalizeSearchVi(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/**
 * Ô tìm theo tên của mọi danh sách người trong Báo cáo (bảng nhóm, chọn thành
 * viên, chọn người duyệt).
 *
 * Nhãn nằm ở `aria-label`: placeholder không thay được nhãn vì nó biến mất ngay
 * khi gõ chữ đầu tiên. Viền `ws-line-strong` vì với ô nhập, đường bao là thứ
 * duy nhất báo có control ở đó. Nút xoá chỉ hiện khi có chữ.
 */
export function ListSearch({
  value,
  onChange,
  label,
  placeholder = 'Tìm theo tên…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden='true'
        className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ws-ink-faint'
      />
      <input
        type='search'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        placeholder={placeholder}
        className={cn(
          'h-11 w-full rounded-ws-control border border-ws-line-strong bg-ws-surface pl-9 pr-10 text-ws-body text-ws-ink placeholder:text-ws-ink-faint sm:h-9 [&::-webkit-search-cancel-button]:hidden',
          FOCUS_RING,
        )}
      />
      {value.length > 0 && (
        <button
          type='button'
          onClick={() => onChange('')}
          aria-label='Xoá từ khoá'
          className={cn(
            'absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-ws-control text-ws-ink-faint hover:text-ws-ink sm:h-9 sm:w-9',
            FOCUS_RING,
          )}
        >
          <X aria-hidden='true' className='h-4 w-4' />
        </button>
      )}
    </div>
  );
}
