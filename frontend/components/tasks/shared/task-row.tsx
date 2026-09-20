'use client';

import Image from 'next/image';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  AlignLeft,
  Calendar,
  Clock,
  ListTodo,
  Paperclip,
  Pin,
  PinOff,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Task,
  TaskAssignmentStatus,
  TaskStatus,
  TaskType,
} from '@/types/task.type';
import {
  COOPERATION_CATEGORY_LABEL_VI,
  getAvatarPalette,
  getTaskChecklistProgress,
  TASK_PRIORITY_CONFIG,
  TASK_STATUS_CONFIG,
  TASK_TYPE_CONFIG,
} from '@/components/tasks/task-utils';
import { TaskMoveMenu } from './task-move-menu';

/**
 * Thẻ việc dạng dòng dọc. Dùng ở hai chỗ: bảng tính khi màn hẹp hơn 768px
 * (lưới 8 cột không vừa), và panel Thành viên bên trong `TaskDetailModal`.
 *
 * Để riêng file vì `TaskDetailModal` cũng cần nó — gộp vào view sẽ thành vòng
 * lặp import.
 */
export function TaskRow({
  task,
  showTypeTag,
  onClick,
  onTogglePin,
  onMove,
}: {
  task: Task;
  showTypeTag?: boolean;
  onClick: () => void;
  onTogglePin: (e: React.MouseEvent, task: Task) => void;
  /**
   * Đổi trạng thái từ dòng. Dưới 768px không có bảng cột nên đây là con đường
   * DUY NHẤT — thiếu nó người dùng điện thoại phải mở modal chi tiết mới đổi được.
   */
  onMove?: (next: TaskStatus) => void;
}) {
  const { totalItems, doneItems } = getTaskChecklistProgress(task.items);
  const companyName = task.businessForm?.companyName;
  const isPartner = task.type === TaskType.PARTNER_TASK;
  const typeVisual = TASK_TYPE_CONFIG[task.type];
  const priorityVisual = task.priority
    ? TASK_PRIORITY_CONFIG[task.priority]
    : null;

  return (
    <button
      type='button'
      onClick={(e) => {
        e.currentTarget.blur();
        onClick();
      }}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl border border-ws-line bg-ws-surface px-3.5 py-3 text-left shadow-ws-rest transition-all hover:border-ws-line-strong hover:shadow-ws-raised active:scale-[0.99] border-l-[3px]',
      )}
      style={{
        // Màu vạch trái = trạng thái, kiểu nét = loại việc (luật 3). Tailwind
        // không có utility đặt border-style theo từng cạnh nên phải qua style.
        borderLeftColor: TASK_STATUS_CONFIG[task.status].edge,
        borderLeftStyle: typeVisual.borderStyle,
      }}
    >
      <div className='min-w-0 flex-1 space-y-1'>
        <div className='flex flex-wrap items-center gap-2 gap-y-1'>
          {isPartner && (companyName || task.businessFormId) && (
            <span
              className='text-[10px] font-bold uppercase text-ws-ink-faint line-clamp-1 max-w-[140px]'
              title={companyName}
            >
              {companyName || `Form #${task.businessFormId?.slice(-4)}`}
            </span>
          )}
          {showTypeTag && (
            <span
              className={cn(
                'text-[9px] font-bold px-1.5 py-0.5 rounded-sm shrink-0',
                typeVisual.badge,
              )}
            >
              {typeVisual.shortLabel}
            </span>
          )}
          {/* Mức "Trung bình" là mặc định — không hiện chip trên dòng (luật 2). */}
          {priorityVisual && !priorityVisual.hiddenOnCard && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-tight border shrink-0',
                priorityVisual.badge,
              )}
            >
              {(() => {
                const PriorityIcon = priorityVisual.icon;
                return <PriorityIcon className='w-2.5 h-2.5' aria-hidden />;
              })()}
              {priorityVisual.label}
            </span>
          )}
          {task.myAssignmentStatus === TaskAssignmentStatus.PENDING && (
            <span className='inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-ws-pending-bg text-ws-pending-fg uppercase tracking-tight ring-1 ring-ws-line shrink-0'>
              <Clock className='w-2.5 h-2.5' />
              Chờ tham gia
            </span>
          )}
          {/* "Admin giao" đổi từ chip màu sang icon — bớt một hue khỏi dòng. */}
          {task.createdByAdmin && (
            <Shield
              className='w-3 h-3 shrink-0 text-ws-ink-ghost'
              aria-label='Việc do quản trị viên giao'
            />
          )}
          {task.category && (
            <span className='text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-ws-surface-sunken text-ws-ink-soft uppercase tracking-tight shrink-0 max-w-[140px] truncate'>
              {COOPERATION_CATEGORY_LABEL_VI[task.category]}
            </span>
          )}
          {task.onBehalfName && (
            <span className='text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-ws-surface-sunken text-ws-ink-soft uppercase tracking-tight shrink-0 max-w-[140px] truncate'>
              Thay: {task.onBehalfName}
            </span>
          )}
        </div>

        <h4 className='font-semibold text-sm text-ws-ink leading-snug break-words'>
          {task.title}
        </h4>

        <div className='flex items-center gap-3 pt-0.5'>
          {task.description && (
            <AlignLeft className='w-3.5 h-3.5 text-ws-ink-ghost' />
          )}
          {task.attachments && task.attachments.length > 0 && (
            <Paperclip className='w-3.5 h-3.5 text-ws-ink-ghost' />
          )}
          {totalItems > 0 && (
            <span
              className={cn(
                'flex items-center gap-1 text-[11px] font-semibold tabular-nums',
                doneItems === totalItems
                  ? 'text-ws-done-fg'
                  : 'text-ws-ink-faint',
              )}
            >
              <ListTodo className='w-3.5 h-3.5' />
              {doneItems}/{totalItems}
            </span>
          )}
          {task.dueDate && (
            <span className='flex items-center gap-1 text-[11px] font-medium text-ws-ink-faint'>
              <Calendar className='w-3.5 h-3.5' />
              {format(new Date(task.dueDate), 'dd/MM', { locale: vi })}
            </span>
          )}
        </div>
      </div>

      {task.relatedUsers && task.relatedUsers.length > 0 && (
        <div
          className='flex items-center -space-x-1.5 shrink-0'
          title={task.relatedUsers.map((a) => a.fullName).join(', ')}
        >
          {task.relatedUsers.slice(0, 3).map((a) => (
            <span
              key={a.id}
              className={cn(
                'w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-ws-surface overflow-hidden',
                getAvatarPalette(a.id),
              )}
              title={a.fullName}
            >
              {a.avatarUrl ? (
                <Image
                  src={a.avatarUrl}
                  alt={a.fullName}
                  width={24}
                  height={24}
                  className='w-full h-full object-cover'
                />
              ) : (
                a.fullName.charAt(0).toUpperCase()
              )}
            </span>
          ))}
          {task.relatedUsers.length > 3 && (
            <span className='w-6 h-6 rounded-full bg-ws-surface-sunken text-ws-ink-soft text-[10px] font-bold flex items-center justify-center border-2 border-ws-surface'>
              +{task.relatedUsers.length - 3}
            </span>
          )}
        </div>
      )}

      <span
        role='button'
        tabIndex={0}
        onClick={(e) => onTogglePin(e, task)}
        title={task.isPinnedByMe ? 'Bỏ ghim' : 'Ghim (chỉ mình bạn thấy)'}
        className={cn(
          'shrink-0 p-1.5 rounded-md transition-all cursor-pointer hover:bg-ws-surface-sunken',
          task.isPinnedByMe
            ? 'text-ws-accent'
            : 'text-ws-ink-ghost hover:text-ws-accent',
        )}
      >
        {task.isPinnedByMe ? (
          <PinOff className='w-4 h-4' />
        ) : (
          <Pin className='w-4 h-4' />
        )}
      </span>

      {onMove && <TaskMoveMenu currentStatus={task.status} onMove={onMove} />}
    </button>
  );
}
