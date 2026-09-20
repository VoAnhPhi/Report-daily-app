'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronDown,
  FileText,
  ListFilter,
  SlidersHorizontal,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  useDailyReport,
  useReportBoard,
  useReportPendingReview,
} from '@/hooks/queries/daily-report-queries';
import type { BoardRow } from '@/types/daily-report.type';
import {
  FOCUS_RING_SURFACE as FOCUS_RING,
  MISSED_TEXT_CLASS,
} from '../utils/classes';
import { formatTimeVi, todayStrVi } from '../utils/date';
import { isSubmitted } from '../utils/status';
import { DailyReportGroupOutcome } from './daily-report-group-outcome';
import { ReportErrorState } from '../shared/report-error-state';
import { BoardDateNav } from './board-date-nav';
import { BoardKpiPanel, BoardKpiToggle } from './board-kpi-summary';
import { DailyReportPendingReview } from '../pending-review/daily-report-pending-review';
import { HelpStatusPill } from '../shared/help-status-pill';
import { InfoHint } from '../shared/info-hint';
import { ListSearch, normalizeSearchVi } from '../shared/list-search';
import { PageNav } from '../shared/page-nav';
import { useScrollToStart } from '../shared/use-scroll-to-start';
import {
  REPORT_ROW_PAD,
  ReportRowAside,
  ReportRowList,
  ReportRowMain,
  ReviewStateBadge,
  RowActionLabel,
} from '../shared/report-row';
import {
  StatusFilterChips,
  type StatusFilterOption,
} from '../shared/status-filter-chips';

/** Số dòng mỗi trang của bảng nhóm (UAT 16/09/2026 lượt 2). */
const BOARD_PAGE_SIZE = 10;

/** Vòng focus bàn phím — cùng công thức với `daily-report-scope-rail.tsx`.
 *  Nền dưới mọi nút của màn này là `ws-surface`, nên khe hở phải cùng màu đó;
 *  lệch màu khe là viền focus bị một vệt sáng cắt ngang. */
/* Template literal chứ không `cn()` — chuỗi này cố định, không có nhánh nào để
   hoà giải nên twMerge chỉ là chi phí thừa.
   (Trước 23/08 đây còn là cách NÉ một bug: twMerge xếp `text-ws-chip` và
   `text-ws-ink-soft` chung nhóm rồi nuốt mất cỡ chữ. Bug đã sửa tận gốc bằng
   `extendTailwindMerge` trong `lib/utils/index.tsx`, nên giờ `cn()` cũng cho
   kết quả đúng — chỉ là ở đây không cần tới nó.) */
/* MỘT khuôn cho cả nút "Tổng hợp" lẫn nút quay lại: hai nút thay chỗ nhau ở
   đúng một ô trên hàng thống kê, nên lệch chiều cao hay cỡ chữ là cả hàng
   nhảy một nhịp mỗi lần đổi trạng thái.

   Cao 44px trên điện thoại rồi hạ về 36px từ `sm`, + `text-ws-body` chứ không
   còn `py-1.5` + `text-ws-chip` như bản cũ: đây là LỐI VÀO màn đọc nội dung cả
   nhóm, tức một trong hai hành động chính của bảng, mà bản cũ lại nhỏ và nhạt
   hơn cả chip lọc ngay dưới nó.
   44px là sàn vùng chạm, và nút này đứng CÙNG HÀNG với chip KPI
   (`min-h-11 sm:min-h-9`) — cố định 36px ở mọi bề ngang thì trên điện thoại nó
   vừa dưới sàn chạm vừa thấp hơn hàng xóm 8px.
   `h-11 sm:h-9` chứ KHÔNG `min-h-11 sm:h-9`: `min-height` thắng `height`, nên
   một `min-h-11` không được gỡ ở `sm` sẽ giữ nút 44px ở mọi bề ngang. Còn
   `h-11` thì twMerge nuốt đúng `h-10` mặc định của `size='default'` trong
   `components/ui/button.tsx` vì hai class cùng nhóm.
   Vẫn là `variant='outline'` chứ không phải nút đen: nút đen của cả cụm Báo
   cáo dành riêng cho hành động NỘP (xem ghi chú khuôn chip ở `utils/constants.ts`).

   Nền `ws-surface` chứ không `ws-surface-alt`: nút đứng trên thanh dính cũng
   màu `ws-surface`, và đã có viền `ws-line` để tách ra — cùng cách xử lý với
   ba ô chọn trên thanh công cụ màn Lịch sử. */
const OUTCOME_BUTTON_CLASS = `h-11 gap-1.5 rounded-ws-control border-ws-line bg-ws-surface px-3 text-ws-body font-medium text-ws-ink-soft hover:bg-ws-surface-alt hover:text-ws-ink sm:h-9 ${FOCUS_RING}`;

interface Props {
  scopeId: string;
  /**
   * Ngày `YYYY-MM-DD` MỞ ĐẦU. Bỏ trống thì server lấy hôm nay — chỉ đúng khi
   * bảng được mở từ trong ngày. Thông báo tổng hợp gửi trưởng nhóm mang theo
   * ngày của chính sự kiện, nên phải truyền vào.
   *
   * Chỉ là điểm xuất phát: từ khi có cụm điều hướng ngày, ngày đang xem sống
   * trong state của chính bảng. Cha đổi prop này (deep-link mới) thì bảng
   * nhảy theo, còn người dùng bấm lùi/tiến thì prop không đổi.
   */
  date?: string;
  /**
   * Báo NGƯỢC lên khi người dùng tự đổi ngày.
   *
   * `daily-report-workspace.tsx` nối vào đây để làm hai việc: cập nhật
   * `boardDate` (queryKey của chip đếm "chưa nộp" hiện ngay TRÊN bảng phải
   * cùng ngày với bảng) và ghi `?date=` lên URL.
   *
   * Không bắt buộc, và bảng KHÔNG chờ cha xác nhận: thiếu prop này thì đổi
   * ngày vẫn chạy đủ, chỉ là F5 quay về ngày trong URL.
   */
  onDateChange?: (dayStr: string) => void;
  /* `hideScopeName` ĐÃ BỎ (UAT 18/09/2026): dòng "tên nhóm · Khóa lúc HH:mm"
     không còn, nên không còn gì để ẩn. NGÀY vẫn ở lại trong cụm điều hướng -
     đó là chỗ duy nhất trong cả màn in ngày của bảng, mà bảng xem được ngày cũ
     (thông báo tổng hợp gửi tối qua mang theo `focusDate`). */
  /**
   * Link tới bản chi tiết của MỘT dòng, nơi có panel duyệt. Thiếu thì dòng chỉ
   * bung ra để đọc tại chỗ như trước.
   *
   * Trước đây bảng không có lối nào sang bản chi tiết: chip "Chờ duyệt (3)" đếm
   * được việc nhưng không dẫn tới chỗ làm việc đó, người duyệt phải bấm thông
   * báo hoặc đi vòng qua Tổng quan.
   */
  reportHref?: (reportId: string) => string;
}

/** `help` là bộ lọc phía client; ba giá trị còn lại do server lọc qua `?status=`. */
type StatusFilter =
  | 'all'
  | 'pending'
  | 'missed'
  | 'review'
  | 'expired'
  | 'help';

/**
 * Bảng theo dõi nhóm (docs 06 mục 4): ai đã nộp / chưa nộp / nộp trễ / cần hỗ
 * trợ. Bấm một dòng mở khối chi tiết tại chỗ.
 *
 * Đây là **một chế độ xem bên trong hộp thoại Báo cáo**, không phải hộp thoại
 * riêng. Trước đây nó tự dựng `ResponsiveModal` của mình, nên bấm "Bảng nhóm"
 * là đóng hộp này để mở hộp kia — người dùng mất ngữ cảnh và không có đường
 * quay lại. Tiêu đề và nút ← nay do `DailyReportModal` vẽ.
 */
export function DailyReportBoard({
  scopeId,
  date,
  onDateChange,
  reportHref,
}: Props) {
  const [filter, setFilterState] = useState<StatusFilter>('all');
  const [query, setQueryState] = useState('');
  const [page, setPageState] = useState(1);
  /* Đổi trang, bộ lọc hay ngày thì đưa đầu bảng về tầm nhìn: danh sách mới
     ngắn hơn là trình duyệt kẹp vị trí cuộn và người dùng đứng giữa chừng
     (đo 375px, 17/09/2026). Gõ tìm KHÔNG cuộn: ô tìm nằm ngay đầu bảng. */
  const [boardRef, requestBoardScroll] = useScrollToStart<HTMLDivElement>();
  const setPage = (next: number) => {
    setPageState(next);
    requestBoardScroll();
  };
  /* Đổi bộ lọc hay từ khoá là đổi cả danh sách: trang cũ hết nghĩa. */
  const setFilter = (next: StatusFilter) => {
    setFilterState(next);
    setPageState(1);
    requestBoardScroll();
  };
  const setQuery = (next: string) => {
    setQueryState(next);
    setPageState(1);
  };
  const [showOutcome, setShowOutcome] = useState(false);
  const [isKpiOpen, setIsKpiOpen] = useState(false);
  const kpiPanelId = useId();
  /* Dải chip lọc đóng sẵn, cùng khuôn với khối Thành viên của Tổng quan. */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterPanelId = useId();

  /* Ngày đang xem sống Ở ĐÂY chứ không ở cha: cụm điều hướng phải đổi ngày
     được ngay cả khi bảng được dựng không kèm `onDateChange`. Cha có nối dây
     thì nó chỉ đi theo, không phải chỗ quyết. */
  const [viewDate, setViewDate] = useState<string | undefined>(date);
  /* Bám theo prop `date` để deep-link mới (`?focusDate=` của thông báo tổng
     hợp) vẫn kéo được bảng sang ngày của nó.
     Chỉnh state NGAY TRONG lượt render thay vì trong `useEffect`: hiệu ứng
     chạy SAU khi render xong, tức có đúng một lượt render mang ngày cũ — và
     lượt đó đủ để `useReportBoard` đăng ký một queryKey của ngày sai rồi bắn
     thêm một request. React bỏ luôn kết quả lượt render này khi thấy setState
     ở đây, nên không có gì kịp hiện ra. */
  const [syncedDate, setSyncedDate] = useState<string | undefined>(date);
  if (date !== syncedDate) {
    setSyncedDate(date);
    setViewDate(date);
  }

  /* `viewDate || undefined` chứ không `viewDate`: `?date=` để trống trên URL
     cho ra chuỗi RỖNG (nuqs `parseAsString` chỉ trả `null` khi param vắng
     hẳn), mà chuỗi rỗng lọt xuống đây là gửi `date=` rỗng lên API và tạo một
     queryKey thứ hai khác hẳn `undefined` cho cùng một bảng. */
  const { data, isLoading, isError, refetch } = useReportBoard(
    scopeId,
    viewDate || undefined,
  );
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  /* Ngày mà cả đầu bảng đang nói tới.
     `viewDate` rỗng nghĩa là "để server tự lấy hôm nay", nên ưu tiên `data.date`
     — đó mới là ngày server thật sự đã trả. Chỉ khi chưa có dữ liệu mới đoán
     bằng hôm nay theo GIỜ NGHIỆP VỤ; hỏi giờ máy ở đây là cụm điều hướng in
     một ngày còn bảng bên dưới in ngày khác.

     `||` chứ KHÔNG `??`: "rỗng" ở đây gồm cả CHUỖI RỖNG, không chỉ
     null/undefined. URL `?date=` bỏ trống cho ra `''`, và `''` lọt tới đây là
     `BoardDateNav` in "T2 · " (không có ngày), `aria-label` đọc thành "Đang
     xem ngày  — …", còn hai nút lùi/tiến bấm không có tác dụng vì
     `shiftDayStr('', ±1)` trả lại đúng `''`. */
  const anchorDay = viewDate || data?.date || todayStrVi();

  const handleChangeDay = (dayStr: string) => {
    setViewDate(dayStr);
    setPage(1);
    onDateChange?.(dayStr);
  };

  /* Mục "Chờ duyệt" đọc nguồn RIÊNG, xuyên ngày. Chip vẫn đứng cùng hàng với
     các chip theo ngày vì đó là chỗ người duyệt đã quen bấm, nhưng con số và
     danh sách của nó KHÔNG thuộc về ngày đang xem: `stats.pendingReview` của
     bảng chỉ đếm trong một ngày, nên người duyệt nghỉ hai ngày thì hai ngày ấy
     biến mất khỏi mọi lối vào (lỗi UAT 16/09/2026).
     Tải sẵn cả khi chip chưa được chọn, vì con số phải hiện ngay trên chip. */
  const pendingReviewQuery = useReportPendingReview(scopeId);
  const isPendingReviewView = filter === 'review';
  const pendingReviewTotal = pendingReviewQuery.data?.total;

  const needle = normalizeSearchVi(query.trim());
  const matchesQuery = (fullName: string) =>
    needle.length === 0 || normalizeSearchVi(fullName).includes(needle);

  /* Dòng cần người xem ra tay (chờ kết luận, quá hạn, đang xin hỗ trợ) lên
     đầu, phần còn lại giữ thứ tự server. Trước đó mười dòng "Chưa nộp" chiếm
     trọn trang 1 và hai bản chờ duyệt rơi sang trang 2 (UAT 17/09/2026).
     `sort` của mảng là ổn định nên trong mỗi nhóm thứ tự không đổi. */
  const needsAction = (r: BoardRow) =>
    r.helpStatus === 'OPEN' ||
    r.boardState === 'CHO_DUYET' ||
    r.boardState === 'QUA_HAN_DUYET' ||
    r.boardState === 'QUA_HAN_BO_SUNG';
  const rows = [...(data?.rows ?? [])]
    .sort((a, b) => Number(needsAction(b)) - Number(needsAction(a)))
    .filter((r) => {
      if (!matchesQuery(r.fullName)) return false;
      if (filter === 'pending') return !isSubmitted(r.status);
      if (filter === 'missed') return r.isMissed;
      if (filter === 'help') return r.helpStatus === 'OPEN';
      if (filter === 'review') return r.boardState === 'CHO_DUYET';
      if (filter === 'expired') {
        // Gộp hai ngõ cụt vào một bộ lọc: cả hai đều cần người quản lý ra tay,
        // nhưng nhãn trên từng dòng vẫn nói rõ cái nào là cái nào.
        return (
          r.boardState === 'QUA_HAN_DUYET' || r.boardState === 'QUA_HAN_BO_SUNG'
        );
      }
      return true;
    });

  /* `countUnknown` chỉ có ở "Chờ duyệt": chip đó đọc số từ endpoint riêng, nên
     nó là chip duy nhất có thể đếm hỏng trong khi bảng vẫn tải được. */
  const filters: StatusFilterOption<StatusFilter>[] = [
    { key: 'all', label: 'Tất cả', count: data?.stats.total },
    {
      key: 'pending',
      label: 'Chưa nộp',
      count: data?.stats.pending,
      dotClass: 'bg-ws-ink-ghost',
    },
    {
      key: 'missed',
      label: 'Không nộp',
      count: data?.stats.missed,
      dotClass: 'bg-ws-danger/80',
    },
    /*
     * BA con số rời nhau, không con nào cộng vào con nào:
     *   · "Chưa nộp"/"Không nộp" — vấn đề của thành viên;
     *   · "Chờ duyệt"            — vấn đề của người duyệt, còn kịp;
     *   · "Quá hạn"              — vấn đề của người duyệt, đã lỡ.
     * Gộp bất kỳ hai cái nào là mất đúng thứ tính năng này sinh ra để giải.
     */
    {
      key: 'review',
      label: 'Chờ duyệt',
      count: pendingReviewTotal,
      countUnknown: pendingReviewQuery.isError,
      dotClass: 'bg-ws-progress-fg',
    },
    {
      key: 'expired',
      label: 'Quá hạn',
      count:
        data === undefined
          ? undefined
          : data.stats.expiredReview + data.stats.expiredEdit,
      dotClass: 'bg-ws-danger',
    },
    {
      key: 'help',
      label: 'Cần hỗ trợ',
      count: data?.stats.needHelp,
      dotClass: 'bg-ws-danger',
    },
  ];

  /* Chip đếm ra 0 ẩn đi: nó chỉ nói "không có ai ở mục này", mà bấm vào thì ra
     một danh sách rỗng. Mục "Tất cả" và mục ĐANG CHỌN luôn ở lại - mất mục đang
     chọn là mất luôn đường bỏ lọc. Chưa có số (đang tải) thì vẫn hiện. */
  const shownFilters = filters.filter(
    (option) =>
      option.key === 'all' ||
      option.key === filter ||
      option.countUnknown === true ||
      option.count === undefined ||
      option.count > 0,
  );

  const pageCount = Math.max(1, Math.ceil(rows.length / BOARD_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = rows.slice(
    (currentPage - 1) * BOARD_PAGE_SIZE,
    currentPage * BOARD_PAGE_SIZE,
  );

  /* Bảng luôn tải TOÀN BỘ hàng (`useReportBoard` không truyền `status`), việc
     lọc xảy ra ngay trên mảng đó. Nên phân biệt được hai lý do khiến danh sách
     trống, và đó là hai câu trả lời khác hẳn nhau cho trưởng nhóm: bộ lọc đang
     bật không khớp ai, hay ngày đó nhóm không có ai phải nộp. */
  const totalRows = data?.rows.length ?? 0;
  const emptyReason: 'filtered' | 'no-member' =
    (filter !== 'all' || needle.length > 0) && totalRows > 0
      ? 'filtered'
      : 'no-member';

  const submittedPercent =
    data && data.stats.total > 0
      ? Math.round((data.stats.submitted / data.stats.total) * 100)
      : 0;

  return (
    <div ref={boardRef} className='scroll-mt-[var(--ws-sticky-top,0px)]'>
      {/* Dính dưới thanh Navbar cố định, không dính ở đỉnh khung hình: từ khi
          màn Báo cáo cuộn theo TRANG chứ không theo một hộp con, `top-0` nghĩa
          là chui xuống dưới Navbar. Mốc `--ws-sticky-top` đặt ở gốc màn
          /tasks. */}
      {/* Chỉ dính từ `sm`: ở điện thoại dải chip lọc xuống dòng và ô tìm làm
          đầu bảng cao gần nửa màn hình, dính lại là che mất danh sách khi cuộn
          (đo 375px, 16/09/2026). */}
      <div className='z-10 border-b border-ws-line bg-ws-surface px-5 py-3 sm:sticky sm:top-[var(--ws-sticky-top,0px)]'>
        {/* MỘT hàng cho cả ngày lẫn hai nút: điều hướng ngày bên trái, chip KPI
            và nút "Tổng hợp" dồn về mép phải. Trước 18/09/2026 đây là hai hàng,
            hàng thứ hai chỉ để chở một dòng số liệu mà chip lọc đã nói.

            Cụm điều hướng ngày nằm NGOÀI `data &&` khác với phần còn lại của đầu bảng.
            Đổi ngày là đổi queryKey, mà `useReportBoard` không giữ dữ liệu cũ
            nên `data` rơi về `undefined` suốt lượt tải: bọc vào trong thì cụm
            điều hướng biến mất ngay lúc vừa bấm. Ở nhánh `isError` còn tệ hơn
            — không có đường quay lại ngày đọc được, F5 là lối thoát duy nhất. */}
        {/* Người duyệt phụ chỉ thấy phần mình phụ trách vì SERVER đã lọc.
            MỘT dòng ngắn đứng trên cùng, câu giải thích nằm trong chú giải
            (UAT 18/09/2026: câu cũ dài và nằm lẫn giữa đầu bảng). */}
        {data?.stats.isFilteredToAssignment && (
          <p className='mb-1.5 flex items-center gap-1 text-ws-chip text-ws-ink-faint'>
            Chỉ người bạn phụ trách
            <InfoHint label='Vì sao danh sách ngắn hơn nhóm'>
              Bạn được giao duyệt {data.stats.visibleMemberCount} người trong
              nhóm này, nên bảng chỉ trả về ngần ấy. Đây không phải toàn nhóm.
            </InfoHint>
          </p>
        )}
        <div className='mb-2 flex flex-wrap items-center gap-x-3 gap-y-2'>
          <BoardDateNav value={anchorDay} onChange={handleChangeDay} />
          {/* Giờ khóa ĐÃ BỎ khỏi đầu bảng (UAT 18/09/2026): nó cố định theo
              nhóm, đọc một lần là biết, mà lại chiếm chỗ ở mọi ngày xem. Hai
              chỗ còn nói giờ khóa: cột "Mốc trong ngày" của màn đọc bản và màn
              cấu hình báo cáo. */}
          {/* Nút vào DANH MỤC KPI (khác chip KPI ngay dưới) đứng cạnh nút "Cấu
              hình báo cáo" trên hàng tiêu đề nhóm của
              `daily-report-workspace.tsx`, ngoài cây này, vì nó là lối vào DUY
              NHẤT tới danh mục KPI và không được chết theo trạng thái tải của
              bảng. Đừng đưa nút đó trở lại vào trong `{data && (`. */}
          {/* Cụm bấm được dồn về mép phải, CÙNG hàng với điều hướng ngày.
              Dòng số liệu cũ ("1/12 đã nộp · 1 cần hỗ trợ") đã bỏ: chính các
              chip lọc nói đúng những con số đó, và thanh tiến độ ngay dưới đây
              nói tỉ lệ (UAT 18/09/2026). */}
          {data && (
            /* `sm:ml-auto`: ở khổ hẹp cụm này rớt xuống dòng riêng, dạt phải
               thì nó lơ lửng lệch hẳn khỏi ngày ở dòng trên (đo 320px). */
            <span className='flex items-center gap-2 sm:ml-auto'>
              <BoardKpiToggle
                summary={data.kpiSummary}
                isOpen={isKpiOpen}
                onToggle={() => setIsKpiOpen((open) => !open)}
                panelId={kpiPanelId}
              />
              {showOutcome ? (
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setShowOutcome(false)}
                  aria-label='Bảng nhóm, quay lại danh sách ai đã nộp'
                  className={OUTCOME_BUTTON_CLASS}
                >
                  <ArrowLeft className='h-4 w-4' aria-hidden='true' />
                  Bảng nhóm
                </Button>
              ) : (
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setShowOutcome(true)}
                  aria-label='Tổng hợp nội dung đã nộp của cả nhóm'
                  className={OUTCOME_BUTTON_CLASS}
                >
                  <FileText className='h-4 w-4' aria-hidden='true' />
                  Tổng hợp
                </Button>
              )}
            </span>
          )}
        </div>
        {data && (
          <>
            {/* Thanh tiến độ dùng primitive chung thay cho hai div tự vẽ: nó tự
                mang `role="progressbar"` và `aria-valuenow`, thứ mà bản tự vẽ
                không có. Màu thanh chạy phải đặt qua selector con vì primitive
                không mở prop riêng cho Indicator. */}
            <Progress
              value={submittedPercent}
              aria-label={`Đã nộp ${data.stats.submitted} trên ${data.stats.total}`}
              className='h-1.5 rounded-ws-bar bg-ws-surface-sunken [&>div]:bg-ws-done-edge'
            />
            <BoardKpiPanel
              summary={data.kpiSummary}
              id={kpiPanelId}
              isOpen={isKpiOpen}
            />
            {!showOutcome && (
              <div className='mt-3 space-y-2'>
                {/* Một hàng công cụ: ô tìm bên trái, nút mở dải lọc ngay sau.
                    Dải chip nằm SAU một nút bật (UAT 18/09/2026): sáu chip mở
                    sẵn là sáu con số phải đọc trước khi tới được danh sách,
                    trong khi phần lớn lượt xem không lọc gì. Cùng khuôn với
                    khối Thành viên của Tổng quan. */}
                <div className='flex flex-wrap items-center gap-2'>
                  {/* Tìm theo tên áp cho danh sách của NGÀY đang xem. Ẩn ở mục
                      "Chờ duyệt": danh sách đó xuyên ngày và có màn riêng. */}
                  {!isPendingReviewView && (
                    <ListSearch
                      value={query}
                      onChange={setQuery}
                      label='Tìm thành viên trong bảng nhóm'
                      className='w-full sm:w-60'
                    />
                  )}
                  <button
                    type='button'
                    aria-expanded={filtersOpen}
                    aria-controls={filterPanelId}
                    onClick={() => setFiltersOpen((open) => !open)}
                    className={cn(
                      'inline-flex h-11 items-center gap-1.5 rounded-ws-control border px-3 text-ws-cell font-medium transition-colors sm:h-9',
                      filtersOpen || filter !== 'all'
                        ? 'border-ws-ink-soft bg-ws-surface-alt text-ws-ink'
                        : 'border-ws-line bg-ws-surface text-ws-ink-soft hover:text-ws-ink',
                      FOCUS_RING,
                    )}
                  >
                    <SlidersHorizontal aria-hidden='true' className='h-4 w-4' />
                    Bộ lọc
                    {filter !== 'all' && (
                      <span className='rounded-full bg-ws-ink px-1.5 text-ws-chip font-bold text-ws-solid-ink'>
                        1
                      </span>
                    )}
                    <ChevronDown
                      aria-hidden='true'
                      className={cn(
                        'h-4 w-4 transition-transform',
                        filtersOpen && 'rotate-180',
                      )}
                    />
                  </button>
                  {/* Đóng dải lọc mà vẫn đang lọc: nói ra, kèm lối bỏ lọc. */}
                  {!filtersOpen && filter !== 'all' && (
                    <span className='flex items-center gap-1 text-ws-chip text-ws-ink-soft'>
                      {filters.find((option) => option.key === filter)?.label}
                      <button
                        type='button'
                        onClick={() => setFilter('all')}
                        aria-label='Bỏ lọc trạng thái'
                        className={cn(
                          'inline-flex h-11 w-11 items-center justify-center rounded-ws-control text-ws-ink-soft hover:bg-ws-surface-sunken hover:text-ws-ink sm:h-7 sm:w-7',
                          FOCUS_RING,
                        )}
                      >
                        <X aria-hidden='true' className='h-4 w-4' />
                      </button>
                    </span>
                  )}
                </div>
                {filtersOpen && (
                  <div id={filterPanelId}>
                    <StatusFilterChips
                      options={shownFilters}
                      value={filter}
                      onChange={setFilter}
                      label='Lọc thành viên theo trạng thái'
                      gridOnMobile
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className='px-5 py-3'>
        {isLoading ? (
          <BoardListSkeleton />
        ) : isError ? (
          /* Phải đứng TRƯỚC nhánh rỗng. Tải hỏng mà hiện "Không có ai trong
             mục này" thì trưởng nhóm kết luận cả nhóm chưa ai nộp trong khi
             API còn chưa trả lời — đúng điều docs 11 mục 2 cấm.
             Nút "Thử lại" là lối thoát duy nhất ngoài F5: query client tắt cả
             refetchOnWindowFocus/onMount/onReconnect, nên `isError` một khi đã
             bật thì tự nó không bao giờ tắt. */
          <ReportErrorState
            title='Không tải được bảng theo dõi nhóm.'
            detail='Đây là lỗi tải dữ liệu, chưa biết được ai đã nộp hay chưa.'
            onRetry={() => void refetch()}
          />
        ) : showOutcome ? (
          /* `anchorDay` chứ không `data?.date ?? ''`: cụm điều hướng ngày phải
             kéo được cả màn Tổng hợp theo, và chuỗi rỗng thì bỏ mặc server tự
             chọn hôm nay — tức đọc nội dung ngày khác với bảng vừa xem. */
          <DailyReportGroupOutcome scopeId={scopeId} date={anchorDay} />
        ) : isPendingReviewView ? (
          /* Nhánh này đứng TRƯỚC `rows.length === 0`: danh sách chờ duyệt
             không sinh từ `rows` của ngày đang xem, nên để nó rơi vào nhánh
             rỗng của bảng là in "ngày này nhóm không có ai phải nộp" trong khi
             vẫn còn bản chờ duyệt ở ngày khác. */
          /* CHÍNH component của tab "Chờ duyệt": một danh sách, một giao
             diện, ở cả hai chỗ (UAT 17/09/2026). */
          <DailyReportPendingReview
            scopeId={scopeId}
            reportHref={reportHref}
            onPageChange={requestBoardScroll}
            embedded
          />
        ) : rows.length === 0 ? (
          <BoardEmpty
            reason={emptyReason}
            totalRows={totalRows}
            filterLabel={
              needle.length > 0
                ? `từ khoá “${query.trim()}”`
                : `“${filters.find((f) => f.key === filter)?.label ?? ''}”`
            }
            onClearFilter={() => {
              setFilter('all');
              setQuery('');
            }}
          />
        ) : (
          <div>
            {/* Khuôn danh sách chung với tab "Chờ duyệt" (UAT 17/09/2026). */}
            <ReportRowList label='Thành viên của ngày đang xem'>
              {pageRows.map((row) => (
                <li key={row.userId}>
                  <BoardRowItem
                    row={row}
                    helpMode={filter === 'help'}
                    href={reportHref ? reportHref(row.reportId) : null}
                    isExpanded={expandedUserId === row.userId}
                    onToggle={() =>
                      setExpandedUserId((cur) =>
                        cur === row.userId ? null : row.userId,
                      )
                    }
                  />
                </li>
              ))}
            </ReportRowList>
            {/* Phân trang tại client: bảng một ngày đã tải đủ hàng để đếm các
                con số ở đầu bảng, nên cắt trang ở đây không tốn thêm request. */}
            <div className='flex flex-wrap items-center justify-between gap-2 pt-2'>
              <p className='text-ws-chip tabular-nums text-ws-ink-faint'>
                {rows.length > BOARD_PAGE_SIZE
                  ? `${(currentPage - 1) * BOARD_PAGE_SIZE + 1}-${Math.min(currentPage * BOARD_PAGE_SIZE, rows.length)} trên ${rows.length} thành viên`
                  : `${rows.length} thành viên`}
              </p>
              <PageNav
                page={currentPage}
                totalPages={pageCount}
                onChange={setPage}
                label='bảng nhóm'
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Khung chờ giữ ĐÚNG hình dạng hàng thành viên sắp hiện: ô trạng thái tròn,
 * avatar tròn, hai dòng chữ, ô giờ bên phải. Vòng xoay giữa màn cũ không nói
 * được nội dung sắp tới trông thế nào, nên khi dữ liệu về là cả khối nhảy một
 * nhịp.
 */
function BoardListSkeleton() {
  return (
    <div
      role='status'
      aria-busy='true'
      aria-label='Đang tải bảng theo dõi nhóm'
      className='space-y-1'
    >
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          aria-hidden='true'
          className='flex items-center gap-3 rounded-ws-block border border-ws-line bg-ws-surface p-3'
        >
          <Skeleton className='h-4 w-4 shrink-0 rounded-full bg-ws-surface-sunken' />
          <Skeleton className='h-7 w-7 shrink-0 rounded-full bg-ws-surface-sunken' />
          <div className='min-w-0 flex-1 space-y-1.5'>
            <Skeleton className='h-3 w-1/3 rounded-ws-bar bg-ws-surface-sunken' />
            <Skeleton className='h-3 w-2/3 rounded-ws-bar bg-ws-surface-sunken' />
          </div>
          <Skeleton className='h-3 w-9 shrink-0 rounded-ws-bar bg-ws-surface-sunken' />
        </div>
      ))}
    </div>
  );
}

/**
 * Bảng trống vì hai lý do khác nhau, và trả lời gộp là bỏ mất câu quan trọng.
 *
 * - `filtered`: nhóm có người, nhưng mục lọc đang bật không khớp ai. Việc cần
 *   làm là BỎ LỌC, nên khối này phải có nút bỏ lọc tại chỗ.
 * - `no-member`: ngày đó không ai nằm trong danh sách phải nộp. Không có hành
 *   động nào cứu được, chỉ cần nói rõ để trưởng nhóm không tưởng bảng hỏng.
 */
function BoardEmpty({
  reason,
  totalRows,
  filterLabel,
  onClearFilter,
}: {
  reason: 'filtered' | 'no-member';
  totalRows: number;
  filterLabel: string;
  onClearFilter: () => void;
}) {
  if (reason === 'filtered') {
    return (
      <div className='flex flex-col items-center justify-center px-6 py-16 text-center'>
        <ListFilter
          className='mb-2 h-8 w-8 text-ws-ink-ghost'
          aria-hidden='true'
        />
        <p className='text-ws-body font-medium text-ws-ink'>
          Không có ai trong mục này
        </p>
        <p className='mt-1 max-w-[340px] text-ws-chip text-ws-ink-faint'>
          Đang lọc theo {filterLabel} nên bảng không hiện ai. Bỏ lọc để xem lại
          đủ {totalRows} thành viên của ngày.
        </p>
        <Button
          variant='outline'
          size='sm'
          className='mt-4 min-h-11'
          onClick={onClearFilter}
        >
          Bỏ lọc, xem tất cả
        </Button>
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center justify-center px-6 py-16 text-center'>
      <Users className='mb-2 h-8 w-8 text-ws-ink-ghost' aria-hidden='true' />
      <p className='text-ws-body font-medium text-ws-ink'>
        Ngày này nhóm không có ai phải nộp báo cáo
      </p>
      <p className='mt-1 max-w-[340px] text-ws-chip text-ws-ink-faint'>
        Danh sách người phải nộp được chốt sẵn cho từng ngày. Ngày này danh sách
        đó trống, nên bảng theo dõi không có dòng nào để hiện.
      </p>
    </div>
  );
}

function BoardRowItem({
  row,
  helpMode,
  href,
  isExpanded,
  onToggle,
}: {
  row: BoardRow;
  /**
   * Đang ở bộ lọc "Cần hỗ trợ": dòng nói về YÊU CẦU HỖ TRỢ, không về bản chờ
   * duyệt. Trước đây dòng vẫn in badge "Chờ duyệt" và nút "Duyệt" xanh đậm, nên
   * bộ lọc này trông y hệt danh sách chờ duyệt (UAT 16/09/2026 lượt 2).
   */
  helpMode: boolean;
  /** Link tới bản chi tiết (panel duyệt nằm ở đó); `null` = chỉ đọc tại chỗ. */
  href: string | null;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const {
    data: detail,
    isLoading,
    isError,
  } = useDailyReport(isExpanded ? row.reportId : null);

  /* Rỗng khi chưa có mốc nộp nào — dùng luôn làm điều kiện vẽ ô giờ bên phải. */
  const submittedTime = formatTimeVi(
    row.lastSubmittedAt ?? row.firstSubmittedAt,
  );

  const isProxy = Boolean(
    row.submittedByName && row.submittedByName !== row.fullName,
  );

  const isPendingReview = !helpMode && row.boardState === 'CHO_DUYET';
  const showLink = href !== null && row.boardState !== 'CHUA_NOP';

  /* Dòng phụ đọc `boardState`, không đọc `status`: bản đã nộp rồi bị trả lại
     hay mở lại mang `status = REOPENED`, và "Chưa nộp" cho nó là sai. */
  const reviewer =
    row.reviewedByName &&
    (row.boardState === 'DA_DUYET' ||
      row.boardState === 'TIEP_TUC' ||
      row.boardState === 'BI_TRA_LAI')
      ? row.reviewedByName
      : null;

  const titleExtra = (
    <>
      {/* `submittedByName` bằng tên chủ bản khi tự nộp — chỉ báo khi khác. */}
      {isProxy && (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className='inline-flex shrink-0 items-center gap-0.5 rounded-full bg-ws-surface-sunken px-1.5 py-0.5 text-ws-chip text-ws-ink-soft'>
                <UserCog className='h-3 w-3' aria-hidden='true' />
                <span className='hidden sm:inline'>{row.submittedByName}</span>
                <span className='sr-only'>
                  Do {row.submittedByName} báo cáo thay
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent className='ws-scope'>
              Do {row.submittedByName} báo cáo thay
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {!helpMode &&
        row.helpStatus !== null &&
        row.helpStatus !== undefined && (
          <HelpStatusPill
            resolved={row.helpStatus === 'RESOLVED'}
            label={row.helpStatus === 'RESOLVED' ? 'Đã hỗ trợ' : 'Cần hỗ trợ'}
          />
        )}
    </>
  );

  const meta = helpMode ? (
    /* Bộ lọc "Cần hỗ trợ": nội dung yêu cầu là chữ chính của dòng. */
    <>
      <HelpStatusPill resolved={row.helpStatus === 'RESOLVED'} />
      <span className='line-clamp-2 min-w-0 basis-full break-words text-ws-cell text-ws-ink'>
        {row.helpExcerpt || row.preview || 'Chưa có nội dung'}
      </span>
    </>
  ) : row.boardState === 'CHUA_NOP' ? (
    <span className={cn(row.isMissed && MISSED_TEXT_CLASS)}>
      {/* Một tên cho trạng thái lỡ hạn ở mọi màn (UAT 17/09/2026). */}
      {row.isMissed ? 'Không nộp' : 'Chưa nộp'}
    </span>
  ) : (
    <>
      <ReviewStateBadge state={row.boardState} by={reviewer} />
      {/* `basis-32`: không đủ 128px thì đoạn xem trước rớt xuống dòng riêng
          thay vì bị bóp còn dấu "…" (đo 375px, 11/09/2026). */}
      <span className='min-w-0 flex-1 basis-32 truncate'>
        {row.preview || 'Chưa có nội dung xem trước'}
      </span>
    </>
  );

  return (
    /* Dòng không tự vẽ viền: `ReportRowList` bên ngoài lo viền và đường kẻ. */
    <div className={cn(isExpanded && 'bg-ws-surface-alt')}>
      {/* Nút bung ra đọc tại chỗ và link sang bản chi tiết là HAI phần tử anh
          em: một link không được nằm trong `<button>`. */}
      <div className='flex items-center gap-3 pr-4 transition-colors hover:bg-ws-surface-alt'>
        <button
          type='button'
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={`daily-report-detail-${row.userId}`}
          className={cn(
            'flex min-w-0 flex-1 items-center text-left',
            REPORT_ROW_PAD,
            'pr-0',
            FOCUS_RING,
          )}
        >
          <ReportRowMain
            name={row.fullName}
            avatarUrl={row.avatarUrl}
            seed={row.userId}
            titleExtra={titleExtra}
            meta={meta}
          />
        </button>
        {/* Cột phải: giờ nộp và lối sang bản. Dòng chưa nộp không có link:
            chưa có gì để đọc hay duyệt, bung tại chỗ là đủ. */}
        <ReportRowAside time={submittedTime || null}>
          {showLink && href && (
            <Link
              href={href}
              aria-label={`${isPendingReview ? 'Duyệt' : 'Mở'} bản của ${row.fullName}`}
              className={cn(
                'inline-flex min-h-11 items-center rounded-ws-control px-1 sm:min-h-8',
                FOCUS_RING,
              )}
            >
              <RowActionLabel kind={isPendingReview ? 'review' : 'open'} />
            </Link>
          )}
        </ReportRowAside>
      </div>
      {isExpanded && (
        <div
          id={`daily-report-detail-${row.userId}`}
          /* Lùi vào đúng mép chữ của tên (avatar 36 + khe 12 + đệm 16). */
          className='border-t border-ws-line bg-ws-surface px-4 py-3 sm:pl-16'
        >
          {isLoading ? (
            <div
              role='status'
              aria-busy='true'
              aria-label='Đang tải nội dung đầy đủ'
              className='space-y-3'
            >
              {[0, 1].map((i) => (
                <div key={i} aria-hidden='true' className='space-y-1.5'>
                  <Skeleton className='h-2.5 w-24 rounded-ws-bar bg-ws-surface-sunken' />
                  <Skeleton className='h-3 w-full rounded-ws-bar bg-ws-surface-sunken' />
                  <Skeleton className='h-3 w-4/5 rounded-ws-bar bg-ws-surface-sunken' />
                </div>
              ))}
            </div>
          ) : isError ? (
            <p className='text-ws-chip text-ws-danger'>
              Không tải được nội dung báo cáo này.
            </p>
          ) : detail ? (
            <div className='space-y-3'>
              {detail.answers.map((answer) => (
                <div key={answer.id}>
                  <p className='text-ws-chip font-semibold uppercase tracking-[0.04em] text-ws-ink-faint'>
                    {answer.label}
                  </p>
                  <p className='mt-1 whitespace-pre-wrap text-ws-chip leading-relaxed text-ws-ink-soft'>
                    {answer.content.trim() || 'Chưa có nội dung'}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
