'use client';

import { TaskStatus } from '@/types/task.type';
import { AddTaskSlot } from './add-task-slot';

/**
 * Trạng thái rỗng đổi câu theo ngữ cảnh — một câu "Không có công việc" dùng
 * chung không giúp người dùng biết phải làm gì tiếp. Câu lấy từ trang hệ thống
 * thiết kế (bảng chốt ở `docs/features/task-workspace-ui/MASTER.md` mục 5).
 */
export const EMPTY_BY_STATUS: Record<TaskStatus, { head: string; sub?: string }> = {
  [TaskStatus.PENDING]: {
    head: 'Chưa có việc nào chờ xử lý.',
    sub: 'Việc mới sẽ rơi vào đây trước.',
  },
  [TaskStatus.IN_PROGRESS]: {
    head: 'Chưa bắt tay vào việc nào.',
    sub: 'Kéo một thẻ từ cột Chờ xử lý sang đây.',
  },
  [TaskStatus.DONE]: {
    head: 'Chưa có việc nào hoàn thành.',
    sub: 'Kéo một thẻ sang đây khi xong.',
  },
  [TaskStatus.CANCELLED]: { head: 'Không có việc nào bị hủy. Tốt.' },
};

export function EmptyColumn({
  status,
  hasActiveFilter,
  onAddTask,
  onClearFilters,
}: {
  status: TaskStatus;
  hasActiveFilter: boolean;
  onAddTask?: () => void;
  onClearFilters?: () => void;
}) {
  if (hasActiveFilter) {
    return (
      <div className='flex flex-col items-center gap-2 px-1.5 py-4 text-center'>
        <b className='text-[13px] font-semibold'>
          Không tìm thấy việc nào khớp.
        </b>
        <span className='text-[12.5px] leading-relaxed text-ws-ink-faint'>
          Thử bỏ bớt bộ lọc hoặc xóa từ khóa.
        </span>
        {onClearFilters && (
          <button
            type='button'
            onClick={onClearFilters}
            className='text-xs font-semibold text-ws-accent hover:underline'
          >
            Xóa bộ lọc
          </button>
        )}
      </div>
    );
  }

  const copy = EMPTY_BY_STATUS[status];
  return (
    <div className='flex flex-col gap-3'>
      <div className='px-1.5 py-4 text-center'>
        <b className='block text-[13px] font-semibold'>{copy.head}</b>
        {copy.sub && (
          <span className='mt-1 block text-[12.5px] leading-relaxed text-ws-ink-faint'>
            {copy.sub}
          </span>
        )}
      </div>
      {/* Cùng một ô gạch như khi cột có việc — không phải một nút chữ riêng.
          Một hành động thì một hình dạng. */}
      {status === TaskStatus.PENDING && onAddTask && (
        <AddTaskSlot onAddTask={onAddTask} />
      )}
    </div>
  );
}
