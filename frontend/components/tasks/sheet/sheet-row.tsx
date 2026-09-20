'use client';

import { memo } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Check, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, TaskStatus } from '@/types/task.type';
import {
  COOPERATION_CATEGORY_LABEL_VI,
  getAvatarPalette,
  getTaskChecklistProgress,
  isTaskOverdue,
  TASK_PRIORITY_CONFIG,
  TASK_STATUS_CONFIG,
  TASK_TYPE_CONFIG,
} from '@/components/tasks/task-utils';
import { TaskStatusChip } from '../shared/task-status-chip';
import { SHEET_GRID } from './sheet-grid';

export interface SheetRowProps {
  task: Task;
  showTypeTag: boolean;
  isSelected: boolean;
  onSelect: (task: Task) => void;
  onComplete: (taskId: string) => void;
}

/**
 * Một hàng lưới. Ô tick đầu hàng chuyển việc sang `done` (qua hộp xác nhận) và
 * KHÔNG mở panel — bấm chỗ khác trên hàng mới mở panel.
 */
export const SheetRow = memo(
  function SheetRow({
    task,
    showTypeTag,
    isSelected,
    onSelect,
    onComplete,
  }: SheetRowProps) {
    const { totalItems, doneItems } = getTaskChecklistProgress(task.items);
    const priorityVisual = task.priority
      ? TASK_PRIORITY_CONFIG[task.priority]
      : null;
    const statusVisual = TASK_STATUS_CONFIG[task.status];
    const typeVisual = TASK_TYPE_CONFIG[task.type];
    const isDone = task.status === TaskStatus.DONE;
    const isOverdue = isTaskOverdue(task);

    return (
      <div
        role='button'
        tabIndex={0}
        onClick={() => onSelect(task)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(task);
          }
        }}
        className={cn(
          /* `w-max min-w-full`, không để chiều rộng `auto`.
             Lưới dùng track px cố định nên tổng bề rộng của nó lớn hơn vùng
             nhìn thấy trong khoảng 768–1030px và ở mọi khổ khi mở panel Xem
             nhanh. Các track vẫn vẽ đúng và tràn ra ngoài, NHƯNG nền và viền
             của chính hàng chỉ vẽ theo `width` — tức dừng ở mép phải ban đầu.
             Cuộn sang phải là thấy `border-b` đứt giữa chừng, nền hover hết
             ngang chừng, và vạch trạng thái bên trái không còn bao hết hàng:
             bảng trông như vỡ.
             `w-max` cho hàng rộng bằng tổng track, `min-w-full` giữ nó phủ hết
             khi vùng cuộn rộng hơn lưới. */
          'grid h-[52px] w-max min-w-full cursor-pointer items-center gap-3 border-b border-ws-line-soft px-3 transition-colors hover:bg-ws-surface-alt',
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ws-focus',
          SHEET_GRID,
          isSelected && 'bg-ws-surface-alt',
        )}
        style={{
          borderLeftWidth: 3,
          borderLeftColor: statusVisual.edge,
          borderLeftStyle: typeVisual.borderStyle,
        }}
      >
        {/* 1 — Ô tick + tên việc */}
        <div className='flex min-w-0 items-center gap-2.5'>
          <span
            role='checkbox'
            aria-checked={isDone}
            aria-label={isDone ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              if (!isDone) onComplete(task.id);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                if (!isDone) onComplete(task.id);
              }
            }}
            className={cn(
              'flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-md border-[1.5px] transition-colors',
              isDone
                ? 'border-transparent text-ws-solid-ink'
                : 'border-ws-line-strong bg-ws-surface hover:border-ws-accent',
            )}
            style={isDone ? { backgroundColor: statusVisual.edge } : undefined}
          >
            {isDone && <Check className='h-3 w-3' />}
          </span>
          {task.isPinnedByMe && (
            <span
              aria-label='Đã ghim'
              className='h-1.5 w-1.5 shrink-0 rounded-full bg-ws-accent'
            />
          )}
          <span
            className='truncate text-[13.5px] font-semibold text-ws-ink'
            title={task.title}
          >
            {task.title}
          </span>
          {task.createdByAdmin && (
            <Shield
              className='h-3 w-3 shrink-0 text-ws-ink-ghost'
              aria-label='Việc do quản trị viên giao'
            />
          )}
        </div>

        {/* 2 — Hồ sơ (ẩn dưới 1280px) */}
        <span className='hidden truncate text-[13px] text-ws-ink-soft xl:block'>
          {task.businessForm?.companyName ?? '—'}
        </span>

        {/* 3 — Trạng thái */}
        <TaskStatusChip status={task.status} size='sm' />

        {/* 4 — Phụ trách */}
        <div className='flex items-center -space-x-[7px]'>
          {(task.relatedUsers ?? []).slice(0, 3).map((a) => (
            <span
              key={a.id}
              title={a.fullName}
              className={cn(
                'flex h-[26px] w-[26px] items-center justify-center overflow-hidden rounded-full border-2 border-ws-surface text-[10px] font-bold',
                getAvatarPalette(a.id),
              )}
            >
              {a.avatarUrl ? (
                <img
                  src={a.avatarUrl}
                  alt={a.fullName}
                  className='h-full w-full object-cover'
                />
              ) : (
                a.fullName.charAt(0).toUpperCase()
              )}
            </span>
          ))}
          {(task.relatedUsers?.length ?? 0) > 3 && (
            <span className='flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-ws-surface bg-ws-surface-sunken text-[10px] font-bold text-ws-ink-soft'>
              +{(task.relatedUsers?.length ?? 0) - 3}
            </span>
          )}
        </div>

        {/* 5 — Hạn */}
        <span
          className={cn(
            'text-[13px] tabular-nums',
            isOverdue ? 'font-semibold text-ws-void-fg' : 'text-ws-ink-soft',
          )}
        >
          {task.dueDate
            ? format(new Date(task.dueDate), 'dd/MM', { locale: vi })
            : '—'}
        </span>

        {/* 6 — Tiến độ (ẩn cả cụm khi không có việc con) */}
        <div className='flex items-center gap-2'>
          {totalItems > 0 ? (
            <>
              <div className='h-[5px] flex-1 overflow-hidden rounded-[3px] bg-ws-surface-sunken'>
                <div
                  className='h-full rounded-[3px]'
                  style={{
                    width: `${(doneItems / totalItems) * 100}%`,
                    backgroundColor: statusVisual.edge,
                  }}
                />
              </div>
              <span className='w-[34px] shrink-0 text-right text-[12px] tabular-nums text-ws-ink-faint'>
                {doneItems}/{totalItems}
              </span>
            </>
          ) : (
            <span className='text-[13px] text-ws-ink-ghost'>—</span>
          )}
        </div>

        {/* 7 — Ưu tiên. Cột này HIỆN cả mức Trung bình: ở đây nó là giá trị của
            một ô có nhãn sẵn, không phải chip chen chỗ trên thẻ. */}
        <span className='flex items-center gap-1.5 text-[13px]'>
          {priorityVisual ? (
            <span
              className={cn(
                'inline-flex items-center gap-1',
                priorityVisual.color,
              )}
            >
              {(() => {
                const PriorityIcon = priorityVisual.icon;
                return <PriorityIcon className='h-3.5 w-3.5' aria-hidden />;
              })()}
              {priorityVisual.label}
            </span>
          ) : (
            <span className='text-ws-ink-ghost'>—</span>
          )}
        </span>

        {/* 8 — Thẻ (ẩn dưới 1280px) */}
        <div className='hidden min-w-0 items-center gap-1 xl:flex'>
          {task.category && (
            <span className='max-w-[120px] truncate rounded-sm bg-ws-surface-sunken px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-tight text-ws-ink-soft'>
              {COOPERATION_CATEGORY_LABEL_VI[task.category]}
            </span>
          )}
          {showTypeTag && (
            <span className='shrink-0 rounded-sm bg-ws-surface-sunken px-1.5 py-0.5 text-[10px] font-bold text-ws-ink-soft'>
              {typeVisual.shortLabel}
            </span>
          )}
          {task.onBehalfName && (
            <span className='max-w-[110px] truncate rounded-sm bg-ws-surface-sunken px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-tight text-ws-ink-soft'>
              Thay: {task.onBehalfName}
            </span>
          )}
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.task.id === next.task.id &&
    prev.task.updatedAt === next.task.updatedAt &&
    prev.task.isPinnedByMe === next.task.isPinnedByMe &&
    prev.isSelected === next.isSelected &&
    prev.showTypeTag === next.showTypeTag,
);
