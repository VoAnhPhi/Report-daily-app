/**
 * Tiến độ và mốc thời gian của MỘT việc: đếm việc con còn sống, nhãn tiếng Việt
 * cho lịch sử việc con, cờ quá hạn, và định dạng hạn / thời điểm để hiển thị.
 */

import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  type TaskItem,
  type TaskItemAction,
  type Task,
  TaskStatus,
} from '@/types/task.type';

/** Nhãn tiếng Việt cho từng hành động trong lịch sử việc con. */
export const ITEM_ACTION_LABEL: Record<TaskItemAction, string> = {
  added: 'đã thêm',
  renamed: 'đã sửa nội dung',
  checked: 'đã hoàn thành',
  unchecked: 'bỏ hoàn thành',
  deleted: 'đã xoá',
  restored: 'đã khôi phục',
  report_due_changed: 'đã đổi hạn báo cáo',
  completion_due_changed: 'đã đổi hạn hoàn thành',
};

/**
 * Đếm việc con của một đầu việc, bỏ qua việc con đã xoá mềm. Bốn nơi hiển thị
 * tiến độ checklist (thẻ bảng cột, dòng bảng tính, panel chi tiết, dòng danh
 * sách) đều tự viết đúng ba dòng này.
 *
 * Tham số để optional có chủ ý: API danh sách không phải lúc nào cũng trả
 * `items`, và nhánh `|| []` chính là chỗ che trường hợp đó.
 *
 * KHÔNG dùng cho ô nhập của form sửa việc — chỗ đó đếm trên `watchedItems` của
 * react-hook-form, có thêm điều kiện `!it?.purge` và đọc `it?.done`, nên là một
 * phép đếm khác chứ không phải bản sao.
 */
export function getTaskChecklistProgress(items?: TaskItem[]): {
  totalItems: number;
  doneItems: number;
} {
  const active = items?.filter((i) => !i.deleted) || [];
  return {
    totalItems: active.length,
    doneItems: active.filter((i) => i.done).length,
  };
}

/**
 * Việc đã quá hạn: có hạn, chưa xong, chưa huỷ, và hạn đã trôi qua.
 *
 * Là HÀM chứ không phải giá trị tính sẵn — `Date.now()` phải chạy lại ở mỗi lần
 * render. Đóng băng nó ở module scope là đóng băng luôn mốc thời gian.
 *
 * Cả hai nơi gọi đều bọc `memo`, nên giá trị này vốn đã có thể cũ khi props
 * không đổi. Đó là hành vi SẴN CÓ ở cả hai bản trước khi gom, và gọi hàm tại
 * đúng điểm cũ trong render giữ nguyên nó.
 */
export function isTaskOverdue(task: Task): boolean {
  return (
    !!task.dueDate &&
    task.status !== TaskStatus.DONE &&
    task.status !== TaskStatus.CANCELLED &&
    new Date(task.dueDate).getTime() < Date.now()
  );
}

/** Định dạng hạn chót: dd/MM/yyyy (vi). */
export const formatTaskDueDate = (date: string | Date) =>
  format(new Date(date), 'dd/MM/yyyy', { locale: vi });

/** Định dạng thời điểm hoạt động: HH:mm dd/MM (vi). */
export const formatTaskTime = (date: string | Date) =>
  format(new Date(date), 'HH:mm dd/MM', { locale: vi });
