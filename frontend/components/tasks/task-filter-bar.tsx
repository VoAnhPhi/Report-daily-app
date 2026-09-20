'use client';

import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  CalendarDays,
  CalendarClock,
} from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { type CooperationCategory, type TaskPriority } from '@/types/task.type';
import {
  COOPERATION_CATEGORY_LABEL_VI,
  TASK_PRIORITY_CONFIG,
  TASK_PRIORITY_ORDER,
} from '@/components/tasks/task-utils';
import { cn } from '@/lib/utils';

/** Cầu nối DateTimePicker (Date) ↔ chuỗi ngày YYYY-MM-DD lưu trong filter. */
const toDateOnly = (d?: Date) => (d ? format(d, 'yyyy-MM-dd') : undefined);
const parseDateOnly = (s?: string) =>
  s ? new Date(`${s}T00:00:00`) : undefined;

/** Bộ lọc dùng chung cho cả 3 tab (cá nhân / đối tác / chung). */
export interface TaskFilters {
  search: string;
  category?: CooperationCategory;
  priority?: TaskPriority;
  createdByAdmin?: boolean;
  startFrom?: string;
  startTo?: string;
  dueFrom?: string;
  dueTo?: string;
}

export const EMPTY_TASK_FILTERS: TaskFilters = { search: '' };

interface TaskFilterBarProps {
  value: TaskFilters;
  onChange: (next: TaskFilters) => void;
  className?: string;
  /** Phần lọc thêm */
  partnerSection?: React.ReactNode;
  /** Số bộ lọc đang bật */
  extraActiveCount?: number;
  onClearExtra?: () => void;
  /**
   * Ẩn ô tìm — dùng khi ô tìm đã nằm ở thanh công cụ. Có hai ô tìm cùng ghi vào
   * một trạng thái là cách chắc chắn nhất để người dùng nghi ngờ mình gõ nhầm chỗ.
   */
  hideSearch?: boolean;
  /**
   * Chỉ còn icon, vuông 44px — khớp ĐÚNG chiều cao cụm chuyển chế độ xem đứng
   * cạnh nó: 1px viền + 4px padding + 34px nút + 4px + 1px = 44px. Dùng ở hàng
   * tab của `/tasks`, nơi chữ "Lọc" chỉ lặp lại điều mà icon đã nói. 44px cũng
   * vừa đúng ngưỡng vùng chạm 44×44 cho khổ hẹp.
   */
  iconOnly?: boolean;
}

export function TaskFilterBar({
  value,
  onChange,
  className,
  partnerSection,
  extraActiveCount = 0,
  onClearExtra,
  hideSearch = false,
  iconOnly = false,
}: TaskFilterBarProps) {
  const set = (patch: Partial<TaskFilters>) => onChange({ ...value, ...patch });

  const advancedCount =
    [
      value.category,
      value.priority,
      value.createdByAdmin,
      value.startFrom,
      value.startTo,
      value.dueFrom,
      value.dueTo,
    ].filter(Boolean).length + extraActiveCount;

  const hasAny = advancedCount > 0 || !!value.search;

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        !hideSearch && 'w-full',
        className,
      )}
    >
      {!hideSearch && (
        <div className='relative flex-1 min-w-0'>
          <Search className='absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ws-ink-faint' />
          <Input
            placeholder='Tìm theo tiêu đề hoặc mô tả...'
            className='h-9 rounded-lg pl-8'
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
          />
        </div>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            title={
              advancedCount > 0
                ? `Lọc — đang bật ${advancedCount} bộ lọc`
                : 'Lọc'
            }
            aria-label={
              advancedCount > 0
                ? `Lọc, đang bật ${advancedCount} bộ lọc`
                : 'Lọc'
            }
            className={cn(
              /* Nền TRẮNG (`ws-surface`) như mọi nút phụ khác của màn, không
                 phải nền lam riêng — nút lọc không phải hành động chính, không
                 có lý do gì để nó là thứ nổi nhất trên hàng tab. */
              'relative shrink-0 border-ws-line bg-ws-surface font-medium text-ws-ink-soft transition-colors hover:bg-ws-surface-alt hover:text-ws-ink',
              iconOnly ? 'h-11 w-11 rounded-xl p-0' : 'h-9 rounded-lg px-3',
              /* Đang lọc thì đổi VIỀN + CHỮ, không đổi nền: nền đặc ở đây sẽ
                 tranh chấp với nút chế độ xem đang chọn ngay bên cạnh. */
              advancedCount > 0 && 'border-ws-accent text-ws-accent',
            )}
          >
            <SlidersHorizontal
              className={cn('h-4 w-4', !iconOnly && 'mr-1.5')}
            />
            {!iconOnly && 'Lọc'}
            {advancedCount > 0 && (
              <span className='absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ws-accent px-1 text-[10px] font-bold text-white'>
                {advancedCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align='end'
          className='ws-scope w-[340px] space-y-4 rounded-xl p-4'
        >
          {partnerSection && (
            <div className='flex flex-col gap-1.5 border-b border-zinc-100 pb-4'>
              {partnerSection}
            </div>
          )}

          <div className='flex flex-col gap-1.5'>
            <span className='text-xs font-medium text-zinc-500'>
              Loại công việc
            </span>
            <Select
              value={value.category ?? 'all'}
              onValueChange={(v) =>
                set({
                  category:
                    v === 'all' ? undefined : (v as CooperationCategory),
                })
              }
            >
              <SelectTrigger className='h-9 w-full rounded-lg'>
                <SelectValue placeholder='Tất cả loại công việc' />
              </SelectTrigger>
              <SelectContent className='ws-scope max-h-[300px] rounded-lg'>
                <SelectItem value='all'>Tất cả loại công việc</SelectItem>
                {Object.entries(COOPERATION_CATEGORY_LABEL_VI).map(
                  ([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className='flex flex-col gap-1.5'>
            <span className='text-xs font-medium text-zinc-500'>
              Độ ưu tiên
            </span>
            <Select
              value={value.priority ?? 'all'}
              onValueChange={(v) =>
                set({ priority: v === 'all' ? undefined : (v as TaskPriority) })
              }
            >
              <SelectTrigger className='h-9 w-full rounded-lg'>
                <SelectValue placeholder='Tất cả độ ưu tiên' />
              </SelectTrigger>
              <SelectContent className='ws-scope rounded-lg'>
                <SelectItem value='all'>Tất cả độ ưu tiên</SelectItem>
                {TASK_PRIORITY_ORDER.map((p) => (
                  <SelectItem key={p} value={p}>
                    {TASK_PRIORITY_CONFIG[p].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='flex flex-col gap-1.5'>
            <span className='text-xs font-medium text-zinc-500'>
              Nguồn việc
            </span>
            <Select
              value={value.createdByAdmin ? 'admin' : 'all'}
              onValueChange={(v) =>
                set({ createdByAdmin: v === 'admin' ? true : undefined })
              }
            >
              <SelectTrigger className='h-9 w-full rounded-lg'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='ws-scope rounded-lg'>
                <SelectItem value='all'>Tất cả nguồn</SelectItem>
                <SelectItem value='admin'>Chỉ việc admin giao</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='flex flex-col gap-1.5'>
            <span className='flex items-center gap-1 text-xs font-medium text-zinc-500'>
              <CalendarDays className='h-3 w-3' /> Ngày bắt đầu
            </span>
            <div className='flex items-center gap-2'>
              <DateTimePicker
                showTime={false}
                date={parseDateOnly(value.startFrom)}
                onDateChange={(d) => set({ startFrom: toDateOnly(d) })}
                placeholder='Từ ngày'
                maxDate={parseDateOnly(value.startTo)}
                className='h-9 min-w-0 flex-1 rounded-lg px-2.5'
              />
              <span className='shrink-0 text-xs text-zinc-400'>đến</span>
              <DateTimePicker
                showTime={false}
                date={parseDateOnly(value.startTo)}
                onDateChange={(d) => set({ startTo: toDateOnly(d) })}
                placeholder='Đến ngày'
                minDate={parseDateOnly(value.startFrom)}
                className='h-9 min-w-0 flex-1 rounded-lg px-2.5'
              />
            </div>
          </div>

          <div className='flex flex-col gap-1.5'>
            <span className='flex items-center gap-1 text-xs font-medium text-zinc-500'>
              <CalendarClock className='h-3 w-3' /> Hạn chót
            </span>
            <div className='flex items-center gap-2'>
              <DateTimePicker
                showTime={false}
                date={parseDateOnly(value.dueFrom)}
                onDateChange={(d) => set({ dueFrom: toDateOnly(d) })}
                placeholder='Từ ngày'
                maxDate={parseDateOnly(value.dueTo)}
                className='h-9 min-w-0 flex-1 rounded-lg px-2.5'
              />
              <span className='shrink-0 text-xs text-zinc-400'>đến</span>
              <DateTimePicker
                showTime={false}
                date={parseDateOnly(value.dueTo)}
                onDateChange={(d) => set({ dueTo: toDateOnly(d) })}
                placeholder='Đến ngày'
                minDate={parseDateOnly(value.dueFrom)}
                className='h-9 min-w-0 flex-1 rounded-lg px-2.5'
              />
            </div>
          </div>

          {hasAny && (
            <Button
              variant='ghost'
              size='sm'
              className='h-8 w-full rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700'
              onClick={() => {
                onChange(EMPTY_TASK_FILTERS);
                onClearExtra?.();
              }}
            >
              <RotateCcw className='mr-1.5 h-3.5 w-3.5' />
              Xóa bộ lọc
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
