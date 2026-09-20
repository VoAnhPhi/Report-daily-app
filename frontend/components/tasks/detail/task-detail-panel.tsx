'use client';

import { X } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Task, TaskActivityType, TaskStatus } from '@/types/task.type';
import {
  COOPERATION_CATEGORY_LABEL_VI,
  getAvatarPalette,
  getTaskChecklistProgress,
  TASK_PRIORITY_CONFIG,
  TASK_STATUS_CONFIG,
  TASK_STATUS_ORDER as MOVE_TO_ORDER,
  TASK_TYPE_CONFIG,
} from '@/components/tasks/task-utils';
import { cn } from '@/lib/utils';
import { TaskStatusChip } from '../shared/task-status-chip';

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
  /** Mở `TaskDetailModal` đầy đủ — mọi thao tác ghi dữ liệu khác nằm ở đó. */
  onOpenFull: () => void;
  onChangeStatus: (status: TaskStatus) => void;
}

/**
 * Panel xem nhanh một việc, rộng 380px, trượt từ phải.
 *
 * RANH GIỚI: panel chỉ để XEM NHANH và ĐỔI TRẠNG THÁI. Bình luận, việc con,
 * tệp đính kèm và lịch sử vẫn ở `TaskDetailModal` — mở từ chân panel. Nhân đôi
 * các thao tác ghi ở hai nơi là cách chắc chắn nhất để chúng lệch nhau.
 *
 * Dưới 1024px không dựng panel; nơi gọi mở thẳng modal.
 */
export function TaskDetailPanel({
  task,
  onClose,
  onOpenFull,
  onChangeStatus,
}: TaskDetailPanelProps) {
  const { totalItems, doneItems } = getTaskChecklistProgress(task.items);
  const priorityVisual = task.priority
    ? TASK_PRIORITY_CONFIG[task.priority]
    : null;
  // Danh sách việc không kèm `activities` — số bình luận chỉ có khi panel được
  // mở từ một bản đã tải chi tiết. Thiếu thì hiện 0, không đoán.
  const commentCount =
    task.activities?.filter((a) => a.type === TaskActivityType.COMMENT)
      .length ?? 0;
  const attachmentCount = task.attachments?.length ?? 0;

  return (
    <aside
      aria-label={`Xem nhanh công việc ${task.title}`}
      className={cn(
        /* `gap-4` / `p-6` thay cho `gap-[18px]` / `p-[22px]`: hai giá trị lẻ đó
           không nằm trong thang khoảng cách nào của hệ, nên panel này lệch
           nhịp với mọi khối bên cạnh. `ws-scroll` cho thanh cuộn mảnh. */
        'ws-scroll hidden h-full w-[380px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-ws-line bg-ws-surface p-6 lg:flex',
        // Trượt vào 180ms; dưới prefers-reduced-motion chỉ đổi độ mờ.
        'motion-safe:animate-in motion-safe:slide-in-from-right-6 motion-safe:fade-in motion-safe:duration-200',
        'motion-reduce:animate-in motion-reduce:fade-in',
      )}
    >
      <div className='flex items-start gap-2'>
        <TaskStatusChip status={task.status} />
        <span className='flex-1' />
        <button
          type='button'
          onClick={onClose}
          aria-label='Đóng xem nhanh'
          className='flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-ws-line bg-ws-surface-alt text-ws-ink-faint transition-colors hover:bg-ws-surface-sunken hover:text-ws-ink'
        >
          <X className='h-4 w-4' />
        </button>
      </div>

      {task.businessForm?.companyName && (
        <p className='text-xs font-semibold uppercase tracking-wide text-ws-ink-faint'>
          {task.businessForm.companyName}
        </p>
      )}

      <h3 className='text-[21px] font-bold leading-[1.25] text-ws-ink'>
        {task.title}
      </h3>

      {task.code && (
        <span className='w-fit rounded-[7px] bg-ws-surface-sunken px-1.5 py-0.5 font-mono text-[11px] text-ws-ink-faint'>
          {task.code}
        </span>
      )}

      <div className='h-px bg-ws-line' />

      <dl className='space-y-2.5'>
        <PanelField label='Phụ trách'>
          {task.relatedUsers && task.relatedUsers.length > 0 ? (
            <div className='flex items-center -space-x-[7px]'>
              {task.relatedUsers.slice(0, 4).map((a) => (
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
              {task.relatedUsers.length > 4 && (
                <span className='flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-ws-surface bg-ws-surface-sunken text-[10px] font-bold text-ws-ink-soft'>
                  +{task.relatedUsers.length - 4}
                </span>
              )}
            </div>
          ) : (
            <span className='text-ws-ink-ghost'>—</span>
          )}
        </PanelField>

        <PanelField label='Hạn'>
          {task.dueDate
            ? format(new Date(task.dueDate), 'dd/MM/yyyy', { locale: vi })
            : '—'}
        </PanelField>

        {/* Mức "Trung bình" HIỆN ở đây: là giá trị của một ô có nhãn sẵn. */}
        <PanelField label='Ưu tiên'>
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
        </PanelField>

        <PanelField label='Tiến độ'>
          {totalItems > 0 ? `${doneItems}/${totalItems} việc con` : '—'}
        </PanelField>

        <PanelField label='Thẻ'>
          <span className='flex flex-wrap gap-1'>
            <span className='rounded-sm bg-ws-surface-sunken px-1.5 py-0.5 text-[10px] font-bold text-ws-ink-soft'>
              {TASK_TYPE_CONFIG[task.type].shortLabel}
            </span>
            {task.category && (
              <span className='rounded-sm bg-ws-surface-sunken px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-tight text-ws-ink-soft'>
                {COOPERATION_CATEGORY_LABEL_VI[task.category]}
              </span>
            )}
            {task.onBehalfName && (
              <span className='rounded-sm bg-ws-surface-sunken px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-tight text-ws-ink-soft'>
                Thay: {task.onBehalfName}
              </span>
            )}
          </span>
        </PanelField>
      </dl>

      <div className='h-px bg-ws-line' />

      <div className='space-y-2'>
        <p className='text-[12.5px] font-semibold text-ws-ink-soft'>
          Chuyển sang…
        </p>
        <div className='flex flex-wrap gap-1.5'>
          {MOVE_TO_ORDER.map((status) => {
            const isCurrent = status === task.status;
            const visual = TASK_STATUS_CONFIG[status];
            return (
              <button
                key={status}
                type='button'
                disabled={isCurrent}
                onClick={() => onChangeStatus(status)}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
                  isCurrent
                    ? cn(visual.bg, visual.color, 'cursor-default')
                    : 'border border-ws-line bg-ws-surface-alt text-ws-ink-soft hover:bg-ws-surface-sunken hover:text-ws-ink',
                )}
              >
                {visual.label}
              </button>
            );
          })}
        </div>
      </div>

      <span className='flex-1' />

      <button
        type='button'
        onClick={onOpenFull}
        className='rounded-xl border border-ws-line bg-ws-surface-alt px-3 py-2.5 text-left text-[12.5px] text-ws-ink-soft transition-colors hover:border-ws-line-strong hover:text-ws-ink'
      >
        {commentCount} bình luận · {attachmentCount} đính kèm
        <span className='mt-0.5 block text-[11px] text-ws-ink-faint'>
          Mở chi tiết đầy đủ để bình luận, sửa việc con và tệp
        </span>
      </button>
    </aside>
  );
}

function PanelField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className='flex items-start gap-2'>
      <dt className='w-24 shrink-0 pt-0.5 text-[12.5px] text-ws-ink-faint'>
        {label}
      </dt>
      <dd className='min-w-0 flex-1 text-[13px] font-semibold text-ws-ink'>
        {children}
      </dd>
    </div>
  );
}
