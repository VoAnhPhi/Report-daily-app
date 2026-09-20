export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum TaskType {
  PERSONAL = 'personal',
  PARTNER_TASK = 'partner_task',
  ADMIN_INTERNAL = 'admin_internal',
}

/** Mức độ ưu tiên công việc: thấp / trung bình / cao / khẩn cấp. */
export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export type CooperationCategory =
  | 'consultation'
  | 'sales_partnership'
  | 'distribution'
  | 'oem_manufacturing'
  | 'brand_collaboration'
  | 'marketing_advertising'
  | 'solar_panel_installation'
  | 'personal_work'
  | 'other';

export enum TaskActivityType {
  STATUS_CHANGED = 'status_changed',
  COMMENT = 'comment',
  MEMBER_CHANGED = 'member_changed',
  /** Log xoá hẳn một việc con khỏi checklist. */
  ITEM_PURGED = 'item_purged',
}

/** Một thành viên của công việc + số việc chung với người đang xem. */
export interface TaskMember {
  user: {
    id: string;
    fullName: string;
    referenceId?: string | null;
    avatarUrl?: string | null;
    status?: TaskAssignmentStatus | null;
  };
  isMainAssignee: boolean;
  /** Việc mà cả hai cùng tham gia, tính cả việc đang mở. */
  sharedCount: number;
}

/** Người phụ trách chính của việc chung tôi tham gia + số việc — cho bộ lọc tab Việc chung. */
export interface SharedTaskAssignee {
  id: string;
  fullName: string;
  referenceId: string | null;
  avatarUrl: string | null;
  count: number;
}

/** Lọc dòng thời gian. `LOG` gộp `STATUS_CHANGED` + `MEMBER_CHANGED`. */
export enum TaskActivityFilter {
  ALL = 'all',
  COMMENT = 'comment',
  LOG = 'log',
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
}

/** Phân loại tệp để chọn cách hiển thị (ảnh / video / tệp thường). */
export enum FileMediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  FILE = 'file',
}


export interface ReactionSummary {
  emoji: string;
  count: number;
  isReactedByMe: boolean;
  users?: { id: string; fullName: string }[];
}

/** Trạng thái tham gia của người được tag vào việc chung: chờ xác nhận / đã tham gia. */
export enum TaskAssignmentStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
}

export interface TaskActivity {
  id: string;
  type: TaskActivityType;
  message?: string;
  /** Làm thay: tên người được chăm mà hoạt động thực hiện hộ (hiện cạnh tên tác giả). */
  onBehalfName?: string | null;
  attachments?: TaskAttachment[];
  oldStatus?: TaskStatus;
  newStatus?: TaskStatus;
  /** Id người được nhắc (@mention) trong bình luận. */
  mentionedUserIds?: string[];
  createdBy: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  createdAt: string;
  replyCount?: number;
  reactionSummary?: ReactionSummary[];
}

export type TaskItemAction =
  | 'added'
  | 'renamed'
  | 'checked'
  | 'unchecked'
  | 'deleted'
  | 'restored'
  | 'report_due_changed'
  | 'completion_due_changed';

export interface TaskItemEvent {
  action: TaskItemAction;
  byId: string;
  byName: string;
  at: string;
  from?: string;
  to?: string;
}

export interface TaskItem {
  /** Id ổn định (server quản). Gửi lại khi cập nhật để giữ lịch sử. */
  id?: string;
  label: string;
  done: boolean;
  /** Xoá mềm — vẫn hiển thị (gạch ngang đỏ) để xem lịch sử. */
  deleted?: boolean;
  /** Xoá hẳn khi lưu: server gỡ khỏi mảng kèm lịch sử. Chỉ gửi lên, không nhận về. */
  purge?: boolean;
  /** Lịch sử theo từng việc con (server tự quản, FE chỉ đọc). */
  history?: TaskItemEvent[];
  /** Hạn cần đưa việc con vào báo cáo; độc lập với hạn hoàn thành. */
  reportDueAt?: string | null;
  /** Hạn hoàn thành việc con; độc lập với hạn báo cáo. */
  completionDueAt?: string | null;
}

export interface Task {
  id: string;
  /** Mã công việc CV+YYMMDD+NNN. Null cho việc cũ chưa backfill. */
  code?: string | null;
  title: string;
  description?: string;
  status: TaskStatus;
  type: TaskType;
  category?: CooperationCategory;
  priority?: TaskPriority;
  /** Người đang xem đã ghim việc này chưa (riêng tư — chỉ đúng với chính họ). */
  isPinnedByMe?: boolean;
  createdByAdmin?: boolean;
  /** Làm thay: tên người được chăm mà việc được tạo hộ (badge "thay cho"). */
  onBehalfName?: string | null;
  startDate?: string;
  dueDate?: string;
  mainAssigneeId?: string | null;
  mainAssignee?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  } | null;
  relatedUsers?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    /** Trạng thái tham gia của người hỗ trợ này. */
    status?: TaskAssignmentStatus | null;
  }[];
  /** Trạng thái tham gia của người đang xem (nếu là người liên quan). 'pending' = cần xác nhận. */
  myAssignmentStatus?: TaskAssignmentStatus | null;
  createdById: string;
  createdByName?: string;
  createdBy?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  } | null;
  createdAt: string;
  /** Mốc sửa gần nhất — dùng làm khóa memo cho thẻ/dòng việc. */
  updatedAt?: string;
  deletedAt?: string | null;
  businessFormId?: string;
  businessForm?: {
    id: string;
    companyName: string;
    status: string;
  };
  attachments?: TaskAttachment[];
  items?: TaskItem[];
  activities?: TaskActivity[];
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  businessFormId?: string;
  type: TaskType;
  /** Trạng thái khởi tạo — chỉ chờ xử lý / đang làm. */
  status?: TaskStatus;
  category?: CooperationCategory;
  priority?: TaskPriority;
  relatedUserIds?: string[];
  startDate?: string;
  dueDate?: string;
  attachments?: { name: string; url: string }[];
  items?: TaskItem[];
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  category?: CooperationCategory;
  priority?: TaskPriority;
  relatedUserIds?: string[];
  startDate?: string;
  dueDate?: string;
  attachments?: { name: string; url: string }[];
  items?: TaskItem[];
}

export interface UpdateTaskStatusDto {
  status: TaskStatus;
  message?: string;
  /** Bắt buộc khi hoàn thành / đã hủy. */
  evidence?: { name: string; url: string }[];
}
