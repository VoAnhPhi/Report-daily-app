'use client';

import { Check, ChevronDown, Loader2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Session } from 'next-auth';
import {
  TaskActivity,
  TaskActivityFilter,
  TaskAttachment,
  TaskStatus,
} from '@/types/task.type';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ActivityItem } from './activity-item';

/** Nhãn của từng chế độ lọc, dùng cho cả nút và dòng "chưa có gì". */
const FILTER_META: Record<
  TaskActivityFilter,
  { label: string; empty: string }
> = {
  [TaskActivityFilter.ALL]: {
    label: 'Tất cả',
    empty: 'Chưa có hoạt động nào',
  },
  [TaskActivityFilter.COMMENT]: {
    label: 'Nhận xét',
    empty: 'Chưa có nhận xét nào',
  },
  [TaskActivityFilter.LOG]: {
    label: 'Hoạt động',
    empty: 'Chưa có hoạt động nào',
  },
};

const FILTER_ORDER = [
  TaskActivityFilter.ALL,
  TaskActivityFilter.COMMENT,
  TaskActivityFilter.LOG,
] as const;

/** Cấu hình hiển thị trạng thái (chỉ cần nhãn + màu để ActivityItem vẽ chip đổi trạng thái). */
type StatusVisual = Record<TaskStatus, { label: string; color: string }>;

interface TaskActivityFeedProps {
  isDesktop: boolean;
  activityFilter: TaskActivityFilter;
  onActivityFilterChange: (filter: TaskActivityFilter) => void;
  isLoadingActivities: boolean;
  /** Hoạt động đã đảo ngược (cũ → mới) để render từ trên xuống. */
  orderedActivities: TaskActivity[];
  isFetchingNextPage: boolean;
  session: Session | null;
  isTrashed: boolean;
  /** Ref cuộn — dùng để auto-scroll xuống tin mới nhất. */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** Ref phần tử đầu (cũ nhất) — chạm tới thì tải thêm tin cũ hơn. */
  lastElementRef: (node: HTMLDivElement | null) => void;
  onReply: (activity: TaskActivity) => void;
  onMediaClick: (attachments: TaskAttachment[], index: number) => void;
  onUpdateComment: (activityId: string, message: string) => Promise<void>;
  onDeleteComment: (activityId: string) => Promise<void>;
  participants: Record<string, string>;
  statusConfig: StatusVisual;
  /** Khu soạn nhận xét — truyền sẵn để tránh khoan ~13 prop qua đây. */
  composer: React.ReactNode;
}

/**
 * Cột phải của modal chi tiết: timeline hoạt động/nhận xét (vô hạn cuộn lên để
 * tải tin cũ) + khu soạn nhận xét gắn dưới đáy. Tách khỏi modal để gọn phần form.
 */
export function TaskActivityFeed({
  isDesktop,
  activityFilter,
  onActivityFilterChange,
  isLoadingActivities,
  orderedActivities,
  isFetchingNextPage,
  session,
  isTrashed,
  scrollRef,
  lastElementRef,
  onReply,
  onMediaClick,
  onUpdateComment,
  onDeleteComment,
  participants,
  statusConfig,
  composer,
}: TaskActivityFeedProps) {
  return (
    // Khung cột (chiều rộng, nền, ẩn/hiện) do modal giữ — đây chỉ là ruột của tab.
    <div className='flex-1 flex flex-col min-h-0'>
      <div className='sticky top-0 z-20 p-6 pb-4 border-b border-zinc-100 dark:border-slate-700 flex items-center justify-between shrink-0 bg-white dark:bg-slate-800'>
        <div className='flex items-center gap-2 min-w-0'>
          <MessageSquare className='w-4 h-4 text-zinc-500 shrink-0' />
          <h3 className='text-sm font-bold text-zinc-600 uppercase truncate'>
            Nhận xét và hoạt động
          </h3>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='outline'
              size='sm'
              className='h-8 shrink-0 gap-1 rounded-lg text-xs font-medium'
            >
              {FILTER_META[activityFilter].label}
              <ChevronDown className='w-3.5 h-3.5' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='ws-scope min-w-[9rem]'>
            {FILTER_ORDER.map((value) => (
              <DropdownMenuItem
                key={value}
                onSelect={() => onActivityFilterChange(value)}
                className='text-xs gap-2'
              >
                <Check
                  className={cn(
                    'w-3.5 h-3.5',
                    value === activityFilter ? 'opacity-100' : 'opacity-0',
                  )}
                />
                {FILTER_META[value].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className='flex-1 flex flex-col min-h-0 relative'>
        <div
          ref={scrollRef}
          className={cn(
            'ws-scroll flex-1 p-6 pb-10 space-y-6 bg-ws-surface-alt/40',
            isDesktop ? 'overflow-y-auto' : 'overflow-visible',
          )}
        >
          {isLoadingActivities ? (
            <div className='space-y-6'>
              {[1, 2, 3].map((i) => (
                <div key={i} className='flex gap-4'>
                  <div className='w-8 h-8 rounded-full bg-zinc-200 animate-pulse shrink-0' />
                  <div className='flex-1 space-y-2'>
                    <div className='h-3 w-24 bg-zinc-200 animate-pulse rounded' />
                    <div className='h-10 w-full bg-zinc-200 animate-pulse rounded-xl' />
                  </div>
                </div>
              ))}
            </div>
          ) : orderedActivities.length === 0 ? (
            <div className='h-full flex flex-col items-center justify-center text-zinc-400 space-y-2 opacity-60'>
              <MessageSquare className='w-8 h-8 stroke-[1.5]' />
              <p className='text-[11px] font-bold uppercase tracking-widest text-center'>
                {FILTER_META[activityFilter].empty}
              </p>
            </div>
          ) : (
            <div className='relative space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-zinc-200'>
              {/* Tải thêm tin cũ hơn khi cuộn lên đầu */}
              {isFetchingNextPage && (
                <div className='flex justify-center py-4'>
                  <Loader2 className='w-5 h-5 animate-spin text-zinc-400' />
                </div>
              )}
              {orderedActivities.map((activity, idx) => (
                <ActivityItem
                  key={activity.id || idx}
                  activity={activity}
                  session={session}
                  onReply={onReply}
                  onMediaClick={onMediaClick}
                  onUpdate={onUpdateComment}
                  onDelete={onDeleteComment}
                  participants={participants}
                  statusConfig={statusConfig}
                  readOnly={isTrashed}
                  ref={idx === 0 ? lastElementRef : null}
                />
              ))}
            </div>
          )}
        </div>

        <div className='flex flex-col shrink-0 sticky bottom-0 z-20 border-t border-zinc-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.03)]'>
          {isTrashed ? null : composer}
        </div>
      </div>
    </div>
  );
}
