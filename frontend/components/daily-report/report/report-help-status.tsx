'use client';

import { CheckCircle2, LifeBuoy } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ReportHelpRequest } from '@/types/daily-report.type';

import { HelpResolveButton } from '../shared/help-resolve-button';
import { formatDeadlineVi } from '../utils/date';

/**
 * Trạng thái giải quyết của yêu cầu hỗ trợ, ngay dưới câu trả lời câu 3.
 *
 * Dựng lại sau UAT 16/09/2026 lượt 2 (theo `ui-ux-pro-max`): bản trước là một
 * dải xám cao 32px, chip trạng thái 10px và ô tích "Xong" dồn về mép phải, nên
 * người duyệt không thấy đây là một việc CẦN LÀM. Nay là một khối có:
 *   · icon + màu theo trạng thái (đỏ còn mở, xanh đã xong) - chữ luôn đi kèm;
 *   · một câu nói trạng thái, và ai giải quyết lúc nào khi đã xong;
 *   · một nút nói đúng hành động (`HelpResolveButton`).
 *
 * Chỉ hai trạng thái: "Chưa giải quyết" và "Đã giải quyết" (chốt 15/09/2026).
 * Ai bấm được do server quyết qua `permissions.canResolveHelp`.
 *
 * `report-form.tsx` dựng component này và truyền vào câu hỏi qua slot
 * `belowAnswer`; `DailyReportQuestion` KHÔNG import nó, vì nút kéo theo
 * `daily-report-queries` rồi `next-auth/react` (bản ESM) và làm hỏng các bộ test
 * chỉ render câu hỏi.
 */
export function ReportHelpStatus({
  helpRequest,
  canResolve,
}: {
  helpRequest: ReportHelpRequest;
  canResolve: boolean;
}) {
  const resolved = helpRequest.status === 'RESOLVED';
  const Icon = resolved ? CheckCircle2 : LifeBuoy;

  const meta = resolved
    ? [
        helpRequest.resolvedBy?.fullName
          ? `bởi ${helpRequest.resolvedBy.fullName}`
          : null,
        helpRequest.resolvedAt
          ? `lúc ${formatDeadlineVi(helpRequest.resolvedAt)}`
          : null,
      ]
        .filter(Boolean)
        .join(' ')
    : canResolve
      ? 'Bấm "Đã giải quyết" khi vấn đề này đã được xử lý.'
      : 'Đang chờ người phụ trách xử lý.';

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-ws-block border px-3 py-2.5',
        resolved
          ? 'border-ws-line bg-ws-surface'
          : 'border-ws-danger/30 bg-ws-surface',
      )}
    >
      <span
        aria-hidden='true'
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          resolved
            ? 'bg-ws-done-bg text-ws-done-fg'
            : 'bg-ws-surface-sunken text-ws-danger',
        )}
      >
        <Icon className='h-4 w-4' />
      </span>
      {/* `role='status'`: trình đọc màn hình đọc lại khi trạng thái đổi ngay
          trên màn, tức ngay sau khi bấm nút. */}
      <p role='status' className='min-w-0 flex-1 basis-48'>
        <span
          className={cn(
            'block text-ws-cell font-semibold',
            resolved ? 'text-ws-done-fg' : 'text-ws-danger',
          )}
        >
          {resolved
            ? 'Yêu cầu hỗ trợ đã giải quyết'
            : 'Yêu cầu hỗ trợ chưa giải quyết'}
        </span>
        {meta && (
          <span className='block text-ws-meta text-ws-ink-soft'>{meta}</span>
        )}
      </p>
      {canResolve && (
        <HelpResolveButton
          helpId={helpRequest.id}
          reportId={helpRequest.reportId}
          resolved={resolved}
          subject='yêu cầu hỗ trợ của bản này'
        />
      )}
    </div>
  );
}
