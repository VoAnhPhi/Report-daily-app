'use client';

import Link from 'next/link';
import { Building2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PendingReviewRow } from '@/types/daily-report.type';
import { AvatarStack } from '../shared/person-avatar';
import {
  REPORT_ROW_PAD,
  ReportRowAside,
  ReportRowList,
  ReportRowMain,
  ReviewStateBadge,
  RowActionLabel,
} from '../shared/report-row';
import { FOCUS_RING_SURFACE as FOCUS_RING } from '../utils/classes';
import { formatDayMonthVi, formatDeadlineVi } from '../utils/date';

/**
 * Danh sách bản chờ kết luận của một nhóm, XUYÊN NGÀY, gom theo bộ phận.
 *
 * Vì sao không phải một bộ lọc trên bảng một ngày: ở đây khoá là BẢN - một
 * người có thể còn ba ngày chưa ai duyệt. Dòng nào cũng in NGÀY BÁO CÁO.
 *
 * Dòng dùng khuôn chung `shared/report-row` như bảng Nhóm, nên ba chỗ hiện
 * "bản chờ duyệt" trông như một (UAT 17/09/2026).
 */
export function BoardPendingReviewList({
  rows,
  reportHref,
}: {
  rows: PendingReviewRow[];
  /** `null` khi màn đang dựng không có đường sang bản chi tiết. */
  reportHref: ((reportId: string) => string) | null;
}) {
  if (rows.length === 0) {
    return (
      <div className='flex flex-col items-center rounded-ws-block border border-dashed border-ws-line px-6 py-10 text-center'>
        <span
          aria-hidden='true'
          className='flex h-10 w-10 items-center justify-center rounded-full bg-ws-done-bg text-ws-done-fg'
        >
          <CheckCircle2 className='h-5 w-5' />
        </span>
        <p className='mt-3 text-ws-body font-semibold text-ws-ink'>
          Không còn bản nào chờ duyệt
        </p>
        <p className='mt-1 max-w-[340px] text-ws-chip text-ws-ink-faint'>
          Mục này gom mọi ngày còn trong hạn duyệt, không chỉ ngày đang xem.
        </p>
      </div>
    );
  }

  /* MỘT mục cho mỗi bộ phận, gom trên TOÀN danh sách chứ không chỉ các dòng
     liền nhau. Server xếp theo hạn duyệt, nên bản của cùng một bộ phận nằm xen
     kẽ bản của bộ phận khác; bản cũ gom theo dòng liền nhau nên cùng một tiêu
     đề hiện hai, ba lần và đọc ra như dữ liệu bị lặp (UAT 18/09/2026).
     Thứ tự mục theo bản GẤP NHẤT của mục đó (lần đầu xuất hiện), và trong mục
     các bản vẫn giữ thứ tự hạn duyệt của server. */
  const groups: { key: string; label: string; rows: PendingReviewRow[] }[] = [];
  const groupByLabel = new Map<string, (typeof groups)[number]>();
  for (const row of rows) {
    const label = departmentLabel(row);
    const found = groupByLabel.get(label);
    if (found) {
      found.rows.push(row);
      continue;
    }
    const group = { key: label, label, rows: [row] };
    groupByLabel.set(label, group);
    groups.push(group);
  }

  return (
    <div className='space-y-4'>
      {groups.map((group) => {
        const reviewers = uniqueReviewers(group.rows);
        return (
          <section key={group.key} aria-label={group.label}>
            <header className='mb-2 flex min-w-0 items-center gap-2'>
              <Building2
                aria-hidden='true'
                className='h-4 w-4 shrink-0 text-ws-ink-faint'
              />
              <h3 className='min-w-0 truncate text-ws-cell font-semibold text-ws-ink'>
                {group.label}
              </h3>
              <span className='shrink-0 text-ws-chip tabular-nums text-ws-ink-faint'>
                {group.rows.length} bản
              </span>
              {reviewers.length > 0 && (
                <span
                  className='ml-auto flex shrink-0 items-center gap-1.5 text-ws-chip text-ws-ink-faint'
                  title={reviewers.map((r) => r.fullName).join(', ')}
                >
                  <span className='hidden sm:inline'>Người duyệt</span>
                  <span className='sr-only'>
                    : {reviewers.map((r) => r.fullName).join(', ')}
                  </span>
                  <AvatarStack people={reviewers} />
                </span>
              )}
            </header>
            <ReportRowList>
              {group.rows.map((row) => (
                <li key={row.reportId}>
                  <PendingReviewItem
                    row={row}
                    href={reportHref ? reportHref(row.reportId) : null}
                  />
                </li>
              ))}
            </ReportRowList>
          </section>
        );
      })}
    </div>
  );
}

/** Nhãn bộ phận của một dòng; rỗng nghĩa là chỉ trưởng nhóm duyệt người đó. */
function departmentLabel(row: PendingReviewRow): string {
  const names = row.departments.map((department) => department.name);
  if (names.length === 0) return 'Chưa thuộc bộ phận nào';
  return [...names].sort((a, b) => a.localeCompare(b, 'vi')).join(' · ');
}

function uniqueReviewers(rows: PendingReviewRow[]) {
  const map = new Map<
    string,
    { id: string; fullName: string; avatarUrl: string | null }
  >();
  for (const row of rows) {
    for (const department of row.departments) {
      for (const reviewer of department.reviewers) {
        if (!map.has(reviewer.id)) map.set(reviewer.id, reviewer);
      }
    }
  }
  return Array.from(map.values());
}

/** Một dòng = một bản. CẢ DÒNG là link sang bản. */
function PendingReviewItem({
  row,
  href,
}: {
  row: PendingReviewRow;
  href: string | null;
}) {
  const deadline = formatDeadlineVi(row.reviewDeadlineAt);
  const day = formatDayMonthVi(row.reportDate);

  const body = (
    <>
      <ReportRowMain
        name={row.owner.fullName}
        avatarUrl={row.owner.avatarUrl}
        seed={row.owner.id}
        meta={
          <>
            <ReviewStateBadge state='CHO_DUYET' />
            <span className='whitespace-nowrap tabular-nums'>
              Bản ngày {day}
            </span>
            {/* Khổ hẹp: hạn duyệt xuống dòng này, nhường cột phải cho tên và
                badge (320px từng cắt "Chờ duyệt" còn "Chờ…"). */}
            {deadline !== '' && (
              <span className='whitespace-nowrap tabular-nums sm:hidden'>
                Hạn {deadline}
              </span>
            )}
          </>
        }
      />
      <ReportRowAside
        time={deadline !== '' ? `Hạn ${deadline}` : null}
        timeClassName='hidden sm:block'
      >
        {href !== null && (
          <RowActionLabel kind={row.canReview ? 'review' : 'readonly'} />
        )}
      </ReportRowAside>
    </>
  );

  const rowClass = cn('flex items-center gap-3', REPORT_ROW_PAD);

  if (href === null) {
    return <div className={rowClass}>{body}</div>;
  }
  return (
    <Link
      href={href}
      aria-label={`${row.canReview ? 'Duyệt' : 'Mở'} bản ngày ${day} của ${row.owner.fullName}`}
      className={cn(
        rowClass,
        'transition-colors hover:bg-ws-surface-alt',
        FOCUS_RING,
      )}
    >
      {body}
    </Link>
  );
}
