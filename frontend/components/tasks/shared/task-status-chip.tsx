'use client';

import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/types/task.type';
import { TASK_STATUS_CONFIG } from '../task-utils';

/**
 * Chip trạng thái — định danh trực quan của một trạng thái việc.
 *
 * Dùng ở đầu cột (đây là thứ mang màu DUY NHẤT của cột), ô Trạng thái của bảng
 * tính, panel chi tiết và bảng theo dõi. KHÔNG dùng trên thẻ ở chế độ bảng cột:
 * ở đó cột đã nói trạng thái rồi, chip là thừa.
 *
 * Luôn có icon VÀ chữ — màu không bao giờ là kênh duy nhất (nguyên tắc 4).
 */
export function TaskStatusChip({
  status,
  size = 'md',
  className,
}: {
  status: TaskStatus;
  size?: 'md' | 'sm';
  className?: string;
}) {
  const visual = TASK_STATUS_CONFIG[status];
  const Icon = visual.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg font-semibold',
        size === 'md'
          ? 'px-2.5 py-[5px] text-xs'
          : 'px-2 py-[3px] text-[11.5px]',
        visual.bg,
        visual.color,
        className,
      )}
    >
      <Icon className='h-3.5 w-3.5 shrink-0' />
      {visual.label}
    </span>
  );
}
