'use client';

import { useMemo, useRef, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMyReportMonth } from '@/hooks/queries/daily-report-queries';
import { ReportErrorState } from '../shared/report-error-state';
import type { DailyReportHistoryItem } from '@/types/daily-report.type';
import {
  SUBMISSION_STATE_DETAIL,
  SUBMISSION_STATE_LABEL,
  WEEKDAY_LABEL_VI,
  formatDateVi,
  formatDayMonthVi,
  formatTimeVi,
  groupByDay,
  isInReviewCycle,
  mergeEmptyDays,
  isoWeekdayOfDayStr,
  monthLabelViOf,
  monthRange,
  shiftMonth,
  todayStrVi,
  type DaySubmission,
  type HistoryRow,
  type DayLevel,
  type HistoryDay,
  type SubmissionState,
  // Vòng focus bàn phím cho cả file — trước 17/08 file này không có chỗ nào.
  FOCUS_RING_SURFACE as FOCUS_RING,
  MISSED_FILL_CLASS,
  MISSED_TEXT_CLASS,
} from '../daily-report-utils';
import { ReviewStateBadge } from '../shared/report-row';
import { useScrollToStart } from '../shared/use-scroll-to-start';

/**
 * Lịch sử báo cáo của tôi — đọc theo NGÀY, mỗi lần một tháng.
 *
 * Ba cấp, mỗi cấp trả lời đúng một câu hỏi:
 *   1. Lịch tháng — "tháng này tôi thủng ngày nào";
 *   2. Hàng ngày  — "hôm đó tôi nộp mấy trên mấy, thiếu nhóm nào";
 *   3. Dòng nhóm  — "bản của nhóm này ra sao", bấm thì mở bản đầy đủ.
 *
 * Vì sao đơn vị là MỘT THÁNG chứ không phải "7 / 30 / 92 ngày" như bản trước:
 * server trả tối đa 100 bản một trang và sắp ngày giảm dần, nên khoảng càng
 * dài thì phần bị cắt càng nhiều — và phần bị cắt LUÔN nằm ở đầu cũ. Bản
 * trước vẽ lịch từ dữ liệu thiếu đó, nên với người thuộc bốn nhóm thì hai
 * phần ba số ô hiện ra là "không có bản báo cáo" trong khi thật ra chưa tải.
 * Một tháng thì `useMyReportMonth` tải đủ được, và cái lịch nói đúng.
 *
 * Vì sao ô lịch KHÔNG mở thẳng báo cáo nữa: một ngày có thể có nhiều bản của
 * nhiều nhóm. Ô cũ tô một màu duy nhất và bấm vào mở "bản đầu tiên" theo thứ
 * tự mà server không hề đảm bảo — tức mở bừa. Giờ ô chỉ đưa người dùng tới
 * hàng của ngày đó; chọn bản nào là việc của họ.
 */
export function DailyReportHistory({
  onOpenReport,
  hasNoScopes = false,
  onOpenGroups,
  canCreateGroups = false,
}: {
  /** Mở một bản cũ ở màn "Hôm nay" — bản ngoài hôm nay được tải riêng theo id. */
  onOpenReport: (reportId: string, scopeId: string) => void;
  /**
   * Người dùng hiện KHÔNG thuộc nhóm nào có báo cáo.
   *
   * Cần biết điều này để phân biệt hai cái rỗng nhìn giống hệt nhau: "tháng
   * này bạn không có bản nào" và "bạn chưa từng có nhóm nào". Câu thứ nhất
   * gợi ý lật sang tháng khác; câu thứ hai mà nói vậy là bắt người dùng đi
   * tìm một thứ không tồn tại ở bất kỳ tháng nào.
   *
   * Lưu ý KHÔNG dùng cờ này để chặn cả màn: một người có thể không còn nhóm
   * nào mà lịch sử vẫn đầy — nhóm bị lưu trữ thì biến mất khỏi danh sách
   * nhưng các bản đã nộp vẫn còn. Cờ chỉ đổi CÂU CHỮ lúc rỗng.
   */
  hasNoScopes?: boolean;
  onOpenGroups?: () => void;
  canCreateGroups?: boolean;
}) {
  const today = todayStrVi();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)));
  const [scopeFilter, setScopeFilter] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);

  /* `today` đọc lại mỗi lần render nên khoảng tự đúng khi tab mở qua nửa
     đêm — bản trước chốt `to` một lần và kẹt ở ngày hôm trước. */
  const range = useMemo(
    () => monthRange(year, month, today),
    [year, month, today],
  );

  const { data, isLoading, isError, refetch } = useMyReportMonth(range);

  const rows = useMemo(() => data?.data ?? [], [data]);

  /* Danh sách nhóm để lọc lấy từ CHÍNH dữ liệu tháng này, không lấy từ
     `useMyReportScopes`: hook đó lọc cứng `archivedAt: null` nên giấu mất
     nhóm đã xoá khỏi báo cáo — mà lịch sử thì vẫn còn bản của nhóm đó — và
     nó cũng không truyền `onBehalfOfUserId` nên ở chế độ làm thay sẽ trả
     nhóm của người đăng nhập chứ không phải người được chăm. */
  const scopesInMonth = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) m.set(r.scope.id, r.scope.name);
    return Array.from(m, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name, 'vi'),
    );
  }, [rows]);

  /* Nhóm đang lọc biến mất khỏi tháng vừa chuyển sang thì bỏ lọc, nếu không
     màn hình rỗng mà người dùng không hiểu vì sao.

     Trước đây là `useEffect([scopesInMonth, scopeFilter])` chạy SAU khi vẽ; nay
     so ngay trong lúc render. Cùng đúng một điều kiện và cùng đúng một lần đặt
     lại state, chỉ sớm hơn một nhịp — nên danh sách bên dưới không còn vẽ một
     lượt bằng bộ lọc đã chết. Không thể thành vòng lặp: đặt `null` xong thì vế
     `scopeFilter &&` tắt ngay ở lượt sau.

     Đặt TRƯỚC ba `useMemo` bên dưới để lượt render bị React bỏ đi không phải
     tính lại chúng bằng một bộ lọc sắp bị xoá. */
  if (scopeFilter && !scopesInMonth.some((n) => n.id === scopeFilter)) {
    setScopeFilter(null);
  }

  const filteredRows = useMemo(
    () => (scopeFilter ? rows.filter((r) => r.scope.id === scopeFilter) : rows),
    [rows, scopeFilter],
  );

  const days = useMemo(
    () => (range ? groupByDay(filteredRows, range.from, range.to) : []),
    [filteredRows, range],
  );
  const historyRows = useMemo(() => mergeEmptyDays(days), [days]);

  const dayRowRefs = useRef(new Map<string, HTMLDivElement | null>());
  const selectDay = (day: string) => {
    setOpenDay(day);
    dayRowRefs.current
      .get(day)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  /* Đổi tháng hay đổi nhóm là thay cả lịch lẫn danh sách: đưa đầu màn về tầm
     nhìn, không để người dùng đứng giữa danh sách của tháng mới. */
  const [historyRef, requestHistoryScroll] = useScrollToStart<HTMLDivElement>();

  const changeMonth = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    requestHistoryScroll();

    /* KẸP ở tháng hiện tại. Nút ▶ đã bị khoá khi đang ở tháng này, nhưng ô
       chọn Tháng vẫn liệt kê đủ 1–12: đang ở tháng 8 mà chọn tháng 12 là
       nhảy thẳng vào tương lai, và từ đó ▶ bật lại nên đi tiếp được vô hạn.
       Khi năm vượt khỏi bốn mục của ô chọn Năm thì `value` không khớp option
       nào và ô đó hoá TRỐNG — người dùng không còn biết mình đang ở năm nào.
       Chặn ở đây thay vì ở từng ô: mọi đường đổi tháng đều đi qua hàm này. */
    const capYear = Number(today.slice(0, 4));
    const capMonth = Number(today.slice(5, 7));
    if (next.year * 12 + next.month > capYear * 12 + capMonth) {
      setYear(capYear);
      setMonth(capMonth);
      setOpenDay(null);
      return;
    }

    setYear(next.year);
    setMonth(next.month);
    setOpenDay(null);
  };

  const isCurrentMonth =
    year === Number(today.slice(0, 4)) && month === Number(today.slice(5, 7));

  return (
    <div ref={historyRef} className='scroll-mt-[var(--ws-sticky-top,0px)]'>
      <MonthBar
        year={year}
        month={month}
        isCurrentMonth={isCurrentMonth}
        scopes={scopesInMonth}
        scopeFilter={scopeFilter}
        onChangeMonth={changeMonth}
        onGoToToday={() => {
          setYear(Number(today.slice(0, 4)));
          setMonth(Number(today.slice(5, 7)));
          setOpenDay(today);
          requestHistoryScroll();
        }}
        onSelectScope={(next) => {
          setScopeFilter(next);
          requestHistoryScroll();
        }}
      />

      {/* Đệm ngang phải BẰNG thanh dính ngay trên (`px-4 md:px-5`).
          Lệch nhau thì mép trái của thẻ lịch và của danh sách ngày gãy khúc
          đúng tại đường kẻ ngăn hai khối — 4px trên điện thoại, 8px trên
          desktop. Hai khối xếp chồng theo chiều dọc thì mép chữ của chúng
          phải đứng trên cùng một đường. */}
      <div className='space-y-4 px-4 py-3 md:px-5'>
        {range === null ? (
          <p className='py-12 text-center text-ws-body text-ws-ink-soft'>
            Chưa tới tháng này
          </p>
        ) : isLoading ? (
          <MonthSkeleton year={year} month={month} />
        ) : isError ? (
          /* Nhánh lỗi BẮT BUỘC đứng trước nhánh rỗng. Gộp chung thì tải hỏng
             lại hiện "chưa có bản nào" - một khẳng định sai về chính người
             dùng. Query tắt hết refetch tự động nên nút Thử lại là lối thoát
             duy nhất ngoài tải lại cả trang.

             Dùng `ReportErrorState` chứ không tự vẽ lại: bản tự vẽ ở đây có nút
             cao 26px, dưới sàn chạm 44px mà primitive dùng chung đã lo sẵn. */
          <ReportErrorState
            title='Không tải được lịch sử báo cáo.'
            detail='Đây là lỗi kết nối, không phải là bạn chưa nộp bản nào trong tháng này.'
            onRetry={() => void refetch()}
          />
        ) : (
          <>
            <MonthGrid
              year={year}
              month={month}
              days={days}
              today={today}
              openDay={openDay}
              onSelectDay={selectDay}
            />

            {rows.length === 0 ? (
              hasNoScopes ? (
                <div className='flex flex-col items-center justify-center px-6 py-10 text-center'>
                  <p className='text-ws-body font-medium text-ws-ink'>
                    Chưa có gì trong lịch sử
                  </p>
                  <p className='mt-1 max-w-[340px] text-ws-chip text-ws-ink-faint'>
                    Bạn chưa thuộc nhóm nào có báo cáo hằng ngày, nên chưa có
                    bản nào được sinh ra. Tạo nhóm và bật báo cáo thì từ hôm sau
                    lịch sử bắt đầu có dữ liệu.
                  </p>
                  {onOpenGroups && canCreateGroups && (
                    <button
                      type='button'
                      onClick={onOpenGroups}
                      className={clsx(
                        /* `min-h-11`: nút này là lối ra duy nhất của khối rỗng,
                           mà `py-1.5` cho ra 30px - dưới sàn chạm 44px. */
                        'mt-4 inline-flex min-h-11 items-center rounded-md border border-ws-line bg-ws-surface-alt px-3 py-1.5 text-ws-chip font-semibold text-ws-ink-soft transition-colors hover:bg-ws-surface-sunken sm:min-h-9',
                        FOCUS_RING,
                      )}
                    >
                      Tạo nhóm
                    </button>
                  )}
                </div>
              ) : (
                /* Nói về THÁNG ĐANG XEM, không nói về cả đời người dùng — ta
                   chỉ vừa hỏi server đúng một tháng. */
                <p className='py-8 text-center text-ws-body text-ws-ink-soft'>
                  Tháng này bạn không có bản báo cáo nào. Lật sang tháng khác để
                  xem tiếp.
                </p>
              )
            ) : (
              <div className='space-y-1.5'>
                {historyRows.map((d) =>
                  d.kind === 'empty' ? (
                    <EmptyDayRange key={`empty-${d.from}`} range={d} />
                  ) : (
                    <DayRow
                      key={d.day}
                      ref={(el) => {
                        dayRowRefs.current.set(d.day, el);
                      }}
                      entry={d}
                      isToday={d.day === today}
                      isOpen={openDay === d.day}
                      onToggle={() =>
                        setOpenDay((cur) => (cur === d.day ? null : d.day))
                      }
                      onOpenReport={onOpenReport}
                    />
                  ),
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Dùng chung ──────────────────────────────────────────────────────────── */

/** Khoá của mục "Tất cả nhóm". Radix cấm `value=''` nên phải có khoá thật. */
const ALL_SCOPES = '__all__';

/** `Skeleton` mặc định dùng `bg-muted`, không thuộc thang `ws-` — ghi đè. */
const SKELETON = 'bg-ws-surface-sunken';

/**
 * `clsx` chứ không `cn` ở những chỗ dưới đây — nay là lựa chọn, không còn là né tránh.
 *
 * Trước 23/08 đây là cách duy nhất để giữ được cỡ chữ: tailwind-merge chạy cấu
 * hình mặc định không biết thang `--text-ws-*`, nên nó xếp `text-ws-chip` (cỡ)
 * chung nhóm với `text-ws-ink-soft` (màu) rồi nuốt mất cái đứng trước —
 * `twMerge('text-ws-chip text-ws-ink-soft')` trả về `'text-ws-ink-soft'`.
 *
 * Bug đó **đã sửa tận gốc** bằng `extendTailwindMerge` trong
 * `lib/utils/index.tsx`, nên `cn` giờ cũng cho kết quả đúng. Giữ `clsx` ở đây
 * vì các nhánh điều kiện loại trừ nhau — twMerge không có gì để hoà giải, gọi
 * nó chỉ tốn thêm một lượt.
 *
 * Với primitive của shadcn thì không chọn được `clsx`: chính component gộp
 * className bằng `cn`. Ở đó phải đưa cỡ chữ xuống phần tử con qua một biến thể
 * bộ chọn — xem `SELECT_TRIGGER_CLASS`.
 */

/**
 * Focus riêng cho Ô NGÀY trong lịch — dày hơn một bậc và khe rộng gấp đôi.
 *
 * Ô ngày là chỗ DUY NHẤT trong file mà kênh `ring` đã mang sẵn hai nghĩa khác:
 * "hôm nay" và "đang chọn". Nếu focus cũng chỉ là `ring-2 ring-offset-1` như
 * `FOCUS_RING` chung thì tab vào ô hôm nay chỉ đổi MÀU vòng, không đổi hình —
 * tín hiệu yếu, và ở chế độ tối từng có ca hai màu trùng nhau nên không đổi
 * một pixel nào. Dày 3px + khe 2px là thay đổi hình học, đọc được bất kể ô đó
 * đang mang màu vòng gì.
 */
const DAY_FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ws-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ws-surface';

/**
 * Màu theo MỨC của một ngày — bốn mức phân biệt bằng NỀN.
 *
 * Bản trước chỉ mã hoá được "xanh hay không xanh": ô "không nộp" dùng
 * `bg-ws-surface`, đúng bằng nền tấm chứa nó, nên thực chất không có nền; còn
 * `noData` (#fafaf8) và "đang soạn" (#f0f0ec) chênh nhau vài phần trăm độ
 * sáng. Kết quả là ô quên nộp nổi ÍT hơn ô không có dữ liệu.
 */
const LEVEL_CELL_CLASS: Record<DayLevel, string> = {
  complete: 'bg-ws-done-bg text-ws-done-fg ring-1 ring-ws-done-edge/50',
  partial: 'bg-ws-count-bg text-ws-count-fg ring-1 ring-ws-count-fg/30',
  /* Bộ màu "không nộp" dùng chung với ô ngày của Tổng quan (chốt 17/09/2026,
     thay tông `ws-void`). Nền đỏ RẤT nhạt nên lịch không đọc thành trang lỗi.
     Ba chỗ nói "không nộp" (ô lịch, chip tỉ lệ, nhãn hàng) cùng một màu. */
  missedAll: 'bg-ws-danger/5 text-ws-danger/80 ring-1 ring-ws-danger/20',
  /* `ws-ink-faint` (4,89:1 trên `ws-surface-alt`) thay `ws-ink-ghost` (2,4:1,
     dưới ngưỡng 4,5:1 của WCAG AA). */
  noData: 'bg-ws-surface-alt text-ws-ink-faint',
};

/**
 * Ô HÔM NAY chưa hoàn tất.
 *
 * Không mượn màu của bốn mức: hổ phách "Còn thiếu" và đỏ "Không nộp" đều là
 * lời trách, mà đầu ngày thì chưa có gì để trách. Xanh nước biển đứng ngoài
 * thang bốn mức nên đọc ra "việc của hôm nay, chưa làm" thay vì "làm hỏng".
 */
const TODAY_INCOMPLETE_CELL =
  'bg-ws-progress-bg/60 text-ws-progress-fg ring-1 ring-ws-progress-edge/30';

const LEVEL_LABEL: Record<DayLevel, string> = {
  complete: 'Đã nộp đủ',
  partial: 'Còn thiếu',
  missedAll: 'Không nộp',
  noData: 'Không có lịch báo cáo',
};

/* ── Thanh tháng ─────────────────────────────────────────────────────────── */

function MonthBar({
  year,
  month,
  isCurrentMonth,
  scopes,
  scopeFilter,
  onChangeMonth,
  onGoToToday,
  onSelectScope,
}: {
  year: number;
  month: number;
  isCurrentMonth: boolean;
  scopes: { id: string; name: string }[];
  scopeFilter: string | null;
  onChangeMonth: (delta: number) => void;
  onGoToToday: () => void;
  onSelectScope: (id: string | null) => void;
}) {
  /* 44px ở khổ điện thoại, về 36px từ `sm`: hai mũi tên lật tháng là thao tác
     dùng nhiều nhất của màn này, mà 36px vẫn dưới sàn chạm. `w-11` chứ không
     `min-w-11` vì khối `@media (max-width: 540px)` trong `app/globals.css` đặt
     `min-width: 0` cho `button`. */
  const NAV_BUTTON =
    'flex h-11 w-9 shrink-0 items-center justify-center rounded-ws-control text-ws-ink-soft transition-colors hover:bg-ws-surface-alt hover:text-ws-ink sm:h-9 sm:w-9';

  /* Ô chọn dùng Radix `Select`, KHÔNG dùng `<select>` native.
     Danh sách bung ra của select native là cửa sổ của HỆ ĐIỀU HÀNH: nền xám
     hệ thống, chữ theo font hệ thống, không bo góc, không khoảng cách giữa
     các mục, và ở chế độ tối nó vẫn bung ra một mảng trắng. Radix render
     danh sách bằng DOM thường nên nó nhận đúng token `ws-*`.
     Nền TRẮNG (`ws-surface`) chứ không nền chìm: ba ô này nằm trên thanh dính
     cũng màu trắng, nhưng có viền `ws-line` nên vẫn tách ra được, và trắng
     trên trắng đọc nhẹ hơn hẳn một mảng xám.
     `pr-2` để mũi tên không dính mép — `SelectTrigger` mặc định chỉ có `px-3`
     cho cả hai bên, nên với chữ dài mũi tên gần như chạm viền.
     Cỡ chữ đi qua `[&>span]:text-ws-cell` chứ KHÔNG đặt thẳng `text-ws-cell`:
     `SelectTrigger` tự gộp className bằng `cn`, nên một chuỗi mang cả cỡ chữ
     lẫn `text-ws-ink-soft` sẽ bị twMerge nuốt mất cỡ (xem ghi chú ở đầu file).
     Biến thể `[&>span]` nằm ở nhóm khác nên sống sót, và nó nhắm đúng phần tử
     mà chính base của component đã nhắm bằng `[&>span]:line-clamp-1`. */
  const SELECT_TRIGGER_CLASS =
    'h-11 gap-0.5 pl-2 pr-1.5 sm:h-9 sm:gap-1.5 sm:pl-3 sm:pr-2 rounded-ws-control border-ws-line bg-ws-surface font-semibold text-ws-ink-soft shadow-none transition-colors hover:bg-ws-surface-alt hover:text-ws-ink [&>span]:text-ws-cell [&>svg]:opacity-60 ' +
    /* Tắt vòng focus mặc định của `SelectTrigger` (`focus:ring-2` +
       `ring-offset-2`, chuỗi shadcn thời Tailwind v3). Để nguyên thì nó vẽ
       thêm một vòng thứ hai chồng lên `FOCUS_RING` — viền đôi lệch màu, đúng
       lỗi đã sửa ở `components/ui/textarea.tsx`. Và nó dùng `focus:` chứ
       không `focus-visible:` nên bật cả khi bấm chuột. */
    'focus:ring-0 focus:ring-offset-0';

  /* Khung danh sách: nền trắng đặc, bo góc, và mục cách nhau 2px cho dễ quét
     mắt. `max-h` chặn chiều dài — người thuộc mười nhóm mà thả xuống hết màn
     hình thì phải cuộn cả trang mới thấy mục cuối. */
  const SELECT_CONTENT_CLASS =
    /* `min-w-[var(--…)]`, KHÔNG phải `min-w-[--…]`.
       Dạng thiếu `var()` không sinh ra CSS nào — class lọt vào DOM mà quy tắc
       rỗng, nên danh sách thả xuống hẹp hơn ô kích hoạt và tên nhóm dài bị
       cắt hai lần. Dạng có `var()` chạy ở cả Tailwind v3 lẫn v4. */
    'ws-scope ws-scroll max-h-[280px] min-w-[var(--radix-select-trigger-width)] rounded-ws-control border-ws-line bg-ws-surface p-1 shadow-ws-raised [&_[role=option]]:my-0.5 [&_[role=option]]:rounded-ws-chip [&_[role=option]]:py-1.5 [&_[role=option]]:text-ws-cell';

  /* Không cho chọn năm tương lai: bản báo cáo chỉ tồn tại khi cron 07:30 sinh
     ra cho ĐÚNG hôm đó, nên mọi năm sau năm nay chắc chắn rỗng. Để chọn được
     là mời người dùng đi vào một màn trống không có lối giải thích. */
  const currentYear = Number(todayStrVi().slice(0, 4));

  return (
    <div className='sticky top-[var(--ws-sticky-top,0px)] z-10 flex flex-wrap items-center gap-2 border-b border-ws-line bg-ws-surface px-4 py-2.5 md:px-5'>
      {/* Bộ lọc nhóm đứng TRÁI, điều hướng tháng đứng PHẢI.
          Lọc nhóm quyết định "đang xem dữ liệu của ai" — nó là ngữ cảnh, nên
          đọc trước; tháng là thứ người dùng lật qua lại liên tục nên nằm ở
          mép phải, gần ngón cái trên máy tính bảng. */}
      {scopes.length > 1 && (
        <Select
          value={scopeFilter ?? ALL_SCOPES}
          onValueChange={(v) => onSelectScope(v === ALL_SCOPES ? null : v)}
        >
          <SelectTrigger
            aria-label='Lọc theo nhóm'
            className={cn(SELECT_TRIGGER_CLASS, 'w-[190px]', FOCUS_RING)}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={SELECT_CONTENT_CLASS}>
            {/* Radix cấm `value=''` (chuỗi rỗng dành riêng cho "chưa chọn"),
                nên "tất cả" phải mang một khoá thật. */}
            <SelectItem value={ALL_SCOPES}>Tất cả nhóm</SelectItem>
            {scopes.map((n) => (
              <SelectItem key={n.id} value={n.id}>
                {n.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {!isCurrentMonth && (
        <button
          type='button'
          onClick={onGoToToday}
          className={clsx(
            'rounded-full bg-ws-surface-sunken px-2.5 py-1 text-ws-chip text-ws-ink-soft transition-colors hover:bg-ws-line/60 hover:text-ws-ink',
            FOCUS_RING,
          )}
        >
          Hôm nay
        </button>
      )}

      {/* `gap-2`: hai mũi tên và ô chọn tháng nằm sát nhau 2px thì bấm lệch là
          lật sai tháng, và hoàn tác phải bấm thêm hai lần. Dưới `sm` chỉ còn
          `gap-1` và nút mũi tên rộng 36px (vẫn cao 44px): ở 320px hàng này có
          254px, còn "Tháng 12" cần ô 92px và "2026" cần ô 76px - tổng 252px
          (đo 17/09/2026, trước đó cắt còn "Thá…"). */}
      <div className='ml-auto flex items-center gap-1 sm:gap-2'>
        <button
          type='button'
          aria-label='Tháng trước'
          onClick={() => onChangeMonth(-1)}
          className={cn(NAV_BUTTON, FOCUS_RING)}
        >
          <ChevronLeft className='h-4 w-4' />
        </button>

        {/* Ô chọn tháng và năm: lật từng bước thì tới tháng 3 phải bấm năm
            lần. Hai ô chọn gọn hơn một bộ chọn ngày đầy đủ.

            KHÔNG dùng `components/month-year-picker.tsx` dù tên nó nghe vừa
            khít. Ba chỗ lệch, chỗ nào cũng phải sửa chính file dùng chung đó
            mới hết:
              1. Nó nhận và trả `Date | null`, còn cả màn này chạy trên
                 `{year, month}` số nguyên đi qua `changeMonth` — hàm KẸP ở
                 tháng hiện tại (xem ghi chú trong `changeMonth`). Bọc lại qua
                 `Date` là mở thêm một đường vào tương lai không đi qua kẹp đó.
              2. Nó là một `Popover` chiếm cả bề ngang (`w-full` + lưới 12
                 tháng, `w-72`); thanh này cần hai ô cao 36px nằm gọn cạnh hai
                 nút mũi tên trong một thanh dính.
              3. Bảng màu của nó là `border-primary` / `bg-primary/10` /
                 `hover:bg-muted` / `text-muted-foreground` — ngoài thang `ws-`,
                 tức kéo lại đúng những class mà đợt chuẩn hoá 17/08 đã dọn. */}
        <Select
          value={String(month)}
          onValueChange={(v) => onChangeMonth(Number(v) - month)}
        >
          <SelectTrigger
            aria-label='Tháng'
            className={cn(
              SELECT_TRIGGER_CLASS,
              'w-[92px] shrink-0 sm:w-[104px]',
              FOCUS_RING,
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={SELECT_CONTENT_CLASS}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <SelectItem key={m} value={String(m)}>
                Tháng {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(year)}
          onValueChange={(v) => onChangeMonth((Number(v) - year) * 12)}
        >
          <SelectTrigger
            aria-label='Năm'
            className={cn(
              SELECT_TRIGGER_CLASS,
              'w-[76px] shrink-0 tabular-nums sm:w-[84px]',
              FOCUS_RING,
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={SELECT_CONTENT_CLASS}>
            {/* Bốn năm gần nhất, dừng ở năm nay — không có năm tương lai. */}
            {Array.from({ length: 4 }, (_, i) => currentYear - 3 + i).map(
              (y) => (
                <SelectItem key={y} value={String(y)} className='tabular-nums'>
                  {y}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>

        {/* Không lật được sang tháng chưa tới — cùng lý do với ô chọn năm. */}
        <button
          type='button'
          aria-label='Tháng sau'
          disabled={isCurrentMonth}
          onClick={() => onChangeMonth(1)}
          className={cn(
            NAV_BUTTON,
            'disabled:pointer-events-none disabled:opacity-35',
            FOCUS_RING,
          )}
        >
          <ChevronRight className='h-4 w-4' />
        </button>
      </div>
    </div>
  );
}

/* ── Lưới lịch một tháng ─────────────────────────────────────────────────── */

function MonthGrid({
  year,
  month,
  days,
  today,
  openDay,
  onSelectDay,
}: {
  year: number;
  month: number;
  days: HistoryDay<DailyReportHistoryItem>[];
  today: string;
  openDay: string | null;
  onSelectDay: (day: string) => void;
}) {
  /* `groupByDay` trả mới → cũ cho danh sách, còn lịch phải chạy xuôi.
     Cắt sẵn thành từng tuần 7 ô để mỗi tuần là một `role='row'` thật. */
  const weekRows = useMemo(() => {
    const chronological = [...days].reverse();
    if (chronological.length === 0) return [];

    /* Ô đệm tính từ NGÀY 1 CỦA THÁNG, không phải từ ngày đầu dữ liệu. Bản
       trước tính từ `days[0]`, nên một khoảng bắt đầu giữa tháng vẫn mang
       nhãn nguyên tháng — "Tháng 7/2026" mà chỉ vẽ 11 ngày. */
    const firstOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
    const leadingBlanks = isoWeekdayOfDayStr(firstOfMonth) - 1;
    const firstDayNumber = Number(chronological[0].day.slice(8, 10));

    const cells: (HistoryDay<DailyReportHistoryItem> | null)[] = [
      ...Array.from<null>({
        length: leadingBlanks + firstDayNumber - 1,
      }).fill(null),
      ...chronological,
    ];
    // Đệm nốt tuần cuối cho đủ 7 ô — thiếu ô thì `role='row'` cuối khai sai
    // số cột và trình đọc màn hình báo "ô 3 trên 3" giữa một lịch 7 cột.
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: (HistoryDay<DailyReportHistoryItem> | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [days, year, month]);

  if (weekRows.length === 0) return null;

  return (
    <div className='rounded-ws-block border border-ws-line bg-ws-surface p-3'>
      <div className='mb-4 flex flex-wrap items-center gap-x-3 gap-y-1'>
        <p className='mr-auto text-ws-chip font-bold uppercase tracking-[0.06em] text-ws-ink-faint'>
          {monthLabelViOf(year, month)}
        </p>
        {(['complete', 'partial', 'missedAll', 'noData'] as DayLevel[]).map(
          (m) => (
            <span
              key={m}
              className='inline-flex items-center gap-1 text-ws-chip text-ws-ink-faint'
            >
              {/* Swatch RỖNG, không có chữ số mẫu bên trong.
                  Trước đây in số "1" cho khớp với ô lịch thật, nhưng bốn con
                  số 1 nằm cạnh bốn nhãn chữ đọc ra như một danh sách đánh số
                  — người dùng đọc thành "1 Đã nộp đủ, 1 Còn thiếu…". Ô lịch
                  thật đã có số ngày riêng; chú giải chỉ cần nói MÀU. */}
              <span
                aria-hidden='true'
                className={cn(
                  'h-3.5 w-3.5 rounded-ws-bar',
                  LEVEL_CELL_CLASS[m],
                )}
              />
              {LEVEL_LABEL[m]}
            </span>
          ),
        )}
        {/* Vòng xanh không tự giải thích được — không có mục này thì người
            dùng thấy một ô viền khác mà không biết viền đó nói gì. */}
        <span className='inline-flex items-center gap-1 text-ws-chip text-ws-ink-faint'>
          <span
            aria-hidden='true'
            className='h-3.5 w-3.5 rounded-ws-bar bg-ws-progress-bg/60 ring-1 ring-ws-progress-edge/60 ring-offset-1 ring-offset-ws-surface'
          />
          Hôm nay · chưa xong
        </span>
      </div>

      {/* `role='grid'` + hàng/ô có vai trò: bản trước là `div.grid` trần nên
          trình đọc màn hình nhận một dãy phẳng mấy chục nút không có cấu trúc. */}
      {/* `space-y-1.5` cho khe DỌC bằng đúng `gap-1.5` ngang của từng tuần.
          Thiếu nó thì các hàng tuần dính sát nhau: vòng "hôm nay" vẽ bằng
          box-shadow (3px ra ngoài hộp ô) bị nền đặc của ô tuần kế phủ mất cạnh
          dưới, và 3px phía trên đè lên đáy ô tuần trước. Ô hôm nay khi đó mang
          một vòng hở đáy, không giống mẫu ở chú giải. */}
      <div
        role='grid'
        aria-label={monthLabelViOf(year, month)}
        className='space-y-1.5'
      >
        <div role='row' className='grid grid-cols-7 gap-1.5'>
          {[1, 2, 3, 4, 5, 6, 7].map((w) => (
            <span
              key={w}
              role='columnheader'
              /* `ws-ink-faint` chứ không `ws-ink-ghost`: đây là tiêu đề cột của
                 một cái lịch, người ta phải đọc nó mới biết ô nào là thứ mấy —
                 chữ mang thông tin, không phải nét trang trí. `ws-ink-ghost`
                 (#83868b) chỉ đạt 3.65:1 trên nền trắng, dưới ngưỡng AA 4.5:1.
                 Bản khung chờ (`MonthSkeleton`) dùng ĐÚNG chuỗi lớp này để hai
                 dải không đổi màu lúc dữ liệu về. */
              className='text-center text-ws-chip font-semibold text-ws-ink-faint'
            >
              {WEEKDAY_LABEL_VI[w]}
            </span>
          ))}
        </div>

        {/* MỖI TUẦN một `role='row'`, không phải cả tháng một hàng.
            Bản trước nhét 31 ô cộng ô đệm vào đúng một `row`, nên trình đọc
            màn hình thông báo "hàng 1 trên 1, ô 19 trên 37" — mất sạch toạ độ
            tuần/thứ, mà đó chính là thứ duy nhất khiến một cái lịch dễ đọc
            hơn một danh sách. */}
        {weekRows.map((week, wi) => (
          <div
            key={`week-${wi}`}
            role='row'
            className='grid grid-cols-7 gap-1.5'
          >
            {week.map((cell, ci) =>
              cell === null ? (
                <span
                  key={`blank-${wi}-${ci}`}
                  role='gridcell'
                  aria-hidden='true'
                />
              ) : (
                <DayCell
                  key={cell.day}
                  entry={cell}
                  isToday={cell.day === today}
                  isSelected={openDay === cell.day}
                  onSelect={onSelectDay}
                />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayCell({
  entry,
  isToday,
  isSelected,
  onSelect,
}: {
  entry: HistoryDay<DailyReportHistoryItem>;
  isToday: boolean;
  isSelected: boolean;
  onSelect: (day: string) => void;
}) {
  const dayCount = Number(entry.day.slice(8, 10));
  const hasReports = entry.totalCount > 0;

  /**
   * MÀU ô đọc THẲNG từ dữ liệu server, không qua một mức suy diễn nào.
   *
   * Bản trước đổi `entry.level` sang `'partial'` cho ô hôm nay rồi tô theo
   * `level` đã đổi đó. Comment cạnh nó tự nhận là "chỉ dùng cho nhãn", nhưng
   * `level` là biến điều khiển màu ô — hai câu đó không thể cùng đúng. Nay
   * tách hẳn: `entry.level` (server tính từ `doneCount`/`totalCount` của các
   * bản, xem `groupByDay`) quyết định màu; suy luận "hôm nay còn hạn" chỉ đi
   * vào NHÃN ở dưới.
   *
   * Việc tách này không đổi một pixel nào: `groupByDay` chỉ trả `'complete'`
   * khi `doneCount === totalCount`, mà `isTodayPending` lại đòi
   * `doneCount < totalCount` — nên nó không bao giờ lật được `level` qua lại
   * ranh giới `complete`, và với ô hôm nay chưa xong thì `TODAY_INCOMPLETE_CELL`
   * đã ghi đè `LEVEL_CELL_CLASS` rồi.
   */
  const level: DayLevel = entry.level;

  /**
   * HÔM NAY có một quy ước màu riêng: chưa hoàn tất thì xanh nước, hoàn tất
   * thì xanh lá. Không dùng màu vàng/đỏ của những ngày đã kết thúc, kể cả khi
   * dữ liệu hôm nay đã chuyển sang `missed`.
   */
  const isTodayIncomplete = isToday && level !== 'complete';

  /* CHỈ dùng cho nhãn: "hôm nay, chưa nộp đủ, và server chưa đánh trượt bản
     nào" — ba vế đều đọc từ trạng thái server (`state`, `doneCount`,
     `totalCount`), không có phép tính giờ nào ở client. */
  const hasMissed = entry.submissions.some(
    (b) => b.state === 'missed' || b.state === 'archivedMissed',
  );
  const isTodayPending =
    isToday && hasReports && !hasMissed && entry.doneCount < entry.totalCount;

  /* Giờ khóa muộn nhất trong ngày — người thuộc nhiều nhóm thì hạn thật là
     hạn xa nhất. Chỉ dùng cho nhãn, không dùng để tính trạng thái. */
  const lastHardStopLabel = entry.submissions.reduce<{
    minute: number;
    label: string;
  } | null>((acc, b) => {
    const { hardStopMinute, hardStopLabel } = b.item.scope;
    if (!hardStopLabel) return acc;
    return acc && acc.minute >= hardStopMinute
      ? acc
      : { minute: hardStopMinute, label: hardStopLabel };
  }, null)?.label;

  /* Nhãn NÓI ĐỦ: ngày, tỉ lệ, và mức. Bản trước ghi "21/07/2026 — Đã nộp"
     cho một ngày mới nộp 1 trong 3 bản. */
  const label = isToday
    ? hasReports
      ? `${formatDateVi(entry.day)} — hôm nay · ${entry.doneCount}/${entry.totalCount} đã nộp${
          isTodayPending && lastHardStopLabel
            ? ` · còn hạn tới ${lastHardStopLabel}`
            : ''
        }`
      : `${formatDateVi(entry.day)} — hôm nay · ${LEVEL_LABEL.noData}`
    : hasReports
      ? `${formatDateVi(entry.day)} — ${entry.doneCount}/${entry.totalCount} đã nộp`
      : `${formatDateVi(entry.day)} — ${LEVEL_LABEL.noData}`;

  const baseClass = clsx(
    /* Chiều cao đổi theo khổ màn, KHÔNG một con số cho cả hai.
       Dưới `sm` (điện thoại, tức gần như mọi màn cảm ứng) ô cao 44px —
       ngưỡng vùng chạm ở `08-responsive-a11y.md` mục 4. Bề ngang do lưới 7
       cột chia nên nó chạy theo màn: ~40px ở 375px, qua 44px từ khoảng 414px
       trở lên; không ép thêm được nữa nếu không muốn cái lịch tự cuộn ngang.
       Từ `sm` trở lên quay về 36px như thiết kế cũ: ở đó chuột đã chính xác,
       còn bảy ô 44px cộng khoảng cách thì đọc thành một mảng ô vuông nặng nề
       và lưới chiếm gần trọn bề ngang cột. */
    'relative flex min-h-11 flex-col items-center justify-center rounded-ws-chip text-ws-chip font-semibold tabular-nums sm:min-h-9',
    isTodayIncomplete ? TODAY_INCOMPLETE_CELL : LEVEL_CELL_CLASS[level],
    /* Vòng XANH NƯỚC BIỂN nhẹ = "hôm nay và CHƯA XONG".
       Nộp hoàn thiện rồi thì bỏ vòng: ô về xanh lá thuần như mọi ngày đã nộp
       đủ — việc xong thì không cần nhắc nữa, và xanh lá tự nó đã là câu trả
       lời. Vòng chỉ còn ý nghĩa khi hôm nay còn thiếu bản nào đó (kể cả ngày
       chưa sinh bản).
       Xanh dương là màu duy nhất không nằm trong bốn mức của lưới nên không bị
       đọc nhầm thành một mức nộp; khe (`ring-offset-1`) tách nó khỏi `ring-1`
       sát viền của mức trạng thái. Khi ô này đồng thời được chọn, vòng "đang
       chọn" ghi đè màu và độ dày, nhưng không ghi đè khe, nên vẫn còn một dấu
       phân biệt nó với mọi ô khác. */
    isToday &&
      level !== 'complete' &&
      'ring-1 ring-ws-progress-edge/60 ring-offset-1 ring-offset-ws-surface',
  );

  /* Ô lưới và NÚT là hai phần tử khác nhau.
     Bản trước đặt `role='gridcell'` thẳng lên `<button>`, mà `role` GHI ĐÈ
     ngữ nghĩa gốc: trình đọc màn hình thôi thông báo "nút" và người dùng
     không còn biết ô đó bấm được. Bọc nút trong một ô lưới thì giữ được cả
     hai — ô có toạ độ, nút có hành vi. */
  if (!hasReports) {
    return (
      <span
        role='gridcell'
        aria-current={isToday ? 'date' : undefined}
        className={baseClass}
        title={label}
      >
        {dayCount}
        <span className='sr-only'>{label}</span>
      </span>
    );
  }

  return (
    <span role='gridcell' className='contents'>
      <button
        type='button'
        aria-current={isToday ? 'date' : undefined}
        aria-pressed={isSelected}
        onClick={() => onSelect(entry.day)}
        /* `clsx` vì `baseClass` mang sẵn cả cỡ chữ lẫn màu chữ `ws-`. */
        className={clsx(
          baseClass,
          'transition-opacity hover:opacity-80',
          isSelected && 'ring-1 ring-ws-ink/70',
          DAY_FOCUS_RING,
        )}
      >
        {dayCount}
        {/* Tỉ lệ ngay trong ô — đây là thứ phân biệt 3/3 với 1/3, mà một mình
            màu nền không nói được. Chỉ hiện khi ngày có nhiều hơn một bản, vì
            "1/1" là tiếng ồn. */}
        {/* 12px (`text-ws-chip`): chữ dưới 12px trên lịch là chữ khó đọc
            (UAT 17/09/2026). `leading-none` giữ được vì chuỗi này chỉ có chữ
            số và dấu gạch, không có dấu tiếng Việt để cắt. */}
        {entry.totalCount > 1 && (
          <span className='text-ws-chip font-bold leading-none opacity-80'>
            {entry.doneCount}/{entry.totalCount}
          </span>
        )}
        <span className='sr-only'>{label}</span>
      </button>
    </span>
  );
}

/* ── Dải ngày trống ──────────────────────────────────────────────────────── */

function EmptyDayRange({
  range,
}: {
  range: Extract<HistoryRow<never>, { kind: 'empty' }>;
}) {
  const label =
    range.dayCount === 1
      ? formatDayMonthVi(range.from)
      : `${formatDayMonthVi(range.from)} – ${formatDayMonthVi(range.to)}`;

  return (
    /* `ws-ink-faint` thay `ws-ink-ghost`: đây là câu phải đọc được, không phải
       nét trang trí. Hai gạch `bg-ws-line` hai bên mới là trang trí. */
    <p className='flex items-center gap-2 px-3 py-1 text-ws-chip-sm text-ws-ink-faint'>
      <span aria-hidden='true' className='h-px flex-1 bg-ws-line' />
      <span className='shrink-0 tabular-nums'>
        {label} · không có lịch báo cáo
      </span>
      <span aria-hidden='true' className='h-px flex-1 bg-ws-line' />
    </p>
  );
}

/* ── Cấp 1: hàng ngày ────────────────────────────────────────────────────── */

function DayRow({
  ref,
  entry,
  isToday,
  isOpen,
  onToggle,
  onOpenReport,
}: {
  ref: (el: HTMLDivElement | null) => void;
  entry: HistoryDay<DailyReportHistoryItem>;
  isToday: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onOpenReport: (reportId: string, scopeId: string) => void;
}) {
  const panelId = `history-day-${entry.day}`;
  const weekday = WEEKDAY_LABEL_VI[isoWeekdayOfDayStr(entry.day)];

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border bg-ws-surface',
        isToday ? 'border-ws-focus' : 'border-ws-line',
      )}
    >
      <button
        type='button'
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-ws-surface-alt',
          FOCUS_RING,
        )}
      >
        <ChevronDown
          aria-hidden='true'
          className={cn(
            'h-4 w-4 shrink-0 text-ws-ink-faint transition-transform',
            !isOpen && '-rotate-90',
          )}
        />

        <span className='flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5'>
          <span className='text-ws-card-title font-semibold tabular-nums text-ws-ink'>
            {formatDayMonthVi(entry.day)}
          </span>
          {/* Cùng lý do với dải tiêu đề cột của lịch: nhãn thứ là thông tin
              người dùng đọc, không phải nét phụ. `ws-ink-ghost` không qua AA. */}
          <span className='text-ws-chip text-ws-ink-faint'>{weekday}</span>
          {isToday && (
            /* Chữ `done-fg` chứ không `accent`: `accent` trên nền này chỉ đạt
               4.43:1 (đo 17/09/2026), dưới ngưỡng AA 4.5. */
            <span className='rounded-full bg-ws-accent-bg px-1.5 py-0.5 text-ws-chip font-semibold text-ws-done-fg'>
              Hôm nay
            </span>
          )}

          {/* Dòng "thiếu: <tên nhóm>" đã BỎ.
              Chip tỉ lệ bên phải đã nói được là ngày đó còn thiếu, và mở hàng
              ra là thấy đúng nhóm nào — liệt kê tên ngay trên hàng chỉ làm
              hàng dài ra, tràn ở khổ hẹp, mà vẫn phải mở mới thao tác được.
              `entry.pendingScopeNames` vẫn còn trong dữ liệu cho nơi khác
              dùng. */}
        </span>

        <span
          className={clsx(
            'shrink-0 rounded-full px-2 py-0.5 text-ws-chip font-bold tabular-nums',
            entry.level === 'complete'
              ? 'bg-ws-done-bg text-ws-done-fg'
              : entry.level === 'missedAll'
                ? MISSED_FILL_CLASS
                : 'bg-ws-count-bg text-ws-count-fg',
          )}
        >
          {entry.doneCount}/{entry.totalCount} đã nộp
        </span>
      </button>

      {isOpen && (
        <div
          id={panelId}
          className='space-y-1 border-t border-ws-line px-3 py-2'
        >
          {entry.submissions.map((b) => (
            <ScopeRow key={b.item.id} submission={b} onOpen={onOpenReport} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Cấp 2: một bản của một nhóm ─────────────────────────────────────────── */

/* `AlertTriangle` KHÔNG có mặt ở đây. Trong màn này nó đã mang nghĩa "không
   tải được"; dùng lại cho một trạng thái báo cáo là để cùng một hình nói hai
   chuyện khác nhau trên cùng một màn. Bản không nộp dùng `XCircle`. */
const STATE_ICON: Record<SubmissionState, typeof CheckCircle2> = {
  submitted: CheckCircle2,
  reopened: RotateCcw,
  archivedSubmitted: Archive,
  archivedMissed: Archive,
  missed: XCircle,
  pending: Circle,
};

const STATE_COLOR: Record<SubmissionState, string> = {
  submitted: 'text-ws-done-fg',
  reopened: 'text-ws-progress-fg',
  archivedSubmitted: 'text-ws-done-fg',
  archivedMissed: 'text-ws-ink-ghost',
  missed: MISSED_TEXT_CLASS,
  pending: 'text-ws-ink-ghost',
};

function ScopeRow({
  submission,
  onOpen,
}: {
  submission: DaySubmission<DailyReportHistoryItem>;
  onOpen: (reportId: string, scopeId: string) => void;
}) {
  const Icon = STATE_ICON[submission.state];
  const submittedTime = formatTimeVi(submission.item.submittedAt);

  /* Giờ nộp chỉ hiện khi nhãn KHÔNG mâu thuẫn với nó. Bản trước in giờ nộp
     cạnh icon "chưa nộp" cho bản `REOPENED` — một dòng tự nói ngược mình. */
  const showTime =
    submittedTime &&
    submission.state !== 'missed' &&
    submission.state !== 'pending';

  /* Bản nằm TRONG vòng duyệt thì nói kết quả duyệt thay cho "Đã nộp": với một
     bài đã nộp, "Đạt" hay "Bị trả lại" mới là điều người dùng mở Lịch sử ra
     để tìm. Hai ngoại lệ giữ nhãn cũ:
       · bản nộp trước khi có vòng duyệt - server suy chúng là "Chờ duyệt" mãi
         mãi, in ra là nói một điều không có thật (`isInReviewCycle`);
       · bản của nhóm đã lưu trữ - "nhóm đã lưu trữ" là thông tin riêng, kết
         luận duyệt không thay được nó. */
  const { boardState } = submission.item;
  const reviewState =
    boardState !== undefined &&
    boardState !== 'CHUA_NOP' &&
    submission.state !== 'archivedSubmitted' &&
    submission.state !== 'archivedMissed' &&
    isInReviewCycle({
      deadlineAt: submission.item.reviewDeadlineAt,
      decision: submission.item.reviewDecision,
    })
      ? boardState
      : null;

  return (
    <button
      type='button'
      onClick={() => onOpen(submission.item.id, submission.item.scope.id)}
      className={cn(
        /* `min-h-11`: mỗi hàng ở đây MỞ một bản báo cáo, tức là vùng chạm
           chính của phần bung ra, mà `py-2` chỉ cho ra 38px (đo 16/09/2026). */
        'flex w-full min-h-11 items-center gap-2.5 rounded-ws-control border border-ws-line bg-ws-surface-alt px-2.5 py-2 text-left transition-colors hover:bg-ws-surface-sunken',
        FOCUS_RING,
      )}
    >
      <Icon
        aria-hidden='true'
        className={cn('h-4 w-4 shrink-0', STATE_COLOR[submission.state])}
      />
      <span className='min-w-0 flex-1 truncate text-ws-cell font-medium text-ws-ink'>
        {submission.item.scope.name}
      </span>
      {reviewState ? (
        <ReviewStateBadge state={reviewState} />
      ) : (
        <span
          className={clsx(
            /* Nhãn co được và chặn trần 45%: trước 16/09/2026 nó `shrink-0` với
               chữ dài nhất 137px, nên ở 320px tên nhóm - thứ quan trọng hơn -
               bị cắt trước. Câu đủ nghĩa đi kèm cho trình đọc màn hình. */
            'min-w-0 max-w-[45%] truncate text-ws-chip-sm',
            submission.state === 'missed'
              ? `font-semibold ${MISSED_TEXT_CLASS}`
              : 'text-ws-ink-soft',
          )}
        >
          {SUBMISSION_STATE_LABEL[submission.state]}
          <span className='sr-only'>
            {' '}
            ({SUBMISSION_STATE_DETAIL[submission.state]})
          </span>
        </span>
      )}
      {showTime && (
        <span className='shrink-0 font-mono text-ws-chip tabular-nums text-ws-ink-faint'>
          {submittedTime}
        </span>
      )}
      <ChevronRight
        aria-hidden='true'
        className='h-4 w-4 shrink-0 text-ws-ink-faint'
      />
    </button>
  );
}

/* ── Khung chờ ───────────────────────────────────────────────────────────── */

/**
 * Khung chờ của cả tháng — dựng đúng lưới 7 cột sắp hiện ra.
 *
 * Bản trước là một `Loader2` xoay cao 64px cho một khối sắp cao 400–500px:
 * lúc dữ liệu về, thẻ lịch bung ra và đẩy toàn bộ danh sách ngày xuống dưới
 * tầm mắt. Vẽ sẵn đúng số hàng tuần của tháng đang xem thì chiều cao gần khớp
 * và không có cú nhảy nào.
 *
 * Ở đây KHÔNG có `role='grid'`: chưa có ô nào là ô thật, khai một lưới rỗng
 * chỉ khiến trình đọc màn hình đọc ra một cái lịch trống. `aria-busy` trên
 * khối bọc đã nói đủ.
 */
function MonthSkeleton({ year, month }: { year: number; month: number }) {
  const weekCount = useMemo(() => {
    const firstOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
    const leadingBlanks = isoWeekdayOfDayStr(firstOfMonth) - 1;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return Math.ceil((leadingBlanks + daysInMonth) / 7);
  }, [year, month]);

  return (
    <div
      aria-busy='true'
      aria-live='polite'
      aria-label={`Đang tải lịch sử ${monthLabelViOf(year, month)}`}
      className='space-y-4'
    >
      <div className='rounded-ws-block border border-ws-line bg-ws-surface p-3'>
        <div className='mb-4 flex flex-wrap items-center gap-x-3 gap-y-1'>
          <Skeleton className={cn('mr-auto h-3 w-28', SKELETON)} />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className={cn('h-3 w-24', SKELETON)} />
          ))}
        </div>

        <div className='space-y-1.5'>
          <div className='grid grid-cols-7 gap-1.5'>
            {[1, 2, 3, 4, 5, 6, 7].map((w) => (
              <span
                key={w}
                aria-hidden='true'
                /* `ws-ink-faint` chứ không `ws-ink-ghost`: đây là tiêu đề cột của
                 một cái lịch, người ta phải đọc nó mới biết ô nào là thứ mấy —
                 chữ mang thông tin, không phải nét trang trí. `ws-ink-ghost`
                 (#83868b) chỉ đạt 3.65:1 trên nền trắng, dưới ngưỡng AA 4.5:1.
                 Bản khung chờ (`MonthSkeleton`) dùng ĐÚNG chuỗi lớp này để hai
                 dải không đổi màu lúc dữ liệu về. */
                className='text-center text-ws-chip font-semibold text-ws-ink-faint'
              >
                {WEEKDAY_LABEL_VI[w]}
              </span>
            ))}
          </div>

          {Array.from({ length: weekCount }, (_, wi) => (
            <div key={wi} className='grid grid-cols-7 gap-1.5'>
              {[0, 1, 2, 3, 4, 5, 6].map((ci) => (
                <Skeleton
                  key={ci}
                  /* Cùng chiều cao với ô lịch thật — 44px trên màn cảm ứng,
                     36px từ `sm` trở lên. */
                  className={cn(
                    'min-h-11 rounded-ws-chip sm:min-h-9',
                    SKELETON,
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className='space-y-1.5'>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className='flex items-center gap-3 rounded-lg border border-ws-line bg-ws-surface p-3'
          >
            <Skeleton
              className={cn('h-4 w-4 shrink-0 rounded-ws-bar', SKELETON)}
            />
            <Skeleton className={cn('h-3.5 w-20 shrink-0', SKELETON)} />
            <Skeleton className={cn('h-3 w-12 shrink-0', SKELETON)} />
            <Skeleton
              className={cn('ml-auto h-4 w-24 shrink-0 rounded-full', SKELETON)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
