'use client';

import { memo } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  AlertTriangle,
  AlignLeft,
  Calendar,
  Paperclip,
  Pin,
  PinOff,
  Shield,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Task,
  TaskAssignmentStatus,
  TaskStatus,
  TaskType,
} from '@/types/task.type';
import {
  COOPERATION_CATEGORY_LABEL_VI,
  formatTaskDueDate,
  getAvatarPalette,
  getTaskChecklistProgress,
  isTaskOverdue,
  TASK_PRIORITY_CONFIG,
  TASK_STATUS_CONFIG,
  TASK_TYPE_CONFIG,
} from '@/components/tasks/task-utils';
import { TaskMoveMenu } from '../shared/task-move-menu';

/**
 * Khung xương giữ ĐÚNG hình dạng nội dung sắp tới — thẻ đầy đủ cao 148px với
 * bốn vạch đặt đúng chỗ tiêu đề, mã, tiến độ và hàng chân.
 *
 * Không dùng vòng xoay giữa cột: vòng xoay không cho biết cái gì sắp hiện ra,
 * và làm cột co giãn khi dữ liệu về.
 */
export function TaskCardSkeleton() {
  return (
    <div
      aria-hidden
      className='h-[148px] animate-pulse rounded-[14px] border border-ws-line bg-ws-surface'
      style={{
        backgroundImage: Array(4)
          .fill(
            'linear-gradient(var(--color-ws-surface-sunken), var(--color-ws-surface-sunken))',
          )
          .join(','),
        backgroundPosition: '14px 16px, 14px 38px, 14px 72px, 14px 104px',
        backgroundSize: '62% 14px, 40% 14px, 84% 8px, 30% 22px',
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}

export interface TaskCardProps {
  task: Task;
  index: number;
  showTypeTag: boolean;
  onClick: (task: Task) => void;
  onTogglePin: (e: React.MouseEvent, task: Task) => void;
  onMove: (id: string, next: TaskStatus, previous: TaskStatus) => void;
}

/**
 * Thẻ việc ở chế độ bảng cột.
 *
 * Thứ tự đọc: tên việc → mã & hạn → hồ sơ → tiến độ → hàng chân. Tên việc lên
 * đầu vì đó mới là thứ người dùng quét; tên hồ sơ chỉ là ngữ cảnh.
 *
 * KHÔNG có chip trạng thái — cột đã nói trạng thái rồi. Viền trái 3px: màu theo
 * trạng thái, kiểu nét theo loại việc.
 */
export const TaskCard = memo(
  function TaskCard({
    task,
    index,
    showTypeTag,
    onClick,
    onTogglePin,
    onMove,
  }: TaskCardProps) {
    const { totalItems, doneItems } = getTaskChecklistProgress(task.items);
    const companyName = task.businessForm?.companyName;
    const typeVisual = TASK_TYPE_CONFIG[task.type];
    const statusVisual = TASK_STATUS_CONFIG[task.status];
    const priorityVisual = task.priority
      ? TASK_PRIORITY_CONFIG[task.priority]
      : null;
    const attachmentCount = task.attachments?.length ?? 0;
    const isOverdue = isTaskOverdue(task);

    return (
      <Draggable draggableId={task.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => onClick(task)}
            /* Enter mở chi tiết việc.
               `dragHandleProps` cho phần tử này `tabIndex` nên nó nhận được
               focus bàn phím, và thư viện dnd đã dùng PHÍM CÁCH để nhấc thẻ —
               nhưng không ai xử lý Enter, nên người dùng bàn phím tab tới
               thẻ rồi không có cách nào mở nó ra. */
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              onClick(task);
            }}
            /* Vòng focus phải nằm ở ĐÂY, không phải ở thẻ con bên trong.
               Đây mới là phần tử nhận focus; bản trước đặt `focus-visible:`
               lên div con — nơi không bao giờ được focus — rồi lại tắt viền ở
               chính chỗ này bằng `outline-hidden`, nên tab qua bảng là đi
               trong bóng tối. */
            className='group rounded-[14px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ws-focus'
          >
            <div
              className={cn(
                // padding 15px là số của bản mẫu; Tailwind không có bậc 15 nên
                // dùng giá trị tuỳ chọn thay vì làm tròn về 14 (`p-3.5`).
                'relative cursor-pointer rounded-[14px] border border-ws-line bg-ws-surface p-[15px] shadow-ws-rest transition-all duration-200',
                'hover:border-ws-line-strong hover:shadow-ws-raised',
                snapshot.isDragging &&
                  'rotate-[1.6deg] scale-[1.02] border-ws-accent shadow-ws-lifted cursor-grabbing',
              )}
              style={{
                borderLeftWidth: 3,
                borderLeftColor: statusVisual.edge,
                borderLeftStyle: typeVisual.borderStyle,
              }}
            >
              {/* KHÔNG có chấm tròn báo ghim. Nó nằm đè lên viền trái 3px màu
                  trạng thái nên bị nuốt mất — chỉ còn icon ghim ở góc phải, vốn
                  đã tô `ws-accent` khi việc đang được ghim. */}

              {/* Hàng đầu: tên việc + nút ghim */}
              <div className='flex items-start gap-2'>
                <h4 className='min-w-0 flex-1 line-clamp-2 text-[13.5px] font-semibold leading-[1.35] text-ws-ink'>
                  {task.title}
                </h4>
                <div className='flex shrink-0 items-center gap-1'>
                  {task.createdByAdmin && (
                    <Shield
                      className='h-3.5 w-3.5 text-ws-ink-ghost'
                      aria-label='Việc do quản trị viên giao'
                    />
                  )}
                  <button
                    type='button'
                    onClick={(e) => onTogglePin(e, task)}
                    title={
                      task.isPinnedByMe ? 'Bỏ ghim' : 'Ghim (chỉ mình bạn thấy)'
                    }
                    className={cn(
                      /* `p-1.5` để vùng chạm đạt 26px (14px icon + 12px đệm),
                         qua ngưỡng 24×24 của WCAG 2.5.8. */
                      'rounded-md p-1.5 transition-all hover:bg-ws-surface-sunken',
                      'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ws-focus',
                      task.isPinnedByMe
                        ? 'text-ws-accent'
                        : /* Ẩn theo hover CHỈ từ 768px trở lên. Dưới mốc đó
                             không có con trỏ để rê, nên `opacity-0` nghĩa là
                             nút ghim vô hình vĩnh viễn trên điện thoại — cùng
                             lỗi đã sửa ở nút xoá việc con trong modal tạo
                             việc. */
                          'text-ws-ink-ghost hover:text-ws-accent md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100',
                    )}
                  >
                    {task.isPinnedByMe ? (
                      <PinOff className='h-3.5 w-3.5' />
                    ) : (
                      <Pin className='h-3.5 w-3.5' />
                    )}
                  </button>
                  <TaskMoveMenu
                    currentStatus={task.status}
                    onMove={(next) => onMove(task.id, next, task.status)}
                  />
                </div>
              </div>

              {/* Hàng mã & hạn. Cả hai là NHÃN TĨNH → cấp 0: nền chìm, không
                  viền. Thẻ đã có viền bao của chính nó; thêm viền cho từng nhãn
                  bên trong là khung lồng khung. */}
              {(task.code || task.dueDate) && (
                <div className='mt-1 flex flex-wrap items-center gap-1'>
                  {task.code && (
                    <span className='rounded-[7px] bg-ws-surface-sunken px-1.5 py-px font-mono text-[10.5px] text-ws-ink-faint'>
                      {task.code}
                    </span>
                  )}
                  {task.dueDate && (
                    <span
                      title={`Hạn hoàn thành: ${formatTaskDueDate(task.dueDate)}`}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-lg border border-transparent px-1.5 py-px text-[10.5px]',
                        isOverdue
                          ? 'bg-ws-void-bg text-ws-void-fg'
                          : 'bg-ws-surface-sunken text-ws-ink-faint',
                      )}
                    >
                      {isOverdue ? (
                        <AlertTriangle className='h-3 w-3' />
                      ) : (
                        <Calendar className='h-3 w-3' />
                      )}
                      {format(new Date(task.dueDate), 'dd/MM', { locale: vi })}
                    </span>
                  )}
                </div>
              )}

              {/* Tên hồ sơ doanh nghiệp — bỏ hẳn khi việc không gắn hồ sơ */}
              {task.type === TaskType.PARTNER_TASK &&
                (companyName || task.businessFormId) && (
                  <>
                    <p
                      className='mt-1.5 truncate text-[11px] text-ws-ink-faint'
                      title={companyName}
                    >
                      {companyName || `Form #${task.businessFormId?.slice(-4)}`}
                    </p>
                  </>
                )}

              {/* Thanh tiến độ — BỎ CẢ CỤM khi không có việc con.
                  Hiện 0% sẽ đọc thành "chưa ai làm gì", sai nghĩa. */}
              {totalItems > 0 && (
                <div className='mt-2 flex items-center gap-2'>
                  <div className='h-[5px] min-w-0 flex-1 overflow-hidden rounded-[3px] bg-ws-surface-sunken'>
                    <div
                      className='h-full rounded-[3px] transition-all'
                      style={{
                        width: `${(doneItems / totalItems) * 100}%`,
                        backgroundColor: statusVisual.edge,
                      }}
                    />
                  </div>
                  <p
                    title={`${doneItems}/${totalItems} việc con đã xong`}
                    className='shrink-0 text-[10.5px] tabular-nums text-ws-ink-faint'
                  >
                    {doneItems}/{totalItems}
                  </p>
                </div>
              )}

              {/* Hàng chân: avatar · ưu tiên · số liệu */}
              <div className='mt-2 flex items-center gap-2'>
                {task.relatedUsers && task.relatedUsers.length > 0 && (
                  <div
                    className='flex items-center -space-x-[7px]'
                    title={task.relatedUsers.map((a) => a.fullName).join(', ')}
                  >
                    {/* `Avatar` của Radix thay `<img>` trần.
                        Với thẻ img thường, ảnh hỏng hoặc link hết hạn cho ra
                        icon "ảnh vỡ" của trình duyệt — xấu hơn hẳn so với
                        không có ảnh, và mất luôn chữ cái đầu vốn là thứ giúp
                        nhận ra người. `AvatarImage` tự rơi về `AvatarFallback`
                        khi ảnh không tải được. */}
                    {task.relatedUsers.slice(0, 2).map((a) => (
                      <Avatar
                        key={a.id}
                        title={a.fullName}
                        className='h-[22px] w-[22px] border-2 border-ws-surface'
                      >
                        <AvatarImage
                          src={a.avatarUrl ?? undefined}
                          alt={a.fullName}
                          className='object-cover'
                        />
                        <AvatarFallback
                          className={cn(
                            'text-[9.5px] font-bold',
                            getAvatarPalette(a.id),
                          )}
                        >
                          {a.fullName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {task.relatedUsers.length > 2 && (
                      <span className='flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-ws-surface bg-ws-surface-sunken text-[9.5px] font-bold text-ws-ink-soft'>
                        +{task.relatedUsers.length - 2}
                      </span>
                    )}
                  </div>
                )}

                <span className='flex-1' />

                {/* Mức "Trung bình" là mặc định — không hiện chip trên thẻ (luật 2). */}
                {priorityVisual && !priorityVisual.hiddenOnCard && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 rounded-lg border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-tight',
                      priorityVisual.badge,
                    )}
                  >
                    {/* Icon chứ không phải chấm tròn: ở mức "Khẩn cấp" chip có
                        nền đặc, chấm tô cùng màu nhấn sẽ là đỏ trên đỏ. Icon
                        thừa hưởng `currentColor` nên luôn tương phản. */}
                    {(() => {
                      const PriorityIcon = priorityVisual.icon;
                      return <PriorityIcon className='h-3 w-3' aria-hidden />;
                    })()}
                    {priorityVisual.label}
                  </span>
                )}

                {task.description && (
                  <AlignLeft
                    className='h-3.5 w-3.5 text-ws-ink-ghost'
                    aria-label='Công việc có mô tả'
                  />
                )}
                {attachmentCount > 0 && (
                  <span className='inline-flex items-center gap-0.5 text-xs tabular-nums text-ws-ink-faint'>
                    <Paperclip className='h-3.5 w-3.5' />
                    {attachmentCount}
                  </span>
                )}
              </div>

              {/* Chip phụ chỉ hiện khi thật sự cần — mật độ vừa đủ (nguyên tắc 6) */}
              {(showTypeTag ||
                task.category ||
                task.onBehalfName ||
                task.myAssignmentStatus === TaskAssignmentStatus.PENDING) && (
                <div className='mt-1.5 flex flex-wrap items-center gap-1'>
                  {showTypeTag && (
                    <span
                      className={cn(
                        'rounded-sm px-1.5 py-0.5 text-[10px] font-bold',
                        typeVisual.badge,
                      )}
                    >
                      {typeVisual.shortLabel}
                    </span>
                  )}
                  {task.myAssignmentStatus === TaskAssignmentStatus.PENDING && (
                    <span className='inline-flex items-center gap-0.5 rounded-sm bg-ws-pending-bg px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-tight text-ws-pending-fg ring-1 ring-ws-line'>
                      Chờ tham gia
                    </span>
                  )}
                  {task.category && (
                    <span className='max-w-[150px] truncate rounded-sm bg-ws-surface-sunken px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-tight text-ws-ink-soft'>
                      {COOPERATION_CATEGORY_LABEL_VI[task.category]}
                    </span>
                  )}
                  {task.onBehalfName && (
                    <span className='max-w-[150px] truncate rounded-sm bg-ws-surface-sunken px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-tight text-ws-ink-soft'>
                      Thay: {task.onBehalfName}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Draggable>
    );
  },
  /**
   * Mỗi lần một cột nạp thêm trang, toàn bộ thẻ trong cột đó render lại. Khóa
   * memo theo id + mốc sửa + vị trí kéo + cờ ghim là đủ: mọi thứ hiển thị trên
   * thẻ đều đổi kèm `updatedAt`.
   */
  (prev, next) =>
    prev.task.id === next.task.id &&
    prev.task.updatedAt === next.task.updatedAt &&
    prev.task.isPinnedByMe === next.task.isPinnedByMe &&
    prev.index === next.index &&
    prev.showTypeTag === next.showTypeTag,
);
