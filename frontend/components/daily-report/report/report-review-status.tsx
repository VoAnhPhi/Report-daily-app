'use client';

import type { ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type {
  DailyReport,
  DailyReportBoardState,
} from '@/types/daily-report.type';

import { formatDeadlineVi, formatTimeOnDayVi } from '../utils/date';
import { isInReviewCycle } from '../utils/status';

type Tone = 'progress' | 'done' | 'attention' | 'closed' | 'neutral';

/* Theo luật mượn token của vòng đời bản báo cáo (`03-bo-mau.md` mục 83):
   `progress` = đang chờ một bước, `done` = đã đạt, `void` = hết đường nộp.
   "Cần một người ra tay" dùng chữ `ws-danger` trên nền trung tính, cùng cách
   badge của bảng nhóm làm (`BOARD_STATE_BADGE_CLASS`). */
const TONE_CLASS: Record<Tone, string> = {
  progress: 'border-ws-progress-edge bg-ws-progress-bg text-ws-progress-fg',
  done: 'border-ws-done-edge bg-ws-done-bg text-ws-done-fg',
  attention: 'border-ws-line bg-ws-surface-alt text-ws-ink-soft',
  closed: 'border-ws-void-edge bg-ws-void-bg text-ws-void-fg',
  neutral: 'border-ws-line bg-ws-surface-alt text-ws-ink-soft',
};

interface StatusCopy {
  tone: Tone;
  icon: LucideIcon;
  title: string;
  /** Các mảnh phụ, nối bằng " · ". Mảnh rỗng bị bỏ. */
  details: (string | null)[];
  /** Lời người duyệt, in NGUYÊN VĂN trên dòng riêng. */
  quote?: { who: string; text: string } | null;
}

/**
 * Trạng thái của MỘT bản theo trục duyệt, nói bằng giọng của người đang xem.
 *
 * Cùng một trạng thái cần hai câu khác nhau: chủ bản đọc "Bị trả lại, cần sửa
 * và nộp lại", còn người duyệt mở lại bản đó phải đọc "Đã trả lại cho An".
 * In chung một câu là một trong hai người đọc sai việc của mình.
 *
 * Đọc `boardState` do server suy (một nguồn với bảng nhóm), không tự ghép lại
 * từ `status` + `review.decision`. Thiếu `boardState` (cache dựng trước bản
 * server mới) thì rơi về đúng hai dải của bản cũ.
 */
function describe(
  report: DailyReport,
  isOwnReport: boolean,
): StatusCopy | null {
  const review = report.review as DailyReport['review'] | undefined;
  const ownerName = report.owner.fullName ?? 'thành viên';
  const reviewerName = review?.reviewerName ?? null;
  const comment = review?.comment?.trim() || null;
  const submittedAt = report.lastSubmittedAt ?? report.firstSubmittedAt;
  const submittedLine = submittedAt
    ? `Đã nộp lúc ${formatTimeOnDayVi(submittedAt, report.reportDate)}`
    : null;
  const reviewDeadline = review?.deadlineAt
    ? `Hạn duyệt: ${formatDeadlineVi(review.deadlineAt)}`
    : null;
  /* Hạn nộp lại là giờ khoá của ngày làm việc KẾ TIẾP, nên phải in cả ngày:
     chỉ in "23:00" là người đọc hiểu thành tối nay. */
  const editDeadline = review?.editableUntil
    ? `Hạn nộp lại: ${formatDeadlineVi(review.editableUntil)}`
    : null;
  const quote =
    comment !== null
      ? { who: reviewerName ?? 'Người duyệt', text: comment }
      : null;
  const inCycle = isInReviewCycle({
    deadlineAt: review?.deadlineAt,
    decision: review?.decision,
    expiredAt: review?.expiredAt,
  });

  const state: DailyReportBoardState | undefined = report.boardState;

  switch (state) {
    case 'CHUA_NOP':
      // Chủ bản đang đứng ngay trước form: chính form là lời mời nộp. Người
      // khác mở một bản chưa nộp thì phải biết vì sao nó trống.
      if (isOwnReport || report.isLocked) return null;
      return {
        tone: 'neutral',
        icon: Clock,
        title: `${ownerName} chưa nộp bản này`,
        details: [],
      };

    case 'CHO_DUYET':
      /* Bản nộp trước khi có vòng duyệt: server vẫn suy nó là "Chờ duyệt" mãi
         mãi vì cron chỉ đóng bản có hạn. In "đang chờ duyệt" cho nó là nói
         với người dùng một điều không có thật. */
      if (!inCycle) {
        return submittedLine
          ? {
              tone: 'done',
              icon: CheckCircle2,
              title: submittedLine,
              details: [],
            }
          : null;
      }
      return {
        tone: 'progress',
        icon: Clock,
        title: isOwnReport
          ? 'Đã nộp, đang chờ duyệt'
          : review?.canReview
            ? 'Chờ bạn duyệt'
            : 'Đang chờ người duyệt',
        details: [submittedLine, reviewDeadline],
      };

    case 'QUA_HAN_DUYET':
      return {
        tone: isOwnReport ? 'neutral' : 'attention',
        icon: AlertTriangle,
        title: 'Quá hạn duyệt',
        details: [
          submittedLine,
          isOwnReport
            ? 'Người duyệt chưa kết luận trước hạn. Bạn không phải làm gì thêm.'
            : review?.deadlineAt
              ? `Hạn duyệt đã qua lúc ${formatDeadlineVi(review.deadlineAt)}, không kết luận được nữa.`
              : 'Hạn duyệt đã qua, không kết luận được nữa.',
        ],
      };

    case 'DA_DUYET':
      return {
        tone: 'done',
        icon: CheckCircle2,
        title: reviewerName ? `Đạt · ${reviewerName} duyệt` : 'Đạt',
        details: [submittedLine],
        quote,
      };

    case 'TIEP_TUC':
      return {
        tone: 'done',
        icon: CheckCircle2,
        title: reviewerName
          ? `Tiếp tục thực hiện · ${reviewerName} duyệt`
          : 'Tiếp tục thực hiện',
        details: [submittedLine],
        quote,
      };

    case 'BI_TRA_LAI':
      return {
        tone: 'attention',
        icon: RotateCcw,
        title: isOwnReport
          ? 'Bị trả lại, cần sửa và nộp lại'
          : `Đã trả lại cho ${ownerName} sửa`,
        details: [editDeadline],
        /* Lý do trả lại là câu quan trọng nhất của cả dải. Thiếu `comment`
           (cache cũ) thì lấy `reopenReason`: server ghi cùng một lý do vào đó
           khi trả lại. */
        quote:
          quote ??
          (report.reopenReason
            ? { who: reviewerName ?? 'Người duyệt', text: report.reopenReason }
            : null),
      };

    case 'DA_MO_LAI':
      return {
        tone: 'progress',
        icon: RotateCcw,
        title: isOwnReport
          ? 'Đã mở lại để bạn bổ sung'
          : `Đã mở lại cho ${ownerName} bổ sung`,
        details: [report.reopenReason, editDeadline],
      };

    case 'QUA_HAN_BO_SUNG':
      return {
        tone: 'closed',
        icon: AlertTriangle,
        title: 'Quá hạn bổ sung',
        details: [
          isOwnReport
            ? 'Hết hạn sửa mà chưa nộp lại. Chỉ trưởng nhóm cấp thêm hạn được.'
            : `${ownerName} chưa nộp lại trước hạn sửa.`,
        ],
      };

    default:
      /* Cache cũ chưa có `boardState`: giữ đúng hai dải của bản trước. */
      if (report.status === 'SUBMITTED' && submittedLine) {
        return {
          tone: 'done',
          icon: CheckCircle2,
          title: submittedLine,
          details: [],
        };
      }
      if (report.status === 'REOPENED') {
        return {
          tone: 'progress',
          icon: RotateCcw,
          title:
            review?.decision === 'REJECTED'
              ? 'Báo cáo bị trả lại'
              : 'Đã mở lại để bổ sung',
          details: [report.reopenReason, editDeadline],
        };
      }
      return null;
  }
}

/**
 * MỘT dải trạng thái cho cả bản, thay cho hai dải rời của bản trước ("Đã nộp
 * lúc…" và dải REOPENED). Hai dải chồng nhau nói hai nửa của cùng một chuyện,
 * và cả hai đều không nói điều người đọc cần nhất: bản này đang chờ ai, ai đã
 * kết luận, người duyệt viết gì.
 *
 * `action` là chỗ của nút mở lại / cấp thêm hạn: state của ô nhập lý do nằm ở
 * `ReportForm`, dải này chỉ chừa chỗ đứng.
 */
export function ReportReviewStatus({
  report,
  isOwnReport,
  action,
  hideQuote = false,
}: {
  report: DailyReport;
  isOwnReport: boolean;
  action?: ReactNode;
  /**
   * Bỏ lời người duyệt khỏi dải, khi khối "Kết luận của người duyệt" ở cuối
   * trang đã in nguyên văn lời đó kèm nhãn. Dải giữ lại lời cho `BI_TRA_LAI`:
   * lý do trả lại là việc người đọc phải LÀM ngay, không phải hồ sơ để tra.
   */
  hideQuote?: boolean;
}) {
  const copy = describe(report, isOwnReport);
  if (!copy && !action) return null;

  if (!copy) {
    return <div className='flex justify-end'>{action}</div>;
  }

  const Icon = copy.icon;
  const details = copy.details.filter(
    (part): part is string => typeof part === 'string' && part.length > 0,
  );

  return (
    /* `role='status'` để trình đọc màn hình đọc lại khi kết luận đổi ngay
       trên màn (người duyệt vừa bấm Gửi kết luận). */
    <div
      role='status'
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs',
        TONE_CLASS[copy.tone],
      )}
    >
      {/* `flex-auto` chứ KHÔNG `flex-1`: `flex-1` đặt flex-basis về 0, nên
          thuật toán xuống dòng coi khối chữ là rộng 0 và luôn nhét nó chung
          hàng với cụm nút. Đo ngày 11/09 ở 375px: chữ bị bóp còn một ký tự mỗi
          dòng. Basis theo nội dung thì cụm nút tự rớt xuống dòng dưới khi
          không đủ chỗ. */}
      <div className='flex min-w-0 flex-auto items-start gap-1.5'>
        <Icon className='mt-0.5 h-3.5 w-3.5 shrink-0' aria-hidden='true' />
        <div className='min-w-0'>
          <p
            className={cn(
              'font-semibold',
              copy.tone === 'attention' && 'text-ws-danger',
            )}
          >
            {copy.title}
          </p>
          {details.length > 0 && (
            /* Mỗi mẩu là MỘT khối không ngắt dòng: ở 320px câu
               "Đã nộp lúc 16:26 · Hạn duyệt: 23:00 18/09" bị bẻ đúng giữa giờ
               và ngày, cho ra "Hạn duyệt: 23:00" ở dòng trên và "18/09" ở dòng
               dưới - đọc thành hạn là tối nay (đo 16/09/2026, ca D4 của UAT).
               Mẩu dài nhất khoảng 130px nên ở khổ hẹp nhất vẫn vừa một dòng. */
            <p className='mt-0.5 flex flex-wrap items-center gap-x-1.5 break-words'>
              {details.map((part, index) => (
                <span key={part} className='whitespace-nowrap'>
                  {index > 0 && (
                    <span aria-hidden='true' className='mr-1.5'>
                      ·
                    </span>
                  )}
                  {part}
                </span>
              ))}
            </p>
          )}
          {copy.quote && !hideQuote && (
            <p className='mt-1 whitespace-pre-wrap break-words'>
              <span className='font-medium'>{copy.quote.who}:</span> “
              {copy.quote.text}”
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
