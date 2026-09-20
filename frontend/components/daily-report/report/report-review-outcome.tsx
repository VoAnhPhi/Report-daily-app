'use client';

import {
  CheckCircle2,
  ListChecks,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type {
  DailyReport,
  DailyReportReviewDecision,
} from '@/types/daily-report.type';

import { formatDeadlineVi } from '../utils/date';
import { REVIEW_DECISION_LABEL_VI } from '../utils/labels';

const TONE: Record<
  DailyReportReviewDecision,
  { icon: LucideIcon; pill: string }
> = {
  ACCEPTED: {
    icon: CheckCircle2,
    pill: 'border-ws-done-edge bg-ws-done-bg text-ws-done-fg',
  },
  CONTINUED: {
    icon: ListChecks,
    pill: 'border-ws-done-edge bg-ws-done-bg text-ws-done-fg',
  },
  /* "Trả lại" KHÔNG dùng nền đỏ: nó là một kết luận hợp lệ của quy trình, không
     phải lỗi hệ thống. Chữ đỏ trên nền trung tính, cùng cách badge bảng nhóm
     làm với `BI_TRA_LAI`. */
  REJECTED: {
    icon: RotateCcw,
    pill: 'border-ws-line bg-ws-surface text-ws-danger',
  },
};

/**
 * Kết luận ĐÃ CÓ của người duyệt, đứng đúng chỗ của form kết luận (cùng `id`
 * neo `#khoi-duyet-bao-cao`, và hai khối không bao giờ cùng hiện: form chỉ hiện
 * khi `canReview`, mà `canReview` của server đòi `reviewDecision = null`).
 *
 * Vì sao cần khối này: trước vòng sửa 16/09/2026, kết luận chỉ hiện trong dải
 * trạng thái trên đầu bản dưới dạng một dòng gộp ("Đạt · Trần Minh duyệt" kèm
 * lời trong ngoặc kép), nên không có chỗ nào nói LÚC NÀO duyệt, và bốn thứ
 * người đọc cần - trạng thái, ai, lúc nào, nội dung - nằm chen trong một dòng
 * chữ 12px. Thứ tự ở đây theo đúng câu hỏi người đọc hỏi: kết luận gì → ai và
 * lúc nào → viết gì.
 */
export function ReportReviewOutcome({ report }: { report: DailyReport }) {
  const review = report.review;
  const decision = review?.decision ?? null;
  if (!review || decision === null) return null;

  const { icon: Icon, pill } = TONE[decision];
  const comment = review.comment?.trim() || null;
  const commentLabel = decision === 'REJECTED' ? 'Lý do trả lại' : 'Nhận xét';
  const reviewedAt = review.reviewedAt
    ? formatDeadlineVi(review.reviewedAt)
    : null;
  /* Chỉ nói "lần nộp thứ N" khi thật sự có nhiều lần nộp: in "lần nộp thứ 1"
     cho mọi bản là thêm một con số không nói gì. */
  const revision =
    review.reviewedRevisionNumber !== null && review.reviewedRevisionNumber > 1
      ? `lần nộp thứ ${review.reviewedRevisionNumber}`
      : null;
  const editableUntil =
    decision === 'REJECTED' && review.editableUntil
      ? formatDeadlineVi(review.editableUntil)
      : null;

  return (
    <section
      id='khoi-duyet-bao-cao'
      aria-labelledby='khoi-duyet-bao-cao-tieu-de'
      className='scroll-mt-[calc(var(--ws-sticky-top,0px)+0.75rem)] rounded-xl border border-ws-line bg-ws-surface-alt p-4'
    >
      <h3
        id='khoi-duyet-bao-cao-tieu-de'
        className='text-sm font-semibold text-ws-ink'
      >
        Kết luận của người duyệt
      </h3>

      {/* Tầng 1: kết luận. Là thứ to nhất trong khối vì mọi câu dưới đều chỉ
          giải thích cho nó. */}
      <p
        className={cn(
          'mt-3 inline-flex items-center gap-1.5 rounded-ws-control border px-2.5 py-1 text-ws-body font-semibold',
          pill,
        )}
      >
        <Icon aria-hidden='true' className='h-4 w-4 shrink-0' />
        {REVIEW_DECISION_LABEL_VI[decision]}
      </p>

      {/* Tầng 2: ai và lúc nào. Một dòng, vì đây là siêu dữ liệu chứ không
          phải nội dung. */}
      <p className='mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-ws-chip text-ws-ink-soft'>
        <span className='font-medium text-ws-ink'>
          {review.reviewerName ?? 'Người duyệt'}
        </span>
        {reviewedAt !== null && <span>lúc {reviewedAt}</span>}
        {revision !== null && <span>{revision}</span>}
      </p>

      {/* Tầng 3: lời của người duyệt. Có nhãn riêng để không đọc lẫn vào dòng
          siêu dữ liệu ngay trên, và giữ nguyên xuống dòng người ta gõ. */}
      {comment !== null ? (
        <div className='mt-3'>
          <p className='text-ws-micro font-semibold uppercase tracking-wide text-ws-ink-faint'>
            {commentLabel}
          </p>
          <p className='mt-1 whitespace-pre-wrap break-words text-ws-body text-ws-ink'>
            {comment}
          </p>
        </div>
      ) : (
        <p className='mt-3 text-ws-chip text-ws-ink-faint'>
          Không có {commentLabel.toLowerCase()}.
        </p>
      )}

      {editableUntil !== null && (
        <p className='mt-3 text-ws-chip text-ws-ink-soft'>
          Hạn nộp lại: {editableUntil}
        </p>
      )}
    </section>
  );
}
