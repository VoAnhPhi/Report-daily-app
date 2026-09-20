'use client';

import { AlertTriangle, ClipboardList, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DailyReportScopeListItem } from '@/types/daily-report.type';
import { EmptyNoScopesBody } from '../shared/empty-no-scopes';
import { formatWeekdayList } from '../daily-report-utils';
import { ReportCenteredNotice } from '../shared/report-centered-notice';

/**
 * Deep-link trỏ vào bản không mở được — nói thẳng.
 *
 * Tuyệt đối KHÔNG lặng lẽ mở một bản khác thay thế: đó chính là lỗi cũ, và nó
 * dẫn tới người dùng sửa nhầm bản mà không hề biết.
 */
export function FocusNotFound() {
  return (
    <ReportCenteredNotice
      icon={ClipboardList}
      title='Không mở được báo cáo từ liên kết này.'
      detail='Bản báo cáo có thể đã bị xóa, nhóm đã lưu trữ, hoặc bạn không còn quyền xem.'
    />
  );
}

/**
 * `my/today` gọi hỏng — tuyệt đối KHÔNG rơi xuống EmptyToday.
 *
 * Mảng rỗng vì lỗi mạng và mảng rỗng vì hôm nay không phải nộp cho ra cùng một
 * `reports.length === 0`, nhưng EmptyToday sẽ khẳng định "Hôm nay bạn không nằm
 * trong danh sách phải nộp". Người dùng tin câu đó, bỏ nộp, rồi bị tính thiếu —
 * docs 11 mục 2 cấm kết luận người dùng ngoài phạm vi khi API chưa trả lời.
 *
 * Nút "Thử lại" là lối thoát DUY NHẤT ngoài F5: cấu hình query toàn cục tắt cả
 * `refetchOnWindowFocus`/`onMount`/`onReconnect`, nên sau 4 lần thử hỏng màn này
 * đứng yên vĩnh viễn.
 */
export function TodayLoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <ReportCenteredNotice
      icon={AlertTriangle}
      title='Không tải được danh sách báo cáo hôm nay.'
      detail='Chưa biết được hôm nay bạn có phải nộp hay không — hãy thử lại trước khi rời màn này.'
      action={
        <Button
          variant='outline'
          size='sm'
          className='mt-4 text-xs'
          onClick={onRetry}
        >
          <RefreshCw className='mr-1.5 h-3.5 w-3.5' />
          Thử lại
        </Button>
      }
    />
  );
}

/**
 * Hôm nay không có bản nào — nói ĐÚNG lý do.
 *
 * Trước đây khối này đoán: "có thể là ngày nghỉ của nhóm, hoặc bạn chưa thuộc nhóm
 * nào bật báo cáo". Nó phải đoán vì `my/today` chỉ trả mảng rỗng. Có `weekdays` của
 * từng scope thì biết chắc, và biết luôn bao giờ bắt đầu.
 */
export function EmptyToday({
  scopes,
  emptyReason,
  onOpenGroups,
  canCreateGroups,
  onRetry,
}: {
  scopes: DailyReportScopeListItem[];
  emptyReason: import('@/types/daily-report.type').TodayEmptyReason | null;
  onOpenGroups?: () => void;
  canCreateGroups: boolean;
  onRetry: () => void;
}) {
  /* Không thuộc nhóm nào. Đây là trạng thái BAN ĐẦU của mọi người dùng mới,
     không phải ca hiếm — comment cũ ở đây viết "nút ngoài kia đã ẩn, vào được
     đây là hiếm", và đó chính là vấn đề: mục Báo cáo từng bị ẩn khỏi thanh
     chuyển màn nên không ai tới được. Nay mục luôn hiện, nên khối này là thứ
     đầu tiên người mới nhìn thấy và nó phải làm được ba việc: nói đang thế
     nào, vì sao, và bước tiếp theo. */
  if (scopes.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center px-6 py-16 text-center'>
        <ClipboardList className='mb-2 h-8 w-8 text-ws-ink-ghost' />
        <EmptyNoScopesBody
          onOpenGroups={onOpenGroups}
          canCreateGroups={canCreateGroups}
        />
      </div>
    );
  }

  const isManager = scopes.some((s) => s.isManager);

  /**
   * Nhãn giờ chốt danh sách — CHỈ lấy từ server, không có mặc định.
   *
   * Bản cũ ghi `?? '07:30'`. Mốc đó cấu hình được theo từng nhóm, nên khi
   * server chưa trả nhãn thì con số cứng kia là một lời khẳng định có thể sai —
   * đúng thứ docs 11 mục 2 cấm. Thiếu nhãn thì nói câu KHÔNG kèm giờ: mất một
   * chi tiết vẫn hơn nói sai một chi tiết.
   */
  const generationLabel = scopes[0]?.generationLabel ?? null;

  return (
    <div className='flex flex-col items-center justify-center px-6 py-16 text-center'>
      <ClipboardList className='mb-2 h-8 w-8 text-ws-ink-ghost' />

      {emptyReason === 'BEFORE_GENERATION' ? (
        <>
          <p className='text-sm text-ws-ink-soft'>Báo cáo chưa mở.</p>
          <p className='mt-1 text-xs text-ws-ink-faint'>
            {generationLabel
              ? `Hệ thống sẽ chốt danh sách và mở báo cáo lúc ${generationLabel}.`
              : 'Hệ thống sẽ chốt danh sách và mở báo cáo.'}
          </p>
        </>
      ) : emptyReason === 'NOT_IN_SNAPSHOT' ? (
        <>
          <p className='text-sm text-ws-ink-soft'>
            Hôm nay bạn không nằm trong danh sách phải nộp.
          </p>
          <p className='mt-1 text-xs text-ws-ink-faint'>
            {generationLabel
              ? `Danh sách được chốt lúc ${generationLabel}; membership hiện tại không thay đổi snapshot của ngày này.`
              : 'Danh sách của ngày đã được chốt; membership hiện tại không thay đổi snapshot của ngày này.'}
          </p>
        </>
      ) : emptyReason === 'SYNCING' ? (
        <>
          <p className='text-sm text-ws-ink-soft'>
            Hệ thống đang đồng bộ báo cáo hôm nay.
          </p>
          <Button
            variant='outline'
            size='sm'
            className='mt-3'
            onClick={onRetry}
          >
            Thử lại
          </Button>
        </>
      ) : (
        <>
          <p className='text-sm text-ws-ink-soft'>
            {emptyReason === 'NO_SCOPE'
              ? 'Bạn chưa thuộc nhóm nào bật báo cáo.'
              : scopes.length === 1
                ? `Hôm nay nhóm ${scopes[0].name} không báo cáo.`
                : 'Hôm nay không nhóm nào của bạn báo cáo.'}
          </p>
          <ul className='mt-2 space-y-0.5 text-xs text-ws-ink-faint'>
            {scopes.map((s) => (
              <li key={s.id}>
                {s.name} · {formatWeekdayList(s.weekdays ?? [])}
              </li>
            ))}
          </ul>
        </>
      )}

      {isManager && onOpenGroups && (
        <Button
          variant='outline'
          size='sm'
          className='mt-4 text-xs'
          onClick={onOpenGroups}
        >
          <Users className='mr-1.5 h-3.5 w-3.5' />
          Mở cài đặt nhóm
        </Button>
      )}
    </div>
  );
}
