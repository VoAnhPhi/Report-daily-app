'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  REPORT_CUTOFF_MINUTE,
  REPORT_GENERATE_MINUTE,
  formatMinuteOfDay,
  validateReportSchedule,
  type ReportScheduleErrors,
} from '../daily-report-utils';
import { InfoHint } from '../shared/info-hint';

interface Props {
  /** Giờ nhắc hiện tại, phút từ 00:00. */
  remindMinute: number;
  /** Giờ gửi tổng hợp hiện tại, phút từ 00:00. */
  summaryMinute: number;
  /** Giờ khóa cứng. Hiện là hằng số công ty, chỉ để hiển thị và để tính. */
  cutoffMinute?: number;
  /**
   * Nhãn giờ mở bản mới, do server dựng (`scope.generationLabel`). Không nhận
   * nhãn thì mốc đầu rơi về hằng số dự phòng — chấp nhận được vì đây là mốc cố
   * định của sản phẩm, nhưng nhóm nào cấu hình khác sẽ hiển thị sai nếu đóng
   * cứng, nên vẫn ưu tiên nhãn từ server.
   */
  generationLabel?: string;
  disabled?: boolean;
  /** Gọi khi người dùng đổi xong MỘT mốc và cả lịch hợp lệ. */
  onCommit: (next: { remindMinute: number; summaryMinute: number }) => void;
}

/** Phút nhảy bước 5 — đủ mịn cho một mốc nhắc việc, mà không bắt cuộn 60 dòng. */
const MINUTE_STEP = 5;

/**
 * Lịch trong ngày của một nhóm: bốn mốc theo thứ tự thời gian, hai mốc giữa
 * chỉnh được ngay tại chỗ.
 *
 * Vì sao ô chọn giờ nằm ĐÚNG chỗ con số vốn đứng, chứ không phải một form riêng
 * phía dưới: tách ra thì người dùng phải tự ghép "16:30 trong danh sách" với
 * "nhắc trước bao nhiêu phút trong form" — đó chính là chỗ bản cũ làm hỏng.
 *
 * Vì sao hai ô chọn chứ không phải input type='time': ô time render theo
 * locale của trình duyệt, máy để tiếng Anh sẽ hiện "04:30 PM" trong khi cả hệ
 * thống nói 16:30. Định dạng giờ không được phụ thuộc máy người dùng.
 *
 * Vì sao Radix Select chứ không phải `<select>` native: ô này sống trong
 * `DailyReportConfigModal`, mà Dialog của Radix là một lớp chặn tương tác
 * (`DismissableLayer` + focus trap) — danh sách bung ra của select native là
 * cửa sổ của HỆ ĐIỀU HÀNH, nằm ngoài cây DOM của Dialog, nên có máy nó không
 * mở, có máy vừa mở đã bị Dialog nuốt mất sự kiện. Radix Select render danh
 * sách vào cùng hệ thống lớp đó nên không bao giờ đánh nhau với Dialog. Kèm
 * theo: danh sách native ăn màu của HĐH, không theo `ws-scope`, nên ở chế độ
 * tối nó bung ra một mảng trắng.
 *
 * Vì sao lưu ngay khi đổi, không có nút Lưu: mỗi lựa chọn bắn đúng một sự kiện
 * nên không có chuyện "gõ dở nửa chừng" như ô nhập chữ.
 */
export function DailyReportSchedule({
  remindMinute,
  summaryMinute,
  cutoffMinute = REPORT_CUTOFF_MINUTE,
  generationLabel,
  disabled = false,
  onCommit,
}: Props) {
  const [remind, setRemind] = useState(remindMinute);
  const [summary, setSummary] = useState(summaryMinute);

  /**
   * Server là nguồn sự thật: khi dữ liệu mới về thì kéo hai ô về theo nó.
   *
   * Trước đây việc này nằm trong hai `useEffect` chạy SAU khi vẽ, nên mỗi lần
   * server trả mốc mới là khối vẽ một lượt bằng giá trị cũ rồi mới vẽ lại bằng
   * giá trị mới. Nay so ngay trong lúc render theo khuôn chính thống của React
   * (giữ giá trị của lượt trước trong state, khác thì đặt lại tại chỗ): React
   * dựng lại trước khi đưa lên màn hình nên không có nháy hình, còn giá trị
   * cuối cùng thì không đổi một chút nào.
   *
   * Điều kiện kích hoạt giữ y hệt mảng phụ thuộc cũ — chỉ chạm khi prop THẬT SỰ
   * đổi giá trị. Người dùng vừa chọn một mốc chưa hợp lệ (nên `change` chưa gọi
   * `onCommit`, prop chưa đổi) mà cha vẽ lại vì lý do khác thì giá trị đang
   * chỉnh vẫn còn nguyên, đúng như hai effect cũ.
   */
  const [syncedRemind, setSyncedRemind] = useState(remindMinute);
  const [syncedSummary, setSyncedSummary] = useState(summaryMinute);
  if (syncedRemind !== remindMinute) {
    setSyncedRemind(remindMinute);
    setRemind(remindMinute);
  }
  if (syncedSummary !== summaryMinute) {
    setSyncedSummary(summaryMinute);
    setSummary(summaryMinute);
  }

  const errors: ReportScheduleErrors = useMemo(
    () =>
      validateReportSchedule({
        remindMinute: remind,
        summaryMinute: summary,
        cutoffMinute,
      }),
    [remind, summary, cutoffMinute],
  );
  const isValid = !errors.remind && !errors.summary;
  /** Giờ mở bản dạng phút, cho câu chú giải; nhãn server là `HH:mm`. */
  const generationMinuteOrDefault = generationLabel
    ? Number(generationLabel.slice(0, 2)) * 60 +
      Number(generationLabel.slice(3, 5))
    : REPORT_GENERATE_MINUTE;

  const change = (which: 'remind' | 'summary', minute: number) => {
    const next = {
      remindMinute: which === 'remind' ? minute : remind,
      summaryMinute: which === 'summary' ? minute : summary,
    };
    if (which === 'remind') setRemind(minute);
    else setSummary(minute);

    const err = validateReportSchedule({ ...next, cutoffMinute });
    if (!err.remind && !err.summary) onCommit(next);
  };

  return (
    <div className='rounded-ws-block border border-ws-line bg-ws-surface-alt p-3'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-1'>
          <p className='text-ws-micro font-bold uppercase tracking-[0.06em] text-ws-ink-faint'>
            Lịch trong ngày
          </p>
          {/* Câu giải thích bốn mốc vào chú giải (UAT 18/09/2026: hộp thoại
              nhiều chữ mô tả quá). Câu vẫn dựng từ đúng giờ đang chọn. */}
          <InfoHint label='Bốn mốc trong ngày hoạt động thế nào'>
            {formatMinuteOfDay(generationMinuteOrDefault)}: mở bản mới cho từng
            người có trong nhóm lúc đó. {formatMinuteOfDay(remind)}: nhắc người
            còn thiếu qua thông báo và email. {formatMinuteOfDay(summary)}: chốt
            số liệu và gửi bạn bản tổng hợp; nộp sau mốc này vẫn được ghi nhận,
            chỉ không kịp vào bản tổng hợp. {formatMinuteOfDay(cutoffMinute)}:
            khóa hẳn, cả nhóm không sửa, nộp hay mở lại được nữa.
          </InfoHint>
        </div>
        <span className='rounded-ws-chip bg-ws-surface-sunken px-1.5 py-0.5 text-ws-nano font-semibold text-ws-ink-faint'>
          Giờ Việt Nam
        </span>
      </div>

      <ol className='mt-2.5'>
        {/* Nhãn mốc NGẮN, cùng chữ với cột "Mốc trong ngày" của màn đọc bản;
            phần giải thích nằm trong dấu hỏi ở đầu khối. */}
        <FixedMark
          at={generationLabel ?? formatMinuteOfDay(REPORT_GENERATE_MINUTE)}
          text='Mở bản báo cáo'
          isPast
        />
        <EditableMark
          id='remind'
          label='Giờ nhắc người còn thiếu'
          minute={remind}
          text='Nhắc người còn thiếu'
          error={errors.remind}
          disabled={disabled}
          onChange={(p) => change('remind', p)}
        />
        <EditableMark
          id='summary'
          label='Giờ gửi tổng hợp'
          minute={summary}
          text='Gửi bạn bản tổng hợp'
          error={errors.summary}
          disabled={disabled}
          onChange={(p) => change('summary', p)}
        />
        <FixedMark
          at={formatMinuteOfDay(cutoffMinute)}
          text='Khóa báo cáo'
          isLast
        />
      </ol>

      {/* Chỉ còn hiện khi lịch SAI: câu báo lỗi là thứ người dùng phải thấy
          ngay, không được giấu vào chú giải. Mốc tổng hợp chỉ chốt SỐ LIỆU gửi
          trưởng nhóm; mốc khóa duy nhất là cutoff (xem chú giải đầu khối). */}
      {!isValid && (
        <p className='mt-2.5 flex items-start gap-1.5 rounded-ws-control border border-ws-void-edge bg-ws-void-bg p-2 text-ws-chip-sm leading-relaxed text-ws-void-fg'>
          <span>
            Chưa lưu được. Sửa mốc đang báo đỏ rồi hệ thống lưu ngay, không cần
            bấm nút.
          </span>
        </p>
      )}
    </div>
  );
}

/** Một mốc do công ty chốt — chỉ đọc, có ổ khóa để nói rõ vì sao không bấm được. */
function FixedMark({
  at,
  text,
  isPast,
  isLast,
}: {
  at: string;
  text: string;
  isPast?: boolean;
  isLast?: boolean;
}) {
  return (
    <li className='relative flex gap-2.5 pb-3.5 last:pb-0'>
      {!isLast && <Connector isPast={isPast} />}
      <Dot isPast={isPast} />
      <span className='min-w-0 flex-1'>
        <span className='flex items-center gap-2'>
          <span className='text-ws-meta font-semibold tabular-nums text-ws-ink-soft'>
            {at}
          </span>
          <span className='inline-flex items-center gap-1 text-ws-nano font-semibold text-ws-ink-faint'>
            <Lock className='h-2.5 w-2.5' />
            Cố định
          </span>
        </span>
        <span className='mt-0.5 block text-ws-chip leading-snug text-ws-ink-soft'>
          {text}
        </span>
      </span>
    </li>
  );
}

/** Một mốc nhóm tự đặt. */
function EditableMark({
  id,
  label,
  minute,
  text,
  error,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  minute: number;
  text: string;
  error?: string;
  disabled: boolean;
  onChange: (minute: number) => void;
}) {
  const hour = Math.floor(minute / 60);
  const p = minute % 60;

  return (
    <li className='relative flex gap-2.5 pb-3.5'>
      <Connector />
      <Dot />
      <span className='min-w-0 flex-1'>
        <span className='flex flex-wrap items-center gap-2'>
          <span
            className={cn(
              'inline-flex h-[30px] items-center gap-0.5 rounded-ws-control border bg-ws-surface px-1',
              error
                ? 'border-ws-danger bg-ws-void-bg'
                : 'border-ws-line-strong',
            )}
          >
            <NumberSelect
              label={label + ' — giờ'}
              value={hour}
              hasError={Boolean(error)}
              disabled={disabled}
              options={Array.from({ length: 24 }, (_, i) => i)}
              onChange={(h) => onChange(h * 60 + p)}
            />
            <span className='font-bold text-ws-ink-faint'>:</span>
            <NumberSelect
              label={label + ' — phút'}
              value={p}
              hasError={Boolean(error)}
              disabled={disabled}
              options={minuteOptions(p)}
              onChange={(m) => onChange(hour * 60 + m)}
            />
          </span>
          <span className='text-ws-nano font-semibold text-ws-accent'>
            Nhóm tự đặt
          </span>
        </span>

        <span className='mt-0.5 block text-ws-chip leading-snug text-ws-ink-soft'>
          {text}
        </span>

        {error && (
          <p
            id={id + '-error'}
            role='status'
            className='mt-1 flex items-start gap-1.5 text-ws-chip-sm leading-snug text-ws-danger'
          >
            <AlertTriangle className='mt-px h-3 w-3 shrink-0' />
            <span>{error}</span>
          </p>
        )}
      </span>
    </li>
  );
}

/**
 * Danh sách phút cho ô chọn: bước 5, CỘNG THÊM phút đang lưu nếu nó lẻ.
 *
 * Bản cũ hiển thị `minute - (minute % 5)`, tức một nhóm đang đặt 17:22 thì ô hiện
 * "20" — sai lệch câm, và tệ hơn: đổi giờ xong lưu lại thành 18:22 trong khi
 * người dùng tin mình vừa lưu 18:20. Giá trị lẻ có thể vào database từ bản cũ
 * hoặc từ một client khác, nên phải hiện đúng cái đang có thay vì làm tròn
 * ngầm; đổi sang mốc bước-5 là việc của người dùng, không phải của giao diện.
 */
function minuteOptions(current: number): number[] {
  const steps = Array.from(
    { length: 60 / MINUTE_STEP },
    (_, i) => i * MINUTE_STEP,
  );
  if (steps.includes(current)) return steps;
  return [...steps, current].sort((a, b) => a - b);
}

/** Một ô chọn hai chữ số. Dùng Radix để sống được bên trong Dialog. */
function NumberSelect({
  label,
  value,
  options,
  hasError,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  hasError: boolean;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <Select
      value={String(value)}
      disabled={disabled}
      onValueChange={(v) => onChange(Number(v))}
    >
      <SelectTrigger
        aria-label={label}
        aria-invalid={hasError ? 'true' : undefined}
        /* `border-0` ghi đè khuôn mặc định của SelectTrigger (h-10, viền,
           nền): ở đây hai ô nằm TRONG một khung chung đã có viền, thêm viền
           nữa là ba đường bao lồng nhau cho một mốc giờ.
           `h-6` chứ không `h-auto` như bản trước: cao theo chữ chỉ còn ~18px,
           dưới sàn vùng chạm 24px (WCAG 2.5.8), trong khi khung 30px bao
           ngoài thừa chỗ. Vòng focus của khuôn mặc định vẫn tắt (`focus:`)
           vì nó vẽ ra ngoài khung chung, nhưng bàn phím phải có vòng riêng
           (`focus-visible:`) - bản trước không có gì cả. */
        className='h-6 w-auto gap-0.5 rounded-ws-chip border-0 bg-transparent px-1 py-0 text-ws-meta font-bold tabular-nums text-ws-ink shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-2 focus-visible:ring-ws-focus disabled:cursor-not-allowed disabled:opacity-60 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-50'
      >
        <SelectValue />
      </SelectTrigger>
      {/* `ws-scope` vì Radix bắn content ra `document.body`; `ws-scroll` vì 24
          mục giờ chắc chắn vượt chiều cao tối đa của popup. */}
      <SelectContent className='ws-scope ws-scroll min-w-[4.5rem]'>
        {options.map((v) => (
          <SelectItem
            key={v}
            value={String(v)}
            className='text-ws-meta font-semibold tabular-nums'
          >
            {String(v).padStart(2, '0')}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Đường dọc nối các mốc — chạy ngầm sau chấm, dừng ở mốc cuối. */
function Connector({ isPast }: { isPast?: boolean }) {
  return (
    <span
      aria-hidden='true'
      className={cn(
        'absolute bottom-0 left-[3.5px] top-3 w-px',
        isPast ? 'bg-ws-done-edge/50' : 'bg-ws-line',
      )}
    />
  );
}

function Dot({ isPast }: { isPast?: boolean }) {
  return (
    <span
      className={cn(
        'relative z-10 mt-1 h-2 w-2 shrink-0 rounded-full',
        isPast
          ? 'bg-ws-done-edge'
          : 'bg-ws-surface-alt ring-1 ring-ws-line-strong',
      )}
    />
  );
}
