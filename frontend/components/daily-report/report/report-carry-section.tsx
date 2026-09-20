'use client';

import { useRef } from 'react';
import { CornerDownRight, Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCancelCarryOver } from '@/hooks/queries/daily-report-queries';
import type { CarryOverView, DailyReport } from '@/types/daily-report.type';

import { formatDateVi } from '../utils/date';
import { CARRY_LONG_CHAIN_WARNING, carryItemLabel } from '../utils/labels';

/**
 * Việc cần làm tiếp: những việc người duyệt đã chuyển sang ngày làm việc kế
 * tiếp từ MỘT bản báo cáo, kể cả việc đã huỷ - thiết kế mục 10.4 đòi nói rõ chứ
 * không lặng lẽ giấu đi.
 *
 * Chỉ đọc. Từ 15/09/2026 thành viên không tự chuyển việc sang ngày sau nữa: câu
 * "ngày làm việc tiếp theo bạn dự định làm gì" là chỗ ghi việc của mình, còn
 * việc phải làm tiếp là kết luận của người duyệt. Nút huỷ chỉ hiện trên dòng mà
 * server nói người xem huỷ được (`canCancel`).
 */
export function ReportCarrySection({ report }: { report: DailyReport }) {
  // Cache dựng trước khi server trả khối này thì `carry` vắng: coi như rỗng.
  const outgoing = report.carry?.outgoing ?? [];
  const {
    mutate: huy,
    isPending: dangHuy,
    variables: dangHuyDong,
  } = useCancelCarryOver(report.id);
  /* Dòng vừa huỷ mất nút sau khi tải lại, và tiêu điểm bàn phím rơi về `body` -
     người dùng bàn phím phải Tab lại từ đầu trang. Đưa tiêu điểm về tiêu đề
     khối là giữ họ ở đúng chỗ. */
  const tieuDeRef = useRef<HTMLHeadingElement>(null);
  const veTieuDe = () => tieuDeRef.current?.focus();

  if (outgoing.length === 0) return null;

  /* Kết luận "Tiếp tục thực hiện" mà mọi việc đã bị huỷ: kết luận KHÔNG tự đổi
     theo (thiết kế mục 10.4), nên phải nói ra, không thì bản trông như có việc
     được chuyển mà ngày sau chẳng thấy gì. */
  const tiepTucDaHuyHet =
    report.review?.decision === 'CONTINUED' &&
    outgoing.every((row) => row.cancelledAt !== null);

  const tieuDeId = `viec-can-lam-tiep-${report.id}`;

  return (
    <section
      aria-labelledby={tieuDeId}
      className='rounded-md border border-ws-line bg-ws-surface px-3 py-3'
    >
      <h3
        id={tieuDeId}
        ref={tieuDeRef}
        tabIndex={-1}
        className='rounded-sm text-sm font-semibold text-ws-ink outline-none focus-visible:ring-2 focus-visible:ring-ws-focus'
      >
        Việc cần làm tiếp
      </h3>
      <p className='mt-0.5 text-ws-micro text-ws-ink-faint'>
        Người duyệt đã chuyển những việc này sang ngày làm việc kế tiếp. Chúng
        hiện trong gợi ý của bản ngày đó.
      </p>

      {tiepTucDaHuyHet && (
        /* Dải trung tính cùng khuôn với câu "Báo cáo đã khóa…" của form: đây là
           thông tin về trạng thái, không phải cảnh báo hay lỗi. */
        <p className='mt-2 rounded-md border border-ws-line bg-ws-surface-alt px-2.5 py-1.5 text-ws-micro text-ws-ink-soft'>
          Kết luận vẫn là “Tiếp tục thực hiện”, nhưng mọi việc trong kết luận đó
          đã bị huỷ.
        </p>
      )}

      <ul className='mt-2 space-y-1.5' aria-label='Việc cần làm tiếp'>
        {outgoing.map((row) => (
          <DongDaChuyen
            key={row.id}
            row={row}
            disabled={dangHuy}
            isCancelling={dangHuy && dangHuyDong === row.id}
            onCancel={() => huy(row.id, { onSuccess: veTieuDe })}
          />
        ))}
      </ul>
    </section>
  );
}

/** Một việc cần làm tiếp: việc gì, sang ngày nào, ai yêu cầu, ai xác nhận lại. */
function DongDaChuyen({
  row,
  disabled,
  isCancelling,
  onCancel,
}: {
  row: CarryOverView;
  disabled: boolean;
  /** Đúng dòng này đang được huỷ - vòng xoay thay cho dấu X. */
  isCancelling: boolean;
  onCancel: () => void;
}) {
  const daHuy = row.cancelledAt !== null;
  const moTa = [
    daHuy ? 'Đã huỷ' : null,
    `Sang ${formatDateVi(row.toReportDate)}`,
    `${row.createdByName ?? 'Người duyệt'} yêu cầu`,
    row.confirmedById
      ? `${row.confirmedByName ?? 'Người duyệt'} xác nhận lại`
      : null,
    // Dòng đã huỷ không còn nằm trong chuỗi, nói số lần của chuỗi là sai.
    !daHuy && row.carriedCount > 0
      ? `đã chuyển tiếp ${row.carriedCount} lần`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className='flex items-start gap-2 rounded-md bg-ws-surface-alt px-2.5 py-2'>
      <CornerDownRight
        className='mt-0.5 h-3.5 w-3.5 shrink-0 text-ws-ink-faint'
        aria-hidden
      />
      <div className='min-w-0 flex-1'>
        <p
          className={cn(
            'break-words text-xs font-medium text-ws-ink',
            daHuy && 'text-ws-ink-faint line-through',
          )}
        >
          {carryItemLabel(row)}
        </p>
        <p className='text-ws-micro text-ws-ink-faint'>{moTa}</p>
        {row.isLongChain && !daHuy && (
          <p className='text-ws-micro text-ws-danger'>
            {CARRY_LONG_CHAIN_WARNING}
          </p>
        )}
      </div>
      {row.canCancel && (
        <Button
          type='button'
          size='sm'
          variant='ghost'
          /* Cùng lý do với nút X của khối kết luận: 24px là dưới nửa sàn
             chạm, chỉ nới ở khổ điện thoại. */
          className='min-h-11 w-11 shrink-0 p-0 sm:h-6 sm:w-6 sm:min-h-0'
          disabled={disabled}
          aria-busy={isCancelling}
          onClick={onCancel}
          aria-label={`Huỷ chuyển ${carryItemLabel(row)}`}
          title='Huỷ việc chuyển này'
        >
          {isCancelling ? (
            <Loader2 className='h-3.5 w-3.5 animate-spin' />
          ) : (
            <X className='h-3.5 w-3.5' />
          )}
        </Button>
      )}
    </li>
  );
}
