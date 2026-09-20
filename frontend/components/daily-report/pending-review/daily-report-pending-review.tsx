'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import { useReportPendingReview } from '@/hooks/queries/daily-report-queries';

import { BoardPendingReviewList } from '../board/board-pending-review';
import { InfoHint } from '../shared/info-hint';
import { PageNav } from '../shared/page-nav';
import { useScrollToStart } from '../shared/use-scroll-to-start';
import { ReportErrorState } from '../shared/report-error-state';
import { ReportLoadingSpinner } from '../shared/report-loading-spinner';
import { FOCUS_RING_SURFACE as FOCUS_RING } from '../utils/classes';

/**
 * Hàng đợi "Chờ duyệt" của một nhóm: mọi bản còn chờ kết luận, XUYÊN NGÀY,
 * gom theo bộ phận.
 *
 * Một component cho HAI chỗ: tab "Chờ duyệt" và bộ lọc "Chờ duyệt" trong tab
 * Nhóm (`embedded`). Trước 17/09/2026 hai chỗ vẽ hai kiểu khác nhau cho cùng
 * một danh sách.
 *
 * Nút "Bắt đầu duyệt" (trước là "Duyệt lần lượt") mở bản GẤP NHẤT; trong bản
 * có nút "Bản chờ duyệt kế tiếp" đi tiếp theo đúng thứ tự của danh sách này.
 */
export function DailyReportPendingReview({
  scopeId,
  reportHref,
  embedded = false,
  onPageChange,
}: {
  scopeId: string;
  reportHref?: (reportId: string) => string;
  /** Nằm trong tab Nhóm: không tự thêm đệm ngoài. */
  embedded?: boolean;
  /** Nằm trong tab Nhóm: bảng cha tự đưa đầu bảng về tầm nhìn khi đổi trang,
   *  vì đầu bảng (dính từ `sm`) mới là chỗ người dùng cần thấy. */
  onPageChange?: () => void;
}) {
  const [page, setPageState] = useState(1);
  const [listRef, requestListScroll] = useScrollToStart<HTMLDivElement>();
  const setPage = (next: number) => {
    setPageState(next);
    if (onPageChange) onPageChange();
    else requestListScroll();
  };
  const { data, isLoading, isError, refetch } = useReportPendingReview(
    scopeId,
    { page },
  );

  const wrap = embedded ? 'space-y-4' : 'space-y-4 p-4 md:p-5';

  if (isLoading && data === undefined) {
    return <ReportLoadingSpinner label='Đang tải danh sách chờ duyệt' />;
  }
  if (isError) {
    return (
      <div className={embedded ? undefined : 'p-5'}>
        <ReportErrorState
          title='Không tải được danh sách chờ duyệt.'
          detail='Đây là lỗi tải dữ liệu, chưa biết được còn bản nào phải duyệt.'
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const rows = data?.data ?? [];
  const total = data?.total ?? rows.length;
  const firstReviewable = rows.find((row) => row.canReview) ?? null;

  return (
    <div
      ref={listRef}
      className={cn(wrap, 'scroll-mt-[var(--ws-sticky-top,0px)]')}
    >
      {total > 0 && (
        <div className='flex flex-wrap items-center gap-x-4 gap-y-3 rounded-ws-block border border-ws-line bg-ws-surface-alt px-4 py-3'>
          <div className='min-w-0 flex-1 basis-56'>
            <p className='flex items-center gap-1 text-ws-body font-semibold text-ws-ink'>
              <span className='tabular-nums'>{total}</span> bản đang chờ kết
              luận
              <InfoHint label='Danh sách này gồm những gì'>
                Mọi bản đã nộp mà chưa ai kết luận, của mọi ngày còn trong hạn
                duyệt, xếp theo hạn gần nhất trước.
                {data?.isFilteredToAssignment
                  ? ' Bạn chỉ thấy những người bạn phụ trách.'
                  : ''}
              </InfoHint>
            </p>
            <p className='text-ws-meta text-ws-ink-soft'>
              Bấm "Bắt đầu duyệt" để mở bản gấp nhất, duyệt xong đi tiếp bằng
              nút "Bản chờ duyệt kế tiếp".
            </p>
          </div>
          {reportHref && firstReviewable && (
            <Link
              href={reportHref(firstReviewable.reportId)}
              className={cn(
                'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-ws-control bg-ws-solid px-4 text-ws-cell font-semibold text-ws-solid-ink transition-opacity hover:opacity-90 sm:h-9',
                FOCUS_RING,
              )}
            >
              Bắt đầu duyệt
              <ArrowRight aria-hidden='true' className='h-4 w-4' />
            </Link>
          )}
        </div>
      )}

      <BoardPendingReviewList rows={rows} reportHref={reportHref ?? null} />

      <PageNav
        page={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        onChange={setPage}
        label='danh sách chờ duyệt'
      />
    </div>
  );
}
