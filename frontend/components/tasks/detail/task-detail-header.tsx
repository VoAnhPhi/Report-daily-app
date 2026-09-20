'use client';

import {
  ArrowLeft,
  Briefcase,
  Pin,
  PinOff,
  Share2,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Task } from '@/types/task.type';
import {
  TASK_TYPE_CONFIG,
  TASK_PRIORITY_CONFIG,
  TASK_STATUS_CONFIG,
} from '@/components/tasks/task-utils';

/**
 * Đầu (sticky header) của cột chi tiết công việc: nút quay lại, mã việc, các
 * badge (loại/admin/ưu tiên), tiêu đề, hồ sơ đối tác, và cụm nút ghim/chia
 * sẻ/trạng thái/ẩn-hiện thảo luận. Thuần hiển thị — mọi hành vi qua props.
 */
interface TaskDetailHeaderProps {
  task: Task;
  canGoBack: boolean;
  onGoBack: () => void;
  onCopyCode: (code: string) => void;
  isTrashed: boolean;
  isPinBusy: boolean;
  onTogglePin: () => void;
  onCopyShareLink: () => void;
  isDesktop: boolean;
  showActivities: boolean;
  onToggleActivities: () => void;
}

export function TaskDetailHeader({
  task,
  canGoBack,
  onGoBack,
  onCopyCode,
  isTrashed,
  isPinBusy,
  onTogglePin,
  onCopyShareLink,
  isDesktop,
  showActivities,
  onToggleActivities,
}: TaskDetailHeaderProps) {
  return (
    <div className='sticky top-0 z-10 bg-white p-6 pb-4 border-b border-gray-100 shrink-0 shadow-sm lg:shadow-none'>
      <div className='flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between'>
        <div className='space-y-1 min-w-0 order-2 lg:order-1'>
          <div className='flex flex-wrap items-center gap-2 gap-y-1.5 mb-1.5'>
            {canGoBack && (
              <button
                type='button'
                onClick={onGoBack}
                className='inline-flex items-center gap-1 h-6 rounded-md border border-zinc-200 bg-white px-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50'
              >
                <ArrowLeft className='w-3.5 h-3.5' />
                Quay lại
              </button>
            )}
            {/* Mã: desktop hiện cạnh badge; mobile hiện ở hàng nút phía trên. */}
            {task.code && (
              <button
                type='button'
                title='Sao chép mã công việc'
                onClick={() => onCopyCode(task.code!)}
                className='hidden lg:inline-flex items-center h-6 rounded-md border border-ws-line bg-ws-surface-alt px-2 font-mono text-xs font-semibold text-ws-ink-soft hover:bg-ws-surface-sunken'
              >
                {task.code}
              </button>
            )}
            <Badge
              variant='outline'
              className={cn(
                'text-xs font-semibold px-2.5 py-0.5 h-6 border-none',
                TASK_TYPE_CONFIG[task.type].badge,
              )}
            >
              {TASK_TYPE_CONFIG[task.type].label}
            </Badge>
            {task.createdByAdmin && (
              <Badge
                variant='outline'
                className='text-xs font-semibold px-2.5 py-0.5 h-6 border-none bg-violet-50 text-violet-700'
              >
                Admin giao
              </Badge>
            )}
            {task.priority && (
              <Badge
                variant='outline'
                className={cn(
                  'text-xs font-semibold px-2.5 py-0.5 h-6 gap-1',
                  TASK_PRIORITY_CONFIG[task.priority].badge,
                )}
              >
                {(() => {
                  const Icon = TASK_PRIORITY_CONFIG[task.priority].icon;
                  return <Icon className='w-3 h-3' />;
                })()}
                {TASK_PRIORITY_CONFIG[task.priority].label}
              </Badge>
            )}
            {task.onBehalfName && (
              <Badge
                variant='outline'
                className='text-xs font-semibold px-2.5 py-0.5 h-6 border-none bg-amber-50 text-amber-700'
              >
                Thay cho {task.onBehalfName}
              </Badge>
            )}
          </div>
          <h2 className='text-xl font-bold text-gray-900 leading-none'>
            Chi tiết công việc
          </h2>
          {task.businessFormId && (
            <div className='flex items-center gap-1.5 text-sm font-medium text-gray-500 pt-1 min-w-0'>
              <Briefcase className='w-4 h-4 text-gray-400 shrink-0' />
              <span className='truncate'>
                {task.businessForm?.companyName ||
                  `Hồ sơ #${task.businessFormId.slice(-4)}`}
              </span>
            </div>
          )}
        </div>
        <div className='flex flex-wrap items-center gap-2 shrink-0 order-1 lg:order-2'>
          {/* Mã (chỉ mobile) đứng cùng dòng với nút ghim / chia sẻ. */}
          {task.code && (
            <button
              type='button'
              title='Sao chép mã công việc'
              onClick={() => onCopyCode(task.code!)}
              className='inline-flex lg:hidden items-center h-6 rounded-md border border-ws-line bg-ws-surface-alt px-2 font-mono text-xs font-semibold text-ws-ink-soft hover:bg-ws-surface-sunken'
            >
              {task.code}
            </button>
          )}
          {!isTrashed && (
            <Button
              type='button'
              size='sm'
              variant='outline'
              className={cn(
                'h-7 w-7 px-0 text-xs font-bold',
                task.isPinnedByMe
                  ? 'border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100'
                  : 'border-zinc-200 text-zinc-500',
              )}
              title={
                task.isPinnedByMe
                  ? 'Bỏ ghim (chỉ mình bạn thấy ghim này)'
                  : 'Ghim công việc (chỉ mình bạn thấy)'
              }
              disabled={isPinBusy}
              onClick={onTogglePin}
            >
              {task.isPinnedByMe ? (
                <PinOff className='w-3.5 h-3.5' />
              ) : (
                <Pin className='w-3.5 h-3.5' />
              )}
            </Button>
          )}
          {!isTrashed && (
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-7 w-7 px-0 sm:w-auto sm:px-2.5 text-xs font-bold border-zinc-200'
              title='Sao chép link chia sẻ — người có quyền (tạo/phụ trách/hỗ trợ) bấm vào sẽ xem được công việc'
              onClick={onCopyShareLink}
            >
              <Share2 className='w-3.5 h-3.5 sm:mr-1.5' />
              <span className='hidden sm:inline'>Chia sẻ</span>
            </Button>
          )}
          <div
            className={cn(
              'flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200',
              TASK_STATUS_CONFIG[task.status].color,
            )}
          >
            {(() => {
              const ConfigIcon = TASK_STATUS_CONFIG[task.status].icon;
              return <ConfigIcon className='w-3.5 h-3.5' />;
            })()}
            {TASK_STATUS_CONFIG[task.status].label}
          </div>
          {isDesktop && (
            <Button
              variant='ghost'
              size='icon'
              className={cn(
                'h-8 w-8 rounded-lg transition-colors',
                showActivities
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                  : 'text-zinc-400 hover:bg-zinc-100',
              )}
              onClick={onToggleActivities}
              title={showActivities ? 'Ẩn thảo luận' : 'Hiện thảo luận'}
            >
              <MessageSquare className='w-4 h-4' />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
