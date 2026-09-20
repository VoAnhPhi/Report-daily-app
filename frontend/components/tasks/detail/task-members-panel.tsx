'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, TaskAssignmentStatus, TaskMember } from '@/types/task.type';
import { useSharedTasks, useTaskMembers } from '@/hooks/queries/task-queries';
import { useOptimizedInfiniteScroll } from '@/hooks/use-optimized-infinite-scroll';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskRow } from '../shared/task-row';

/** Số dòng skeleton hiển thị khi đang tải danh sách. */
const SKELETON_ROWS = 3;

interface TaskMembersPanelProps {
  taskId: string;
  /** Mở một việc chung — modal đổi nội dung tại chỗ. */
  onOpenTask: (taskId: string) => void;
}

/** Avatar tròn, rơi về chữ cái đầu khi không có ảnh. */
function MemberAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={36}
        height={36}
        loading='lazy'
        className='w-9 h-9 rounded-full object-cover shrink-0'
      />
    );
  }
  return (
    <div className='w-9 h-9 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center text-xs font-bold shrink-0'>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function MemberRow({
  member,
  onSelect,
}: {
  member: TaskMember;
  onSelect: () => void;
}) {
  // Chỉ chung mỗi việc đang mở thì không có gì để xem thêm.
  const disabled = member.sharedCount === 0;

  return (
    <button
      type='button'
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors',
        disabled
          ? 'border-zinc-100 bg-white cursor-default opacity-60'
          : 'border-zinc-100 bg-white hover:border-zinc-200 hover:bg-zinc-50',
      )}
    >
      <MemberAvatar
        name={member.user.fullName}
        avatarUrl={member.user.avatarUrl}
      />

      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-1.5 flex-wrap'>
          <span className='text-sm font-semibold text-zinc-700 truncate'>
            {member.user.fullName}
          </span>
          {member.isMainAssignee && (
            <span className='text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600'>
              Phụ trách
            </span>
          )}
          {member.user.status === TaskAssignmentStatus.PENDING && (
            <span className='text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600'>
              Chờ tham gia
            </span>
          )}
        </div>
        <span className='text-xs text-zinc-400'>
          {member.sharedCount} việc chung
        </span>
      </div>

      {!disabled && <ChevronRight className='w-4 h-4 text-zinc-300 shrink-0' />}
    </button>
  );
}

/** Danh sách việc mà cả người xem và `member` cùng tham gia. */
function SharedTaskList({
  member,
  onBack,
  onOpenTask,
}: {
  member: TaskMember;
  onBack: () => void;
  onOpenTask: (taskId: string) => void;
}) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSharedTasks(member.user.id);

  const tasks: Task[] = data?.pages.flatMap((page) => page.data) ?? [];

  // Chạm phần tử canh cuối → tải trang kế. Danh sách này cuộn xuống, không cuộn lên.
  const { lastElementRef } = useOptimizedInfiniteScroll({
    hasMore: !!hasNextPage,
    loading: isFetchingNextPage,
    onLoadMore: fetchNextPage,
    rootMargin: '300px',
  });

  return (
    <div className='flex flex-col min-h-0 flex-1'>
      <button
        type='button'
        onClick={onBack}
        className='flex items-center gap-2 px-6 py-3 border-b border-zinc-100 bg-white shrink-0 text-left hover:bg-zinc-50 transition-colors'
      >
        <ChevronLeft className='w-4 h-4 text-zinc-500 shrink-0' />
        <MemberAvatar
          name={member.user.fullName}
          avatarUrl={member.user.avatarUrl}
        />
        <span className='text-sm font-semibold text-zinc-700 truncate'>
          {member.user.fullName}
        </span>
      </button>

      <div className='ws-scroll flex-1 overflow-y-auto p-4 space-y-3'>
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className='h-24 w-full rounded-xl' />
            ))}
          </>
        ) : tasks.length === 0 ? (
          <p className='text-center text-xs text-zinc-400 py-10'>
            Không có việc chung nào
          </p>
        ) : (
          <>
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                showTypeTag
                onClick={() => onOpenTask(task.id)}
                // Ghim không thuộc luồng này — nuốt sự kiện để khỏi mở việc.
                onTogglePin={(e) => e.stopPropagation()}
              />
            ))}

            {/* `TaskRow` không forward ref, nên đặt mốc quan sát ở cuối danh sách. */}
            {hasNextPage && (
              <div ref={lastElementRef} className='flex justify-center py-4'>
                {isFetchingNextPage && (
                  <Loader2 className='w-5 h-5 animate-spin text-zinc-400' />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Tab "Thành viên" của chi tiết công việc: ai đang trong việc này, và tôi đã làm
 * chung bao nhiêu việc với từng người. Bấm một người ra danh sách việc chung.
 */
export function TaskMembersPanel({
  taskId,
  onOpenTask,
}: TaskMembersPanelProps) {
  const [selected, setSelected] = useState<TaskMember | null>(null);
  const { data: members, isLoading } = useTaskMembers(taskId);

  if (selected) {
    return (
      <SharedTaskList
        member={selected}
        onBack={() => setSelected(null)}
        onOpenTask={onOpenTask}
      />
    );
  }

  return (
    <div className='flex flex-col min-h-0 flex-1'>
      {/* min-h-8 khớp chiều cao nút lọc h-8 ở header tab Nhận xét, kẻo đổi tab bị nhảy. */}
      <div className='sticky top-0 z-20 p-6 pb-4 border-b border-zinc-100 dark:border-slate-700 flex items-center shrink-0 bg-white dark:bg-slate-800'>
        <div className='flex items-center gap-2 min-w-0 min-h-8'>
          <Users className='w-4 h-4 text-zinc-500 shrink-0' />
          <h3 className='text-sm font-bold text-zinc-600 uppercase truncate'>
            Thành viên
          </h3>
        </div>
      </div>

      <div className='ws-scroll flex-1 overflow-y-auto p-4 space-y-2'>
        {isLoading ? (
          <>
            {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <Skeleton key={i} className='h-[60px] w-full rounded-xl' />
            ))}
          </>
        ) : !members || members.length === 0 ? (
          <p className='text-center text-xs text-zinc-400 py-10'>
            Chưa có thành viên nào khác
          </p>
        ) : (
          members.map((member) => (
            <MemberRow
              key={member.user.id}
              member={member}
              onSelect={() => setSelected(member)}
            />
          ))
        )}
      </div>
    </div>
  );
}
