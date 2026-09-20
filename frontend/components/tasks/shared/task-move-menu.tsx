'use client';

import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { TaskStatus } from '@/types/task.type';
import {
  TASK_STATUS_CONFIG,
  TASK_STATUS_ORDER as MOVE_TO_ORDER,
} from '../task-utils';

interface TaskMoveMenuProps {
  currentStatus: TaskStatus;
  onMove: (status: TaskStatus) => void;
  /** Nút mở: dấu ba chấm (thẻ) hoặc nhãn chữ (dòng, modal). */
  variant?: 'icon' | 'label';
  className?: string;
}

/**
 * Menu "Chuyển sang…" — đường đổi trạng thái dùng chung cho thẻ bảng cột, dòng
 * việc và modal chi tiết.
 *
 * Đây là con đường DUY NHẤT để đổi trạng thái dưới 768px: ở khổ đó không có
 * bảng cột nên không kéo thả được. Cũng là lối cho người dùng bàn phím.
 */
export function TaskMoveMenu({
  currentStatus,
  onMove,
  variant = 'icon',
  className,
}: TaskMoveMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* `span role="button"` chứ không phải `<button>`: dòng việc bọc ngoài
            đã là một `<button>`, lồng button trong button là DOM không hợp lệ
            và React sẽ cảnh báo hydrate. Nút ghim cạnh bên cũng làm như vậy. */}
        <span
          role='button'
          tabIndex={0}
          aria-label='Chuyển sang trạng thái khác'
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md text-ws-ink-faint transition-colors hover:bg-ws-surface-sunken hover:text-ws-ink',
            variant === 'icon'
              ? 'p-1.5'
              : 'border border-ws-line bg-ws-surface-alt px-2 py-1 text-xs font-semibold',
            className,
          )}
        >
          {variant === 'icon' ? (
            <MoreHorizontal className='h-3.5 w-3.5' />
          ) : (
            'Chuyển sang…'
          )}
        </span>
      </DropdownMenuTrigger>
      {/* `ws-scope` phải nằm trên chính content: Radix render nó ra
          `document.body`, ngoài lớp bọc theme của trang. */}
      <DropdownMenuContent
        align='end'
        onClick={(e) => e.stopPropagation()}
        className='ws-scope w-48'
      >
        <DropdownMenuLabel className='text-[12.5px] text-ws-ink-faint'>
          Chuyển sang…
        </DropdownMenuLabel>
        {MOVE_TO_ORDER.map((status) => {
          const visual = TASK_STATUS_CONFIG[status];
          const Icon = visual.icon;
          const isCurrent = status === currentStatus;
          return (
            <DropdownMenuItem
              key={status}
              disabled={isCurrent}
              onSelect={() => onMove(status)}
              className='gap-2 text-[13px]'
            >
              <Icon className={cn('h-3.5 w-3.5', visual.color)} />
              {visual.label}
              {isCurrent && (
                <span className='ml-auto text-[11px] text-ws-ink-ghost'>
                  hiện tại
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
