'use client';

import { useState } from 'react';
import { Task, TaskStatus } from '@/types/task.type';
import { GetTasksQuery } from '@/app/api/tasks';
import { TASK_STATUS_ORDER as STATUS_ORDER } from '@/components/tasks/task-utils';
import {
  usePinTask,
  useUnpinTask,
  useUpdateTaskStatus,
} from '@/hooks/queries/task-queries';
import { useIsMobile } from '@/hooks/use-mobile';
import { SheetStatusGroup } from './sheet/sheet-status-group';
import { TaskDetailModal } from './task-detail-modal';
import { TaskDetailPanel } from './detail/task-detail-panel';
import { UpdateStatusModal } from './update-status-modal';

interface TaskSheetViewProps {
  /** Filter của tab hiện tại (KHÔNG kèm status — mỗi nhóm tự thêm status). */
  baseQuery?: GetTasksQuery;
  showTypeTag?: boolean;
  hasActiveFilter?: boolean;
  onAddTask?: () => void;
  onClearFilters?: () => void;
}

/**
 * Chế độ Bảng tính — thay `TaskListView` cũ. Cấu trúc gom nhóm theo trạng thái
 * vốn đã đúng nên giữ nguyên; chỉ đổi cách trình bày từ "thẻ xếp dọc" sang
 * "hàng lưới".
 *
 * Dưới 768px quay về thẻ dọc (`TaskRow`) — lưới 8 cột không vừa màn hẹp và
 * cuộn ngang cả trang là điều tuyệt đối tránh.
 */
export function TaskSheetView({
  baseQuery,
  showTypeTag = false,
  hasActiveFilter = false,
  onAddTask,
  onClearFilters,
}: TaskSheetViewProps) {
  const isMobile = useIsMobile();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalTask, setModalTask] = useState<Task | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const { mutate: pinTask } = usePinTask();
  const { mutate: unpinTask } = useUnpinTask();
  const { mutate: updateStatus } = useUpdateTaskStatus();

  /** Vào `done` phải qua hộp xác nhận; mọi chuyển khác áp dụng ngay. */
  const moveTask = (id: string, next: TaskStatus, previous: TaskStatus) => {
    if (next === TaskStatus.DONE) {
      setCompletingTaskId(id);
      return;
    }
    updateStatus({ id, payload: { status: next }, previousStatus: previous });
  };

  const togglePin = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    if (task.isPinnedByMe) unpinTask(task.id);
    else pinTask(task.id);
  };

  /**
   * Dưới 1024px không dựng panel — bấm mở thẳng modal đầy đủ như trước. Panel
   * chỉ là lớp xem nhanh, không thay modal.
   */
  const handleSelect = (task: Task) => {
    if (isMobile) setModalTask(task);
    else setSelectedTask(task);
  };

  return (
    <>
      <div className='flex h-full min-h-0 gap-4'>
        <div className='h-full min-w-0 flex-1 overflow-auto pb-6 ws-scroll'>
          {/* Lớp bọc co theo NỘI DUNG — thứ chốt bề rộng cho cả bảng.
              Không có nó thì mỗi `<section>` nhóm chỉ rộng bằng vùng NHÌN
              THẤY, vì section là block và vùng cuộn không truyền bề rộng cuộn
              xuống. Hệ quả dây chuyền:
                • nút tiêu đề nhóm dù mang `min-w-full` cũng chỉ bằng khung
                  nhìn — dải xám hết giữa chừng khi cuộn sang phải;
                • `min-w-full` của từng hàng cũng chỉ bằng khung nhìn, nên
                  track `1fr` ở cột cuối co theo nội dung TỪNG hàng và mép
                  phải bảng thành răng cưa;
                • vạch phân cách nhóm tháng cũng đứt ở đúng chỗ đó.
              `w-max` cho lớp bọc rộng bằng hàng rộng nhất, `min-w-full` giữ
              nó phủ hết khi bảng hẹp hơn vùng cuộn. Từ đó mọi thứ bên trong
              đo theo cùng một bề rộng. */}
          <div className='w-max min-w-full'>
          {STATUS_ORDER.map((status) => (
            <SheetStatusGroup
              key={status}
              status={status}
              baseQuery={baseQuery}
              showTypeTag={showTypeTag}
              hasActiveFilter={hasActiveFilter}
              // Mặc định mở "Chờ xử lý" VÀ "Đang làm" — "Đang làm" mới là nhóm
              // người dùng cần thấy đầu tiên.
              defaultOpen={
                status === TaskStatus.PENDING ||
                status === TaskStatus.IN_PROGRESS
              }
              isMobile={isMobile}
              selectedTaskId={selectedTask?.id ?? null}
              onSelectTask={handleSelect}
              onTogglePin={togglePin}
              onComplete={setCompletingTaskId}
              onMoveTask={moveTask}
              onAddTask={onAddTask}
              onClearFilters={onClearFilters}
            />
          ))}
          </div>
        </div>

        {selectedTask && !isMobile && (
          <TaskDetailPanel
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onOpenFull={() => {
              setModalTask(selectedTask);
              setSelectedTask(null);
            }}
            onChangeStatus={(status) =>
              moveTask(selectedTask.id, status, selectedTask.status)
            }
          />
        )}
      </div>

      <TaskDetailModal
        task={modalTask}
        isOpen={!!modalTask}
        onClose={() => setModalTask(null)}
      />

      <UpdateStatusModal
        taskId={completingTaskId}
        newStatus={completingTaskId ? TaskStatus.DONE : null}
        isOpen={!!completingTaskId}
        onClose={() => setCompletingTaskId(null)}
      />
    </>
  );
}
