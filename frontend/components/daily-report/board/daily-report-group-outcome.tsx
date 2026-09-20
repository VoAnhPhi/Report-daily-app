'use client';

import { useMemo } from 'react';
import { Inbox } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportErrorState } from '../shared/report-error-state';
import { useReportGroupOutcome } from '@/hooks/queries/daily-report-queries';
import type {
  DailyReportQuestionKind,
  GroupOutcomeAnswer,
  GroupOutcomeReport,
} from '@/types/daily-report.type';
import { formatDateVi, formatTimeVi } from '../daily-report-utils';

/**
 * Bộ MỚI đứng trước, bộ cũ chen vào giữa. Một ngày chỉ có thể mang bộ này HOẶC
 * bộ kia (câu hỏi được chụp lại lúc sinh bản), nên thứ tự này đọc đúng ở cả hai
 * phía: ngày mới ra `done → blocked → need_help → tomorrow`, ngày trước
 * 25/08/2026 ra `today → done_blocked → need_help → tomorrow`.
 */
const KIND_ORDER: DailyReportQuestionKind[] = [
  'done',
  'blocked',
  'today',
  'done_blocked',
  'need_help',
  'tomorrow',
  'custom',
];

/** Chỉ dùng khi bản chụp không có nhãn — nhãn thật luôn đi kèm câu trả lời. */
const KIND_FALLBACK_LABEL: Record<DailyReportQuestionKind, string> = {
  done: 'Những việc nhóm đã hoàn thành',
  blocked: 'Những việc còn tồn đọng',
  need_help: 'Yêu cầu hỗ trợ',
  tomorrow: 'Công việc dự kiến ngày mai',
  custom: 'Nội dung khác',
  today: 'Hôm nay nhóm đã làm gì',
  done_blocked: 'Đã xong và tồn đọng',
};

interface OutcomeEntry {
  report: GroupOutcomeReport;
  answer: GroupOutcomeAnswer;
}

interface OutcomeSection {
  kind: DailyReportQuestionKind;
  label: string;
  entries: OutcomeEntry[];
}

/** Layout đọc outcome đã nộp của cả nhóm, gom theo từng câu hỏi. */
export function DailyReportGroupOutcome({
  scopeId,
  date,
}: {
  scopeId: string;
  date: string;
}) {
  const { data, isLoading, isError, refetch } = useReportGroupOutcome(
    scopeId,
    date,
    true,
  );

  const sections = useMemo<OutcomeSection[]>(() => {
    if (!data) return [];

    const grouped = new Map<DailyReportQuestionKind, OutcomeSection>();
    for (const report of data.reports) {
      for (const answer of report.answers) {
        if (!answer.content.trim()) continue;
        const section = grouped.get(answer.kind) ?? {
          kind: answer.kind,
          label: answer.label || KIND_FALLBACK_LABEL[answer.kind],
          entries: [],
        };
        section.entries.push({ report, answer });
        grouped.set(answer.kind, section);
      }
    }

    return Array.from(grouped.values()).sort((a, b) => {
      const orderA = KIND_ORDER.indexOf(a.kind);
      const orderB = KIND_ORDER.indexOf(b.kind);
      if (orderA !== orderB) return orderA - orderB;
      return a.label.localeCompare(b.label, 'vi');
    });
  }, [data]);

  return (
    <div className='space-y-4'>
      {isLoading ? (
        <OutcomeSkeleton />
      ) : isError ? (
        <ReportErrorState
          title='Không tải được tổng hợp của nhóm.'
          detail='Đây là lỗi tải dữ liệu, chưa phải là nhóm không có nội dung.'
          onRetry={() => void refetch()}
        />
      ) : !data ? null : (
        <>
          <section className='rounded-ws-card border border-ws-line bg-ws-surface px-4 py-3'>
            <div className='flex flex-wrap items-start gap-3'>
              <div className='mr-auto'>
                <p className='text-ws-chip font-semibold uppercase tracking-wide text-ws-ink-faint'>
                  Tổng hợp của nhóm
                </p>
                <h2 className='mt-1 text-ws-h2 font-semibold text-ws-ink'>
                  {data.scope.name}
                </h2>
                <p className='mt-0.5 text-ws-chip text-ws-ink-soft'>
                  {formatDateVi(data.date)} · Nội dung đã nộp của các thành viên
                </p>
              </div>
              <div className='rounded-ws-control bg-ws-surface-alt px-3 py-2 text-right'>
                <p className='text-ws-h1 font-semibold tabular-nums text-ws-ink'>
                  {data.stats.submitted}/{data.stats.total}
                </p>
                <p className='text-ws-micro text-ws-ink-faint'>đã nộp</p>
              </div>
            </div>
          </section>

          {sections.length === 0 ? (
            /* Khối rỗng phải nói được VÌ SAO trống, không chỉ báo là trống:
               một dòng chữ giữa hộp trắng dễ bị đọc thành "màn hình hỏng".
               Ở đây lý do luôn là chưa ai nộp — bảng theo dõi mới là chỗ trả
               lời "ai chưa nộp", nên khối này chỉ trỏ sang đó. */
            <div className='flex flex-col items-center justify-center rounded-ws-card border border-ws-line bg-ws-surface px-6 py-16 text-center'>
              <Inbox
                className='mb-2 h-8 w-8 text-ws-ink-ghost'
                aria-hidden='true'
              />
              <p className='text-ws-body font-medium text-ws-ink'>
                Chưa có nội dung tổng hợp đã nộp trong ngày này.
              </p>
              <p className='mt-1 max-w-[340px] text-ws-chip text-ws-ink-faint'>
                Màn này chỉ gom nội dung của những báo cáo đã nộp. Ai đã nộp và
                ai chưa thì xem ở bảng nhóm.
              </p>
            </div>
          ) : (
            sections.map((section) => (
              <section key={section.kind}>
                <h3 className='mb-2 text-ws-chip font-semibold uppercase tracking-wide text-ws-ink-faint'>
                  {section.label}
                </h3>
                <div className='space-y-2'>
                  {section.entries.map(({ report, answer }) => (
                    <article
                      key={`${section.kind}-${report.reportId}`}
                      className='rounded-ws-block border border-ws-line bg-ws-surface px-4 py-3'
                    >
                      <div className='mb-2 flex items-center gap-2'>
                        <Avatar className='h-7 w-7 shrink-0'>
                          <AvatarImage
                            src={report.avatarUrl ?? undefined}
                            alt={report.fullName}
                          />
                          <AvatarFallback className='text-ws-floor'>
                            {report.fullName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className='min-w-0 flex-1 truncate text-ws-body font-medium text-ws-ink'>
                          {report.fullName}
                        </span>
                        {report.submittedAt && (
                          <span className='shrink-0 font-mono text-ws-micro tabular-nums text-ws-ink-faint'>
                            {formatTimeVi(report.submittedAt)}
                          </span>
                        )}
                      </div>
                      <p className='whitespace-pre-wrap text-ws-body leading-relaxed text-ws-ink-soft'>
                        {answer.content.trim()}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}

/**
 * Khung chờ giữ đúng hình dạng màn outcome: thẻ đầu (tên nhóm + ô đếm đã nộp),
 * rồi tới từng cụm câu hỏi với thẻ nội dung có avatar. Vòng xoay giữa màn cũ
 * không cho biết trước sắp hiện cái gì.
 */
function OutcomeSkeleton() {
  return (
    <div
      role='status'
      aria-busy='true'
      aria-label='Đang tải tổng hợp của nhóm'
      className='space-y-4'
    >
      <div
        aria-hidden='true'
        className='rounded-ws-card border border-ws-line bg-ws-surface px-4 py-3'
      >
        <div className='flex items-start gap-3'>
          <div className='mr-auto space-y-2'>
            <Skeleton className='h-2.5 w-28 rounded-ws-bar bg-ws-surface-sunken' />
            <Skeleton className='h-4 w-40 rounded-ws-bar bg-ws-surface-sunken' />
            <Skeleton className='h-3 w-52 rounded-ws-bar bg-ws-surface-sunken' />
          </div>
          <Skeleton className='h-12 w-16 shrink-0 rounded-ws-control bg-ws-surface-sunken' />
        </div>
      </div>

      {[0, 1].map((i) => (
        <div key={i} aria-hidden='true' className='space-y-2'>
          <Skeleton className='h-2.5 w-32 rounded-ws-bar bg-ws-surface-sunken' />
          <div className='rounded-ws-block border border-ws-line bg-ws-surface px-4 py-3'>
            <div className='mb-2 flex items-center gap-2'>
              <Skeleton className='h-7 w-7 shrink-0 rounded-full bg-ws-surface-sunken' />
              <Skeleton className='h-3 w-28 rounded-ws-bar bg-ws-surface-sunken' />
            </div>
            <Skeleton className='h-3 w-full rounded-ws-bar bg-ws-surface-sunken' />
            <Skeleton className='mt-1.5 h-3 w-3/4 rounded-ws-bar bg-ws-surface-sunken' />
          </div>
        </div>
      ))}
    </div>
  );
}

/* `GroupOutcomeBackButton` đã bị XOÁ khỏi đây, không phải chuyển đi chỗ khác.
   Nút quay lại nay do `daily-report-board.tsx` tự vẽ bằng `<Button
   variant='outline'>` để dùng CHUNG một khuôn với nút "Tổng hợp" thay chỗ nó
   trên hàng thống kê — hai nút lệch khuôn thì cả hàng nhảy một nhịp mỗi lần
   đổi trạng thái. Bản ở đây không còn ai gọi; `tsc` không bao giờ báo một hàm
   đã `export`, nên nó sẽ nằm im mà mục rữa. */
