/**
 * Bảng nhãn / màu / thứ tự của mọi phân loại việc: trạng thái, độ ưu tiên, loại
 * việc, loại hình hợp tác — kèm hai giá trị mặc định khi tạo việc.
 *
 * Đây là MỘT trong ba điểm đổi màu duy nhất của cả tính năng Công việc (hai chỗ
 * kia: `app/globals.css` và `AVATAR_PALETTE` ở `task-people.ts`). Tài liệu
 * `docs/features/task-workspace-ui/03-bo-mau.md` trỏ vào đây.
 */

import {
  CircleDashed,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Equal,
  ChevronUp,
  ChevronsUp,
  type LucideIcon,
} from 'lucide-react';
import {
  type CooperationCategory,
  TaskStatus,
  TaskPriority,
  TaskType,
} from '@/types/task.type';

/**
 * Cấu hình hiển thị theo trạng thái việc (icon + nhãn + màu) — dùng chung mọi nơi.
 *
 * Đây là MỘT trong ba điểm đổi màu duy nhất của cả tính năng Công việc. Bảng
 * màu `ws-*` khai ở `app/globals.css`; bảng dịch từng dòng ở
 * `docs/features/task-workspace-ui/03-bo-mau.md` mục 8.
 *
 * Trạng thái là trục nhấn duy nhất của màn — bốn màu này độc quyền, không được
 * mượn cho độ ưu tiên hay loại việc.
 */
export interface TaskStatusVisual {
  icon: LucideIcon;
  label: string;
  color: string;
  bg: string;
  /**
   * Màu vạch: thanh tiến độ, chấm chỉ báo, viền trái hàng bảng tính.
   *
   * Là chuỗi `var(--color-…)` chứ không phải class Tailwind, vì cùng một màu
   * phải dùng được ở ba thuộc tính khác nhau (`background`, `border-color`,
   * `color`). Tailwind chỉ nhận diện class viết nguyên văn trong mã nguồn nên
   * `bg-${edge}` sẽ không sinh ra gì. Dùng qua `style={{ … }}` — đây đúng là
   * loại "giá trị thật sự động" mà quy ước cho phép inline. Biến vẫn đổi theo
   * chế độ tối vì `.dark` ghi đè chính custom property này.
   */
  edge: string;
}

export const TASK_STATUS_CONFIG: Record<TaskStatus, TaskStatusVisual> = {
  [TaskStatus.PENDING]: {
    icon: CircleDashed,
    label: 'Chờ xử lý',
    color: 'text-ws-pending-fg',
    bg: 'bg-ws-pending-bg',
    edge: 'var(--color-ws-pending-edge)',
  },
  [TaskStatus.IN_PROGRESS]: {
    icon: Clock,
    label: 'Đang làm',
    color: 'text-ws-progress-fg',
    bg: 'bg-ws-progress-bg',
    edge: 'var(--color-ws-progress-edge)',
  },
  [TaskStatus.DONE]: {
    icon: CheckCircle2,
    label: 'Hoàn thành',
    color: 'text-ws-done-fg',
    bg: 'bg-ws-done-bg',
    edge: 'var(--color-ws-done-edge)',
  },
  [TaskStatus.CANCELLED]: {
    icon: XCircle,
    label: 'Đã hủy',
    color: 'text-ws-void-fg',
    bg: 'bg-ws-void-bg',
    edge: 'var(--color-ws-void-edge)',
  },
};

/**
 * Thứ tự bốn trạng thái việc, dùng chung cho mọi nơi cần xếp chúng thành dãy:
 * cột của bảng cột, nhóm của bảng tính, và danh sách đích của menu chuyển
 * trạng thái. Trước đây bốn file tự khai một bản giống hệt nhau.
 *
 * Hai chỗ dùng có ngữ nghĩa riêng nên import kèm alias giữ tên cũ tại chỗ
 * (`STATUS_ORDER` cho cột/nhóm, `MOVE_TO_ORDER` cho menu chuyển) — chú thích
 * giải thích từng ngữ nghĩa ở lại đúng file dùng nó.
 */
export const TASK_STATUS_ORDER: TaskStatus[] = [
  TaskStatus.PENDING,
  TaskStatus.IN_PROGRESS,
  TaskStatus.DONE,
  TaskStatus.CANCELLED,
];

/**
 * Cấu hình hiển thị theo độ ưu tiên — MỘT dải nhiệt bốn bậc, không phải bốn
 * hue rời (luật 2 của `03-bo-mau.md`). Độ ưu tiên là thông tin phụ nên nói
 * bằng giọng nhỏ hơn trạng thái: Thấp và Trung bình chỉ có icon + chữ, Cao mới
 * có nền nhạt, Khẩn cấp là chip nền đặc DUY NHẤT của cả màn.
 *
 * - `badge`: class gộp cho chip (nền + chữ + viền).
 * - `hiddenOnCard`: mức mặc định không hiện chip trên thẻ và dòng.
 *
 * KHÔNG có chấm tròn chỉ báo nữa. Chấm ấy tô bằng chính màu nhấn của mức, nên ở
 * mức "Khẩn cấp" — mức DUY NHẤT có chip nền đặc — nó thành đỏ trên đỏ và biến
 * mất hẳn. Icon đã có sẵn trong config làm đúng việc đó mà không phụ thuộc màu:
 * bốn mũi tên xuống / ngang / lên / lên kép đọc được cả khi in đen trắng, đúng
 * luật "màu không bao giờ là kênh duy nhất". Icon thừa hưởng `currentColor` của
 * chip nên tự tương phản ở mọi mức.
 */
export interface TaskPriorityVisual {
  icon: LucideIcon;
  label: string;
  color: string;
  badge: string;
  /**
   * Mức mặc định: KHÔNG hiện chip trên thẻ bảng cột và dòng danh sách — hiện
   * lên chỉ tạo nhiễu. Vẫn hiện ở cột Ưu tiên của bảng tính và ở panel chi
   * tiết, nơi nó là giá trị của một ô có nhãn sẵn.
   */
  hiddenOnCard?: boolean;
}

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, TaskPriorityVisual> = {
  [TaskPriority.LOW]: {
    icon: ChevronDown,
    label: 'Thấp',
    color: 'text-ws-prio-low',
    badge: 'text-ws-prio-low border-transparent',
  },
  [TaskPriority.NORMAL]: {
    icon: Equal,
    label: 'Trung bình',
    color: 'text-ws-prio-normal',
    badge: 'text-ws-prio-normal border-transparent',
    hiddenOnCard: true,
  },
  [TaskPriority.HIGH]: {
    icon: ChevronUp,
    label: 'Cao',
    color: 'text-ws-prio-high',
    badge: 'bg-ws-prio-high-bg text-ws-prio-high border-transparent',
  },
  [TaskPriority.URGENT]: {
    icon: ChevronsUp,
    label: 'Khẩn cấp',
    color: 'text-ws-prio-urgent',
    badge: 'bg-ws-prio-urgent text-ws-prio-urgent-ink border-transparent',
  },
};

/** Thứ tự ưu tiên để render nhóm nút chọn (thấp → khẩn cấp). */
export const TASK_PRIORITY_ORDER: TaskPriority[] = [
  TaskPriority.LOW,
  TaskPriority.NORMAL,
  TaskPriority.HIGH,
  TaskPriority.URGENT,
];

/** Độ ưu tiên mặc định khi tạo việc. */
export const DEFAULT_TASK_PRIORITY: TaskPriority = TaskPriority.NORMAL;

/**
 * Cấu hình hiển thị theo loại việc — 1 nguồn nhãn/màu duy nhất (hết magic string).
 *
 * Loại việc là dữ liệu PHÂN LOẠI (không có thứ tự) nên mã hoá bằng hình dạng,
 * không bằng màu (luật 3 của `03-bo-mau.md`): cả ba loại dùng chung một màu
 * viền `ws-line-strong`, phân biệt bằng KIỂU NÉT liền / đứt / chấm.
 *
 * - `label`: nhãn dài (badge chi tiết); `shortLabel`: nhãn ngắn (thẻ card/list).
 * - `badge`: class nền+chữ cho chip; `border`: class viền trái cho card board.
 */
export interface TaskTypeVisual {
  label: string;
  shortLabel: string;
  badge: string;
  border: string;
  /**
   * Kiểu nét viền trái thay cho màu riêng (luật 3).
   *
   * Tailwind KHÔNG có utility đặt `border-style` theo từng cạnh (`border-dashed`
   * dashed cả bốn cạnh), mà thẻ việc lại có viền 1px liền quanh + viền trái 3px
   * theo loại. Nên kiểu nét phải đi qua `style={{ borderLeftStyle }}`; trường
   * `border` chỉ mang màu và độ dày.
   */
  borderStyle: 'solid' | 'dashed' | 'dotted';
}

export const TASK_TYPE_CONFIG: Record<TaskType, TaskTypeVisual> = {
  [TaskType.PERSONAL]: {
    label: 'Việc cá nhân',
    shortLabel: 'Cá nhân',
    badge: 'bg-ws-surface-sunken text-ws-ink-soft',
    border: 'border-l-[3px] border-l-ws-line-strong',
    borderStyle: 'solid',
  },
  [TaskType.PARTNER_TASK]: {
    label: 'Việc đối tác',
    shortLabel: 'Đối tác',
    badge: 'bg-ws-surface-sunken text-ws-ink-soft',
    border: 'border-l-[3px] border-l-ws-line-strong',
    borderStyle: 'dashed',
  },
  [TaskType.ADMIN_INTERNAL]: {
    label: 'Việc nội bộ',
    shortLabel: 'Nội bộ',
    badge: 'bg-ws-surface-sunken text-ws-ink-soft',
    border: 'border-l-[3px] border-l-ws-line-strong',
    borderStyle: 'dotted',
  },
};

export const COOPERATION_CATEGORY_LABEL_VI: Record<
  CooperationCategory,
  string
> = {
  consultation: 'Tư vấn',
  sales_partnership: 'Liên kết bán hàng',
  distribution: 'Phân phối / Đại lý',
  oem_manufacturing: 'Sản xuất / OEM',
  brand_collaboration: 'Hợp tác thương hiệu',
  marketing_advertising: 'Marketing & Quảng cáo',
  solar_panel_installation: 'Lắp đặt điện mặt trời',
  personal_work: 'Công việc cá nhân',
  other: 'Khác',
};

/** Loại công việc mặc định khi chưa chọn. */
export const DEFAULT_COOPERATION_CATEGORY: CooperationCategory = 'other';
