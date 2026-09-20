'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Task, TaskStatus } from '@/types/task.type';
import { GetTasksQuery } from '@/app/api/tasks';
import { getTaskColumnData } from '@/components/tasks/task-utils';
import {
  useMyPinnedTasks,
  useMyTasksInfinite,
} from '@/hooks/queries/task-queries';
import { useOptimizedInfiniteScroll } from '@/hooks/use-optimized-infinite-scroll';
import { TaskRow } from '../shared/task-row';
import { TaskStatusChip } from '../shared/task-status-chip';
import { SheetHeaderRow } from './sheet-header-row';
import { SheetRow } from './sheet-row';

export interface SheetStatusGroupProps {
  status: TaskStatus;
  baseQuery?: GetTasksQuery;
  showTypeTag: boolean;
  hasActiveFilter: boolean;
  defaultOpen: boolean;
  isMobile: boolean;
  selectedTaskId: string | null;
  onSelectTask: (task: Task) => void;
  onTogglePin: (e: React.MouseEvent, task: Task) => void;
  onComplete: (taskId: string) => void;
  onMoveTask: (id: string, next: TaskStatus, previous: TaskStatus) => void;
  onAddTask?: () => void;
  onClearFilters?: () => void;
}

/** Một nhóm trạng thái gập được, tự tải trang riêng như bảng cột. */
export function SheetStatusGroup({
  status,
  baseQuery,
  showTypeTag,
  hasActiveFilter,
  defaultOpen,
  isMobile,
  selectedTaskId,
  onSelectTask,
  onTogglePin,
  onComplete,
  onMoveTask,
  onAddTask,
  onClearFilters,
}: SheetStatusGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  const {
    data,
    isLoading,
    /* `isError` + `refetch`: dạng bảng (`board/task-column.tsx`) đã có nhánh lỗi
       từ trước, dạng danh sách này thì chưa — nên cùng một lỗi mạng cho ra hai
       màn hình khác hẳn nhau tuỳ người dùng đang bật dạng xem nào. */
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useMyTasksInfinite(status, baseQuery);
  const { data: pinned = [] } = useMyPinnedTasks(status, baseQuery);
  const { lastElementRef } = useOptimizedInfiniteScroll({
    hasMore: !!hasNextPage,
    loading: isFetchingNextPage,
    onLoadMore: fetchNextPage,
    enablePrefetch: false,
  });

  const { total, groups, isEmpty } = getTaskColumnData(data, pinned);

  const renderTask = (task: Task) =>
    isMobile ? (
      /* `px-3` cho khớp hàng tiêu đề nhóm trạng thái ngay trên (cũng `px-3`).
         Trước đây là `px-1`, nên ở khổ điện thoại mép trái của mọi thẻ việc so
         le 8px với tiêu đề nhóm suốt cả danh sách, và vạch trạng thái 3px bên
         trái thẻ gần như dính vào mép tấm. */
      <div key={task.id} className='px-3 py-1.5'>
        <TaskRow
          task={task}
          showTypeTag={showTypeTag}
          onClick={() => onSelectTask(task)}
          onTogglePin={onTogglePin}
          onMove={(next) => onMoveTask(task.id, next, task.status)}
        />
      </div>
    ) : (
      <SheetRow
        key={task.id}
        task={task}
        showTypeTag={showTypeTag}
        isSelected={selectedTaskId === task.id}
        onSelect={onSelectTask}
        onComplete={onComplete}
      />
    );

  return (
    <section className='mb-1'>
      <button
        type='button'
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        /* `w-full` là đủ — bề rộng do lớp bọc `w-max min-w-full` ở
           `TaskSheetView` chốt, nên 100% ở đây đã là bề rộng của cả bảng.
           Từng thử `w-max min-w-full` ngay tại nút này và nó VÔ HIỆU:
           `w-max` là max-content của chính nút (chevron + chip + số ≈ 156px),
           còn `min-w-full` tính theo `<section>` — mà section lúc đó chỉ rộng
           bằng vùng nhìn thấy. Mẹo đó chỉ chạy với phần tử tự nó đã rộng bằng
           bảng, tức các hàng lưới. */
        className='sticky top-0 z-20 flex h-11 w-full items-center gap-2 border-b border-ws-line bg-ws-surface-alt px-3 text-left'
      >
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-ws-ink-ghost transition-transform',
            !open && '-rotate-90',
          )}
        />
        <TaskStatusChip status={status} size='sm' />
        <span className='text-[12.5px] font-semibold tabular-nums text-ws-ink-faint'>
          {isLoading ? '—' : total > 999 ? '999+' : total}
        </span>
      </button>

      {open && (
        <>
          {!isMobile && <SheetHeaderRow />}
          {isLoading ? (
            <div className='space-y-1 p-2'>
              <Skeleton className='h-[52px] w-full rounded-[10px] bg-ws-surface-alt' />
              <Skeleton className='h-[52px] w-full rounded-[10px] bg-ws-surface-alt' />
            </div>
          ) : isError ? (
            /* Nhánh LỖI phải đứng TRƯỚC nhánh rỗng — cùng lý do đã ghi ở
               `board/task-column.tsx`: tải hỏng thì `data` là undefined nên
               `isEmpty` bật, và danh sách báo "Chưa có việc nào ở nhóm này"
               kèm lời mời "Thêm việc". Đó là một khẳng định SAI về chính công
               việc của người dùng, và lời mời kia còn dụ họ tạo lại thứ đang
               có sẵn. Đo thật: ép mọi request trả 500 rồi chờ 25 giây, cả bốn
               nhóm trạng thái đều báo rỗng, không một dấu hiệu lỗi nào.
               Nút Thử lại là lối thoát DUY NHẤT ngoài F5 — query client tắt
               hết refetch tự động. */
            <div className='flex flex-col items-center gap-2 py-8 text-center'>
              <AlertTriangle
                className='h-6 w-6 text-ws-ink-ghost'
                aria-hidden='true'
              />
              <b className='text-[13px] font-semibold'>
                Không tải được nhóm này.
              </b>
              <span className='text-[12.5px] text-ws-ink-faint'>
                Đây là lỗi kết nối, không phải nhóm không có việc.
              </span>
              <button
                type='button'
                onClick={() => void refetch()}
                className='rounded-md border border-ws-line bg-ws-surface px-2.5 py-1 text-xs font-semibold text-ws-ink-soft transition-colors hover:bg-ws-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ws-focus'
              >
                Thử lại
              </button>
            </div>
          ) : isEmpty ? (
            <div className='flex flex-col items-center gap-2 py-8 text-center'>
              <b className='text-[13px] font-semibold'>
                {hasActiveFilter
                  ? 'Không tìm thấy việc nào khớp.'
                  : 'Chưa có việc nào ở nhóm này.'}
              </b>
              <span className='text-[12.5px] text-ws-ink-faint'>
                {hasActiveFilter
                  ? 'Thử bỏ bớt bộ lọc hoặc xóa từ khóa.'
                  : 'Việc mới sẽ hiện ở đây.'}
              </span>
              {hasActiveFilter && onClearFilters ? (
                <button
                  type='button'
                  onClick={onClearFilters}
                  className='text-xs font-semibold text-ws-accent hover:underline'
                >
                  Xóa bộ lọc
                </button>
              ) : status === TaskStatus.PENDING && onAddTask ? (
                <button
                  type='button'
                  onClick={onAddTask}
                  className='text-xs font-semibold text-ws-accent hover:underline'
                >
                  Thêm việc
                </button>
              ) : null}
            </div>
          ) : (
            <>
              {pinned.map(renderTask)}
              {groups.map((group) => (
                <div key={group.key}>
                  <div className='flex h-7 items-center gap-2 px-3'>
                    <span className='text-[11px] font-semibold uppercase tracking-wide text-ws-ink-faint'>
                      {group.label}
                    </span>
                    <span className='text-[11px] tabular-nums text-ws-ink-ghost'>
                      {group.tasks.length}
                    </span>
                    <div className='h-px flex-1 bg-ws-line-soft' />
                  </div>
                  {group.tasks.map(renderTask)}
                </div>
              ))}
            </>
          )}
          {hasNextPage && (
            <div
              ref={lastElementRef}
              className='flex justify-center py-3 text-ws-ink-ghost'
            >
              {isFetchingNextPage && (
                <Loader2 className='h-4 w-4 animate-spin' />
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
