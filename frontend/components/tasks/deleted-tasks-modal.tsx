'use client';

import { useState } from 'react';
import { useEffectiveUserId } from '@/contexts/caregiver-context';
import ResponsiveModal from '@/components/modals/responsive-modal';
import { useDeletedTasks, useRestoreTask } from '@/hooks/queries/task-queries';
import { TaskDetailModal } from './task-detail-modal';
import { Task, TaskStatus } from '@/types/task.type';
import { COOPERATION_CATEGORY_LABEL_VI } from '@/components/tasks/task-utils';
import { Trash2, Loader2, Briefcase, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// Phím kích hoạt hàng việc bằng bàn phím (a11y).
const ENTER = 'Enter';
const SPACE = ' ';

const STATUS_META: Record<TaskStatus, { label: string; cls: string }> = {
  [TaskStatus.PENDING]: {
    label: 'Chờ xử lý',
    cls: 'bg-zinc-100 text-zinc-600',
  },
  [TaskStatus.IN_PROGRESS]: {
    label: 'Đang làm',
    cls: 'bg-blue-50 text-blue-600',
  },
  [TaskStatus.DONE]: {
    label: 'Hoàn thành',
    cls: 'bg-emerald-50 text-emerald-600',
  },
  [TaskStatus.CANCELLED]: { label: 'Đã hủy', cls: 'bg-rose-50 text-rose-600' },
};

export function DeletedTasksModal({ isOpen, onClose }: Props) {
  const currentUserId = useEffectiveUserId();
  const { data: tasks, isLoading } = useDeletedTasks(isOpen);
  const {
    mutate: restoreTask,
    isPending: isRestoring,
    variables: restoringId,
  } = useRestoreTask();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Chỉ người tạo việc mới khôi phục được (việc admin giao có createdById = admin nên tự loại).
  const canRestore = (task: Task) =>
    !!currentUserId && task.createdById === currentUserId;

  return (
    <>
      <ResponsiveModal
        className='ws-scope'
      overlayClassName='bg-ws-overlay'
        open={isOpen}
        onOpenChange={(o) => !o && onClose()}
        maxWidth='sm:max-w-lg lg:max-w-2xl'
        scrollable={false}
      >
        <div className='flex flex-col max-h-[90vh]'>
          <div className='flex items-center gap-2 p-5 border-b border-zinc-100 shrink-0'>
            <Trash2 className='w-5 h-5 text-zinc-500' />
            <div>
              <h2 className='text-sm font-semibold text-zinc-900'>
                Việc đã xóa
              </h2>
              <p className='text-xs text-zinc-500'>
                Mở để xem chi tiết và khôi phục
              </p>
            </div>
          </div>

          <div className='flex-1 min-h-0 overflow-y-auto p-3 ws-scroll'>
            {isLoading ? (
              <div className='flex items-center justify-center py-16 text-zinc-400'>
                <Loader2 className='w-5 h-5 animate-spin' />
              </div>
            ) : !tasks || tasks.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-16 text-center'>
                <Trash2 className='w-8 h-8 text-zinc-300 mb-2' />
                <p className='text-sm text-zinc-500'>Thùng rác trống</p>
              </div>
            ) : (
              <div className='space-y-1.5'>
                {tasks.map((task) => {
                  const meta = STATUS_META[task.status];
                  return (
                    <div
                      key={task.id}
                      role='button'
                      tabIndex={0}
                      onClick={() => setSelectedTask(task)}
                      onKeyDown={(e) => {
                        if (e.key === ENTER || e.key === SPACE) {
                          e.preventDefault();
                          setSelectedTask(task);
                        }
                      }}
                      className='group flex w-full cursor-pointer items-center gap-3 rounded-lg border border-zinc-100 bg-white p-3 text-left transition-colors hover:bg-zinc-50 hover:border-zinc-200'
                    >
                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-sm font-semibold text-zinc-800'>
                          {task.title}
                        </p>
                        <div className='mt-1 flex flex-wrap items-center gap-1.5'>
                          {meta && (
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.5 text-[10px] font-bold',
                                meta.cls,
                              )}
                            >
                              {meta.label}
                            </span>
                          )}
                          {task.category && (
                            <span className='rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-600'>
                              {COOPERATION_CATEGORY_LABEL_VI[task.category] ??
                                task.category}
                            </span>
                          )}
                          {task.businessForm && (
                            <span className='flex items-center gap-1 text-[10px] text-zinc-500'>
                              <Briefcase className='w-3 h-3' />{' '}
                              {task.businessForm.companyName}
                            </span>
                          )}
                        </div>
                      </div>
                      {canRestore(task) ? (
                        <Button
                          type='button'
                          size='sm'
                          onClick={(e) => {
                            e.stopPropagation();
                            restoreTask(task.id);
                          }}
                          disabled={isRestoring && restoringId === task.id}
                          className='h-8 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold'
                        >
                          {isRestoring && restoringId === task.id ? (
                            <Loader2 className='w-3.5 h-3.5 animate-spin' />
                          ) : (
                            <>
                              <RotateCcw className='w-3.5 h-3.5 mr-1.5' /> Khôi
                              phục
                            </>
                          )}
                        </Button>
                      ) : task.createdByAdmin ? (
                        <span className='shrink-0 rounded bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700'>
                          Admin giao
                        </span>
                      ) : (
                        <span className='shrink-0 text-[10px] font-medium text-zinc-400'>
                          Người khác tạo
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ResponsiveModal>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  );
}
