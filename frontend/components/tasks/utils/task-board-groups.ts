/**
 * Xếp việc thành nhóm cho bảng cột và bảng tính: gom theo mốc tháng của
 * `startDate` (việc ghim nổi lên đầu từng tháng), và dẫn xuất tổng / nhóm / cờ
 * rỗng từ dữ liệu phân trang của `useMyTasksInfinite`.
 */

import { type Task } from '@/types/task.type';
import type { InfiniteData } from '@tanstack/react-query';
import type { PaginatedResponse } from '@/types/common.type';

/** Một nhóm việc theo mốc tháng (của startDate) trong một cột status. */
export interface TaskMonthGroup {
  key: string; // 'YYYY-MM' hoặc 'no-date'
  label: string; // 'Tháng 7/2026' | 'Chưa có ngày bắt đầu'
  tasks: Task[];
}

/**
 * Gom danh sách việc (đã sắp startDate desc từ BE) theo mốc THÁNG của startDate.
 * Giữ nguyên thứ tự nguồn nên các tháng liền khối, mới → cũ; việc không có
 * startDate dồn vào nhóm cuối. Trong TỪNG tháng, việc đã ghim xếp lên trước.
 */
export function groupTasksByStartMonth(tasks: Task[]): TaskMonthGroup[] {
  const groups: TaskMonthGroup[] = [];
  const index = new Map<string, TaskMonthGroup>();
  for (const task of tasks) {
    if (!task) continue; // phòng thủ: page shape lạ có thể chèn undefined
    let key: string;
    let label: string;
    if (task.startDate) {
      const d = new Date(task.startDate);
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      label = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
    } else {
      key = 'no-date';
      label = 'Chưa có ngày bắt đầu';
    }
    let group = index.get(key);
    if (!group) {
      group = { key, label, tasks: [] };
      index.set(key, group);
      groups.push(group);
    }
    group.tasks.push(task);
  }
  // Ghim-trước trong từng tháng (sort ổn định → phần còn lại giữ startDate desc).
  for (const group of groups) {
    group.tasks.sort(
      (a, b) => Number(!!b.isPinnedByMe) - Number(!!a.isPinnedByMe),
    );
  }
  return groups;
}

/**
 * Dẫn xuất ba giá trị mà cả bảng cột lẫn bảng tính đều cần cho một cột/nhóm
 * trạng thái — tổng số việc, các nhóm theo tháng, và cờ rỗng — từ danh sách
 * phân trang đã dàn phẳng.
 *
 * `total` cộng `pinned.length` vì query phân trang chạy với `pinned: 'exclude'`
 * — việc ghim nằm ở query riêng nên không có trong tổng mà server trả về.
 *
 * `pinned` có giá trị mặc định ngay tại đây: hai nơi gọi lấy nó từ
 * `const { data: pinned = [] } = useMyPinnedTasks(...)`, nhưng mặc định đó nằm
 * ở dòng destructuring chứ không thuộc khối được gom, nên hàm tự phòng lấy.
 */
export function getTaskColumnData(
  data: InfiniteData<PaginatedResponse<Task>> | undefined,
  pinned: Task[] = [],
): {
  total: number;
  groups: TaskMonthGroup[];
  isEmpty: boolean;
} {
  const rest = data?.pages.flatMap((p) => p?.data ?? []) ?? [];
  const restTotal = data?.pages[0]?.total ?? rest.length;
  return {
    total: pinned.length + restTotal,
    groups: groupTasksByStartMonth(rest),
    isEmpty: pinned.length === 0 && rest.length === 0,
  };
}
