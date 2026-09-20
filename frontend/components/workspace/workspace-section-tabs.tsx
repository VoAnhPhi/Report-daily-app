'use client';

import { ClipboardList, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WorkspaceSection = 'tasks' | 'report';

interface ReportTabState {
  badge: number;
  state: string;
  title?: string;
}

interface Props {
  active: WorkspaceSection;
  onTasks: () => void;
  onReport: () => void;
  reportTab?: ReportTabState | null;
  showReport?: boolean;
  className?: string;
}

/**
 * Khuôn của một cụm "segment" — dùng chung cho mọi cụm chuyển trong workspace:
 * thanh chuyển màn ở đây, và cụm chuyển chế độ xem Bảng tính/Bảng cột ở
 * `app/(routes)/tasks/page.tsx`. Một ngôn ngữ thị giác, một nguồn chuỗi.
 */
export const SEGMENT_CLASS =
  'flex h-[34px] shrink-0 items-center gap-1.5 rounded-[9px] px-2.5 text-[13px] font-semibold transition-colors';

/**
 * Mục ĐANG CHỌN của một cụm segment: nổi lên bằng nền trắng + bóng nghỉ, trên
 * track nền chìm.
 *
 * Trước đây mục đang chọn tô đen đặc. Đen là màu đậm nhất bảng màu và trong
 * một màn có tới ba cụm như vậy (chuyển màn, chế độ xem, dải chip lọc) — cộng
 * nút hành động chính cũng đen — nên không còn phân biệt được đâu là "chỗ tôi
 * đang đứng" và đâu là "việc tôi nên bấm". Từ đây đen chỉ dành cho MỘT nút
 * hành động chính mỗi màn; trạng thái chọn nói bằng chênh lệch nền.
 */
export const SEGMENT_ON_CLASS = 'bg-ws-surface text-ws-ink shadow-ws-rest';
export const SEGMENT_OFF_CLASS = 'text-ws-ink-soft hover:text-ws-ink';

/** Track bọc ngoài một cụm segment. Nền chìm để mục đang chọn nổi lên được. */
export const SEGMENT_TRACK_CLASS =
  'flex items-center gap-1 rounded-xl border border-ws-line bg-ws-surface-sunken p-1';

/**
 * Thanh chuyển giữa hai workspace chính.
 *
 * Đây là nguồn UI duy nhất cho `/tasks` và `/daily-reports/*`: cùng kích thước,
 * màu active, icon, badge và khoảng cách trên desktop/mobile.
 */
export function WorkspaceSectionTabs({
  active,
  onTasks,
  onReport,
  reportTab,
  showReport = true,
  className,
}: Props) {
  return (
    <div className={cn('inline-flex w-fit max-w-full min-w-0', className)}>
      <div
        className={cn(
          SEGMENT_TRACK_CLASS,
          'max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        <button
          type='button'
          onClick={onTasks}
          className={cn(
            SEGMENT_CLASS,
            active === 'tasks' ? SEGMENT_ON_CLASS : SEGMENT_OFF_CLASS,
          )}
        >
          <ListTodo className='h-4 w-4' />
          Công việc
        </button>

        {showReport && (
          <button
            type='button'
            title={reportTab?.title}
            onClick={onReport}
            className={cn(
              SEGMENT_CLASS,
              active === 'report' ? SEGMENT_ON_CLASS : SEGMENT_OFF_CLASS,
            )}
          >
            <ClipboardList className='h-4 w-4' />
            Báo cáo
            {reportTab && reportTab.badge > 0 && (
              <span
                className={cn(
                  'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums',
                  reportTab.state === 'missed'
                    ? 'bg-ws-danger text-white'
                    : 'bg-ws-count-bg text-ws-count-fg',
                )}
              >
                {reportTab.badge}
              </span>
            )}
            {/* Số bản chờ duyệt KHÔNG in trên tab (UAT 16/09/2026 lượt 2): nó
                chỉ nằm trong màn "Chờ duyệt". Chú giải của tab vẫn nói ra. */}
          </button>
        )}
      </div>
    </div>
  );
}
