import type { ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRightCircle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  FileClock,
  RotateCcw,
  Undo2,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { DailyReportBoardState } from '@/types/daily-report.type';

import { BOARD_STATE_BADGE_CLASS } from '../utils/classes';
import { BOARD_STATE_LABEL_VI } from '../utils/labels';
import { PersonAvatar } from './person-avatar';

/**
 * Bộ khuôn DÒNG BẢN dùng chung cho mọi danh sách "ai - bản nào - trạng thái
 * gì" của Báo cáo: bảng Nhóm, bộ lọc "Chờ duyệt" trong bảng, và tab "Chờ
 * duyệt" (UAT 17/09/2026: ba chỗ từng vẽ ba kiểu dòng khác nhau).
 *
 * Chỉ là KHUÔN, không tự quyết tương tác: nơi dùng bọc phần chính trong nút
 * (bung đọc tại chỗ) hoặc link (sang bản), vì một link không được nằm trong
 * nút và ngược lại.
 *
 *   [avatar] Tên  [phụ]                         [thời gian]
 *            [trạng thái] chi tiết               [Duyệt ›]
 */

/** Khung danh sách: một viền ngoài, đường kẻ giữa các dòng. */
export function ReportRowList({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <ul
      aria-label={label}
      className={cn(
        'divide-y divide-ws-line overflow-hidden rounded-ws-block border border-ws-line bg-ws-surface',
        className,
      )}
    >
      {children}
    </ul>
  );
}

/** Đệm và chiều cao chung của một dòng; nơi dùng đặt lên phần tử bấm được. */
export const REPORT_ROW_PAD = 'px-4 py-3';

/** Nửa trái: avatar, tên, dòng chi tiết. */
export function ReportRowMain({
  name,
  avatarUrl,
  seed,
  titleExtra,
  meta,
}: {
  name: string;
  avatarUrl: string | null;
  seed: string;
  /** Chip nhỏ đứng sau tên (báo cáo thay, cần hỗ trợ…). */
  titleExtra?: ReactNode;
  /** Dòng dưới tên: trạng thái trước, chi tiết sau. */
  meta?: ReactNode;
}) {
  return (
    <span className='flex min-w-0 flex-1 items-start gap-3'>
      {/* 28px dưới `sm`: ở 320px cột chữ chỉ còn ~99px, badge "Chờ duyệt"
          12px thiếu 2px và bị cắt (đo 17/09/2026). */}
      <PersonAvatar
        name={name}
        url={avatarUrl}
        seed={seed}
        size='md'
        className='h-7 w-7 sm:h-9 sm:w-9'
      />
      <span className='min-w-0 flex-1'>
        <span className='flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1'>
          {/* KHÔNG thêm `block` cạnh `line-clamp-2`: `block` thắng và kẹp
              dòng mất tác dụng (đo 320px, 16/09/2026). */}
          <span
            title={name}
            className='line-clamp-2 min-w-0 max-w-full break-words text-ws-body font-semibold text-ws-ink'
          >
            {name}
          </span>
          {titleExtra}
        </span>
        {meta && (
          <span className='mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-ws-chip text-ws-ink-soft'>
            {meta}
          </span>
        )}
      </span>
    </span>
  );
}

/** Cột phải: một dòng thời gian (tuỳ chọn) trên nhãn hành động. */
export function ReportRowAside({
  time,
  timeClassName,
  children,
  className,
}: {
  time?: ReactNode;
  /** Ví dụ `hidden sm:block` khi nơi dùng tự đưa thời gian xuống dòng chi
   *  tiết ở khổ hẹp - cột phải `shrink-0` sẽ bóp mất phần tên. */
  timeClassName?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'flex shrink-0 flex-col items-end justify-center gap-1',
        className,
      )}
    >
      {time && (
        <span
          className={cn(
            'whitespace-nowrap text-ws-chip tabular-nums text-ws-ink-faint',
            timeClassName,
          )}
        >
          {time}
        </span>
      )}
      {children}
    </span>
  );
}

export type RowActionKind = 'review' | 'open' | 'readonly';

/**
 * Nhãn hành động cuối dòng. Một chữ + mũi tên, không phải nút nền đặc: mười
 * dòng mười khối màu là màn không còn hành động chính. Màu `progress` chỉ cho
 * "Duyệt" - việc duy nhất đòi người xem làm ngay.
 */
export function RowActionLabel({ kind }: { kind: RowActionKind }) {
  if (kind === 'readonly') {
    return (
      <span className='text-ws-chip font-medium text-ws-ink-faint'>
        Chỉ đọc
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 whitespace-nowrap text-ws-chip font-semibold',
        kind === 'review' ? 'text-ws-progress-fg' : 'text-ws-ink-soft',
      )}
    >
      {kind === 'review' ? 'Duyệt' : 'Mở'}
      <ChevronRight aria-hidden='true' className='h-4 w-4' />
    </span>
  );
}

/** Icon riêng cho từng trạng thái: đọc được mà không cần phân biệt màu. */
export const BOARD_STATE_ICON: Record<DailyReportBoardState, LucideIcon> = {
  CHUA_NOP: Circle,
  CHO_DUYET: Clock,
  QUA_HAN_DUYET: AlertTriangle,
  DA_DUYET: CheckCircle2,
  TIEP_TUC: ArrowRightCircle,
  /* Khác icon với "Quá hạn duyệt": hai ngõ cụt cùng tông đỏ, chỉ icon tách
     được việc của người duyệt (tam giác) với việc sửa bản của thành viên. */
  QUA_HAN_BO_SUNG: FileClock,
  BI_TRA_LAI: Undo2,
  DA_MO_LAI: RotateCcw,
};

/**
 * Badge trạng thái trên trục duyệt, MỘT hình dạng cho mọi nơi: viên nền nhạt +
 * icon + chữ đậm vừa (chốt 17/09/2026). Kèm tên người kết luận khi có.
 * `truncate` nằm ở span chữ bên trong, vì dấu ba chấm không vẽ được trên một
 * flex container.
 */
export function ReviewStateBadge({
  state,
  by,
  size = 'sm',
  className,
}: {
  state: DailyReportBoardState;
  by?: string | null;
  size?: 'xs' | 'sm';
  className?: string;
}) {
  const label = BOARD_STATE_LABEL_VI[state];
  const Icon = BOARD_STATE_ICON[state];
  return (
    <span
      className={cn(
        'inline-flex max-w-full shrink-0 items-center gap-1 rounded-full font-semibold',
        size === 'xs'
          ? 'px-1.5 py-0.5 text-ws-chip'
          : 'px-2 py-0.5 text-ws-chip',
        BOARD_STATE_BADGE_CLASS[state],
        className,
      )}
    >
      <Icon
        aria-hidden='true'
        className={cn('shrink-0', size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5')}
      />
      <span className='truncate'>{by ? `${label} bởi ${by}` : label}</span>
    </span>
  );
}
