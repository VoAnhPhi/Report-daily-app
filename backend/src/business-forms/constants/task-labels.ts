import {
  BusinessFormPriority,
  BusinessFormTaskStatus,
  BusinessFormTaskType,
} from '@prisma/client';

/** Nhãn tiếng Việt cho file Excel xuất ra (backend không có bảng nhãn nào khác). */

export const TASK_STATUS_LABELS: Record<BusinessFormTaskStatus, string> = {
  [BusinessFormTaskStatus.pending]: 'Chờ xử lý',
  [BusinessFormTaskStatus.in_progress]: 'Đang làm',
  [BusinessFormTaskStatus.done]: 'Hoàn thành',
  [BusinessFormTaskStatus.cancelled]: 'Đã hủy',
};

export const TASK_TYPE_LABELS: Record<BusinessFormTaskType, string> = {
  [BusinessFormTaskType.admin_internal]: 'Nội bộ Admin',
  [BusinessFormTaskType.partner_task]: 'Đối tác',
  [BusinessFormTaskType.personal]: 'Cá nhân',
};

export const TASK_PRIORITY_LABELS: Record<BusinessFormPriority, string> = {
  [BusinessFormPriority.low]: 'Thấp',
  [BusinessFormPriority.normal]: 'Trung bình',
  [BusinessFormPriority.high]: 'Cao',
  [BusinessFormPriority.urgent]: 'Khẩn cấp',
};
