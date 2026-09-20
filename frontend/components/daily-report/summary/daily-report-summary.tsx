'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { parseAsString, parseAsStringEnum, useQueryState } from 'nuqs';
import type { DateRange } from 'react-day-picker';
import { vi } from 'date-fns/locale';
import {
  AlertTriangle,
  Building2,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  LifeBuoy,
  List,
  Repeat2,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { clsx } from 'clsx';
import { cn } from '@/lib/utils';
import {
  useReportSummary,
  useScopeMemberReportHistory,
} from '@/hooks/queries/daily-report-queries';
import type {
  DailyReportBoardState,
  SummaryDayStatus,
  SummaryDepartmentStat,
  SummaryHelpRequest,
  SummaryMemberStat,
} from '@/types/daily-report.type';
import {
  MAX_HISTORY_RANGE_DAYS,
  daysBetweenInclusive,
  formatDateVi,
  formatDayMonthVi,
  isHistoryRangeValid,
  BOARD_STATE_LABEL_VI,
  shiftDayStr,
  todayStrVi,
  monthRange,
  FOCUS_RING_SURFACE as FOCUS_RING,
  MISSED_CELL_CLASS,
  MISSED_TEXT_CLASS,
} from '../daily-report-utils';
import { HelpResolveButton } from '../shared/help-resolve-button';
import { InfoHint } from '../shared/info-hint';
import { ListSearch, normalizeSearchVi } from '../shared/list-search';
import { PageNav } from '../shared/page-nav';
import {
  BOARD_STATE_ICON,
  REPORT_ROW_PAD,
  ReportRowAside,
  ReportRowList,
  ReportRowMain,
} from '../shared/report-row';
import { AvatarStack, PersonAvatar } from '../shared/person-avatar';
import { SegmentedControl } from '../shared/segmented-control';
import { StatusFilterChips } from '../shared/status-filter-chips';
import { useScrollToStart } from '../shared/use-scroll-to-start';
import { formatDeadlineVi } from '../utils/date';

/** Số thành viên mỗi trang của "Chi tiết theo thành viên" (UAT 16/09 lượt 2). */
const MEMBER_PAGE_SIZE = 10;

/**
 * MỘT bộ chọn khoảng ngày cho CẢ HAI chế độ xem.
 *
 * Trước đây cụm chip này chỉ render khi `mode === 'grid'`. Sang "Theo thành
 * viên" nó biến mất và màn rơi về một tham số `?month=` riêng — tức người dùng
 * chỉ chọn được theo THÁNG, không xem được một khoảng cắt ngang hai tháng, và
 * khoảng vừa chọn ở tab kia thì mất. Hai bộ lọc cho cùng một câu hỏi ("đang
 * xem khoảng nào") là hai chỗ để lệch nhau; nay chỉ còn một.
 */
type RangePresetKey = '7' | '30' | 'month' | '92';

const RANGE_PRESET_KEYS: RangePresetKey[] = ['7', '30', 'month', '92'];

const RANGE_PRESETS: { key: RangePresetKey; label: string }[] = [
  { key: '7', label: '7 ngày' },
  { key: '30', label: '30 ngày' },
  { key: 'month', label: 'Tháng này' },
  { key: '92', label: '3 tháng' },
];

/**
 * Khoảng ngày của một chip nhanh. Mọi chip đều nằm trong trần 92 ngày của
 * server (`MAX_HISTORY_RANGE_DAYS`), nên nhánh này không bao giờ cần chặn —
 * chỉ khoảng TUỲ Ý mới phải kiểm, xem `readCustomRange`.
 */
function presetRange(
  key: RangePresetKey,
  today: string,
): { from: string; to: string } {
  if (key === 'month') {
    /* `monthRange` tự kẹp `to` ở hôm nay nên không hỏi API những ngày CHƯA
       TỚI. Nó chỉ trả `null` khi cả tháng nằm sau hôm nay — không thể xảy ra
       với tháng hiện tại — nên nhánh dự phòng dưới đây chỉ để TS yên tâm. */
    return (
      monthRange(
        Number(today.slice(0, 4)),
        Number(today.slice(5, 7)),
        today,
      ) ?? { from: today, to: today }
    );
  }
  const days = key === '7' ? 7 : key === '30' ? 30 : MAX_HISTORY_RANGE_DAYS;
  return { from: shiftDayStr(today, -(days - 1)), to: today };
}

/**
 * Khoảng tuỳ ý đọc từ URL, hoặc `null` khi không dùng được.
 *
 * Đây là cổng DUY NHẤT: `?from=`/`?to=` sửa tay được, và một khoảng ngược đầu
 * hay dài quá 92 ngày sẽ ăn 422 từ server. Trả `null` thì nơi gọi rơi về chip
 * nhanh — màn vẫn có số liệu thay vì hiện một lỗi tải mà người dùng không hiểu
 * vì sao. Chặn cả ngày ở TƯƠNG LAI, cùng lý do với `monthRange`.
 */
function readCustomRange(
  fromParam: string | null,
  toParam: string | null,
  today: string,
): { from: string; to: string } | null {
  const dayStr = /^\d{4}-\d{2}-\d{2}$/;
  if (!fromParam || !toParam) return null;
  if (!dayStr.test(fromParam) || !dayStr.test(toParam)) return null;
  if (toParam > today) return null;
  if (!isHistoryRangeValid(fromParam, toParam)) return null;
  return { from: fromParam, to: toParam };
}

/**
 * Cầu nối giữa chuỗi `YYYY-MM-DD` của API và `Date` của react-day-picker.
 *
 * Dựng ở giờ ĐỊA PHƯƠNG chứ không phải UTC — khác hẳn `shiftDayStr` trong
 * `utils/date.ts`, vốn tính thuần trên chuỗi nên không dính múi giờ. Lịch thì
 * vẽ và so sánh theo đồng hồ máy, nên `new Date(Date.UTC(...))` sẽ tô sáng lệch
 * một ngày ở mọi múi giờ âm. Hai hàm đối xứng nhau: chuỗi → Date → chuỗi luôn
 * ra chính nó.
 */
function dayStrToDate(dayStr: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayStr);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function dateToDayStr(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/**
 * `components/ui/calendar.tsx` mặc định tô bằng họ `modern-primary` (cam
 * #f57c00, `globals.css:64`) trên nền chữ trắng cứng — cả hai nằm ngoài thang
 * `ws-`, nên đặt nguyên vào màn này thì cái lịch đọc như mảnh giao diện của
 * một sản phẩm khác.
 *
 * Phải ghi đè cả ba khoá dễ quên — `day` (ô ngày) và hai nút lật tháng — chứ
 * không riêng `selected`/`range_middle`: cả ba mang
 * `hover:bg-modern-primary/10 hover:text-modern-primary`, mà `.ws-scope` chỉ
 * ánh xạ lại họ `--color-popover/primary/accent/muted…` và KHÔNG hề đụng tới
 * `--color-modern-primary`. Bỏ sót là rê chuột lên bất kỳ ô ngày nào trong
 * popover vẫn ra cam.
 *
 * Ba khoá đó phải dựng LẠI cả phần hình học, vì `classNames` của DayPicker
 * trộn theo TỪNG KHOÁ (`{...mặc định, ...ghi đè}`) — ghi đè là THAY cả chuỗi
 * chứ không cộng thêm. Nên giữ nguyên `buttonVariants({ variant: 'ghost' })`
 * và đúng các lớp kích thước của component chung, chỉ bỏ hai lớp cam. Hover
 * lúc đó rơi về `hover:bg-accent hover:text-accent-foreground` của `ghost`, mà
 * trong `.ws-scope` thì `--color-accent` = `--color-ws-surface-alt` và
 * `--color-accent-foreground` = `--color-ws-ink` — đúng thang.
 *
 * Ba khoá này BẮT BUỘC ghép bằng `cn` chứ không `clsx`: gọi `buttonVariants`
 * mà không truyền `size` thì cva lấy bậc mặc định, tức chuỗi kèm sẵn
 * `h-10 px-4 py-2`; phải để twMerge loại chúng đi thì `h-9 w-9 p-0` mới thắng.
 * Ở đây không có class cỡ chữ `ws-` nào nên cái bẫy twMerge ghi ở đầu tệp
 * không đụng tới.
 *
 * `range_middle` phải giữ tiền tố `aria-selected:` như bản gốc: ngày giữa
 * khoảng cũng mang modifier `selected`, nên nếu bỏ tiền tố thì hai nền cùng độ
 * đặc hiệu và thứ tự trong tệp CSS quyết định — cả dải sẽ tô đặc một màu.
 * `today` cố tình KHÔNG đặt màu chữ: ngày hôm nay có thể đồng thời là đầu
 * khoảng, mà hai lớp cùng nhắm `color` trên một phần tử thì không ai thắng
 * chắc.
 */
const CALENDAR_WS_CLASSNAMES = {
  day: cn(
    buttonVariants({ variant: 'ghost' }),
    'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
  ),
  button_previous: cn(
    buttonVariants({ variant: 'ghost' }),
    'z-10 h-7 w-7 p-0 hover:opacity-100',
  ),
  button_next: cn(
    buttonVariants({ variant: 'ghost' }),
    'z-10 h-7 w-7 p-0 hover:opacity-100',
  ),
  selected:
    'bg-ws-accent text-ws-solid-ink hover:bg-ws-accent-hover hover:text-ws-solid-ink focus:bg-ws-accent focus:text-ws-solid-ink',
  range_middle: 'aria-selected:bg-ws-accent-bg aria-selected:text-ws-ink',
  today: 'font-semibold ring-1 ring-inset ring-ws-line-strong',
  outside: 'text-ws-ink-ghost opacity-50 aria-selected:opacity-40',
  disabled: 'text-ws-ink-ghost opacity-40',
  weekday: 'w-9 font-normal text-ws-chip text-ws-ink-faint',
  caption_label: 'font-semibold text-ws-body text-ws-ink',
};

/** Ô ngày chỉ rộng 8px — khe hở 0 để vòng focus không nuốt mất ô bên cạnh. */
const FOCUS_RING_TIGHT =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-focus focus-visible:ring-offset-0';

/** Nền xám của `Skeleton` mặc định là `bg-muted`, không thuộc thang `ws-`. */
const SKELETON = 'bg-ws-surface-sunken';

/**
 * `clsx` chứ KHÔNG `cn` ở mọi chỗ có ĐỒNG THỜI cỡ chữ và màu chữ `ws-`.
 *
 * `cn` là `twMerge(clsx(...))`, và tailwind-merge đang chạy cấu hình mặc định
 * nên nó KHÔNG biết thang `--text-ws-*`: `text-ws-body` không khớp mẫu cỡ chữ
 * nào nó nhận ra (t-shirt size, hay `text-[…px]`), nên nó xếp class đó vào
 * nhóm `text-color` — đúng nhóm của `text-ws-ink`. Cùng nhóm thì twMerge chỉ
 * giữ lại cái đứng SAU, và cỡ chữ biến mất không một cảnh báo nào:
 *
 *     twMerge('text-ws-body text-ws-ink') === 'text-ws-ink'
 *
 * Ở những chỗ này twMerge không có gì để hoà giải — các nhánh điều kiện loại
 * trừ nhau — nên `clsx` vừa đủ mà vừa đúng. Sửa tận gốc là khai thang này cho
 * tailwind-merge trong `lib/utils/index.tsx`, nhưng file đó dùng chung cả
 * repo nên nằm ngoài phạm vi đợt này.
 */

/**
 * Tổng hợp tuân thủ của một nhóm theo khoảng ngày — màn còn thiếu.
 *
 * Endpoint `GET /daily-reports/scope/:scopeId/summary` và hook `useReportSummary`
 * đã có sẵn nhưng không nơi nào gọi. Khác với **Bảng theo dõi** (một ngày, ai đã
 * nộp), màn này trả lời câu hỏi khác: **trong cả khoảng thời gian, ai đều đặn và
 * việc gì tồn đọng lặp lại**.
 */
export function DailyReportSummary({
  scopeId,
  viewerId = null,
  onOpenReport,
}: {
  scopeId: string | null;
  /** Người đang xem: bản chờ duyệt của CHÍNH họ chỉ mở để xem, không mời duyệt. */
  viewerId?: string | null;
  onOpenReport?: (reportId: string) => void;
}) {
  const [mode, setMode] = useQueryState(
    'mode',
    parseAsStringEnum<'grid' | 'member'>(['grid', 'member']).withDefault(
      'grid',
    ),
  );
  const [memberId, setMemberId] = useQueryState('memberId', parseAsString);
  /**
   * Khoảng ngày sống trên URL, đúng như `mode` và `memberId`: F5 và nút Back
   * giữ nguyên thứ đang xem, và trưởng nhóm gửi được đường dẫn tới đúng khoảng
   * mình đang nói tới. Ba tham số chứ không một, vì chip nhanh phải TÍNH LẠI
   * theo hôm nay mỗi lần render — chốt cứng `from`/`to` cho cả chip nhanh thì
   * một tab mở qua nửa đêm sẽ kẹt ở khoảng của hôm qua.
   *
   * `?from=`/`?to=` có mặt (và hợp lệ) nghĩa là đang ở khoảng tuỳ ý; không thì
   * đọc `?range=`. Nhờ vậy không có trạng thái "tuỳ ý mà không có ngày nào" để
   * phải đồng bộ.
   */
  const [rangeKey, setRangeKey] = useQueryState(
    'range',
    parseAsStringEnum<RangePresetKey>(RANGE_PRESET_KEYS).withDefault('30'),
  );
  const [fromParam, setFromParam] = useQueryState('from', parseAsString);
  const [toParam, setToParam] = useQueryState('to', parseAsString);
  const [memberQuery, setMemberQuery] = useState('');
  /* Phân trang và bộ lọc của ba danh sách (điểm 7 và 2 của UAT 16/09/2026).
     Giữ ở state cục bộ, không đẩy lên URL: khoảng ngày, chế độ xem và người
     đang xem mới là thứ cần chia sẻ được bằng đường dẫn, còn "đang ở trang 3"
     thì không. */
  const [memberPage, setMemberPage] = useState(1);
  /* "Theo bộ phận" là một CÁCH XEM riêng: thẻ tổng hợp từng bộ phận, bấm một
     thẻ để lọc danh sách thành viên về bộ phận đó. Bản trước chỉ đổi thứ tự
     danh sách và in tên các bộ phận ghép lại làm tiêu đề ("HU, Nhóm của A, Oh
     My God"), đọc không ra ai thuộc đâu (UAT 16/09/2026 lượt 2). */
  const [listView, setListView] = useState<'all' | 'department'>('all');
  /** Id bộ phận đang lọc, `none` = chưa thuộc bộ phận nào, `null` = tất cả. */
  const [department, setDepartment] = useState<string | null>(null);
  /** Vùng bộ lọc trạng thái + chú giải của khối Thành viên, đóng sẵn. */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reviewState, setReviewState] = useState<DailyReportBoardState | null>(
    null,
  );
  const [openHelpPage, setOpenHelpPage] = useState(1);
  const [resolvedHelpPage, setResolvedHelpPage] = useState(1);
  /* Đổi trang/bộ lọc của khối Thành viên thì đưa đầu khối về tầm nhìn. */
  const [membersRef, requestMembersScroll] = useScrollToStart<HTMLElement>();
  /* Đổi khoảng ngày, thứ tự hay bộ lọc là đổi CẢ danh sách, nên số trang cũ
     hết nghĩa: trang 3 của khoảng cũ có thể vượt số trang mới và cho ra một
     danh sách rỗng không ai hiểu vì sao. */
  const resetListState = () => {
    setMemberPage(1);
    setOpenHelpPage(1);
    setResolvedHelpPage(1);
    /* Bộ lọc trạng thái duyệt cũng phải bỏ: nó đếm theo BẢN trong khoảng ngày,
       nên đổi khoảng là trạng thái đang lọc có thể không còn bản nào - danh
       sách rỗng mà chip đã biến mất, không còn gì để bấm bỏ lọc (rà giao diện
       16/09/2026). */
    setReviewState(null);
  };

  /* Đọc lại mỗi lần render nên khoảng tự đúng khi tab mở qua nửa đêm. */
  const today = todayStrVi();
  const customRange = readCustomRange(fromParam, toParam, today);
  const { from, to } = customRange ?? presetRange(rangeKey, today);

  const applyPreset = (key: RangePresetKey) => {
    resetListState();
    void setRangeKey(key);
    // Xoá khoảng tuỳ ý, nếu không nó vẫn thắng và chip vừa bấm không có tác dụng.
    void setFromParam(null);
    void setToParam(null);
  };
  const clearCustomRange = () => {
    resetListState();
    void setFromParam(null);
    void setToParam(null);
  };
  const applyCustomRange = (range: { from: string; to: string }) => {
    resetListState();
    void setFromParam(range.from);
    void setToParam(range.to);
  };

  const { data, isLoading, isError, refetch } = useReportSummary(scopeId, {
    from,
    to,
    memberPage,
    memberLimit: MEMBER_PAGE_SIZE,
    memberDepartment:
      listView === 'department' ? (department ?? undefined) : undefined,
    reviewState: reviewState ?? undefined,
    /* Người đang xem ở chế độ "Theo thành viên" phải về cùng response dù họ
       không nằm trong trang: dòng tiêu đề của màn đó đọc số lượt đã nộp của
       chính họ. */
    memberFocus: mode === 'member' ? (memberId ?? undefined) : undefined,
    openHelpPage,
    resolvedHelpPage,
  });
  /* Cùng MỘT khoảng với bảng toàn nhóm — hook đã nhận `{from, to}` nên tầng dữ
     liệu không phải đổi gì khi bỏ nhánh theo tháng. */
  const memberHistory = useScopeMemberReportHistory(
    scopeId ?? '',
    mode === 'member' ? memberId : null,
    { from, to },
  );

  /* TRANG hiện tại của "Chi tiết theo thành viên". Thứ tự do SERVER quyết,
     client không xếp lại: xếp trong trang là xếp một mẩu của danh sách, nên
     trang 2 sẽ không nối tiếp trang 1. */
  const members = data?.members ?? [];
  /* Danh bạ ĐỦ người cho ô chọn và ô tìm: hai chỗ đó là ĐIỀU HƯỚNG, thiếu ai
     là mất đường vào người đó. Cache cũ không có `memberDirectory` thì rơi về
     trang hiện tại - đúng như trước khi có phân trang. */
  const directory = useMemo(
    () =>
      data?.memberDirectory ??
      members.map((m) => ({
        userId: m.userId,
        fullName: m.fullName,
        avatarUrl: m.avatarUrl,
      })),
    [data?.memberDirectory, members],
  );
  const avatarById = useMemo(
    () => new Map(directory.map((m) => [m.userId, m.avatarUrl])),
    [directory],
  );
  const filteredMembers = useMemo(() => {
    const needle = normalizeSearchVi(memberQuery.trim());
    if (!needle) return directory;
    return directory.filter((m) =>
      normalizeSearchVi(m.fullName).includes(needle),
    );
  }, [directory, memberQuery]);
  /* Stat của người đang xem: `focusedMember` khi họ ngoài trang, không thì tìm
     trong trang. Tên thì luôn có trong danh bạ. */
  const selectedMember =
    members.find((m) => m.userId === memberId) ?? data?.focusedMember ?? null;
  const selectedName =
    selectedMember?.fullName ??
    directory.find((m) => m.userId === memberId)?.fullName ??
    null;

  /* Bốn con số của cả nhóm đọc `totals` của server: cộng lại từ `members` là
     cộng MỘT TRANG, nên đổi trang sẽ đổi luôn tỉ lệ chung. Cache cũ không có
     `totals` thì cộng lại như trước. */
  const totalExpected =
    data?.totals?.expected ??
    members.reduce((sum, member) => sum + member.expected, 0);
  const totalSubmitted =
    data?.totals?.submitted ??
    members.reduce((sum, member) => sum + member.submitted, 0);
  const totalMissed =
    data?.totals?.missed ??
    members.reduce((sum, member) => sum + member.missed, 0);
  const groupRate =
    totalExpected > 0 ? Math.round((totalSubmitted / totalExpected) * 100) : 0;

  /**
   * Mốc dính của cột chọn thành viên = chiều cao THẬT của hàng lọc.
   *
   * Hàng lọc ở đầu màn dính ở `--ws-sticky-top` và mang `z-10`, nên nó luôn vẽ
   * đè lên cột trái; cột trái phải dính THẤP HƠN nó đúng bằng chiều cao của
   * nó. Chiều cao đó KHÔNG chốt cứng được: hàng lọc mang `flex-wrap` và phải
   * chứa dòng ngày + track 2 chip chế độ + track 5 chip khoảng ngày, nên nó vỡ
   * thành hai dòng tuỳ bề ngang còn lại sau khi trừ rail — và ngưỡng vỡ còn đổi
   * theo độ dài chuỗi ngày tiếng Việt. Chốt một con số là chấp nhận sai ở một
   * dải bề ngang nào đó, mà sai ở đây nghĩa là đầu cột trái chui xuống dưới
   * hàng lọc. Vì vậy đo bằng `ResizeObserver`.
   *
   * Đo bằng `ResizeObserver` rồi ghi thẳng biến CSS lên phần tử gốc: không đi
   * qua state nên không kéo theo lượt render nào. Không có vòng lặp đo/đổi vì
   * cột trái chỉ `position: sticky` — nó không tham gia dòng chảy, nên dời mốc
   * dính của nó không làm hàng lọc đổi chiều cao.
   *
   * `[]` là đúng: hai phần tử được tham chiếu nằm cố định trong cây, đổi
   * `mode` không tháo chúng ra.
   */
  const rootRef = useRef<HTMLDivElement>(null);
  const filterRowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    const filterRow = filterRowRef.current;
    if (!root || !filterRow || typeof ResizeObserver === 'undefined') return;
    const sync = () => {
      root.style.setProperty(
        '--ws-summary-filter-h',
        `${Math.ceil(filterRow.getBoundingClientRect().height)}px`,
      );
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(filterRow);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef}>
      {/* Dính dưới Navbar cố định — xem ghi chú ở `daily-report-board.tsx`. */}
      <div
        ref={filterRowRef}
        className='sticky top-[var(--ws-sticky-top,0px)] z-10 border-b border-ws-line bg-ws-surface px-5 py-3'
      >
        <div className='flex flex-wrap items-center gap-2'>
          {/* Hàng này ĐỌC RA CÙNG MỘT MẠCH với hàng `BoardDateNav` ở đầu bảng
            nhóm (`board/daily-report-board.tsx`) đúng ở HAI ô đầu: bộ chọn
            ngày TRƯỚC → dòng chữ ngữ cảnh SAU. Bên đó hai ô ấy là cụm lùi/tiến
            + ô ngày, rồi "tên nhóm · Khóa lúc HH:mm".

            Ô thứ ba thì chỉ giống nhau ở QUY ƯỚC "dồn về mép phải", không phải
            cùng một thứ: bên đó mép phải hàng ngày là nút vào danh mục KPI,
            còn hành động đổi chế độ xem của bảng nhóm (nút "Tổng hợp") nằm ở
            HÀNG DƯỚI — hàng thống kê — chứ không cùng hàng với bộ chọn ngày
            như cụm "Toàn nhóm / Theo thành viên" ở đây.

            Dòng chữ mô tả khoảng ngày nay nằm ở HÀNG DƯỚI chứ không chen giữa
            hai control. Nó là KẾT QUẢ của lựa chọn ngay trên nó, không phải một
            lựa chọn — đặt nó chung hàng làm mắt phải nhảy qua một câu chữ để
            tới cụm chế độ, và ở 375px thì chính nó là thứ đẩy cụm chế độ xuống
            dòng.

            Cụm chế độ dùng `ml-auto`: hàng trên nay chỉ còn hai item nên không
            còn `<p>` nào để mang `mr-auto` hộ. */}
          {/* Năm lựa chọn khoảng ngày gộp thành MỘT nút mở danh sách, thay cho
            dải chip phơi hết mọi lựa chọn ra thanh dính.

            Dải chip cũ chiếm gần trọn bề ngang: bốn chip preset cộng nút
            "Tuỳ chọn" nằm trên một track nền chìm, và ở 375px nó tự vỡ thành
            hai dòng, đẩy phần còn lại của thanh xuống. Nó cũng bắt người dùng
            đọc cả năm nhãn mỗi lần nhìn lên, trong khi thứ họ cần biết chỉ là
            "đang xem khoảng nào".

            Khuôn lấy từ nút ngày ở đầu bảng nhóm (`board/board-date-nav.tsx`):
            nền `ws-surface` sáng, một dòng chữ nói giá trị ĐANG áp dụng, bấm
            thì bung. Hai màn anh em nay cùng một cách mở bộ chọn ngày. */}
          {/* Ở chế độ "Theo thành viên" bộ chọn khoảng ngày xuống đứng cạnh
              tên người đang xem (UAT 16/09/2026 lượt 2): để nó ở đây là người
              dùng đọc lịch sử một người mà không thấy đang xem từ ngày nào. */}
          {mode === 'grid' && (
            <RangePicker
              rangeKey={rangeKey}
              customRange={customRange}
              today={today}
              onPickPreset={applyPreset}
              onApplyCustom={applyCustomRange}
              onClearCustom={clearCustomRange}
            />
          )}
          <SegmentedControl
            label='Chế độ xem tổng quan'
            value={mode}
            onChange={(next) => void setMode(next)}
            options={[
              { value: 'grid', label: 'Toàn nhóm', icon: Users },
              { value: 'member', label: 'Theo thành viên', icon: List },
            ]}
            className='ml-auto'
          />
        </div>
        {/* Hàng thứ hai: KẾT QUẢ của lựa chọn ở hàng trên.

            `aria-live='polite'` vì đây là chỗ DUY NHẤT nói ra khoảng ngày thật
            sau khi bấm — nút mở chỉ hiện nhãn rút gọn ("30 ngày"), còn con số
            ngày làm việc thì chỉ có ở đây. Không có `aria-live`, người dùng bàn
            phím đổi khoảng xong không nghe được gì đổi.

            `min-h-5` giữ chỗ sẵn cho dòng chữ: `data` vắng lúc đang tải nên vế
            "· N ngày làm việc" xuất hiện muộn một nhịp, và nếu hàng co lại rồi
            giãn ra thì cả tấm nội dung bên dưới nhích theo. */}
        {mode === 'grid' && (
          <p
            aria-live='polite'
            className='mt-2 flex min-h-5 items-center text-ws-chip text-ws-ink-soft'
          >
            {formatDateVi(from)} - {formatDateVi(to)}
            {data ? ` · ${data.workingDays} ngày làm việc` : ''}
          </p>
        )}
      </div>

      {mode === 'member' ? (
        /* `lg:items-start` là ĐIỀU KIỆN để cột trái dính được: mặc định
           `align-items: stretch` kéo nó cao bằng cột nội dung, mà một phần tử
           đã cao bằng cả vùng cuộn thì `sticky` không còn gì để trượt — cùng
           cái bẫy đã ghi ở `daily-report-workspace.tsx`. */
        <div className='grid gap-4 p-5 lg:grid-cols-[260px_1fr] lg:items-start'>
          {/* Dính DƯỚI hàng lọc dính ở đầu màn, không dính đúng
              `--ws-sticky-top`: hàng đó luôn vẽ đè lên vì nó có `z-10`.
              `--ws-summary-filter-h` là chiều cao thật của hàng lọc, do
              `ResizeObserver` ở trên ghi vào — xem ghi chú ở đó vì sao không
              chốt cứng được. 4.5rem chỉ là mốc DỰ PHÒNG cho lượt vẽ đầu tiên và
              cho SSR, tức khoảng thời gian trước khi phép đo thật kịp chạy; nó
              không phải là chiều cao đúng của bất kỳ trạng thái nào. */}
          <aside className='rounded-lg border border-ws-line bg-ws-surface p-2 lg:sticky lg:top-[calc(var(--ws-sticky-top,0px)+var(--ws-summary-filter-h,4.5rem))]'>
            <p className='px-2 py-1 text-ws-chip font-semibold text-ws-ink-soft'>
              Chọn thành viên
            </p>
            {/* Ô tìm chỉ hiện khi danh sách đủ dài để phải tìm. Nhóm bốn năm
                người thì một ô nhập nữa chỉ là thêm một thứ để đọc lướt qua. */}
            {/* Đếm theo DANH BẠ, không theo `members`: `members` chỉ còn một
                trang 10 người nên điều kiện cũ không bao giờ bật ô tìm. */}
            {directory.length > 6 && (
              <ListSearch
                value={memberQuery}
                onChange={setMemberQuery}
                label='Tìm thành viên theo tên'
                className='px-1 pb-2 pt-1'
              />
            )}
            {/* Danh sách phải CUỘN TRONG chính nó, không kéo dài cả cột.
                Nhóm 30 người dựng ra một cột cao hơn cả nội dung bên phải, nên
                đọc lịch sử của một người là phải cuộn qua hết danh sách rồi
                cuộn ngược lên mới đổi được người.
                `clamp` chứ không phải một `calc` trần: trên màn hình thấp thì
                `100vh` trừ đi mốc dính cộng phần đầu cột có thể ra số âm, mà
                `max-h` âm thì danh sách biến mất. Sàn 12rem ≈ 4 hàng, trần
                32rem để trên màn hình cao nó không lại dài bằng cả trang. */}
            {/* Thứ tự bốn nhánh dưới đây là HỢP ĐỒNG, giống hệt hai chỗ đã ghi
                thành lời: nhánh `isError` của chính tệp này và khối điều hướng
                ở `daily-report-workspace.tsx` — ĐANG TẢI rồi LỖI rồi mới tới
                RỖNG.
                `members` dựng từ `data?.members ?? []`, nên lúc query còn chạy
                và mãi mãi khi query hỏng thì nó rỗng y như khi nhóm thật sự
                không có ai. Đặt khối rỗng lên trước là in ra "Khoảng ngày này
                chưa có thành viên nào." trong cả hai ca đó — một kết luận sai
                thay người dùng, và trên nhánh lỗi thì tệ hơn nữa: query dùng
                mặc định toàn cục (refetchOnWindowFocus/onMount/onReconnect đều
                tắt) nên không có đường tự phục hồi, nút "Thử lại" là lối ra duy
                nhất ngoài tải lại cả trang. */}
            <div className='ws-scroll max-h-[clamp(12rem,calc(100vh-var(--ws-sticky-top,0px)-16rem),32rem)] space-y-1 overflow-y-auto'>
              {isLoading ? (
                <MemberPickerSkeleton />
              ) : isError ? (
                <div className='px-2 py-6 text-center'>
                  <AlertTriangle
                    aria-hidden='true'
                    className='mx-auto mb-2 h-6 w-6 text-ws-ink-ghost'
                  />
                  <p className='text-ws-chip text-ws-ink-soft'>
                    Không tải được danh sách thành viên.
                  </p>
                  <p className='mt-1 text-ws-chip text-ws-ink-faint'>
                    Đây là lỗi tải dữ liệu, không phải nhóm chưa có ai.
                  </p>
                  <Button
                    variant='outline'
                    size='sm'
                    className={cn('mt-3 text-ws-chip', FOCUS_RING)}
                    onClick={() => void refetch()}
                  >
                    Thử lại
                  </Button>
                </div>
              ) : filteredMembers.length === 0 ? (
                /* Hai cái rỗng khác hẳn nhau: khoảng ngày không có ai, và ô
                   tìm không khớp ai. Nói nhầm là bắt người dùng đi nới khoảng
                   ngày trong khi thứ cần xoá chỉ là chữ vừa gõ. */
                <p className='px-2 py-8 text-center text-ws-chip text-ws-ink-faint'>
                  {members.length === 0
                    ? 'Khoảng ngày này chưa có thành viên nào.'
                    : `Không có thành viên nào khớp “${memberQuery.trim()}”.`}
                </p>
              ) : (
                filteredMembers.map((member) => (
                  <button
                    key={member.userId}
                    type='button'
                    aria-pressed={memberId === member.userId}
                    onClick={() => void setMemberId(member.userId)}
                    className={clsx(
                      /* `min-h-11` = 44px: đây là danh sách chạm chính của chế
                         độ "Theo thành viên", và avatar 28px + `py-2` chỉ tới
                         44px khi tên chỉ có một dòng. Chốt sàn để tên xuống
                         dòng cũng không làm hàng co lại. */
                      'flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-2 text-left text-ws-body',
                      memberId === member.userId
                        ? 'bg-ws-surface-sunken font-medium text-ws-ink'
                        : 'text-ws-ink-soft hover:bg-ws-surface-alt',
                      FOCUS_RING,
                    )}
                  >
                    <PersonAvatar
                      name={member.fullName}
                      url={member.avatarUrl}
                      seed={member.userId}
                    />
                    <span className='truncate'>{member.fullName}</span>
                  </button>
                ))
              )}
            </div>
          </aside>
          <section className='rounded-lg border border-ws-line bg-ws-surface'>
            {/* Thanh lật tháng ← / → đã bỏ cùng với `?month=`: khoảng ngày nay
                do bộ lọc dùng chung ở đầu màn quyết, hai nơi cùng đổi một thứ
                là hai nơi để lệch nhau. Chỗ đó nay dùng để nói ĐANG XEM AI —
                câu hỏi mà bản trước không trả lời ở đâu cả. */}
            {/* Đầu khung trả lời ĐỦ ba câu: đang xem ai, trong khoảng nào, kết
                quả ra sao - và đổi được khoảng ngay tại đây. */}
            <div className='space-y-2 border-b border-ws-line px-4 py-3'>
              <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
                {selectedName && (
                  <PersonAvatar
                    name={selectedName}
                    url={
                      directory.find((m) => m.userId === memberId)?.avatarUrl
                    }
                    seed={memberId ?? undefined}
                    size='md'
                  />
                )}
                {/* `basis-48`: không đủ 192px cho tiêu đề thì ô chọn khoảng
                    ngày rớt xuống dòng dưới, thay vì bóp tiêu đề còn "Lịch sử
                    nộp báo …" (đo 375px, 17/09/2026). */}
                <div className='min-w-0 flex-1 basis-48'>
                  <h3 className='truncate text-ws-card-title font-semibold text-ws-ink'>
                    {selectedName ?? 'Lịch sử nộp báo cáo'}
                  </h3>
                  <p
                    aria-live='polite'
                    className='text-ws-chip tabular-nums text-ws-ink-soft'
                  >
                    Từ {formatDateVi(from)} đến {formatDateVi(to)}
                    {selectedMember
                      ? ` · ${selectedMember.submitted}/${selectedMember.expected} lượt đã nộp`
                      : ''}
                  </p>
                </div>
                <RangePicker
                  rangeKey={rangeKey}
                  customRange={customRange}
                  today={today}
                  onPickPreset={applyPreset}
                  onApplyCustom={applyCustomRange}
                  onClearCustom={clearCustomRange}
                />
              </div>
            </div>
            {!memberId ? (
              <p className='py-16 text-center text-ws-body text-ws-ink-soft'>
                Chọn một thành viên để xem lịch sử
              </p>
            ) : memberHistory.isLoading ? (
              <MemberHistorySkeleton />
            ) : memberHistory.isError ? (
              /* Cùng khuôn với hai nhánh rỗng khác của màn: lỗi tải phải có
                 lối thử lại, không thì người dùng chỉ còn cách F5 cả trang và
                 mất luôn khoảng ngày đang xem. */
              <div className='flex flex-col items-center justify-center px-6 py-16 text-center'>
                <AlertTriangle
                  aria-hidden='true'
                  className='mb-2 h-8 w-8 text-ws-ink-ghost'
                />
                <p className='text-ws-body text-ws-ink-soft'>
                  Không tải được lịch sử của thành viên này.
                </p>
                <p className='mt-1 text-ws-chip text-ws-ink-faint'>
                  Đây là lỗi tải dữ liệu, không phải người này chưa có báo cáo.
                </p>
                <Button
                  variant='outline'
                  size='sm'
                  className={cn('mt-3 min-h-11 text-ws-chip', FOCUS_RING)}
                  onClick={() => void memberHistory.refetch()}
                >
                  Thử lại
                </Button>
              </div>
            ) : (
              <div className='divide-y divide-ws-line'>
                {(memberHistory.data?.data ?? []).map((report) => (
                  <button
                    key={report.id}
                    type='button'
                    onClick={() => onOpenReport?.(report.id)}
                    className={cn(
                      'flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left hover:bg-ws-surface-alt',
                      FOCUS_RING,
                    )}
                  >
                    <span className='w-24 text-ws-chip text-ws-ink-soft'>
                      {formatDateVi(report.reportDate)}
                    </span>
                    <span
                      className={clsx(
                        'rounded-full px-2 py-0.5 text-ws-chip',
                        report.isMissed
                          ? 'bg-ws-danger/10 text-ws-danger'
                          : report.status === 'SUBMITTED'
                            ? 'bg-ws-done-bg text-ws-done-fg'
                            : 'bg-ws-surface-sunken text-ws-ink-soft',
                      )}
                    >
                      {report.isMissed
                        ? 'Không nộp'
                        : report.status === 'SUBMITTED'
                          ? 'Đã nộp'
                          : 'Chưa nộp'}
                    </span>
                    <span className='min-w-0 flex-1 truncate text-ws-body text-ws-ink-soft'>
                      {report.answerPreview || 'Không có nội dung'}
                    </span>
                  </button>
                ))}
                {(memberHistory.data?.data.length ?? 0) === 0 && (
                  <p className='py-16 text-center text-ws-body text-ws-ink-soft'>
                    Không có nghĩa vụ báo cáo trong khoảng ngày này
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      ) : isLoading ? (
        <SummaryGridSkeleton />
      ) : isError ? (
        /* BẮT BUỘC đứng trước nhánh `!data`. Nhánh đó nói "Chưa chọn nhóm để xem
           tổng hợp" — với một lần tải hỏng thì câu đó sai hẳn nghĩa, và hợp đồng
           báo cáo (mục 2) cấm kết luận thay người dùng khi API chưa trả lời.

           Query dùng mặc định toàn cục: refetchOnWindowFocus/onMount/onReconnect
           đều tắt, nên một khi lỗi đã bật thì không có đường tự phục hồi — nút
           "Thử lại" là lối ra duy nhất ngoài tải lại cả trang. */
        <div className='flex flex-col items-center justify-center px-6 py-16 text-center'>
          <AlertTriangle className='mb-2 h-8 w-8 text-ws-ink-ghost' />
          <p className='text-ws-body text-ws-ink-soft'>
            Không tải được tổng hợp của nhóm.
          </p>
          <p className='mt-1 text-ws-chip text-ws-ink-faint'>
            Đây là lỗi tải dữ liệu, không phải nhóm không có báo cáo.
          </p>
          <Button
            variant='outline'
            size='sm'
            className={cn('mt-3 text-ws-chip', FOCUS_RING)}
            onClick={() => void refetch()}
          >
            Thử lại
          </Button>
        </div>
      ) : !data ? (
        <p className='py-12 text-center text-ws-body text-ws-ink-soft'>
          Chưa chọn nhóm để xem tổng hợp
        </p>
      ) : (
        <div className='space-y-4 p-4 md:p-5'>
          {/* Thẻ tỷ lệ: con số chính bên trái, bốn số phụ ngăn bằng đường kẻ
              bên phải thay cho bốn ô xám rời (rà `/fe-redesign` 17/09/2026). */}
          <SummarySection icon={TrendingUp} title='Tỷ lệ nộp báo cáo'>
            <div className='grid gap-4 lg:grid-cols-[minmax(0,16rem)_1fr] lg:items-center'>
              <div>
                <p className='flex items-baseline gap-2'>
                  <span className='text-[28px] font-bold leading-none tabular-nums tracking-[-0.02em] text-ws-ink'>
                    {groupRate}%
                  </span>
                  <span className='text-ws-meta text-ws-ink-soft'>
                    lượt đã nộp
                  </span>
                </p>
                {/* `Progress` của Radix tự phát `role='progressbar'` và
                    `aria-valuenow`. `[&>[data-state]]` nhắm vào Indicator để
                    đổi màu mà không phụ thuộc thứ tự trong tệp CSS. */}
                <Progress
                  value={groupRate}
                  max={100}
                  aria-label={`${groupRate}% lượt báo cáo của nhóm đã nộp`}
                  className='mt-3 h-2 bg-ws-surface-sunken [&>[data-state]]:bg-ws-done-edge'
                />
              </div>
              <dl className='grid grid-cols-2 gap-y-3 sm:grid-cols-4 sm:divide-x sm:divide-ws-line'>
                <GroupMetric label='Phải nộp' value={totalExpected} />
                <GroupMetric
                  label='Đã nộp'
                  value={totalSubmitted}
                  tone='done'
                />
                <GroupMetric
                  label='Còn thiếu'
                  value={totalMissed}
                  tone='danger'
                />
                <GroupMetric label='Ngày làm việc' value={data.workingDays} />
              </dl>
            </div>
          </SummarySection>

          <SummarySection
            sectionRef={membersRef}
            icon={Users}
            title='Thành viên'
            /* Chú giải ô ngày ĐỔI CHỖ vào đây (UAT 18/09/2026): nó giải thích
               cách đọc ô ngày, tức đọc MỘT lần rồi thôi, nên đứng thường trực
               trên màn là mười một ký hiệu chắn đường tới danh sách. */
            titleHint={
              <InfoHint
                label='Chú giải ô ngày'
                /* Rộng hơn mặc định 260px: chú giải xếp hai cột, mà nhãn dài
                   nhất ("Đã mở lại để bổ sung") một mình đã 150px. */
                maxWidth={440}
              >
                <DayLegend />
              </InfoHint>
            }
            /* KHÔNG in số thành viên ở đây (UAT 18/09/2026): dòng
               "1-10 trên 12 thành viên" ngay dưới danh sách đã nói đúng con số
               đó. Đầu khối chỉ còn TIÊU ĐỀ và cụm chọn cách xem; nút lọc và dải
               chip nằm dưới đường kẻ, ngay trên danh sách mà chúng lọc (yêu cầu
               18/09/2026). Nhờ vậy tiêu đề cũng không trượt khi mở bộ lọc. */
            actions={
              (data.departmentStats ?? []).length > 0 ? (
                <SegmentedControl
                  label='Cách xem danh sách thành viên'
                  iconOnlyOnMobile
                  value={listView}
                  onChange={(next) => {
                    setListView(next);
                    setDepartment(null);
                    setMemberPage(1);
                    requestMembersScroll();
                  }}
                  options={[
                    { value: 'all', label: 'Tất cả', icon: Users },
                    {
                      value: 'department',
                      label: 'Theo bộ phận',
                      icon: Building2,
                    },
                  ]}
                />
              ) : null
            }
          >
            <div className='space-y-3'>
              {/* Hàng công cụ của danh sách: nút lọc bên trái, dải chip mở ra
                  ngay dưới - cùng thứ tự với hàng công cụ của tab Nhóm. */}
              <div className='space-y-2'>
                <div className='flex flex-wrap items-center gap-2'>
                  <button
                    type='button'
                    aria-expanded={filtersOpen}
                    aria-controls='tong-quan-bo-loc-thanh-vien'
                    onClick={() => setFiltersOpen((open) => !open)}
                    className={cn(
                      'inline-flex h-11 items-center gap-1.5 rounded-ws-control border px-3 text-ws-cell font-medium transition-colors sm:h-9',
                      filtersOpen || reviewState !== null
                        ? 'border-ws-ink-soft bg-ws-surface-alt text-ws-ink'
                        : 'border-ws-line bg-ws-surface text-ws-ink-soft hover:text-ws-ink',
                      FOCUS_RING,
                    )}
                  >
                    <SlidersHorizontal aria-hidden='true' className='h-4 w-4' />
                    Bộ lọc
                    {reviewState !== null && (
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
                  {!filtersOpen && reviewState !== null && (
                    <span className='flex items-center gap-1 text-ws-chip text-ws-ink-soft'>
                      {BOARD_STATE_LABEL_VI[reviewState]}
                      <button
                        type='button'
                        onClick={() => {
                          setReviewState(null);
                          setMemberPage(1);
                          requestMembersScroll();
                        }}
                        aria-label='Bỏ lọc trạng thái duyệt'
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
                {filtersOpen && data.reviewStateCounts && (
                  <div id='tong-quan-bo-loc-thanh-vien'>
                    <ReviewStateFilter
                      counts={data.reviewStateCounts}
                      active={reviewState}
                      onPick={(state) => {
                        setReviewState(state);
                        setMemberPage(1);
                        requestMembersScroll();
                      }}
                    />
                  </div>
                )}
              </div>
              {listView === 'department' &&
                (data.departmentStats ?? []).length > 0 && (
                  <DepartmentOverview
                    stats={data.departmentStats ?? []}
                    active={department}
                    onPick={(id) => {
                      setDepartment(id);
                      setMemberPage(1);
                      requestMembersScroll();
                    }}
                  />
                )}

              {members.length === 0 ? (
                <div className='flex flex-col items-center justify-center rounded-ws-block border border-dashed border-ws-line px-6 py-12 text-center'>
                  <Users
                    aria-hidden='true'
                    className='mb-2 h-8 w-8 text-ws-ink-ghost'
                  />
                  <p className='text-ws-body font-medium text-ws-ink'>
                    Không có thành viên nào trong khoảng này
                  </p>
                  <p className='mt-1 max-w-[340px] text-ws-chip text-ws-ink-faint'>
                    {reviewState !== null
                      ? `Không có thành viên nào có bản ở trạng thái “${BOARD_STATE_LABEL_VI[reviewState]}” trong khoảng này.`
                      : `Trong ${formatDateVi(from)} - ${formatDateVi(to)} nhóm không có nghĩa vụ báo cáo nào. Nới khoảng ngày ra rồi xem lại.`}
                  </p>
                  {/* Lối ra khớp với LÝ DO rỗng: đang lọc trạng thái thì bỏ
                      lọc, không phải nới khoảng ngày. */}
                  {reviewState !== null ? (
                    <Button
                      variant='outline'
                      size='sm'
                      className={cn('mt-4 min-h-11 text-ws-chip', FOCUS_RING)}
                      onClick={() => {
                        setReviewState(null);
                        setMemberPage(1);
                        requestMembersScroll();
                      }}
                    >
                      Bỏ lọc trạng thái
                    </Button>
                  ) : (
                    (customRange !== null || rangeKey !== '92') && (
                      <Button
                        variant='outline'
                        size='sm'
                        className={cn('mt-4 min-h-11 text-ws-chip', FOCUS_RING)}
                        onClick={() => applyPreset('92')}
                      >
                        <CalendarRange className='mr-1.5 h-3.5 w-3.5' />
                        Xem 3 tháng
                      </Button>
                    )
                  )}
                </div>
              ) : (
                <>
                  {/* Một `TooltipProvider` cho cả danh sách: rê từ ô này sang
                      ô kia không phải chờ lại từ đầu. */}
                  <TooltipProvider delayDuration={120}>
                    <div className='divide-y divide-ws-line overflow-hidden rounded-ws-block border border-ws-line'>
                      {members.map((m) => (
                        <MemberRow
                          key={m.userId}
                          stat={m}
                          isViewer={m.userId === viewerId}
                          onOpenReport={onOpenReport}
                        />
                      ))}
                    </div>
                  </TooltipProvider>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <p className='text-ws-chip tabular-nums text-ws-ink-faint'>
                      {pageRangeLabel(
                        data.memberPage ?? 1,
                        data.memberPageSize ?? MEMBER_PAGE_SIZE,
                        members.length,
                        data.membersTotal ?? members.length,
                      )}
                    </p>
                    <PageNav
                      page={data.memberPage ?? 1}
                      totalPages={data.memberTotalPages ?? 1}
                      onChange={(next) => {
                        setMemberPage(next);
                        requestMembersScroll();
                      }}
                      label='danh sách thành viên'
                    />
                  </div>
                </>
              )}
            </div>
          </SummarySection>

          {(data.openHelpRequests.length > 0 ||
            (data.resolvedHelpRequests ?? []).length > 0) && (
            <SummaryHelpRequests
              open={data.openHelpRequests}
              resolved={data.resolvedHelpRequests ?? []}
              avatarById={avatarById}
              canResolve={data.canResolveHelp ?? false}
              onOpenReport={onOpenReport}
              openPage={data.openHelpPage ?? 1}
              openTotalPages={data.openHelpTotalPages ?? 1}
              openTotal={data.openHelpTotal ?? data.openHelpRequests.length}
              onOpenPageChange={setOpenHelpPage}
              resolvedPage={data.resolvedHelpPage ?? 1}
              resolvedTotalPages={data.resolvedHelpTotalPages ?? 1}
              resolvedTotal={
                data.resolvedHelpTotal ??
                (data.resolvedHelpRequests ?? []).length
              }
              onResolvedPageChange={setResolvedHelpPage}
            />
          )}

          {/* Hai mục ít dùng hơn xuống dưới cùng, cạnh nhau trên màn rộng. */}
          {(data.recurringBlockers.length > 0 ||
            (data.kpis ?? []).length > 0) && (
            <div
              className={cn(
                'grid gap-4',
                /* Hai cột chỉ khi có đủ hai mục, không để một thẻ lẻ nửa màn. */
                data.recurringBlockers.length > 0 &&
                  (data.kpis ?? []).length > 0 &&
                  'lg:grid-cols-2',
              )}
            >
              {(data.kpis ?? []).length > 0 && (
                <SummarySection
                  icon={Target}
                  title='KPI đạt được'
                  count={(data.kpis ?? []).length}
                >
                  <ul className='divide-y divide-ws-line'>
                    {(data.kpis ?? []).map((kpi) => {
                      /* `?? []`: `members` là trường THÊM VÀO của server, và
                         trong cửa sổ lệch deploy nó vắng thật. */
                      const kpiMembers = kpi.members ?? [];
                      return (
                        <li
                          key={kpi.kpiId}
                          className='flex items-center gap-3 py-2.5 first:pt-0 last:pb-0'
                        >
                          <span className='min-w-0 flex-1'>
                            <span className='block truncate text-ws-body font-medium text-ws-ink'>
                              {kpi.name}
                            </span>
                            <span className='block text-ws-chip text-ws-ink-faint'>
                              {kpi.achievedMembers} người ·{' '}
                              {kpi.achievedReports} báo cáo
                            </span>
                          </span>
                          {kpiMembers.length > 0 && (
                            <span
                              className='shrink-0'
                              title={kpiMembers
                                .map((m) => m.fullName)
                                .join(', ')}
                            >
                              <span className='sr-only'>
                                Người đạt:{' '}
                                {kpiMembers.map((m) => m.fullName).join(', ')}
                              </span>
                              <AvatarStack
                                people={kpiMembers.map((m) => ({
                                  id: m.userId,
                                  fullName: m.fullName,
                                  avatarUrl: m.avatarUrl,
                                }))}
                                max={4}
                                size='sm'
                              />
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </SummarySection>
              )}
              {data.recurringBlockers.length > 0 && (
                <SummarySection
                  icon={Repeat2}
                  title='Tồn đọng lặp lại'
                  count={data.recurringBlockers.length}
                >
                  <ul className='divide-y divide-ws-line'>
                    {data.recurringBlockers.map((b) => (
                      <li
                        key={b.taskId}
                        className='flex items-center gap-3 py-2.5 first:pt-0 last:pb-0'
                      >
                        <span className='shrink-0 font-mono text-ws-chip text-ws-ink-faint'>
                          {b.code ?? '-'}
                        </span>
                        <span className='min-w-0 flex-1 truncate text-ws-body text-ws-ink'>
                          {b.title}
                        </span>
                        <span className='shrink-0 rounded-full bg-ws-surface-sunken px-2 py-0.5 text-ws-chip font-semibold tabular-nums text-ws-danger'>
                          {b.appearedDays} ngày
                        </span>
                      </li>
                    ))}
                  </ul>
                </SummarySection>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Khối trạng thái duyệt của cả khoảng ngày (điểm 2 của UAT 16/09/2026).
 *
 * Đếm theo BẢN, không theo người: câu hỏi của trưởng nhóm là "còn bao nhiêu bản
 * phải duyệt", và một người có thể còn ba bản. Bấm một chip là lọc danh sách
 * thành viên bên dưới về những người CÓ bản ở trạng thái đó - lọc ở server, vì
 * danh sách đã phân trang.
 */
const REVIEW_STATE_ORDER: DailyReportBoardState[] = [
  'CHO_DUYET',
  'QUA_HAN_DUYET',
  'DA_DUYET',
  'TIEP_TUC',
  'BI_TRA_LAI',
  'DA_MO_LAI',
  'QUA_HAN_BO_SUNG',
  'CHUA_NOP',
];

function ReviewStateFilter({
  counts,
  active,
  onPick,
}: {
  counts: Record<DailyReportBoardState, number>;
  active: DailyReportBoardState | null;
  onPick: (state: DailyReportBoardState | null) => void;
}) {
  /* Chip đang chọn LUÔN ở lại, kể cả khi số đếm về 0: nó chính là thứ làm danh
     sách rỗng, và biến mất thì người dùng mất luôn đường bỏ lọc. */
  const shown = REVIEW_STATE_ORDER.filter(
    (state) => (counts[state] ?? 0) > 0 || state === active,
  );

  /* Không còn tiêu đề "Trạng thái duyệt": dải này chỉ hiện sau khi bấm nút
     "Bộ lọc", mà nút đó đã nói đây là gì - đúng khuôn dải lọc của tab Nhóm
     (UAT 18/09/2026). */
  return (
    <div>
      {shown.length === 0 ? (
        /* Khối vẫn đứng nguyên chỗ với một câu: trả về `null` là người dùng
           không biết mình vừa mất một khối hay khối đó chưa bao giờ có. */
        <p className='text-ws-chip text-ws-ink-faint'>
          Khoảng này chưa có bản nào trên trục duyệt.
        </p>
      ) : (
        <StatusFilterChips
          label='Lọc thành viên theo trạng thái duyệt'
          value={active}
          onChange={(state) => onPick(state === active ? null : state)}
          options={shown.map((state) => ({
            key: state,
            label: BOARD_STATE_LABEL_VI[state],
            count: counts[state] ?? 0,
            dotClass: BOARD_STATE_DOT_CLASS[state],
          }))}
        />
      )}
    </div>
  );
}

/** "11-20 trên 34 thành viên", hoặc "7 thành viên" khi chỉ có một trang. */
function pageRangeLabel(
  page: number,
  pageSize: number,
  shown: number,
  total: number,
): string {
  if (total <= shown) return `${total} thành viên`;
  const first = (page - 1) * pageSize + 1;
  return `${first}-${first + shown - 1} trên ${total} thành viên`;
}

/**
 * Thẻ tổng hợp của từng bộ phận ở cách xem "Theo bộ phận" (UAT 16/09/2026 lượt
 * 2, dựng theo quy trình `/fe-redesign`).
 *
 * Mỗi thẻ trả lời bốn câu trưởng nhóm hỏi về một bộ phận, theo thứ tự nặng
 * dần: bộ phận nào, AI duyệt, nộp đều không (tỉ lệ + thanh), còn bao nhiêu bản
 * chờ duyệt. Bấm thẻ là lọc danh sách thành viên bên dưới về bộ phận đó - thẻ
 * là bộ lọc, nên nó là `button` mang `aria-pressed`, và thẻ "Tất cả" đứng đầu
 * làm lối bỏ lọc.
 *
 * Lưới tự co theo bề ngang (`auto-fill`), không chốt số cột: số bộ phận của mỗi
 * nhóm khác nhau, và một thẻ đứng một mình ở 1440px không được kéo dài hết hàng.
 */
function DepartmentOverview({
  stats,
  active,
  onPick,
}: {
  stats: SummaryDepartmentStat[];
  active: string | null;
  onPick: (id: string | null) => void;
}) {
  /* Một người thuộc nhiều bộ phận được tính ở MỖI thẻ, nên cộng các thẻ lớn hơn
     số của cả nhóm. Dòng chú thích về chuyện này ĐÃ BỎ theo yêu cầu
     18/09/2026. */
  return (
    <div
      role='group'
      aria-label='Lọc theo bộ phận'
      /* Cột tối thiểu 10rem: hai thẻ một hàng ở 375px thay vì năm thẻ đầy bề
         ngang xếp dọc chiếm trọn một màn (đo 17/09/2026). */
      className='grid grid-cols-2 gap-2 sm:[grid-template-columns:repeat(auto-fill,minmax(14rem,1fr))]'
    >
      {stats.map((dept) => {
        const key = dept.id ?? 'none';
        const isOn = active === key;
        const percent = Math.round(dept.rate * 100);
        return (
          <button
            key={key}
            type='button'
            aria-pressed={isOn}
            onClick={() => onPick(isOn ? null : key)}
            className={cn(
              'flex min-w-0 flex-col gap-2 rounded-ws-block border bg-ws-surface p-3 text-left transition-colors',
              isOn
                ? 'border-ws-ink-soft bg-ws-surface-alt ring-1 ring-ws-ink-soft'
                : 'border-ws-line hover:border-ws-line-strong',
              dept.id === null && !isOn && 'border-dashed',
              FOCUS_RING,
            )}
          >
            <span className='flex min-w-0 items-start gap-2'>
              <span
                aria-hidden='true'
                className='hidden h-8 w-8 shrink-0 items-center justify-center rounded-ws-control bg-ws-surface-sunken text-ws-ink-soft sm:flex'
              >
                <Building2 className='h-4 w-4' />
              </span>
              <span className='min-w-0 flex-1'>
                <span className='line-clamp-2 break-words text-ws-cell font-semibold text-ws-ink'>
                  {dept.name}
                </span>
                <span className='block truncate text-ws-chip text-ws-ink-soft'>
                  {dept.memberCount} thành viên
                  {dept.id === null ? ' · trưởng nhóm duyệt' : ''}
                </span>
              </span>
              {isOn && (
                <Check
                  aria-hidden='true'
                  className='h-4 w-4 shrink-0 text-ws-ink'
                />
              )}
            </span>

            <span className='flex items-center gap-2'>
              <Progress
                value={percent}
                aria-hidden='true'
                className='h-1.5 flex-1 bg-ws-surface-sunken [&>[data-state]]:bg-ws-done-edge'
              />
              <span className='shrink-0 text-ws-chip font-semibold tabular-nums text-ws-ink'>
                {percent}%
              </span>
            </span>

            <span className='flex min-w-0 flex-wrap items-center justify-between gap-2'>
              <span className='flex flex-wrap items-center gap-x-2 gap-y-1 text-ws-chip tabular-nums'>
                <span className='text-ws-ink-soft'>
                  {dept.submitted}/{dept.expected} đã nộp
                </span>
                {dept.pendingReview > 0 && (
                  <span className='font-semibold text-ws-progress-fg'>
                    {dept.pendingReview} chờ duyệt
                  </span>
                )}
              </span>
              {dept.reviewers.length > 0 && (
                <span
                  className='flex items-center gap-1.5'
                  title={dept.reviewers.map((r) => r.fullName).join(', ')}
                >
                  <span className='sr-only'>
                    Người duyệt:{' '}
                    {dept.reviewers.map((r) => r.fullName).join(', ')}
                  </span>
                  <AvatarStack people={dept.reviewers} />
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Đốm màu của chip trạng thái: cùng thang với badge và icon ở góc ô ngày. */
const BOARD_STATE_DOT_CLASS: Record<DailyReportBoardState, string> = {
  /* Số "Chưa nộp" ở đây chính là "Còn thiếu" của khối tỉ lệ, và gần hết là ô
     "không nộp" màu đỏ: đốm dùng cùng tông đó chứ không xám. */
  CHUA_NOP: 'bg-ws-danger/80',
  CHO_DUYET: 'bg-ws-progress-fg',
  QUA_HAN_DUYET: 'bg-ws-danger',
  DA_DUYET: 'bg-ws-done-fg',
  TIEP_TUC: 'bg-ws-done-fg',
  QUA_HAN_BO_SUNG: 'bg-ws-danger',
  BI_TRA_LAI: 'bg-ws-danger',
  DA_MO_LAI: 'bg-ws-ink-ghost',
};

/**
 * Yêu cầu hỗ trợ của khoảng ngày (dựng lại 17/09/2026): MỘT danh sách với hai
 * tab "Chưa giải quyết / Đã giải quyết", thay cho hai cột hai kiểu khung. Mở
 * sẵn tab còn việc; hết việc thì mở tab đã xong. Dòng dùng khuôn chung
 * `shared/report-row` như bảng Nhóm.
 */
function SummaryHelpRequests({
  open,
  resolved,
  avatarById,
  canResolve,
  onOpenReport,
  openPage,
  openTotalPages,
  openTotal,
  onOpenPageChange,
  resolvedPage,
  resolvedTotalPages,
  resolvedTotal,
  onResolvedPageChange,
}: {
  open: SummaryHelpRequest[];
  resolved: SummaryHelpRequest[];
  /** Ảnh đại diện tra từ danh bạ thành viên; dòng hỗ trợ không mang ảnh. */
  avatarById: Map<string, string | null>;
  canResolve: boolean;
  onOpenReport?: (reportId: string) => void;
  openPage: number;
  openTotalPages: number;
  openTotal: number;
  onOpenPageChange: (page: number) => void;
  resolvedPage: number;
  resolvedTotalPages: number;
  resolvedTotal: number;
  onResolvedPageChange: (page: number) => void;
}) {
  const [tab, setTabState] = useState<'open' | 'resolved'>(
    openTotal > 0 ? 'open' : 'resolved',
  );
  const isOpenTab = tab === 'open';
  const items = isOpenTab ? open : resolved;
  /* Tab ngắn hơn làm trang ngắn đi, trình duyệt kẹp vị trí cuộn và đầu khối
     tụt xuống đáy màn (đo 375px, 17/09/2026). */
  const [helpRef, requestHelpScroll] = useScrollToStart<HTMLElement>();
  const setTab = (next: 'open' | 'resolved') => {
    setTabState(next);
    requestHelpScroll();
  };

  return (
    <SummarySection
      sectionRef={helpRef}
      icon={LifeBuoy}
      title='Yêu cầu hỗ trợ'
      flush
      actions={
        <StatusFilterChips<'open' | 'resolved'>
          label='Trạng thái yêu cầu hỗ trợ'
          fill
          value={tab}
          onChange={setTab}
          options={[
            {
              key: 'open',
              label: 'Chưa giải quyết',
              count: openTotal,
              dotClass: 'bg-ws-danger',
            },
            {
              key: 'resolved',
              label: 'Đã giải quyết',
              count: resolvedTotal,
              dotClass: 'bg-ws-done-fg',
            },
          ]}
        />
      }
    >
      {items.length === 0 ? (
        <div className='flex flex-col items-center px-6 py-10 text-center'>
          <CheckCircle2
            aria-hidden='true'
            className={cn(
              'mb-2 h-6 w-6',
              isOpenTab ? 'text-ws-done-fg' : 'text-ws-ink-ghost',
            )}
          />
          <p className='text-ws-body text-ws-ink-soft'>
            {isOpenTab
              ? 'Không còn yêu cầu nào chưa giải quyết.'
              : 'Chưa có yêu cầu nào được giải quyết trong khoảng ngày này.'}
          </p>
        </div>
      ) : (
        <div>
          {/* Danh sách sát mép thẻ, không viền riêng: một lớp khung duy nhất. */}
          <ReportRowList
            label={
              isOpenTab ? 'Yêu cầu chưa giải quyết' : 'Yêu cầu đã giải quyết'
            }
            className='rounded-none border-0 bg-transparent'
          >
            {items.map((help) => (
              <HelpRequestRow
                key={help.id}
                help={help}
                avatarUrl={avatarById.get(help.userId) ?? null}
                canResolve={canResolve}
                onOpenReport={onOpenReport}
              />
            ))}
          </ReportRowList>
          {(isOpenTab ? openTotalPages : resolvedTotalPages) > 1 && (
            <div className='border-t border-ws-line px-4 py-3'>
              <PageNav
                page={isOpenTab ? openPage : resolvedPage}
                totalPages={isOpenTab ? openTotalPages : resolvedTotalPages}
                onChange={(next) => {
                  (isOpenTab ? onOpenPageChange : onResolvedPageChange)(next);
                  requestHelpScroll();
                }}
                label={
                  isOpenTab
                    ? 'yêu cầu hỗ trợ chưa giải quyết'
                    : 'yêu cầu hỗ trợ đã giải quyết'
                }
              />
            </div>
          )}
        </div>
      )}
    </SummarySection>
  );
}

/**
 * Một yêu cầu hỗ trợ: ai hỏi, ngày nào, hỏi gì, ai đã giải quyết. Bấm phần nội
 * dung là mở bản chứa nó; nút đổi trạng thái đứng NGOÀI vùng bấm đó, vì bấm
 * nhầm nút là đổi việc của người khác.
 */
function HelpRequestRow({
  help,
  avatarUrl,
  canResolve,
  onOpenReport,
}: {
  help: SummaryHelpRequest;
  avatarUrl: string | null;
  canResolve: boolean;
  onOpenReport?: (reportId: string) => void;
}) {
  const isResolved = help.status === 'RESOLVED';
  const day = formatDateVi(help.date);
  const resolvedMeta = isResolved
    ? [
        help.resolvedBy?.fullName ? `bởi ${help.resolvedBy.fullName}` : null,
        help.resolvedAt ? `lúc ${formatDeadlineVi(help.resolvedAt)}` : null,
      ]
        .filter(Boolean)
        .join(' ')
    : '';

  const main = (
    <ReportRowMain
      name={help.fullName}
      avatarUrl={avatarUrl}
      seed={help.userId}
      meta={
        <>
          <span className='line-clamp-2 min-w-0 basis-full break-words text-ws-body text-ws-ink'>
            {help.excerpt}
          </span>
          {resolvedMeta && (
            <span className='inline-flex items-center gap-1 text-ws-chip text-ws-ink-soft'>
              <CheckCircle2
                aria-hidden='true'
                className='h-3.5 w-3.5 shrink-0 text-ws-done-fg'
              />
              Đã giải quyết {resolvedMeta}
            </span>
          )}
        </>
      }
    />
  );

  return (
    /* Khổ hẹp: nút xuống dưới nội dung, thẳng mép chữ, để câu "Đã giải quyết
       bởi…" không bị bóp vụn (đo 375px, 17/09/2026). */
    <li className='flex flex-col transition-colors hover:bg-ws-surface-alt sm:flex-row sm:items-start sm:gap-3 sm:pr-4'>
      {onOpenReport ? (
        <button
          type='button'
          onClick={() => onOpenReport(help.reportId)}
          aria-label={`Mở bản ngày ${day} của ${help.fullName}`}
          className={cn(
            'flex min-w-0 flex-1 text-left',
            REPORT_ROW_PAD,
            'sm:pr-0',
            FOCUS_RING,
          )}
        >
          {main}
        </button>
      ) : (
        <div className={cn('flex min-w-0 flex-1', REPORT_ROW_PAD, 'sm:pr-0')}>
          {main}
        </div>
      )}
      <ReportRowAside
        time={formatDayMonthVi(help.date)}
        className='-mt-2 flex-row-reverse items-center justify-between pb-3 pl-16 pr-4 sm:mt-0 sm:flex-col sm:items-end sm:justify-center sm:p-0 sm:py-3'
      >
        {canResolve && (
          <HelpResolveButton
            helpId={help.id}
            reportId={help.reportId}
            resolved={isResolved}
            subject={`yêu cầu của ${help.fullName} ngày ${day}`}
          />
        )}
      </ReportRowAside>
    </li>
  );
}

/* ── Khoảng ngày tuỳ ý ───────────────────────────────────────────────────── */

/**
 * Chip thứ năm của cụm khoảng ngày: mở một lịch để chọn khoảng bất kỳ.
 *
 * Chip nhanh trả lời được "gần đây" nhưng không trả lời được "từ ngày họp tới
 * hôm nay" — mà đó chính là câu trưởng nhóm hỏi khi rà lại một đợt. Trần 92
 * ngày chặn NGAY TẠI ĐÂY kèm câu giải thích, thay vì để người dùng bấm Áp dụng
 * rồi ăn một khối "Không tải được tổng hợp" không nói được vì sao.
 */
/**
 * Bộ chọn khoảng ngày của màn Tổng quan — MỘT nút, bung ra danh sách.
 *
 * Thay cho dải chip cũ (4 preset + nút "Tuỳ chọn" trên một track nền chìm).
 * Ba lý do đổi, theo thứ tự nặng dần:
 *
 *   1. Dải chip phơi mọi lựa chọn ra thanh dính, trong khi thứ người dùng cần
 *      biết khi liếc lên chỉ là "đang xem khoảng nào".
 *   2. Ở 375px nó tự vỡ hai dòng và đẩy phần còn lại của thanh xuống.
 *   3. Nút "Tuỳ chọn" mở một popover THỨ HAI, tức cùng một bộ lọc mà có hai
 *      chỗ bấm. Nay preset và khoảng tuỳ ý nằm trong CÙNG một hộp.
 *
 * Khuôn nút mở lấy từ `board/board-date-nav.tsx` để hai màn anh em mở bộ chọn
 * ngày theo cùng một cách: nền sáng `ws-surface`, một dòng chữ nói giá trị đang
 * áp dụng, `min-h-11` rồi hạ về 36px từ `sm`.
 */
/** Id cố định để nút bung trỏ `aria-controls` tới vùng lịch. */
const CALENDAR_REGION_ID = 'ws-summary-range-calendar';

function RangePicker({
  rangeKey,
  customRange,
  today,
  onPickPreset,
  onApplyCustom,
  onClearCustom,
}: {
  rangeKey: RangePresetKey;
  customRange: { from: string; to: string } | null;
  today: string;
  onPickPreset: (key: RangePresetKey) => void;
  onApplyCustom: (range: { from: string; to: string }) => void;
  onClearCustom: () => void;
}) {
  const [open, setOpen] = useState(false);
  /* Bảng lịch chỉ bung khi người dùng gọi tới. Mở sẵn khi đang áp dụng một
     khoảng tuỳ ý: lúc đó lịch chính là thứ họ vào để sửa. */
  const [showCalendar, setShowCalendar] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(undefined);

  const todayDate = dayStrToDate(today);
  const isCustom = customRange !== null;

  const currentRangeLabel = isCustom
    ? `${formatDayMonthVi(customRange.from)} – ${formatDayMonthVi(customRange.to)}`
    : (RANGE_PRESETS.find((r) => r.key === rangeKey)?.label ?? '30 ngày');

  /* Mở lại thì bắt đầu từ khoảng ĐANG áp dụng, không phải từ trống: mở ra thấy
     lịch trắng thì người dùng không biết mình đang xem khoảng nào. */
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDraft(
        customRange
          ? {
              from: dayStrToDate(customRange.from),
              to: dayStrToDate(customRange.to),
            }
          : undefined,
      );
      setShowCalendar(isCustom);
    }
    setOpen(next);
  };

  const draftFrom = draft?.from ? dateToDayStr(draft.from) : null;
  const draftTo = draft?.to ? dateToDayStr(draft.to) : null;
  const draftDays =
    draftFrom && draftTo ? daysBetweenInclusive(draftFrom, draftTo) : 0;
  const tooLong = draftDays > MAX_HISTORY_RANGE_DAYS;
  const canApply = draftFrom !== null && draftTo !== null && !tooLong;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type='button'
          aria-expanded={open}
          aria-label={`Khoảng ngày đang xem: ${currentRangeLabel} — mở để chọn khoảng khác`}
          className={cn(
            'inline-flex min-h-11 items-center gap-1.5 rounded-ws-control border border-ws-line bg-ws-surface px-3 text-ws-body font-semibold text-ws-ink transition-colors hover:bg-ws-surface-alt sm:min-h-9',
            FOCUS_RING,
          )}
        >
          <CalendarRange
            className='h-4 w-4 shrink-0 text-ws-ink-faint'
            aria-hidden='true'
          />
          <span className='whitespace-nowrap tabular-nums'>
            {currentRangeLabel}
          </span>
          <ChevronDown
            className='h-4 w-4 shrink-0 text-ws-ink-faint'
            aria-hidden='true'
          />
        </button>
      </PopoverTrigger>
      {/* `ws-scope` BẮT BUỘC: PopoverContent đi qua Portal ra document.body,
          thiếu lớp này thì token `ws-*` bên trong không phân giải được. */}
      <PopoverContent
        align='start'
        className='ws-scope w-auto max-w-[calc(100vw-2rem)] border-ws-line bg-ws-surface p-0'
      >
        {/* `role='listbox'` chứ không phải `menu`: đây là chọn MỘT giá trị
            trong nhiều, và mỗi mục cần nói được nó có đang được chọn hay không
            (`aria-selected`) — thứ mà `menuitem` không mang. */}
        <ul role='listbox' aria-label='Khoảng ngày' className='py-1'>
          {RANGE_PRESETS.map((r) => {
            const isOn = !isCustom && rangeKey === r.key;
            return (
              <li key={r.key}>
                <button
                  type='button'
                  role='option'
                  aria-selected={isOn}
                  onClick={() => {
                    onPickPreset(r.key);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex min-h-11 w-full items-center gap-2 px-3 text-left text-ws-body transition-colors hover:bg-ws-surface-alt sm:min-h-9',
                    isOn ? 'font-semibold text-ws-ink' : 'text-ws-ink-soft',
                    FOCUS_RING,
                  )}
                >
                  {/* Ô đánh dấu giữ chỗ cố định ở cả hai trạng thái: để nhãn
                      của năm mục thẳng cột, không nhích ngang khi đổi chọn. */}
                  <span className='flex h-4 w-4 shrink-0 items-center justify-center'>
                    {isOn && (
                      <Check
                        className='h-4 w-4 text-ws-accent'
                        aria-hidden='true'
                      />
                    )}
                  </span>
                  <span className='whitespace-nowrap'>{r.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Hàng này đứng NGOÀI `listbox` có chủ ý. Nó không phải lựa chọn thứ
            năm mà là nút BUNG bảng lịch, và hai vai đó không đội chung được:
            `role='option'` không nhận `aria-expanded` (eslint
            `jsx-a11y/role-supports-aria-props` bắt đúng chỗ này), còn bỏ
            `aria-expanded` đi thì người dùng trình đọc màn hình không biết bấm
            vào sẽ mở ra thêm thứ gì.
            Trạng thái "đang áp dụng khoảng tuỳ chọn" vì thế nói bằng TÊN của
            nút chứ không bằng `aria-selected`. */}
        <button
          type='button'
          aria-expanded={showCalendar}
          aria-controls={CALENDAR_REGION_ID}
          aria-label={
            isCustom
              ? 'Khoảng tuỳ chọn — đang áp dụng. Mở bảng lịch để sửa.'
              : 'Khoảng tuỳ chọn — mở bảng lịch để chọn'
          }
          onClick={() => setShowCalendar((v) => !v)}
          className={cn(
            'flex min-h-11 w-full items-center gap-2 border-t border-ws-line px-3 text-left text-ws-body transition-colors hover:bg-ws-surface-alt sm:min-h-9',
            isCustom ? 'font-semibold text-ws-ink' : 'text-ws-ink-soft',
            FOCUS_RING,
          )}
        >
          <span className='flex h-4 w-4 shrink-0 items-center justify-center'>
            {isCustom ? (
              <Check className='h-4 w-4 text-ws-accent' aria-hidden='true' />
            ) : (
              <SlidersHorizontal
                className='h-4 w-4 text-ws-ink-faint'
                aria-hidden='true'
              />
            )}
          </span>
          <span className='whitespace-nowrap'>Khoảng tuỳ chọn</span>
          <ChevronDown
            aria-hidden='true'
            className={cn(
              'ml-auto h-4 w-4 shrink-0 text-ws-ink-faint transition-transform',
              showCalendar && 'rotate-180',
            )}
          />
        </button>

        {showCalendar && (
          <div id={CALENDAR_REGION_ID} className='border-t border-ws-line'>
            <Calendar
              mode='range'
              locale={vi}
              /* `resetOnSelect` là thứ làm cho lời nhắc bên dưới nói ĐÚNG (prop
                 có từ react-day-picker 9.14, bản đang cài đúng 9.14.0).

                 Với nó, `useRange` xử lý TRƯỚC khi tới `addToRange`: khi chưa
                 có `from`, hoặc khi khoảng đã đủ hai đầu, một cú bấm cho ra
                 `{ from: ngày vừa bấm, to: undefined }` — tức mở khoảng MỚI.
                 Nhờ vậy trạng thái "đã có ngày bắt đầu, chưa có ngày kết thúc"
                 mới thật sự tồn tại, đúng hai bước mà câu nhắc hứa. (Ngoại lệ
                 duy nhất: khoảng đang là ĐÚNG một ngày và bạn bấm lại chính
                 ngày đó — khi ấy lựa chọn bị xoá, vì `required` không bật.)

                 Không có nó thì mỗi cú bấm đi thẳng vào `addToRange` và nhánh
                 "khoảng đã đủ" ở đó dời MỘT đầu tuỳ vị trí ngày bấm, nên không
                 bao giờ quay lại được trạng thái một-đầu. */
              resetOnSelect
              selected={draft}
              onSelect={(next) => setDraft(next)}
              defaultMonth={draft?.from ?? todayDate}
              /* Ngày mai không có báo cáo nào để tổng hợp; chặn ở lịch thì
                 không cần một câu lỗi riêng cho nó. */
              disabled={todayDate ? { after: todayDate } : undefined}
              classNames={CALENDAR_WS_CLASSNAMES}
            />
            <div className='space-y-2 border-t border-ws-line px-3 py-2.5'>
              {/* `aria-live` để người dùng bàn phím / trình đọc màn hình nghe
                  được lời nhắc vượt trần ngay lúc chọn, chứ không phải sau khi
                  bấm. */}
              <p
                aria-live='polite'
                className={clsx(
                  'text-ws-meta',
                  tooLong ? 'text-ws-danger' : 'text-ws-ink-soft',
                )}
              >
                {/* Cả bốn nhánh đều chạy được, và chỉ chạy được nhờ
                    `resetOnSelect` ở `<Calendar>` — xem ghi chú tại đó. */}
                {!draftFrom
                  ? 'Chọn ngày bắt đầu, rồi chọn ngày kết thúc.'
                  : !draftTo
                    ? `Bắt đầu ${formatDateVi(draftFrom)} — chọn tiếp ngày kết thúc.`
                    : tooLong
                      ? `Bạn đang chọn ${draftDays} ngày. Khoảng dài nhất xem được là ${MAX_HISTORY_RANGE_DAYS} ngày — bấm một ngày bất kỳ để chọn lại từ đầu.`
                      : `${formatDateVi(draftFrom)} — ${formatDateVi(draftTo)} · ${draftDays} ngày`}
              </p>
              <div className='flex flex-wrap items-center justify-end gap-2'>
                {isCustom && (
                  <Button
                    variant='ghost'
                    size='sm'
                    className={cn('min-h-11 text-ws-chip', FOCUS_RING)}
                    onClick={() => {
                      onClearCustom();
                      setOpen(false);
                    }}
                  >
                    Bỏ khoảng tuỳ chọn
                  </Button>
                )}
                <Button
                  size='sm'
                  disabled={!canApply}
                  className={cn('min-h-11 text-ws-chip', FOCUS_RING)}
                  onClick={() => {
                    if (!draftFrom || !draftTo || tooLong) return;
                    onApplyCustom({ from: draftFrom, to: draftTo });
                    setOpen(false);
                  }}
                >
                  Áp dụng
                </Button>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Khuôn MỘT mục của Tổng quan (rà `/fe-redesign` 17/09/2026): khung, tiêu đề
 * viết thường có icon và số đếm, hành động bên phải. Bản trước dùng tiêu đề in
 * hoa 12px xám và mỗi mục một kiểu khung, nên mắt không bám được mục nào.
 */
function SummarySection({
  icon: Icon,
  title,
  titleHint,
  subtitle,
  count,
  actions,
  flush = false,
  sectionRef,
  children,
}: {
  icon: LucideIcon;
  title: string;
  /** Dấu hỏi đứng ngay sau tiêu đề, cho phần giải thích dài (chú giải ô ngày). */
  titleHint?: ReactNode;
  subtitle?: string;
  count?: number;
  actions?: ReactNode;
  /**
   * Thân mục không đệm: danh sách nằm sát mép thẻ. Lồng một danh sách CÓ viền
   * trong thẻ có đệm là hai lớp khung lệch nhau (UAT 17/09/2026).
   */
  flush?: boolean;
  /** Cho `useScrollToStart`: khối có danh sách phân trang hoặc có bộ lọc. */
  sectionRef?: Ref<HTMLElement>;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      ref={sectionRef}
      aria-labelledby={headingId}
      /* `scroll-mt`: cuộn về đầu khối thì dừng ngay dưới Navbar và hàng lọc
         dính của màn (`--ws-summary-filter-h`), không chui xuống dưới chúng. */
      className='scroll-mt-[calc(var(--ws-sticky-top,0px)+var(--ws-summary-filter-h,4.5rem)+0.75rem)] rounded-ws-card border border-ws-line bg-ws-surface'
    >
      <header className='border-b border-ws-line px-4 py-3'>
        <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
          <span
            aria-hidden='true'
            className='flex h-8 w-8 shrink-0 items-center justify-center rounded-ws-control bg-ws-surface-sunken text-ws-ink-soft'
          >
            <Icon className='h-4 w-4' />
          </span>
          <div className='min-w-0 flex-1'>
            <h3
              id={headingId}
              className='flex items-center gap-2 text-ws-h2 font-semibold text-ws-ink'
            >
              {title}
              {titleHint}
              {count !== undefined && (
                <span className='rounded-full bg-ws-surface-sunken px-2 py-0.5 text-ws-chip font-semibold tabular-nums text-ws-ink-soft'>
                  {count}
                </span>
              )}
            </h3>
            {subtitle && (
              <p className='text-ws-meta tabular-nums text-ws-ink-faint'>
                {subtitle}
              </p>
            )}
          </div>
          {/* Khổ hẹp: hành động xuống hàng riêng, không bóp tiêu đề. */}
          {actions && <div className='w-full sm:w-auto'>{actions}</div>}
        </div>
      </header>
      <div className={flush ? undefined : 'p-4'}>{children}</div>
    </section>
  );
}

function GroupMetric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'done' | 'danger';
}) {
  return (
    <div className='min-w-0 sm:px-4 sm:first:pl-0'>
      <dt className='text-ws-meta text-ws-ink-soft'>{label}</dt>
      <dd
        className={clsx(
          'text-ws-panel-title font-semibold tabular-nums',
          tone === 'done'
            ? 'text-ws-done-fg'
            : tone === 'danger'
              ? MISSED_TEXT_CLASS
              : 'text-ws-ink',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** Nền ô ngày theo tình trạng NỘP. Ngày không có bản không được vẽ. */
/* "Không nộp" dùng bộ màu chung `MISSED_CELL_CLASS`, cùng với ô lịch của màn
   Lịch sử (UAT 17/09/2026). */
const DAY_CELL_CLASS: Record<SummaryDayStatus, string> = {
  submitted: 'border-ws-done-edge/40 bg-ws-done-bg text-ws-done-fg',
  missed: MISSED_CELL_CLASS,
  pending: 'border-ws-line bg-ws-surface-sunken text-ws-ink-soft',
};

/** Đốm nhỏ của chú giải, cùng màu với nền ô. */
const DAY_LEGEND_CLASS: Record<SummaryDayStatus, string> = {
  submitted: 'border-ws-done-edge/40 bg-ws-done-bg',
  missed: 'border-ws-danger/20 bg-ws-danger/5',
  pending: 'border-ws-line bg-ws-surface-sunken',
};

const DAY_CELL_LABEL: Record<SummaryDayStatus, string> = {
  submitted: 'Đã nộp',
  missed: 'Không nộp',
  pending: 'Chưa nộp, còn hạn',
};

/** Màu icon kết luận ở góc ô: cùng tông với badge trạng thái. */
const DAY_REVIEW_ICON_CLASS: Partial<Record<DailyReportBoardState, string>> = {
  CHO_DUYET: 'text-ws-progress-fg',
  DA_DUYET: 'text-ws-done-fg',
  TIEP_TUC: 'text-ws-done-fg',
  BI_TRA_LAI: 'text-ws-danger',
  QUA_HAN_DUYET: 'text-ws-danger',
  QUA_HAN_BO_SUNG: 'text-ws-danger',
  DA_MO_LAI: 'text-ws-ink-soft',
};

/**
 * Một ô ngày: số ngày ở giữa, nền theo tình trạng nộp, icon kết luận ở góc
 * dưới phải (nếu bản đã vào vòng duyệt), ảnh người đã duyệt ở góc trên phải.
 * Ô chờ duyệt có viền xanh để nhìn lướt là thấy việc cần làm.
 */
function DayCell({ day }: { day: SummaryMemberStat['days'][number] }) {
  const state =
    day.boardState !== undefined && day.boardState !== 'CHUA_NOP'
      ? day.boardState
      : null;
  const Icon = state ? BOARD_STATE_ICON[state] : null;
  return (
    <span
      aria-hidden='true'
      className={cn(
        'relative flex h-8 w-8 items-center justify-center rounded-ws-check border text-ws-chip font-semibold tabular-nums transition-opacity hover:opacity-80',
        DAY_CELL_CLASS[day.status],
        state === 'CHO_DUYET' &&
          'ring-2 ring-ws-progress-fg ring-offset-1 ring-offset-ws-surface',
      )}
    >
      {Number(day.date.slice(8, 10))}
      {Icon && state && (
        <span className='absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ws-surface'>
          <Icon className={cn('h-3 w-3', DAY_REVIEW_ICON_CLASS[state])} />
        </span>
      )}
      {day.reviewedBy && (
        <PersonAvatar
          name={day.reviewedBy.fullName}
          url={day.reviewedBy.avatarUrl}
          seed={day.reviewedBy.id}
          size='xxs'
          className='absolute -right-1 -top-1.5 ring-1 ring-ws-surface'
        />
      )}
    </span>
  );
}

/** Chú giải: ba màu nộp + các icon kết luận, một hàng. */
function DayLegend() {
  /* Đủ MỌI trạng thái có thể hiện ở góc ô (trừ `CHUA_NOP`, đã nói bằng nền
     ô): thiếu một cái là người xem gặp icon không có trong chú giải. */
  const states: DailyReportBoardState[] = [
    'CHO_DUYET',
    'DA_DUYET',
    'TIEP_TUC',
    'BI_TRA_LAI',
    'DA_MO_LAI',
    'QUA_HAN_DUYET',
    'QUA_HAN_BO_SUNG',
  ];
  const items = (
    <>
      {(['submitted', 'missed', 'pending'] as const).map((status) => (
        <span key={status} className='inline-flex items-center gap-1'>
          <span
            aria-hidden='true'
            className={cn(
              'h-3 w-3 shrink-0 rounded-[3px] border',
              DAY_LEGEND_CLASS[status],
            )}
          />
          {DAY_CELL_LABEL[status]}
        </span>
      ))}
      {states.map((state) => {
        const Icon = BOARD_STATE_ICON[state];
        return (
          <span key={state} className='inline-flex items-center gap-1'>
            <Icon
              aria-hidden='true'
              className={cn('h-3 w-3 shrink-0', DAY_REVIEW_ICON_CLASS[state])}
            />
            {BOARD_STATE_LABEL_VI[state]}
          </span>
        );
      })}
    </>
  );
  /* Không có tiêu đề riêng: từ 18/09/2026 khối này sống trong chú giải nổi của
     dấu hỏi cạnh "Thành viên", mà nhãn của dấu hỏi đã nói "Chú giải ô ngày".
     HAI mục một hàng (yêu cầu 18/09/2026); khung chú giải được nới rộng cho
     vừa hai cột, xem `contentClassName` ở chỗ dùng. */
  return (
    <div className='grid grid-cols-2 gap-x-3 gap-y-1.5 text-ws-chip text-ws-ink'>
      {items}
    </div>
  );
}

function MemberRow({
  stat,
  isViewer,
  onOpenReport,
}: {
  stat: SummaryMemberStat;
  /** Dòng của chính người đang xem: không ai tự duyệt bản của mình. */
  isViewer: boolean;
  onOpenReport?: (reportId: string) => void;
}) {
  const percent = Math.round(stat.rate * 100);
  /* LỐI VÀO DUYỆT từ Tổng quan (UAT 17/09/2026: "2 chờ duyệt" chỉ là chữ, không
     bấm được). Mở bản chờ duyệt CŨ NHẤT - dải ngày đã xếp cũ trước, và bản cũ
     nhất là bản gần hết hạn duyệt nhất. */
  const pendingDays = stat.days.filter(
    (day) => day.boardState === 'CHO_DUYET' && day.reportId,
  );
  const firstPending = pendingDays[0] ?? null;
  const openFirstPending =
    firstPending && onOpenReport
      ? () => onOpenReport(firstPending.reportId)
      : null;
  /* MỘT nguồn chữ cho cả `aria-label` của ô và chú giải của nó: hai chỗ nói
     khác nhau về cùng một ngày là lỗi khó thấy nhất, vì mắt và trình đọc màn
     hình không bao giờ gặp nhau. Trạng thái duyệt và TÊN người đã duyệt đi kèm
     từ 16/09/2026 (điểm 2 của UAT): màu ô trả lời "có nộp chưa", không trả lời
     "ai đã duyệt". */
  const dayDetail = (day: SummaryMemberStat['days'][number]): string => {
    const parts = [formatDateVi(day.date), DAY_CELL_LABEL[day.status]];
    if (day.boardState !== undefined && day.boardState !== 'CHUA_NOP') {
      parts.push(BOARD_STATE_LABEL_VI[day.boardState]);
    }
    if (day.reviewedBy) parts.push(`${day.reviewedBy.fullName} duyệt`);
    return parts.join(' · ');
  };
  /* Ai đã duyệt nay hiện bằng ảnh trên TỪNG ô ngày (`DayCell`), nên dòng "Đã
     duyệt bởi" dưới dải ngày đã bỏ (UAT 17/09/2026). */
  return (
    <div className='flex items-start gap-3 px-4 py-3'>
      <PersonAvatar
        name={stat.fullName}
        url={stat.avatarUrl}
        seed={stat.userId}
        size='md'
        className='mt-0.5'
      />

      <div className='min-w-0 flex-1'>
        <div className='flex items-start justify-between gap-2'>
          <span className='min-w-0'>
            {/* Hai dòng thay vì cắt: ở 375px cột phải có nút "Duyệt n bản",
                tên cắt một dòng chỉ còn "Nguyễn Thị …" (đo 17/09/2026). */}
            <span
              title={stat.fullName}
              className='line-clamp-2 break-words text-ws-body font-semibold text-ws-ink'
            >
              {stat.fullName}
            </span>
            {/* Bộ phận: MỘT dòng chữ nhạt, cắt đuôi khi dài. Bản chip rời
                (16/09) rớt thành ba bốn hàng vụn ở 375px. */}
            {(stat.departments ?? []).length > 0 && (
              <span className='flex min-w-0 items-center gap-1 text-ws-chip text-ws-ink-faint'>
                <Building2 aria-hidden='true' className='h-3 w-3 shrink-0' />
                <span className='truncate'>
                  {(stat.departments ?? []).map((d) => d.name).join(' · ')}
                </span>
              </span>
            )}
          </span>
          <span className='flex shrink-0 flex-col items-end gap-1'>
            {/* Số nộp và tỉ lệ đứng MỘT chỗ; dòng số liệu dưới dải ngày đã bỏ
                vì nói lại cùng ý với chính các ô (UAT 17/09/2026). */}
            <span className='text-ws-chip tabular-nums text-ws-ink-soft'>
              {stat.submitted}/{stat.expected}
              <span
                className={cn(
                  'ml-1.5 font-semibold',
                  percent < 80 ? MISSED_TEXT_CLASS : 'text-ws-done-fg',
                )}
              >
                {percent}%
              </span>
            </span>
            {openFirstPending && (
              <button
                type='button'
                onClick={openFirstPending}
                aria-label={
                  isViewer
                    ? `Xem bản chờ duyệt của bạn (${pendingDays.length} bản)`
                    : `Duyệt ${pendingDays.length} bản chờ duyệt của ${stat.fullName}, mở bản cũ nhất`
                }
                className={cn(
                  'inline-flex min-h-11 items-center rounded-ws-control px-1 sm:min-h-7',
                  FOCUS_RING,
                )}
              >
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 whitespace-nowrap text-ws-chip font-semibold',
                    isViewer ? 'text-ws-ink-soft' : 'text-ws-progress-fg',
                  )}
                >
                  {isViewer ? 'Xem' : 'Duyệt'} {pendingDays.length} bản
                  <ChevronRight aria-hidden='true' className='h-4 w-4' />
                </span>
              </button>
            )}
          </span>
        </div>

        {/* Dải ngày THAY cho thanh tiến độ.
            Thanh tiến độ chỉ nói được một con số, mà hai người cùng 18/20 có
            thể rất khác nhau: một người thiếu hai ngày rải rác từ tháng trước,
            người kia thiếu đúng hai ngày gần nhất. Dải ngày cho thấy chỗ
            THỦNG nằm ở đâu — đó mới là thứ trưởng nhóm cần. Tỉ lệ % vẫn còn ở
            dòng dưới cho ai chỉ cần con số. */}
        {/* Ở 375px dải 30 ngày cần ~330px mà cột chỉ còn ~267px, dải 92 ngày
            cần ~1010px — `flex-wrap` cắt nó thành 2–4 dòng và mốc thời gian
            đọc thành từng đoạn rời, đúng thứ dải ngày sinh ra để tránh. Dưới
            `md` cho dải chạy MỘT hàng và cuộn ngang TRONG KHUNG của chính nó
            (`overscroll-x-contain` để không kéo theo cả trang); từ `md` trở
            lên chỗ đã đủ rộng nên trả về `flex-wrap` như cũ, không sinh thêm
            thanh cuộn trên desktop. */}
        {stat.days.length > 0 && (
          /* Ô ngày (UAT 17/09/2026): một ô nói ĐỦ ba điều của một ngày - nộp
             chưa (màu nền), kết luận gì (icon góc dưới) và AI duyệt (ảnh góc
             trên). Bản vạch 8px trước chỉ nói được điều thứ nhất.
             Dưới `md` dải chạy một hàng và cuộn ngang trong khung của nó. */
          <div
            /* Khổ hẹp: mở sẵn ở CUỐI dải - ngày gần nhất mới là thứ cần xem
               (đo 375px: chỉ thấy 5 ngày cũ nhất). */
            ref={(el) => {
              /* Đợi một khung hình: lúc ref chạy, bề ngang dải chưa tính xong
                 nên chỉ cuộn được nửa chừng (đo 17/09/2026). */
              if (el && el.scrollLeft === 0) {
                requestAnimationFrame(() => {
                  el.scrollLeft = el.scrollWidth;
                });
              }
            }}
            className='ws-scroll mt-2 flex flex-nowrap gap-1 overflow-x-auto overscroll-x-contain px-0.5 pb-1 pt-1.5 md:flex-wrap md:overflow-x-visible'
            role='group'
            aria-label={`${stat.fullName}: ${stat.submitted} ngày đã nộp trên ${stat.expected} ngày phải nộp`}
          >
            {stat.days.map((d) => (
              <Tooltip key={d.date}>
                <TooltipTrigger asChild>
                  <button
                    type='button'
                    aria-label={dayDetail(d)}
                    onClick={() => d.reportId && onOpenReport?.(d.reportId)}
                    className={cn(
                      d.reportId && onOpenReport
                        ? 'cursor-pointer'
                        : 'cursor-default',
                      'shrink-0 rounded-ws-check',
                      FOCUS_RING_TIGHT,
                    )}
                  >
                    <DayCell day={d} />
                  </button>
                </TooltipTrigger>
                {/* Portal ra ngoài `ws-scope`, nên phải mang lại class đó. */}
                <TooltipContent
                  side='top'
                  className='ws-scope rounded-ws-chip border-ws-line bg-ws-surface px-2 py-1 shadow-ws-raised'
                >
                  {/* Cỡ và màu chữ trên `<span>` con: `TooltipContent` gộp
                      className bằng `cn`, twMerge sẽ nuốt mất cỡ chữ. */}
                  <span className='text-ws-chip text-ws-ink'>
                    {dayDetail(d)}
                  </span>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Khung chờ ───────────────────────────────────────────────────────────── */

/**
 * Khung chờ của chế độ **Toàn nhóm** — giữ đúng hình dạng của trang thật.
 *
 * Bản trước là một `Loader2` xoay giữa màn: nó nói "đang tải" nhưng không nói
 * SẮP HIỆN RA CÁI GÌ, nên lúc dữ liệu về cả trang nhảy một phát từ một vòng
 * xoay cao 64px thành một trang cao vài trăm px. Khung chờ dựng sẵn đúng bốn
 * khối (thẻ tổng quan, bốn ô số, thanh tỉ lệ, danh sách thành viên) nên chiều
 * cao gần khớp và mắt không phải tìm lại vị trí.
 */
function SummaryGridSkeleton() {
  return (
    <div
      aria-busy='true'
      aria-live='polite'
      aria-label='Đang tải tổng hợp của nhóm'
      className='space-y-5 p-5'
    >
      <section className='rounded-lg border border-ws-line bg-ws-surface px-4 py-3'>
        <div className='flex flex-wrap items-start gap-3'>
          <div className='mr-auto space-y-2'>
            <Skeleton className={cn('h-3 w-28', SKELETON)} />
            <Skeleton className={cn('h-3.5 w-64 max-w-full', SKELETON)} />
          </div>
          <div className='flex flex-col items-end gap-2'>
            <Skeleton className={cn('h-6 w-16', SKELETON)} />
            <Skeleton className={cn('h-2.5 w-14', SKELETON)} />
          </div>
        </div>

        <div className='mt-4 grid grid-cols-2 gap-2 md:grid-cols-4'>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className='rounded-md bg-ws-surface-alt px-3 py-2'>
              <Skeleton className={cn('h-2.5 w-20', SKELETON)} />
              <Skeleton className={cn('mt-1.5 h-4 w-10', SKELETON)} />
            </div>
          ))}
        </div>

        <Skeleton className={cn('mt-4 h-2 w-full rounded-full', SKELETON)} />
      </section>

      <section>
        <div className='mb-2 flex flex-wrap items-center gap-x-3 gap-y-1'>
          <Skeleton className={cn('mr-auto h-3 w-40', SKELETON)} />
        </div>
        <div className='space-y-1'>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className='flex items-start gap-3 rounded-lg border border-ws-line bg-ws-surface px-3 py-2.5'
            >
              <Skeleton
                className={cn('mt-0.5 h-8 w-8 shrink-0 rounded-full', SKELETON)}
              />
              <div className='min-w-0 flex-1'>
                <div className='flex items-center justify-between gap-2'>
                  <Skeleton
                    className={cn('h-3.5 w-36 max-w-[60%]', SKELETON)}
                  />
                  <Skeleton className={cn('h-3 w-10 shrink-0', SKELETON)} />
                </div>
                {/* Cùng chiều cao 14px và cùng khe 3px với dải ngày thật. */}
                <div className='mt-1.5 flex flex-nowrap gap-[3px] overflow-hidden md:flex-wrap'>
                  {Array.from({ length: 24 }, (_, d) => (
                    <Skeleton
                      key={d}
                      className={cn(
                        'h-3.5 w-2 shrink-0 rounded-ws-bar',
                        SKELETON,
                      )}
                    />
                  ))}
                </div>
                <Skeleton className={cn('mt-1.5 h-2.5 w-24', SKELETON)} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Khung chờ của cột chọn thành viên.
 *
 * Năm hàng đúng khuôn hàng thật: sàn cao 44px, avatar tròn 28px, một dòng tên.
 * Nhờ vậy lúc dữ liệu về cột không nhảy chiều cao — cùng lý do với
 * `SummaryGridSkeleton`. Ô tìm không có khung chờ vì hàng thật cũng chỉ hiện
 * khi nhóm quá 8 người, mà lúc chưa có dữ liệu thì chưa biết điều đó.
 */
function MemberPickerSkeleton() {
  return (
    <div
      aria-busy='true'
      aria-live='polite'
      aria-label='Đang tải danh sách thành viên'
      className='space-y-1'
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className='flex min-h-11 items-center gap-2 px-2 py-2'>
          <Skeleton className={cn('h-7 w-7 shrink-0 rounded-full', SKELETON)} />
          <Skeleton className={cn('h-3.5 min-w-0 flex-1', SKELETON)} />
        </div>
      ))}
    </div>
  );
}

/**
 * Khung chờ của danh sách lịch sử một thành viên — ba cột đúng như hàng thật:
 * ngày (rộng cố định 96px), chip trạng thái, và trích đoạn nội dung.
 */
function MemberHistorySkeleton() {
  return (
    <div
      aria-busy='true'
      aria-live='polite'
      aria-label='Đang tải lịch sử của thành viên'
      className='divide-y divide-ws-line'
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className='flex min-h-11 items-center gap-3 px-4 py-3'>
          <Skeleton className={cn('h-3 w-24 shrink-0', SKELETON)} />
          <Skeleton
            className={cn('h-4 w-16 shrink-0 rounded-full', SKELETON)}
          />
          <Skeleton className={cn('h-3.5 min-w-0 flex-1', SKELETON)} />
        </div>
      ))}
    </div>
  );
}
