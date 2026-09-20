'use client';

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { parseAsString, useQueryState } from 'nuqs';
import { useSession } from 'next-auth/react';
import { ClipboardList, Settings2, UserCog, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuthPermissions } from '@/hooks/auth/use-auth-permissions';
import { PermissionCode } from '@/types/permission.type';
import { Role } from '@/types/user.type';
import { useCaregiver } from '@/contexts/caregiver-context';
import {
  useDailyReport,
  useMyReportScopes,
  useMyTodayReports,
  useReportBoard,
  useReportPendingReview,
} from '@/hooks/queries/daily-report-queries';
import { BoardKpiManageButton } from './board/board-kpi-summary';
import { DailyReportScopeRail } from './scope/daily-report-scope-rail';
import { DailyReportTodaySide } from './report/daily-report-today-side';
import { EmptyNoScopesBody } from './shared/empty-no-scopes';
import { ReportCenteredNotice } from './shared/report-centered-notice';
import { ReportErrorState } from './shared/report-error-state';
import { ReportLoadingSpinner } from './shared/report-loading-spinner';
import {
  EmptyToday,
  FocusNotFound,
  TodayLoadFailed,
} from './report/report-empty-states';
import { ReportForm } from './report/report-form';
import {
  buildScopeRailItems,
  formatDateVi,
  isReviewOnly,
  normalizeScopeParam,
  pickReport,
  resolveDefaultScopeId,
  todayReportOfScope,
  todayStrVi,
  TOOLTIP_CONTENT_CLASS,
  TOOLTIP_CONTENT_STYLE,
  // Vòng focus bàn phím — CÙNG công thức với `daily-report-scope-rail.tsx`, chỉ
  // đổi màu khe hở: mọi phần tử bấm được trong tấm này đứng trên `ws-surface`,
  // còn cột nhóm đứng trên `ws-surface-alt`. Khe hở sai màu thì viền focus bị
  // một vệt trắng cắt ngang. Chỉ dùng cho `<button>` / `<Link>` thô —
  // `components/ui/button.tsx` đã có sẵn `focus-visible:ring-ring`, mà
  // `--color-ring` trong `globals.css` chính là `ws-focus`.
  FOCUS_RING_SURFACE as FOCUS_RING,
} from './daily-report-utils';

/**
 * Bốn màn dữ liệu của Báo cáo, phẳng — không lồng cấp.
 *
 * Chúng là một lưới 2×2 của cùng hai câu hỏi: **của ai** (tôi / nhóm) × **khi
 * nào** (hôm nay / một khoảng). Tách "Nhóm theo dõi" ra thành một mục ngang hàng
 * với "Báo cáo" ở cụm chuyển màn chính là mã hoá trục "của ai" hai lần, ở hai
 * cấp khác nhau — người dùng phải đoán mục nào chứa cái gì.
 *
 *            │ Hôm nay        │ Một khoảng
 *   ─────────┼────────────────┼──────────────
 *   Của tôi  │ report         │ history
 *   Của nhóm │ board          │ summary
 *
 * `review-groups` KHÔNG nằm trong lưới đó: nó không đọc báo cáo của ai cả mà
 * sửa cách chia nhóm duyệt. Nó là một mục riêng, chỉ trưởng nhóm thấy, và đứng
 * cuối dải vì là việc thiết lập chứ không phải việc hằng ngày.
 */
export type ReportView =
  | 'report'
  | 'history'
  | 'board'
  /** Mọi bản còn chờ kết luận của nhóm, xuyên ngày (thêm 16/09/2026). */
  | 'pending-review'
  | 'summary'
  | 'review-groups';

/**
 * Ba màn phụ và hộp thoại KPI tải THEO YÊU CẦU.
 *
 * Bốn màn của không gian Báo cáo loại trừ nhau — mỗi lượt render đúng một cái —
 * nhưng nhập tĩnh thì cả bốn cùng nằm trong chunk của route. Đo trên bản build
 * production: `board` 668 dòng + `summary` 1450 + `history` 1168 + hộp thoại KPI
 * 296 = 3.582 dòng đi kèm mỗi lần mở `/daily-reports/today`, nơi KHÔNG cái nào
 * được vẽ. Đó là phần lớn quãng chờ khi bấm từ "Công việc" sang "Báo cáo": lối
 * vào của cả tính năng là màn báo cáo của chính mình, còn ba màn kia chỉ trưởng
 * nhóm mới mở, và cũng chỉ thỉnh thoảng.
 *
 * `loading` phải có thật, không để trống: chunk về chậm mà không có gì thay chỗ
 * thì vùng nội dung sập xuống 0px rồi bung ra: cả trang giật một nhịp. Dùng
 * đúng `ReportLoadingSpinner` mà các nhánh chờ khác của màn đang dùng.
 *
 * KHÔNG đụng `BoardKpiManageButton`: nó nằm ở hàng tiêu đề nhóm, hiện ở CẢ ba
 * màn `report`/`board`/`summary`, nên tách ra chỉ đổi một lần tải sang ba lần.
 * File đó cũng chỉ 237 dòng và không kéo theo gì ngoài primitive dùng chung.
 */
const DailyReportBoard = dynamic(
  () => import('./board/daily-report-board').then((m) => m.DailyReportBoard),
  { loading: () => <ReportLoadingSpinner label='Đang tải bảng nhóm' /> },
);
const DailyReportSummary = dynamic(
  () =>
    import('./summary/daily-report-summary').then((m) => m.DailyReportSummary),
  { loading: () => <ReportLoadingSpinner label='Đang tải tổng quan' /> },
);
const DailyReportHistory = dynamic(
  () =>
    import('./history/daily-report-history').then((m) => m.DailyReportHistory),
  { loading: () => <ReportLoadingSpinner label='Đang tải lịch sử' /> },
);
const DailyReportKpiModal = dynamic(() =>
  import('./config/daily-report-kpi-modal').then((m) => m.DailyReportKpiModal),
);
/* Màn chia nhóm duyệt: chỉ trưởng nhóm mở, và cũng chỉ thỉnh thoảng - đúng
   loại màn phải tải theo yêu cầu như ba màn phụ ở trên. */
const DailyReportReviewGroups = dynamic(
  () =>
    import('./review-groups/daily-report-review-groups').then(
      (m) => m.DailyReportReviewGroups,
    ),
  { loading: () => <ReportLoadingSpinner label='Đang tải bộ phận' /> },
);
/* Dải "Chờ duyệt": chỉ trưởng nhóm và người duyệt mở, cùng luật tải theo yêu
   cầu với bốn màn trên. */
const DailyReportPendingReview = dynamic(
  () =>
    import('./pending-review/daily-report-pending-review').then(
      (m) => m.DailyReportPendingReview,
    ),
  {
    loading: () => (
      <ReportLoadingSpinner label='Đang tải danh sách chờ duyệt' />
    ),
  },
);

interface Props {
  /** Màn đang xem — page shell quyết qua `?section=`, không phải state nội bộ. */
  view: ReportView;
  /** Đổi màn: nút "Bảng nhóm" trong form và deep-link tổng hợp đều đi qua đây. */
  onViewChange: (
    view: ReportView,
    scopeId?: string | null,
    date?: string | null,
  ) => void;
  /** Href thật cho các tab nội bộ; giữ được điều hướng ngay cả khi callback bị stale. */
  viewHref?: (
    view: ReportView,
    scopeId?: string | null,
    date?: string | null,
  ) => string | null;
  /** Mở chi tiết một công việc — page shell lo `?focusTaskId=` và đổi màn. */
  onOpenTask: (taskId: string) => void;
  /** Điều hướng tới route chi tiết riêng; thiếu thì giữ hành vi state cũ. */
  onOpenReportRoute?: (reportId: string, scopeId?: string) => void;
  /**
   * URL thật của bản chi tiết - để bảng nhóm dựng link "Duyệt"/"Mở" (mở tab
   * mới, sao chép được) thay vì chỉ có hành vi bấm. Thiếu thì bảng chỉ bung
   * dòng tại chỗ như trước.
   */
  reportHref?: (reportId: string, scopeId: string) => string;
  /** Scope mặc định khi người dùng vào mục "Nhóm theo dõi". */
  initialBoardScopeId?: string | null;
  /** Ngày được giữ trong URL khi mở bảng theo dõi trực tiếp. */
  initialBoardDate?: string | null;
  /** Cho page shell xoá query deep-link sau khi đã nhận focus. */
  onFocusConsumed?: () => void;
  /** Mở hộp thoại Nhóm giao việc để quản lý nhóm hoặc tự rời nhóm. */
  onOpenGroups?: () => void;
  /** Href thật cho mục lịch sử xuyên nhóm ở rail. */
  historyHref?: string;
  /**
   * Mở cấu hình của nhóm ĐANG XEM. Nút nằm ngay cạnh tên nhóm chứ không trên
   * hàng công cụ: cấu hình luôn thuộc về một nhóm cụ thể, mà hàng công cụ thì
   * không biết nhóm nào đang mở.
   */
  onOpenScopeConfig?: (scopeId: string) => void;
  /**
   * Deep-link `?focusReportId=` — mở thẳng đúng bản báo cáo, bỏ qua bước chọn
   * nhóm kể cả khi người dùng thuộc nhiều nhóm.
   */
  focusReportId?: string | null;
  /** Deep-link `?focusScopeId=` — mở thẳng bảng theo dõi của phạm vi. */
  focusScopeId?: string | null;
  /**
   * Deep-link `?focusDate=` (`YYYY-MM-DD`) — ngày của sự kiện sinh ra thông báo.
   * Thiếu thì bảng theo dõi mở ngày hôm nay, tức là sai ngày khi trưởng nhóm
   * bấm vào thông báo tối qua lúc sáng hôm sau.
   */
  focusDate?: string | null;
}

/**
 * Ba dải NẰM TRONG một nhóm. `history` không có ở đây vì nó xuyên nhóm — nó là
 * một mục riêng ở đáy cột nhóm, dưới một vạch ngăn.
 *
 * Dải này chỉ hiện khi nhóm đang chọn có từ hai mục trở lên: trưởng nhóm, hoặc
 * người được giao duyệt trong chính nhóm mình tham gia. Bản cũ dựng dải bốn mục
 * rồi lọc theo cờ `isManager` TOÀN CỤC, nên số mục nhảy theo người đăng nhập và
 * vạch ngăn vẽ theo chỉ số sau khi lọc — hai thứ cùng phải sửa mỗi lần đổi
 * danh sách.
 *
 * `gate` nói mục đó mở theo cờ nào của NHÓM ĐANG XEM:
 *   · `member` - có bản phải nộp ở nhóm này (ẩn với người chỉ đứng ngoài duyệt);
 *   · `board`  - quản lý hoặc người duyệt (server lọc bảng theo phân công);
 *   · `group`  - chỉ quản lý: "Tổng quan" là số liệu của CẢ nhóm;
 *   · `manage` - chỉ quản lý, và là việc THIẾT LẬP chứ không phải đọc dữ liệu.
 */
/** Giá trị `?from=` đánh dấu bản chi tiết mở từ hàng đợi "Chờ duyệt". */
const PENDING_QUEUE_FROM = 'pending-review';

const BANDS: {
  key: Exclude<ReportView, 'history'>;
  label: string;
  /** Câu mô tả HIỆN RA dưới dải, không phải tooltip. */
  sub: string;
  gate: 'member' | 'board' | 'group' | 'manage';
}[] = [
  {
    key: 'report',
    label: 'Báo cáo của tôi',
    sub: 'Bạn sẽ viết câu trả lời cho các câu hỏi bên dưới',
    gate: 'member',
  },
  {
    key: 'board',
    label: 'Nhóm',
    sub: 'Ai đã nộp, ai chưa trong MỘT ngày. Bấm một người để đọc bản của họ.',
    gate: 'board',
  },
  {
    key: 'pending-review',
    label: 'Chờ duyệt',
    sub: 'Mọi bản còn chờ kết luận của nhóm, gom theo bộ phận và KHÔNG theo một ngày. Bấm một dòng để đọc và kết luận.',
    gate: 'board',
  },
  {
    key: 'summary',
    /* KHÔNG gọi màn này là "Lịch sử báo cáo": mục "Lịch sử của tôi" ở đáy cột
       nhóm là một màn khác hẳn (xuyên nhóm, chỉ của mình), nên hai cái tên gần
       giống nhau khiến người dùng bấm nhầm rồi tưởng dữ liệu bị thiếu. Tên
       hiện tại nói đúng cái nó là: tổng quan của CẢ NHÓM theo một khoảng ngày. */
    label: 'Tổng quan báo cáo',
    sub: 'Mức độ đều đặn của cả nhóm trong một khoảng ngày: xem toàn nhóm hoặc lần theo từng thành viên, kèm việc tồn đọng lặp lại và yêu cầu hỗ trợ đã hoặc chưa giải quyết.',
    gate: 'group',
  },
  {
    key: 'review-groups',
    /* Lối vào RIÊNG cho việc chia nhóm duyệt, tách khỏi hộp thoại cấu hình
       báo cáo. Chia nhóm cần nhìn cả bức tranh "ai duyệt ai" cùng lúc, còn
       trong hộp thoại cấu hình thì nó chen giữa lịch báo cáo và bộ câu hỏi. */
    label: 'Bộ phận',
    sub: 'Chia thành viên thành các bộ phận có tên và giao cho người duyệt phụ. Lưu là áp dụng ngay cho cả bản đã nộp trong hôm nay.',
    gate: 'manage',
  },
];

/** Nhãn dải bảng khi người xem chỉ DUYỆT, không quản lý: bảng của họ đã được
    server lọc về đúng những người được giao, gọi là "Nhóm" là nói quá. */
const REVIEWER_BOARD_BAND = {
  label: 'Bộ phận của bạn',
  sub: 'Những người được giao cho bạn duyệt, trong MỘT ngày. Bấm "Duyệt" ở một dòng để đọc và kết luận bản của họ.',
};

/**
 * Không gian Báo cáo hằng ngày (docs 06 mục 2–3): chọn nhóm (khi thuộc nhiều
 * nhóm) → điền 4 câu (đã dựng sẵn) → nộp. Sau nộp chuyển chỉ đọc, sửa lại
 * được trong ngày.
 *
 * Đây là **một màn trong tấm nội dung của `/tasks`**, không phải hộp thoại.
 * Tiêu đề màn và cụm chuyển màn do page shell vẽ; ở đây chỉ còn dải ngữ cảnh
 * (tên nhóm · ngày · hạn nộp) để không có hai tiêu đề cùng chữ chồng nhau.
 */
function DailyReportWorkspaceBase({
  view,
  onViewChange,
  viewHref,
  onOpenTask,
  onOpenReportRoute,
  reportHref,
  initialBoardScopeId = null,
  initialBoardDate = null,
  onFocusConsumed,
  onOpenGroups,
  historyHref,
  focusReportId,
  focusScopeId,
  focusDate,
  onOpenScopeConfig,
}: Props) {
  const { data: session } = useSession();
  const { hasPermission, adminRoles } = useAuthPermissions();
  const canCreateGroups =
    session?.user?.role === Role.ADMIN ||
    hasPermission(PermissionCode.DAILY_TASK_GROUPS_CREATE);
  /**
   * Admin nền tảng — cùng phép thử với `isPlatformAdmin` bên `acta-api`: vai
   * `admin` trên tài khoản, HOẶC một vai quản trị `super_admin`.
   *
   * Đọc thẳng `adminRoles` thay vì gọi `hasRole()`: React Compiler không nhìn
   * xuyên được một hàm lấy từ context, nên giá trị suy ra từ nó bị coi là có
   * thể đổi bất ngờ, và cả `handleSelectBand` lẫn `handleSelectScope` mất
   * memoization thủ công (`react-hooks/preserve-manual-memoization`). Một mảng
   * dữ liệu thì nó theo dõi được.
   *
   * Chỉ dùng để mở đường ĐIỀU HƯỚNG tới nhóm ngoài danh sách của mình, không
   * phải để cấp quyền: server vẫn chốt từng scope qua `canViewGroupData()`, và
   * `scope/:scopeId/board` vẫn trả `403` khi cờ này nói sai. Đó cũng là lý do
   * không cần soi `expiresAt` của vai ở đây như server làm.
   */
  const isPlatformAdmin = useMemo(
    () =>
      session?.user?.role === Role.ADMIN ||
      adminRoles.some(
        (r) => r.role.code === 'super_admin' || r.role.code === 'SUPER_ADMIN',
      ),
    [session?.user?.role, adminRoles],
  );
  const { careUser } = useCaregiver();
  const {
    data,
    isLoading,
    isError: isTodayError,
    refetch: refetchToday,
  } = useMyTodayReports();
  // Cần `weekdays` + tên nhóm để nói ĐÚNG lý do hôm nay không có bản nào, thay vì
  // đoán "có thể là ngày nghỉ, hoặc có thể bạn không thuộc nhóm nào".
  const {
    data: scopes,
    isLoading: isLoadingScopes,
    /* `isError` phải lấy ra, không được bỏ. Trước đây chỉ lấy `isLoading`, nên
       khi API danh sách nhóm hỏng thì `isLoadingScopes` về `false`, `railItems`
       rỗng, `activeScopeId` là `null`, `isScopeKnown` cũng `false` (vì nó gồm
       `!isTodayError`) — và cả ba màn Báo cáo rơi vào nhánh spinner "Đang tải
       danh sách nhóm" và ĐỨNG ĐÓ VĨNH VIỄN. Đo thật: ép mọi request trả 500 rồi
       chờ 25 giây, quá ba lượt retry của React Query, vòng xoay vẫn quay và
       không có một chữ báo lỗi nào. */
    isError: isScopesError,
    refetch: refetchScopes,
  } = useMyReportScopes();

  /**
   * MỘT nguồn duy nhất cho "đang xem nhóm nào", sống trên URL.
   *
   * Bản cũ giữ hai biến rời nhau: `selectedReportId` cho màn Hôm nay và
   * `boardScopeId` cho màn Nhóm. Không có gì buộc chúng khớp nhau, nên đang xem
   * nhóm A rồi bấm Tổng hợp là ra nhóm khác mà không có dấu hiệu gì. Gộp về một
   * biến thì lỗi đó biến mất theo cấu trúc, không phải nhờ nhớ đồng bộ.
   *
   * Đặt trên URL để F5 và nút Back giữ đúng nhóm, và để `page.tsx` đọc được mà
   * gate nút Cấu hình — nút đó nằm ở hàng tiêu đề của page, ngoài cây này.
   */
  const [scopeParam, setScopeParam] = useQueryState('scope', parseAsString);
  /** Bản chi tiết được mở từ dải "Chờ duyệt" (`?from=pending-review`): dải đó
      sáng thay cho "Nhóm", và nút "Bản chờ duyệt kế tiếp" giữ nguyên dấu này. */
  const [fromParam] = useQueryState('from', parseAsString);
  const fromPendingQueue = fromParam === PENDING_QUEUE_FROM;
  /** Bản NGOÀI hôm nay đang mở (deep-link, dòng Lịch sử, thẻ Bản gần đây). */
  const [openedReportId, setOpenedReportId] = useState<string | null>(null);
  /**
   * `|| undefined` chứ KHÔNG `?? undefined`: `?date=` bỏ trống trên URL cho ra
   * CHUỖI RỖNG chứ không phải `null` (nuqs chỉ trả `null` khi param vắng hẳn),
   * mà chuỗi rỗng giữ lại ở đây là gửi `date=` rỗng lên API và tách queryKey
   * của chip đếm khỏi queryKey của bảng. Rỗng ở mọi dạng đều có cùng một nghĩa:
   * "để server tự lấy hôm nay".
   */
  const [boardDate, setBoardDate] = useState<string | undefined>(
    initialBoardDate || undefined,
  );
  /**
   * `?date=` — ĐÚNG param mà page shell đang đọc để đổ xuống `initialBoardDate`.
   *
   * Ở đây chỉ dùng chiều GHI; chiều đọc vẫn đi qua prop, nên vẫn chỉ có một
   * đường dữ liệu xuống. Cần chiều ghi vì ngày đang xem của bảng phải sống trên
   * URL: thiếu nó thì F5 hay gửi link cho người khác là quay về ngày cũ.
   *
   * Ghi bằng nuqs chứ KHÔNG bằng `onViewChange`: `onViewChange` của page shell
   * đi qua `router.push`, nên mỗi lần bấm mũi tên là thêm một mục vào lịch sử
   * trình duyệt — xem lùi mười ngày thì phải bấm Back mười lần mới thoát khỏi
   * bảng. nuqs mặc định `history: 'replace'` + `shallow: true`, mà
   * `app/(routes)/daily-reports/[scopeId]/board/page.tsx` chỉ đọc `params` chứ
   * không đọc `searchParams`, nên không có gì phía server cần được báo.
   */
  const [, setBoardDateParam] = useQueryState('date', parseAsString);
  /**
   * `?date=` trên URL đổi (F5, nút Back, mở một link được gửi) thì kéo ngày của
   * bảng theo nó.
   *
   * Trước đây là `useEffect` phụ thuộc `[initialBoardDate]` chạy SAU khi vẽ;
   * nay so ngay trong lúc render theo khuôn "giữ giá trị của lượt trước trong
   * state" của React. Điều kiện kích hoạt giống hệt mảng phụ thuộc cũ —
   * `initialBoardDate` là `string | null` nên `!==` so đúng bằng cách React so
   * mảng phụ thuộc — chỉ khác là bảng không còn vẽ một lượt bằng ngày cũ trước
   * khi đổi.
   *
   * Chiều ngược lại không đụng gì: người dùng bấm lùi/tiến ngày vẫn đi qua
   * `handleBoardDateChange`, hàm đó ghi `?date=` rồi prop quay xuống bằng ĐÚNG
   * giá trị vừa ghi, nên nhánh dưới đây gặp giá trị y hệt và `setBoardDate`
   * dừng ngay tại đó.
   */
  const [syncedDateParam, setSyncedDateParam] = useState(initialBoardDate);
  if (syncedDateParam !== initialBoardDate) {
    setSyncedDateParam(initialBoardDate);
    setBoardDate(initialBoardDate || undefined);
  }
  /**
   * Giữ lại bản mà `?focusReportId=` vừa trỏ tới, vì param đó chỉ sống MỘT lượt.
   *
   * `wantedId` bên dưới đọc thẳng `focusReportId` khi param còn trên URL, nên
   * lúc đầu không cần state. Nhưng effect nhận deep-link gọi `onFocusConsumed()`
   * ngay sau đó và shell xoá param; không ghim lại thì `wantedId` rơi về
   * `openedReportId` là `null` và bản vừa mở biến mất ngay lượt render kế.
   *
   * Cùng khuôn "state suy từ prop" với `syncedDateParam` ngay trên, và vì cùng
   * lý do: chạy trong lúc render nên không có một khung hình trống chớp qua
   * trước khi effect kịp chạy. Chỗ nhận `?taskId=` ở `daily-report-route-shell.tsx`
   * cũng dùng đúng khuôn này.
   *
   * `!focusScopeId` giữ nguyên thứ tự ưu tiên của effect: link nào mang cả hai
   * param thì `focusScopeId` thắng và mở bảng nhóm, không mở bản. Bỏ điều kiện
   * này là bản được ghim sẽ kéo `?scope=` về nhóm của nó, đè lên nhóm mà link
   * chỉ định.
   */
  /*
   * Mốc khởi tạo là `null`, KHÔNG phải `focusReportId`.
   *
   * `syncedDateParam` ngay trên khởi tạo bằng prop được vì `boardDate` cũng
   * khởi tạo từ đúng prop đó, nên lượt đầu vốn đã khớp. Ở đây thì không:
   * `openedReportId` bắt đầu bằng `null`, mà deep-link đã nằm sẵn trên URL ngay
   * lượt render ĐẦU TIÊN. Khởi tạo bằng prop là lượt đầu không thấy chênh lệch
   * nào, không ai ghim id, và bản biến mất ngay khi shell xoá param.
   */
  const [syncedFocusReportId, setSyncedFocusReportId] = useState<
    string | null | undefined
  >(null);
  if (syncedFocusReportId !== focusReportId) {
    setSyncedFocusReportId(focusReportId);
    if (focusReportId && !focusScopeId) setOpenedReportId(focusReportId);
  }
  /** Người dùng đã tự bấm rời khỏi bản được deep-link tới. */
  const [ignoreFocus, setIgnoreFocus] = useState(false);
  /**
   * Nhóm đang mở danh mục KPI. State nằm ở ĐÂY chứ không ở `DailyReportBoard`
   * như trước: nút mở đã dời lên hàng tiêu đề nhóm, mà hàng đó sống ngoài cây
   * của bảng và còn hiện ở hai màn bảng không hề mount.
   */
  const [kpiConfigScopeId, setKpiConfigScopeId] = useState<string | null>(null);
  /**
   * Đã từng mở hộp thoại KPI trong phiên xem này chưa.
   *
   * Cần một cờ RIÊNG, không dùng thẳng `kpiConfigScopeId !== null`: hộp thoại
   * nay là `dynamic()`, mà một `dynamic()` nằm trong cây thì chunk của nó tải
   * ngay lúc mount — treo vào `kpiConfigScopeId` thì mới hoãn được lần tải.
   * Nhưng nếu tháo hẳn khi đóng thì `isOpen` nhảy về `false` cùng lúc component
   * biến mất, nên hoạt ảnh đóng của Radix không kịp chạy. Cờ này chỉ bật một
   * chiều: hoãn tải cho tới lần mở đầu tiên, rồi giữ nguyên trong cây để những
   * lần đóng/mở sau vẫn mượt.
   */
  const [wasKpiModalOpened, setWasKpiModalOpened] = useState(false);

  const reports = useMemo(() => data?.reports ?? [], [data]);

  /**
   * Bản được xem KHÔNG chắc nằm trong danh sách hôm nay — hai đường dẫn tới đây:
   * deep-link mở bản của ngày cũ ở chế độ đọc (`canReopen` chỉ bật trong ngày,
   * cho chủ bản và trưởng nhóm), và bấm một dòng ở màn Lịch sử. Màn này chỉ tải `my/today`, nên
   * thiếu thì lấy riêng theo id.
   */
  const wantedId =
    focusReportId && !ignoreFocus ? focusReportId : openedReportId;
  const outsideTodayId =
    wantedId && !reports.some((r) => r.id === wantedId) ? wantedId : null;
  const {
    data: outsideReport,
    isLoading: isLoadingOutside,
    isError: isOutsideError,
  } = useDailyReport(outsideTodayId);

  /**
   * Danh sách nhóm cho cột trái — HỢP của `/daily-report-scopes/my` và
   * `my/today`, không phải chỉ nguồn đầu. Lý do đầy đủ ở `buildScopeRailItems`:
   * ở chế độ làm thay hai nguồn nói về hai người khác nhau, và dựng cột trái
   * từ mỗi `scopes` là mất hẳn đường vào bản phải nộp hộ.
   */
  const railItems = useMemo(
    () => buildScopeRailItems(scopes, reports),
    [scopes, reports],
  );

  /**
   * Bản được CHỈ ĐỊNH — deep-link, dòng ở màn Lịch sử, hoặc thẻ "Bản gần đây".
   *
   * Phải gộp cả hai đường: `outsideReport` (bản ngoài `my/today`, tải riêng
   * theo id) VÀ bản chỉ định nằm ngay trong `my/today`. Chỉ xét vế đầu là bấm
   * một dòng Lịch sử của NHÓM KHÁC trong cùng ngày hôm nay sẽ không đổi được
   * `activeScopeId`, và màn mở bản của nhóm đang chọn — người dùng gõ vào rồi
   * autosave đè lên đúng bản không phải bản họ vừa bấm.
   */
  const focusedReport =
    outsideReport ??
    (wantedId ? reports.find((r) => r.id === wantedId) : undefined);

  /**
   * Nhóm đang xem. Thứ tự ưu tiên:
   * 1. bản đang được chỉ định → nhóm của chính nó, để cột trái sáng đúng chỗ
   * 2. `?scope=` nếu hợp lệ (id thô sửa tay được nên phải lọc)
   * 3. mặc định theo dải đang xem, tái lập đúng hành vi cũ
   */
  const activeScopeId =
    (view === 'report' && focusedReport ? focusedReport.scope.id : null) ??
    normalizeScopeParam(scopeParam, railItems) ??
    resolveDefaultScopeId(
      view,
      railItems,
      initialBoardScopeId,
      isPlatformAdmin,
    );

  const activeItem = railItems.find((i) => i.scopeId === activeScopeId) ?? null;
  /**
   * Quyền cấu hình tính theo ĐÚNG nhóm đang chọn, không phải "quản lý bất kỳ
   * nhóm nào". Quyền xem dữ liệu nhóm có thể rộng hơn cho admin/super admin.
   * Server vẫn chặn theo từng scope (`/scope/:scopeId/board`).
   */
  const isManagerOfActive = activeItem?.isManager ?? false;
  /**
   * Nhóm đang xem CÓ THỂ không nằm trong danh sách của mình — admin nền tảng mở
   * link trực tiếp tới board/summary của nhóm họ giám sát. Khi đó `activeItem`
   * là `null`, và với riêng họ ở đây KHÔNG được suy ra "không có quyền": làm
   * vậy là giao diện tự đóng một cánh cổng mà server vẫn đang mở, rồi không ai
   * lần ra được vì hai tầng nói hai điều khác nhau.
   *
   * Chưa biết thì hỏi. `scope/:scopeId/board` trả `403` mới là câu trả lời
   * thật, và Board/Summary đã có sẵn nhánh `isError` để nói ra điều đó.
   *
   * Người dùng thường vẫn rơi về `false` như cũ: nhóm ngoài danh sách với họ
   * gần như luôn là link cũ tới nhóm đã xoá hoặc vừa rời, và một câu giải thích
   * vẫn hơn một khối lỗi đỏ.
   */
  const canViewGroupDataOfActive = activeItem
    ? activeItem.canViewGroupData
    : isPlatformAdmin && activeScopeId !== null;
  /**
   * Xem được BẢNG của nhóm đang xem: quản lý, hoặc người được giao duyệt - bảng
   * của họ đã được server lọc về đúng những người họ duyệt. Rộng hơn
   * `canViewGroupDataOfActive`, cờ đó vẫn gác "Tổng quan", màn số liệu của CẢ
   * nhóm.
   *
   * Trước đây bảng cũng gác bằng `canViewGroupData`, nên người duyệt phụ không
   * có đường nào vào danh sách bản mình phải duyệt dù server đã mở sẵn.
   */
  const canViewBoardOfActive = activeItem
    ? activeItem.canViewBoard
    : isPlatformAdmin && activeScopeId !== null;
  /** Nhóm mình CHỈ duyệt: không có "bản của tôi" ở đây để nộp. */
  const isReviewOnlyActive = activeItem ? isReviewOnly(activeItem) : false;

  /**
   * Bản của ĐÚNG nhóm đang chọn.
   *
   * KHÔNG đưa `null` vào `pickReport` khi nhóm này không có bản: nhánh cuối của
   * nó ("đúng một bản thì mở luôn") sẽ mở bản của nhóm KHÁC trong khi cột trái
   * vẫn sáng nhóm này — đúng loại lỗi sửa nhầm bản mà `pickReport` sinh ra để
   * chặn. Nhóm đang chọn mà không có bản thì phải nói thẳng, xem nhánh (10).
   */
  const scopeReport = todayReportOfScope(reports, activeScopeId);
  const report = focusedReport
    ? focusedReport
    : activeScopeId !== null
      ? (scopeReport ?? null)
      : pickReport(reports, null, undefined);

  /**
   * Bản đang mở là của NGƯỜI KHÁC - người duyệt hoặc trưởng nhóm đang đọc bản
   * của một thành viên. Ở chế độ báo cáo thay, "mình" là người được chăm.
   *
   * Chưa biết người xem là ai thì coi là bản của mình: đó là hành vi cũ, và
   * sai theo hướng này chỉ làm thiếu nhãn, không làm lộ nút duyệt.
   */
  const viewerId = careUser?.id ?? session?.user?.id ?? null;
  const isReviewingOther =
    view === 'report' &&
    report !== null &&
    viewerId !== null &&
    report.owner.id !== viewerId;

  /** Dùng chung cho badge dải "Cả nhóm" và thẻ ngữ cảnh. Truyền `boardDate` để
   *  cùng queryKey với bảng bên dưới — khác date là vừa thêm một request vừa
   *  hiện con số của ngày khác ngay trên bảng của ngày đang xem.
   *
   *  Đang đọc bản của người khác thì lấy NGÀY CỦA BẢN ĐÓ: nút "bản chờ duyệt
   *  kế tiếp" phải tìm trong đúng ngày của bản đang duyệt, và dải "Nhóm" khi
   *  đó cũng trỏ về ngày ấy (`bandBoardDate`). */
  const { data: activeBoard } = useReportBoard(
    canViewBoardOfActive ? activeScopeId : null,
    isReviewingOther ? report.reportDate : boardDate,
  );

  /* Số bản chờ kết luận XUYÊN NGÀY cho badge của dải "Chờ duyệt". Cùng
     queryKey với trang 1 của bảng nhóm nên react-query gộp một request. */
  const { data: pendingReviewSummary } = useReportPendingReview(
    canViewBoardOfActive ? activeScopeId : null,
  );
  const pendingReviewTotal = pendingReviewSummary?.total ?? 0;

  /**
   * Bản CHỜ DUYỆT kế tiếp trong cùng ngày, tính vòng từ sau bản đang mở. Đây là
   * đường đi của người duyệt qua hàng đợi: duyệt xong một bản thì sang bản sau
   * mà không phải quay về bảng rồi dò lại.
   */
  /* Đi theo HÀNG ĐỢI "Chờ duyệt" xuyên ngày (cùng thứ tự với danh sách mà nút
     "Bắt đầu duyệt" mở ra), không chỉ trong ngày của bản đang mở: người duyệt
     bắt đầu từ bản gấp nhất rồi đi hết hàng đợi, kể cả bản của ngày khác (UAT
     17/09/2026). Chỉ những bản NGƯỜI NÀY kết luận được. */
  const nextReviewHref = (() => {
    if (!isReviewingOther || !reportHref) return null;
    const queue = (pendingReviewSummary?.data ?? []).filter(
      (r) => r.canReview,
    );
    const at = queue.findIndex((r) => r.reportId === report.id);
    const ordered =
      at < 0 ? queue : [...queue.slice(at + 1), ...queue.slice(0, at)];
    const next = ordered.find((r) => r.reportId !== report.id);
    if (!next) return null;
    const href = reportHref(next.reportId, report.scope.id);
    return fromPendingQueue ? `${href}?from=${PENDING_QUEUE_FROM}` : href;
  })();

  const bands = BANDS.filter((b) =>
    b.gate === 'member'
      ? !isReviewOnlyActive
      : b.gate === 'board'
        ? canViewBoardOfActive
        : b.gate === 'manage'
          ? /* Chia nhóm duyệt là quyền của TRƯỞNG NHÓM, hẹp hơn cả "Tổng
               quan": admin nền tảng đọc được dữ liệu nhóm nhưng server vẫn
               gác `isManager` ở cả bốn route nhóm duyệt, nên mời họ vào đây
               là mời vào một màn chỉ trả 403. */
            isManagerOfActive
          : canViewGroupDataOfActive,
  ).map((b) =>
    b.key === 'board' && !canViewGroupDataOfActive
      ? { ...b, ...REVIEWER_BOARD_BAND }
      : b,
  );
  /** Dải đang sáng. Đọc bản của người khác là đang làm việc của mục bảng
      (duyệt), không phải "Báo cáo của tôi". */
  const currentBand: ReportView = !isReviewingOther
    ? view
    : fromPendingQueue && bands.some((b) => b.key === 'pending-review')
      ? 'pending-review'
      : 'board';
  /**
   * Kéo mục ĐANG SÁNG vào tầm nhìn của thanh dải.
   *
   * Thanh dải cuộn ngang (`overflow-x-auto`), và từ khi có mục thứ tư "Nhóm
   * duyệt" thì ở 375px mục cuối nằm NGOÀI khung: đo ngày 11/09/2026, người dùng
   * đứng ở màn Nhóm duyệt mà thanh dải chỉ hiện ba mục khác, không mục nào sáng
   * - màn trông như không thuộc về đâu cả. Ba mục cũ ở 320px cũng vừa đủ tràn.
   *
   * `inline: 'nearest'` chỉ cuộn NGANG trong chính thanh dải; `block: 'nearest'`
   * giữ trang không nhảy dọc khi mục đã nằm trong tầm nhìn theo chiều dọc.
   */
  const activeBandRef = useRef<HTMLElement | null>(null);
  /*
   * CALLBACK ref, không phải object ref: cùng một ref gắn cho cả `<Link>`
   * (`Ref<HTMLAnchorElement>`) và `<button>` (`Ref<HTMLButtonElement>`), mà
   * `RefObject<T>` thì bất biến theo T nên `RefObject<HTMLElement>` không gán
   * được cho cả hai. Hàm nhận tham số RỘNG hơn thì gán được cho cả hai.
   */
  const ghiActiveBand = useCallback((el: HTMLElement | null) => {
    activeBandRef.current = el;
  }, []);
  useEffect(() => {
    // `?.()`: jsdom không hiện thực `scrollIntoView`, nên gọi thẳng là mọi
    // test mount workspace đều nổ ở một hành vi chỉ có ý nghĩa trên trình duyệt.
    activeBandRef.current?.scrollIntoView?.({
      block: 'nearest',
      inline: 'nearest',
    });
  }, [currentBand, bands.length]);

  /**
   * Ngày mà mục "Nhóm" của dải trỏ tới.
   *
   * Đang ĐỨNG ở bảng thì lấy ngày đang xem: mục này khi đó là mục hiện hành,
   * link của nó mà mang ngày khác với thanh địa chỉ thì bấm vào chính mục mình
   * đang đứng lại nhảy về hôm nay.
   * Ở các màn còn lại mới lấy ngày của BẢN đang đọc — mở bảng từ một bản của
   * ngày cũ mà ra bảng hôm nay là vô nghĩa (cùng luật với `openBoard` bên dưới).
   */
  const bandBoardDate =
    (view === 'board' ? boardDate : undefined) ??
    report?.reportDate ??
    boardDate ??
    null;

  /**
   * Đã đủ dữ liệu để KẾT LUẬN về phạm vi của người dùng chưa.
   *
   * `railItems` rỗng có ba nghĩa khác nhau — đang tải, API hỏng, thật sự không
   * thuộc nhóm nào — và chỉ nghĩa thứ ba mới được nói thành lời.
   */
  const isScopeKnown =
    !isLoadingScopes && !isLoading && !isTodayError && !isOutsideError;

  // Deep-link từ thông báo. `focusScopeId` (tổng hợp gửi trưởng nhóm) mở thẳng
  // bảng theo dõi; `focusReportId` (nhắc nộp / mở lại / hỗ trợ) mở thẳng bản.
  // Hai param tiêu thụ ở CÙNG một chỗ, cùng một lượt — tách đôi là param còn
  // lại kéo `view` về chỗ khác ở mọi lần render và khoá người dùng một dải.
  //
  // Effect này CHỈ điều hướng, không còn đặt state nào (`react-hooks/set-state-in-effect`).
  // Giữ nó là đúng chỗ: nó tiêu thụ một param dùng-một-lần của URL rồi đồng bộ
  // với thế giới bên ngoài — `onViewChange` → `router.push`, `onFocusConsumed`
  // xoá param.
  //
  // Hai `setState` từng nằm đây đã đi hai đường khác nhau, đừng kéo chúng về:
  //
  //  - `setOpenedReportId` lên khuôn "state suy từ prop" cạnh `syncedDateParam`.
  //  - `setBoardDate` bị BỎ HẲN, không chuyển đi đâu cả. `onViewChange('board',
  //    scopeId, focusDate)` đã đẩy ngày lên URL thành `?date=` (xem `changeView`
  //    bên `daily-report-route-shell.tsx`), rồi `initialBoardDate` quay xuống và
  //    `syncedDateParam` nhận. Đặt thêm ở đây là dựng nguồn sự thật thứ hai cho
  //    cùng một giá trị. Không mất khung hình nào: `view` và `initialBoardDate`
  //    cùng đến từ URL nên tới CÙNG một lượt render, và bảng chỉ vẽ sau khi
  //    `view` đã là `'board'`.
  //
  // `daily-report-deep-link.test.tsx` chắn cả hai nửa của vòng đi đó.
  useEffect(() => {
    if (focusScopeId) {
      // Chưa biết danh sách nhóm thì CHỜ, đừng ghi một id không kiểm được:
      // `normalizeScopeParam` sau đó sẽ lọc bỏ và âm thầm rơi về nhóm khác,
      // tức trưởng nhóm đọc số liệu của nhóm không phải nhóm trong thông báo.
      if (railItems.length === 0) return;
      if (!railItems.some((i) => i.scopeId === focusScopeId)) {
        // Nhóm trong liên kết không còn thuộc về mình. Nói thẳng bằng cách để
        // màn rơi về bản của mình, thay vì mở bảng của một nhóm khác.
        onViewChange('report');
        onFocusConsumed?.();
        return;
      }
      /* KHÔNG ghim thêm `?scope=` bằng nuqs ở đây: `changeView` đã đặt
         scopeId vào chính đường dẫn đích (`/daily-reports/<scope>/board`), còn
         nuqs ghi param lên PATHNAME HIỆN TẠI nên tranh với `router.push` (xem
         `openBoard`). */
      onViewChange('board', focusScopeId, focusDate);
      onFocusConsumed?.();
    } else if (focusReportId) {
      /* Đã đứng ở màn bản (route chi tiết `/…/reports/:id`, hoặc
         `/daily-reports/today?focusReportId=`) thì KHÔNG điều hướng.
         Bản cũ luôn gọi `onViewChange('report')`, mà shell dịch lời gọi đó
         thành `router.push('/daily-reports/today?scope=…')`: trên route chi
         tiết đó là một route KHÁC, workspace mount lại, bản vừa ghim mất sạch
         và người dùng thấy bản hôm nay của chính mình. Link thông báo, dòng
         Lịch sử và nút "Duyệt" trên bảng nhóm đều rơi vào đó.
         Đứng ở màn khác (link cũ `/…/board?focusReportId=`) thì đi hẳn tới
         route của bản; không xoá param vì trang đang rời đi, và ghi URL bằng
         nuqs cùng lúc với `router.push` là tranh nhau (xem `handleSelectScope`). */
      if (view === 'report') onFocusConsumed?.();
      else if (onOpenReportRoute) onOpenReportRoute(focusReportId);
      else {
        onViewChange('report');
        onFocusConsumed?.();
      }
    }
  }, [
    focusScopeId,
    focusReportId,
    focusDate,
    onFocusConsumed,
    onOpenReportRoute,
    onViewChange,
    railItems,
    view,
  ]);

  /**
   * Đồng bộ `?scope=` theo bản đang mở.
   *
   * Ba lối vào (`focusReportId`, dòng ở màn Lịch sử, thẻ "Bản gần đây") đều chỉ
   * mang `reportId`, không mang `scopeId` — chỉ sau khi bản về mới biết nó
   * thuộc nhóm nào. So sánh trước khi ghi nên không thành vòng lặp render.
   */
  useEffect(() => {
    if (!focusedReport) return;
    /* KHÔNG ghi `?scope=` khi đang đứng ở màn Lịch sử.
     *
     * Lỗi người dùng báo 26/08/2026: ở "Lịch sử của tôi", bấm vào TÊN NHÓM của
     * một dòng thì thanh địa chỉ thành
     * `/daily-reports/history?scope=<id>` và màn không chuyển sang bản báo cáo.
     *
     * Cuộc đua: `ScopeRow` (`daily-report-history.tsx`) in tên nhóm làm nhãn
     * nút, bấm là gọi `onOpenReport(reportId, scopeId)` → `setOpenedReportId`
     * → `focusedReport` có giá trị → effect này chạy. Cùng lúc đó nhánh
     * `onOpenReport` đã gọi `router.push('/daily-reports/today?scope=…')`.
     * nuqs mặc định `history: 'replace'` + `shallow: true`, tức nó ghi `?scope=`
     * lên PATHNAME HIỆN TẠI — `/daily-reports/history` — và bản ghi đó đè lên
     * cú `push` vừa phát. Người dùng ở lại đúng chỗ cũ kèm một param rác.
     *
     * Đây CHÍNH LÀ cái bẫy mà `handleSelectScope` đã né bằng cách không gọi
     * `setScopeParam` ở nhánh `view === 'history'` (xem chú thích ở đó) — chỉ là
     * đường thứ hai này bị bỏ sót. Không mất gì khi bỏ qua: URL đích do
     * `changeView` dựng đã mang sẵn `?scope=`.
     */
    if (view === 'history') return;
    const owner = focusedReport.scope.id;
    if (scopeParam === owner) return;
    // Chỉ ghim nhóm còn thuộc về mình. Bản của nhóm đã lưu trữ vẫn đọc được từ
    // Lịch sử, nhưng nhóm đó không có trong rail nên ghim vào là param rác.
    if (!railItems.some((i) => i.scopeId === owner)) return;
    void setScopeParam(owner);
  }, [focusedReport, scopeParam, railItems, setScopeParam, view]);

  /**
   * Mở bảng của một nhóm: nút ở thẻ bên ("Xem bảng nhóm" / "Xem bảng bộ phận")
   * và nút bảng ở chân bản.
   *
   * KHÔNG ghi `?scope=` bằng nuqs. Lỗi UAT 16/09/2026: bấm hai nút đó không
   * điều hướng. `changeView` đã đưa scopeId vào đường dẫn đích
   * (`/daily-reports/<scope>/board?date=`), trong khi nuqs ghi param lên
   * PATHNAME HIỆN TẠI với `history: 'replace'` — bản ghi đó đáp sau
   * `router.push` và kéo thanh địa chỉ về màn cũ, nên nút nhìn như chết. Cùng
   * cuộc đua đã ghi trong `handleSelectScope` (nhánh `view === 'history'`).
   */
  const openBoard = useCallback(
    (scopeId: string, date?: string) => {
      setBoardDate(date);
      onViewChange('board', scopeId, date);
    },
    [onViewChange],
  );

  /**
   * Bấm một nhóm ở cột trái.
   *
   * Ba việc, thiếu việc nào cũng thành ngõ cụt:
   * - ghim `?scope=` để mọi dải sau đọc chung một nhóm;
   * - nhả bản ngoài hôm nay đang mở, nếu không nó thắng tuyệt đối ở `report`
   *   và bấm nhóm khác sẽ không đổi được nội dung;
   * - lùi về "Bản của tôi" khi nhóm mới không cho xem dải đang đứng. Đang ở
   *   `board` của nhóm mình quản lý rồi bấm sang nhóm chỉ tham gia mà giữ
   *   nguyên `view` là màn hiện khối "Chỉ trưởng nhóm…" trong khi dải ba mục
   *   đã ẩn — không còn nút nào để quay về.
   */
  /**
   * Bấm một dải (Bản của tôi / Cả nhóm / Xu hướng).
   *
   * Nhóm đang xem phải đi CÙNG cú điều hướng: `activeScopeId` suy lại theo
   * `view` khi param còn trống, mà `resolveDefaultScopeId` cho `board`/`summary`
   * lại ưu tiên nhóm mình quản lý — đổi dải mà không nói rõ nhóm là nhảy sang
   * nhóm khác, đúng lỗi mà cả bố cục này sinh ra để xoá. Nó đi bằng tham số
   * thứ hai của `onViewChange`; `changeView` đặt scopeId vào đường dẫn đích,
   * hoặc vào `?scope=` cho dải "Bản của tôi".
   *
   * KHÔNG ghim thêm bằng nuqs, vì bản ghi đó nhắm pathname hiện tại và tranh
   * với `router.push` (xem `openBoard`).
   */
  const handleSelectBand = useCallback(
    (key: Exclude<ReportView, 'history'>) => {
      onViewChange(key, activeScopeId, key === 'board' ? bandBoardDate : null);
    },
    [activeScopeId, bandBoardDate, onViewChange],
  );

  /**
   * Người dùng bấm lùi/tiến ngày (hoặc chọn trong lịch) NGAY TRONG bảng.
   *
   * Phải cập nhật cả hai chỗ, thiếu chỗ nào cũng lệch:
   * - `boardDate`: `useReportBoard` ở trên dùng nó làm queryKey cho chip đếm
   *   "chưa nộp" của mục dải và cho thẻ ngữ cảnh. Giữ ngày cũ là in con số của
   *   ngày khác ngay phía TRÊN bảng của ngày mới, lại tốn thêm một request vì
   *   hai queryKey khác nhau cho cùng một bảng.
   * - `?date=`: để F5, nút Back và link chia sẻ ra đúng ngày đang xem.
   *
   * Bảng vẫn tự giữ ngày của nó và không chờ hàm này trả lời, nên hai chiều
   * không thể kẹt nhau: prop `date` quay xuống bằng đúng giá trị bảng vừa gửi
   * lên, và `setState` cùng giá trị thì React dừng ngay tại đó.
   */
  const handleBoardDateChange = useCallback(
    (day: string) => {
      setBoardDate(day);
      void setBoardDateParam(day);
    },
    [setBoardDateParam],
  );

  const handleSelectScope = useCallback(
    (scopeId: string) => {
      setOpenedReportId(null);
      setIgnoreFocus(true);

      const next = railItems.find((i) => i.scopeId === scopeId);
      const reviewOnly = next ? isReviewOnly(next) : false;
      const canSee = (v: ReportView): boolean =>
        v === 'board' || v === 'pending-review'
          ? (next?.canViewBoard ?? false)
          : v === 'summary'
            ? (next?.canViewGroupData ?? false)
            : v === 'review-groups'
              ? (next?.isManager ?? false)
              : !reviewOnly;
      /* Nhóm mình CHỈ duyệt không có "bản của tôi": bấm vào nó là để duyệt, nên
         đích mặc định là bảng của nhóm, không phải một màn trống. */
      const fallback: ReportView = reviewOnly ? 'board' : 'report';
      // History là màn xuyên nhóm. Khi người dùng chọn một nhóm ở rail,
      // phải quay về report của chính nhóm đó; nếu chỉ đổi `?scope=` thì
      // workspace vẫn giữ view=history và nhìn như click bị lỗi.
      if (view === 'history') {
        // Không gọi setScopeParam ở nhánh này: nuqs và router.push cùng ghi
        // URL sẽ tranh nhau, khiến pathname vừa chuyển sang today bị ghi đè
        // ngược lại thành /history?scope=.... `changeView` đã đưa scope vào
        // URL đích rồi.
        onViewChange(fallback, scopeId);
        return;
      }

      // Board/summary là route động theo `scopeId`. Chỉ cập nhật `?scope=`
      // không đổi được param của pathname, nên UI vẫn đọc dữ liệu nhóm cũ.
      // Điều hướng lại đúng route cũng làm cho nút "Nhóm của tôi" và
      // "Đang tham gia" hoạt động giống nhau ở mọi màn.
      // Nhóm mới không cho xem màn đang đứng thì lùi về màn gần nhất còn xem
      // được: Tổng quan → bảng (người duyệt vẫn có bảng) → bản của mình.
      if (
        view === 'board' ||
        view === 'pending-review' ||
        view === 'summary' ||
        view === 'review-groups'
      ) {
        const target = canSee(view)
          ? view
          : canSee('board')
            ? 'board'
            : fallback;
        onViewChange(
          target,
          scopeId,
          target === 'board' ? (boardDate ?? initialBoardDate ?? null) : null,
        );
        return;
      }

      if (reviewOnly) {
        onViewChange('board', scopeId);
        return;
      }
      /* Đang mở MỘT bản cụ thể (route chi tiết `/…/reports/:id`) thì phải đổi
         route. Chỉ ghi `?scope=` thì nội dung đổi nhưng thanh địa chỉ vẫn trỏ
         bản cũ: F5 hay gửi link là bản cũ quay lại. */
      if (wantedId !== null) {
        onViewChange('report', scopeId);
        return;
      }
      void setScopeParam(scopeId);
    },
    [
      boardDate,
      initialBoardDate,
      railItems,
      view,
      wantedId,
      onViewChange,
      setScopeParam,
    ],
  );

  /* Nút thoát của bốn khối báo quyền (bảng, Tổng quan, Bộ phận, Chờ duyệt).
     Người chỉ THAM GIA nhóm đang xem thì thanh dải mục chỉ còn một mục nên bị
     ẩn hẳn; mở link cũ hay bấm Back vào một màn mình không có quyền là gặp một
     câu từ chối không kèm nút nào (rà giao diện 16/09/2026). Cùng khuôn nút của
     khối "chưa có nhóm" ngay phía trên. */
  const nutVeBanCuaToi = (
    <Button
      variant='outline'
      size='sm'
      className='mt-4'
      onClick={() => onViewChange('report')}
    >
      Về bản của tôi
    </Button>
  );

  return (
    /* Tấm nội dung cao THEO NỘI DUNG, không theo khung hình: trang là thứ
       cuộn, không phải một hộp con bên trong trang. Vì vậy ở đây không còn
       `h-full`, `min-h-0` hay `overflow-hidden` — riêng `overflow-hidden` còn
       phải bỏ vì nó vô hiệu hoá mọi `sticky` nằm bên trong. */
    <div className='flex flex-col rounded-ws-frame border border-ws-line bg-ws-surface'>
      {/* Dải "đang báo cáo thay" đứng TRÊN CÙNG: nó nói về toàn bộ màn, không
          riêng nhóm nào. */}
      {careUser && (
        <div className='flex shrink-0 items-center gap-2 border-b border-ws-line bg-ws-surface-sunken px-5 py-2 text-xs text-ws-ink-soft'>
          <UserCog className='h-3.5 w-3.5 shrink-0' />
          Bạn đang báo cáo thay cho {careUser.fullName}
        </div>
      )}

      {/* Cột nhóm | nội dung nhóm. Dưới 1024px cột nhóm nằm ngang ở trên.
          `lg:items-start` là điều kiện để cột nhóm dính được: mặc định
          `align-items: stretch` kéo nó cao bằng cột nội dung, mà một phần tử
          đã cao bằng cả vùng cuộn thì `sticky` không còn gì để trượt. */}
      <div className='flex flex-col lg:flex-row lg:items-start'>
        {/* Lớp bọc của cột nhóm mang NỀN, VIỀN PHẢI và BO GÓC TRÁI; phần tử
            bên trong mới là thứ dính khi cuộn.
            Tách làm hai vì `position: sticky` và "mảng nền cao hết tấm" không
            thể ở cùng một phần tử: sticky chỉ trượt được khi phần tử thấp hơn
            vùng cuộn của nó, mà một phần tử thấp hơn thì nền của nó cũng dừng
            giữa chừng — đó chính là vệt cắt hai màu ở cột trái. Lớp bọc
            `self-stretch` cao bằng cột nội dung nên màu liền mạch tới đáy. */}
        <div
          className={cn(
            'lg:w-[232px] lg:shrink-0 lg:self-stretch lg:border-r lg:border-ws-line lg:bg-ws-surface-alt',
            /* NHỎ HƠN tấm bao (`ws-frame` 16px), KHÔNG bằng.
               Bán kính TRONG của một hộp có viền phải bằng bán kính ngoài trừ
               độ dày viền. Bo con đúng 16px như cha thì nền của con nhô ra
               khỏi đường cong của viền đúng một pixel — mắt đọc thành góc bị
               nhoè, viền như đứt đoạn. Đây chính là chỗ "góc mờ, không rõ
               border".
               Con số cũ là 15px đặc chế (16 − 1). Thang bán kính không có bậc
               15px, nên lấy bậc GẦN NHẤT còn giữ được luật "trong < ngoài":
               `ws-card` 14px. Lệch 1px so với đường cong của viền, không đủ để
               mắt bắt, mà vẫn không phá hiệu ứng ghép hai khối. Bậc kế trên
               (`ws-frame` 16px) thì tái tạo đúng lỗi đang sửa. */
            'lg:rounded-bl-ws-card',
            /* Góc TRÊN chỉ bo khi cột thật sự chạm đỉnh tấm. Có dải "đang báo
               cáo thay" thì đỉnh cột nằm giữa tấm, bo ở đó là khoét một góc
               tròn vô cớ giữa hai mảng màu. */
            !careUser && 'lg:rounded-tl-ws-card',
          )}
        >
          <DailyReportScopeRail
            items={railItems}
            activeScopeId={activeScopeId}
            isHistoryActive={view === 'history'}
            onSelectScope={handleSelectScope}
            onOpenHistory={() => {
              onViewChange('history');
            }}
            historyHref={historyHref}
            isLoading={isLoadingScopes}
            activeBoard={activeBoard}
            careName={careUser?.fullName}
          />
        </div>

        <div className='flex min-w-0 flex-1 flex-col'>
          {/* Tiêu đề của nhóm đang xem. Giữ nguyên luật tách truncate của bản
              cũ: tên nhóm + ngày được phép cắt, "Khóa lúc HH:mm" thì không —
              gộp làm một là mobile mất hẳn hạn nộp, form không hiện deadline ở
              chỗ nào khác. */}
          <div className='shrink-0 border-b border-ws-line px-4 py-3 md:px-5'>
            <div className='flex items-center gap-2'>
              {/* Hai dòng rồi mới cắt, kèm `title`: tên nhóm dài cắt ở một
                  dòng thì ở 375px chỉ còn vài chữ đầu, và không còn chỗ nào
                  trên màn in đủ tên. `leading-tight` (1.25) vẫn trên ngưỡng
                  1.15 nên dấu tiếng Việt của dòng dưới không bị xén. */}
              <h2
                title={
                  view === 'history' ? undefined : (activeItem?.name ?? undefined)
                }
                className='line-clamp-2 min-w-0 flex-1 break-words text-ws-h2 font-bold leading-tight text-ws-ink'
              >
                {view === 'history'
                  ? 'Lịch sử của tôi'
                  : (activeItem?.name ?? 'Báo cáo hằng ngày')}
              </h2>
              {view !== 'history' &&
                activeScopeId !== null &&
                isManagerOfActive &&
                onOpenScopeConfig && (
                  /* `title=` gốc bị thay bằng Radix Tooltip: thuộc tính native
                     không hiện trên thiết bị cảm ứng, không đổi được kiểu chữ,
                     và không đi qua `ws-scope` nên nó là mảnh giao diện duy
                     nhất của màn không theo hệ màu.
                     `aria-label` PHẢI giữ lại — chú giải không phải là tên của
                     nút, và nút này chỉ có icon. Nay nó mang tên nhóm thật,
                     đúng bằng câu trong chú giải, nên người dùng bàn phím nghe
                     một câu lặp lúc chú giải bật; đó là đánh đổi Radix khuyến
                     nghị cho nút chỉ-icon, đổi lại tên nút luôn đọc được kể cả
                     khi chú giải không bao giờ mở. */
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type='button'
                          onClick={() => onOpenScopeConfig(activeScopeId)}
                          aria-label={
                            'Cấu hình báo cáo của ' +
                            (activeItem?.name ?? 'nhóm này')
                          }
                          /* Cùng khuôn với nút icon của màn Công việc (nút
                             "Việc đã xóa" ở hàng công cụ): 40×40, bo
                             `ws-control` (11px), có viền và nền.
                             Trước đây nút này là 32px và còn CO xuống 28px ở
                             desktop — vừa nhỏ hơn hẳn mọi nút icon khác của
                             màn /tasks, vừa dưới ngưỡng vùng chạm, lại không
                             có viền nên đọc như một icon trang trí chứ không
                             phải nút. */
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-ws-control border border-ws-line bg-ws-surface text-ws-ink-soft transition-colors hover:bg-ws-surface-alt hover:text-ws-ink',
                            FOCUS_RING,
                          )}
                        >
                          <Settings2 className='h-[17px] w-[17px]' />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        className={TOOLTIP_CONTENT_CLASS}
                        style={TOOLTIP_CONTENT_STYLE}
                      >
                        Cấu hình báo cáo của {activeItem?.name ?? 'nhóm này'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              {/* Danh mục KPI — CẶP với nút Cấu hình ngay bên trái, cùng phạm
                  vi (nhóm đang xem) và cùng điều kiện hiện. Đứng sau nút Cấu
                  hình chứ không trước: Cấu hình là thứ trưởng nhóm mở thường
                  xuyên hơn, giữ nó sát tên nhóm.
                  Cổng KHÁC nút Cấu hình đúng một điểm: không đòi
                  `onOpenScopeConfig`, vì modal KPI mount ngay tại đây chứ không
                  đi qua route shell. */}
              {view !== 'history' &&
                activeScopeId !== null &&
                isManagerOfActive && (
                  <BoardKpiManageButton
                    scopeName={activeItem?.name}
                    onOpen={() => {
                      setWasKpiModalOpened(true);
                      setKpiConfigScopeId(activeScopeId);
                    }}
                  />
                )}
            </div>
            <p className='mt-0.5 flex items-center gap-1 text-ws-meta text-ws-ink-soft'>
              {view === 'history' ? (
                <span className='truncate'>Mọi nhóm bạn từng thuộc</span>
              ) : view === 'report' && report && isReviewingOther ? (
                /* Bản của NGƯỜI KHÁC phải nói ra ngay dưới tên nhóm. Thiếu dòng
                   này, màn đọc bản của thành viên trông y hệt màn nộp bản của
                   mình: cùng tiêu đề, cùng bố cục, và người duyệt không có
                   chữ nào cho biết mình đang đọc bản của ai. */
                /* Hai dòng rồi mới cắt: tên đầy đủ ở 375px đã chiếm hết một
                   dòng, cắt ở một dòng là mất luôn NGÀY của bản - thứ duy nhất
                   trên màn nói bản này của hôm nào. */
                <span className='line-clamp-2 min-w-0 break-words'>
                  Bản của{' '}
                  <span className='font-semibold text-ws-ink'>
                    {report.owner.fullName ?? 'thành viên'}
                  </span>{' '}
                  · {formatDateVi(report.reportDate)}
                </span>
              ) : view === 'report' && report ? (
                <span className='min-w-0 truncate'>
                  {formatDateVi(report.reportDate)}
                </span>
              ) : view === 'report' && data ? (
                <span className='truncate'>{formatDateVi(data.date)}</span>
              ) : (
                /* Vai trò ("Bạn là trưởng nhóm này") đã bị bỏ khỏi đây: cột
                   nhóm bên trái vốn tách sẵn hai cụm "Nhóm của tôi" /
                   "Đang tham gia" và còn gắn dấu trưởng nhóm
                   trên từng dòng, nên câu này lặp lần thứ ba cùng một thông tin
                   ngay dưới tên nhóm. Dòng phụ đứng đúng chỗ đó phải trả lời
                   "đang xem NGÀY nào" — cùng câu hỏi với hai nhánh phía trên.
                   Ngày lấy từ `my/today` (`MyTodayResponse.date`), tức là ngày
                   SERVER đang tính theo múi giờ báo cáo. `todayStrVi()` chỉ là
                   lối thoát cuối khi response chưa về hoặc gọi hỏng: đồng hồ
                   máy người dùng lệch múi giờ hay lệch ngày thì dòng này in
                   sai ngày, mà đây là nơi duy nhất trên màn nói "đang xem ngày
                   nào". */
                <span className='truncate'>
                  {formatDateVi(data?.date ?? todayStrVi())}
                </span>
              )}
            </p>
          </div>

          {/* Ba dải của MỘT nhóm. Một mục thì không phải là dải — ẩn hẳn thay vì
              vẽ một ô bấm không dẫn tới đâu. */}
          {view !== 'history' && bands.length > 1 && (
            /* Padding của nav phải TRỪ ĐI padding của nút, nếu không nó cộng
               dồn: nav `px-4` + nút `px-3` đẩy chữ tab vào 28px, trong khi
               tiêu đề nhóm ngay trên đứng ở 16px — hai hàng chữ chồng nhau
               theo chiều dọc mà lệch nhau một khoảng thấy rõ.
               4 + 12 = 16 (khớp `px-4`), 8 + 12 = 20 (khớp `md:px-5`).
               Nền nút khi rê chuột vẫn trải hết vùng chạm 44px vì phần đệm
               nằm bên trong nút, chỉ có mép CHỮ là được kéo về thẳng hàng. */
            <nav
              aria-label='Chế độ xem của nhóm'
              className='flex shrink-0 items-center gap-1 overflow-x-auto border-b border-ws-line px-1 [scrollbar-width:none] md:px-2 [&::-webkit-scrollbar]:hidden'
            >
              {bands.map((band) => {
                const isOn = currentBand === band.key;
                const pending =
                  band.key === 'board' ? (activeBoard?.stats.pending ?? 0) : 0;
                /* Số bản chờ duyệt chỉ đứng trên CHÍNH dải "Chờ duyệt" (UAT
                   16/09/2026 lượt 2): không trên tab "Báo cáo", không trên
                   dải "Nhóm". Xuyên ngày, cùng nguồn với màn đó. */
                const reviewCount =
                  band.key === 'pending-review' ? pendingReviewTotal : 0;
                const href = viewHref?.(
                  band.key,
                  activeScopeId,
                  band.key === 'board' ? bandBoardDate : null,
                );
                const tabClassName = cn(
                  'flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-ws-cell font-semibold transition-colors md:h-9',
                  isOn
                    ? 'border-ws-accent text-ws-ink'
                    : 'border-transparent text-ws-ink-soft hover:text-ws-ink',
                  /* Dải này điều hướng được bằng Tab; không có vòng focus thì
                     người dùng bàn phím mất dấu hoàn toàn giữa ba mục. */
                  FOCUS_RING,
                );
                const tabContent = (
                  <>
                    {band.label}
                    {reviewCount > 0 && (
                      <span
                        aria-label={`${reviewCount} bản chờ duyệt`}
                        className='inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ws-progress-bg px-1 text-ws-nano font-bold tabular-nums text-ws-progress-fg'
                      >
                        {reviewCount}
                      </span>
                    )}
                    {/* Bộ đếm "còn chưa nộp" — dùng `ws-count-*`, KHÔNG dùng
                        `ws-void-*` (màu trạng thái "Đã hủy") như bản trước:
                        mượn màu trạng thái cho một con số là phá luật 1 của
                        docs/features/task-workspace-ui/03-bo-mau.md. */}
                    {pending > 0 && (
                      <span
                        /* Con số một mình không nói được nó đếm gì. Nhãn trợ
                           năng gắn ngay tại chip để trình đọc màn hình phát
                           "Nhóm, 3 người chưa nộp" thay vì "Nhóm 3". */
                        aria-label={`${pending} người chưa nộp`}
                        className='inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ws-count-bg px-1 text-ws-nano font-bold tabular-nums text-ws-count-fg'
                      >
                        {pending}
                      </span>
                    )}
                  </>
                );
                return (
                  /* `band.sub` chuyển từ `title=` sang Radix Tooltip. Thuộc
                     tính native không hiện trên cảm ứng, không hiện khi tới
                     bằng Tab, và trình đọc màn hình đọc nó chồng lên nhãn của
                     mục. Chú giải thì gắn được `aria-describedby` đúng cách. */
                  <TooltipProvider key={band.key} delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {href ? (
                          <Link
                            href={href}
                            ref={isOn ? ghiActiveBand : undefined}
                            aria-current={isOn ? 'true' : undefined}
                            className={tabClassName}
                          >
                            {tabContent}
                          </Link>
                        ) : (
                          <button
                            type='button'
                            ref={isOn ? ghiActiveBand : undefined}
                            onClick={() => handleSelectBand(band.key)}
                            aria-current={isOn ? 'true' : undefined}
                            className={tabClassName}
                          >
                            {tabContent}
                          </button>
                        )}
                      </TooltipTrigger>
                      <TooltipContent
                        className={TOOLTIP_CONTENT_CLASS}
                        style={TOOLTIP_CONTENT_STYLE}
                      >
                        {band.sub}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </nav>
          )}

          {/* Câu mô tả dải đã BỎ hẳn khỏi giao diện.
              Nó từng là một hàng riêng dưới thanh dải, nói rõ mục đang chọn
              cho xem gì. Bỏ vì ba lý do: ba nhãn dải đã tự nói đủ nghĩa; câu
              dài ngắn khác nhau nên mỗi lần đổi dải là cả khối bên dưới nhảy
              chỗ; và nó ăn nguyên một hàng ngay phía trên vùng nội dung, đẩy
              câu hỏi đầu tiên xuống thấp.
              `band.sub` vẫn còn trong `BANDS` và vẫn hiện ra qua chú giải nổi
              của từng mục dải, nên nội dung không mất — chỉ không còn chiếm
              chỗ thường trực. */}

          {/* Không còn scroller riêng ở đây — TRANG là thứ cuộn. Header sticky
              của Board / Summary / History vì thế bám vào viewport, nên chúng
              dính ở `--ws-sticky-top` (mốc dưới thanh Navbar cố định) chứ
              không phải `top-0`.
              Tuyệt đối không thêm `overflow-*` vào lớp bọc nào từ đây trở lên:
              một `overflow` duy nhất ở tổ tiên là đủ để mọi sticky bên trong
              chết im lặng, không báo lỗi gì. */}
          <div className='min-w-0'>
            {/* Thứ tự các nhánh là HỢP ĐỒNG, không phải ngẫu nhiên:
                - `activeScopeId === null` đứng TRƯỚC cổng quyền, nếu không thì
                  trưởng nhóm có nhóm duy nhất đang tạm dừng sẽ bị báo là
                  "không phải trưởng nhóm" — kết luận sai thay người dùng;
                - lỗi đứng TRƯỚC rỗng, nếu không thì API hỏng lại đọc thành
                  "hôm nay bạn không phải nộp". */}
            {view === 'history' ? (
              <DailyReportHistory
                onOpenReport={(id, reportScopeId) => {
                  // Bản cũ → `outsideTodayId` tự bắt và tải riêng theo id.
                  setIgnoreFocus(true);
                  setOpenedReportId(id);
                  if (onOpenReportRoute) onOpenReportRoute(id, reportScopeId);
                  else onViewChange('report');
                }}
                /* `isScopeKnown` chứ không phải `railItems.length === 0` đơn
                       độc: lúc danh sách nhóm còn đang tải thì nó cũng rỗng, mà
                       nói "bạn chưa thuộc nhóm nào" lúc chưa biết gì là kết luận
                       sai thay người dùng. */
                hasNoScopes={isScopeKnown && railItems.length === 0}
                onOpenGroups={onOpenGroups}
                canCreateGroups={canCreateGroups}
              />
            ) : activeScopeId === null && isScopesError ? (
              /* Nhánh LỖI phải đứng trước nhánh spinner ngay dưới, cùng lý do
                 mà `ReportErrorState`, `TodayLoadFailed` và màn Lịch sử đều đã
                 ghi: "chưa biết" và "hỏng" là hai chuyện khác nhau, và chỉ một
                 trong hai có lối thoát.
                 Không gộp vào nhánh spinner: query này tắt refetch tự động, nên
                 `isError` một khi bật thì tự nó không bao giờ tắt — spinner ở
                 đây là quay mãi, không phải quay lâu. Đây là khối DUY NHẤT có
                 nút Thử lại trên đường đi này, vì `activeScopeId === null` chặn
                 mất mọi khối lỗi phía dưới.
                 Câu thứ hai nói rõ đây là lỗi TẢI: người dùng đọc màn trống
                 thành "mình không thuộc nhóm nào" là kết luận sai thay họ. */
              <ReportErrorState
                title='Không tải được danh sách nhóm báo cáo.'
                detail='Đây là lỗi kết nối, chưa biết được bạn đang thuộc nhóm nào.'
                onRetry={() => void refetchScopes()}
              />
            ) : activeScopeId === null && !isScopeKnown ? (
              /* Chưa biết gì thì KHÔNG kết luận. `railItems` rỗng vì đang tải
                 hoặc vì API hỏng cũng cho `activeScopeId === null`, mà nói
                 "bạn không thuộc nhóm nào" lúc đó là kết luận sai thay người
                 dùng — và tệ hơn, nó chặn mất `TodayLoadFailed` bên dưới, khối
                 DUY NHẤT có nút Thử lại (query đã tắt refetch tự động). */
              <ReportLoadingSpinner label='Đang tải danh sách nhóm' />
            ) : activeScopeId === null ? (
              /* Đã biết chắc. Hai lý do khác hẳn nhau, nói đúng từng cái —
                 cũng là chỗ TS thu hẹp `string | null` thành `string` cho prop
                 `scopeId` của Board/Summary, không cast, không dấu `!`. */
              <div className='flex flex-col items-center justify-center px-6 py-16 text-center'>
                <Users className='mb-2 h-8 w-8 text-ws-ink-ghost' />
                {railItems.length === 0 ? (
                  /* Trạng thái ban đầu của người chưa có nhóm nào — không phải
                     lỗi, không phải rỗng do lọc. Phải nói được ba điều: hiện
                     đang thế nào, vì sao, và bước tiếp theo là gì. Trước đây
                     người dùng còn không vào được tới đây vì cả mục Báo cáo bị
                     ẩn khỏi thanh chuyển màn. */
                  <EmptyNoScopesBody
                    onOpenGroups={onOpenGroups}
                    canCreateGroups={canCreateGroups}
                  />
                ) : (
                  /* Hai màn, hai luật: bảng mở cho cả người duyệt phụ, Tổng
                     quan thì chỉ trưởng nhóm. Một câu chung "không quản lý hay
                     duyệt nhóm nào" là nói sai với người duyệt đứng ở Tổng quan. */
                  <>
                    <p className='text-sm text-ws-ink-soft'>
                      {view === 'summary' || view === 'review-groups'
                        ? 'Bạn không quản lý nhóm nào.'
                        : 'Bạn không quản lý hay duyệt nhóm nào.'}
                    </p>
                    <p className='mt-1 text-xs text-ws-ink-faint'>
                      {view === 'review-groups'
                        ? 'Chia bộ phận chỉ dành cho trưởng nhóm. Bản báo cáo của bạn vẫn ở mục bên cạnh.'
                        : view === 'summary'
                          ? 'Tổng quan chỉ dành cho trưởng nhóm. Bản báo cáo của bạn vẫn ở mục bên cạnh.'
                          : 'Mục này dành cho trưởng nhóm và người được giao duyệt. Bản báo cáo của bạn vẫn ở mục bên cạnh.'}
                    </p>
                    <Button
                      variant='outline'
                      size='sm'
                      className='mt-4'
                      onClick={() => onViewChange('report')}
                    >
                      Về bản của tôi
                    </Button>
                  </>
                )}
              </div>
            ) : view === 'board' && !canViewBoardOfActive ? (
              /* Cổng theo TỪNG nhóm. Đây chỉ là giao diện — server vẫn là nơi
                 chặn thật (403), đừng coi cờ này là bảo mật. */
              <ReportCenteredNotice
                icon={Users}
                title='Chỉ trưởng nhóm và người duyệt được xem bảng của nhóm.'
                detail='Bạn đang tham gia nhóm này, không quản lý và không được giao duyệt ai.'
                action={nutVeBanCuaToi}
              />
            ) : view === 'summary' && !canViewGroupDataOfActive ? (
              /* Tổng quan là số liệu của CẢ nhóm, nên hẹp hơn bảng: người duyệt
                 phụ tới được đây (link cũ, gõ tay) thì chỉ cho họ về đúng chỗ
                 làm việc của họ thay vì một câu từ chối trơn. */
              <ReportCenteredNotice
                icon={Users}
                title='Chỉ trưởng nhóm được xem tổng quan của cả nhóm.'
                detail={
                  canViewBoardOfActive
                    ? 'Bạn được giao duyệt một số người trong nhóm này. Bản của họ nằm ở mục "Bộ phận của bạn".'
                    : 'Bạn đang tham gia nhóm này, không quản lý nó.'
                }
                action={
                  canViewBoardOfActive ? (
                    <Button
                      variant='outline'
                      size='sm'
                      className='mt-4'
                      onClick={() => openBoard(activeScopeId)}
                    >
                      Mở các bản bạn duyệt
                    </Button>
                  ) : (
                    nutVeBanCuaToi
                  )
                }
              />
            ) : view === 'review-groups' && !isManagerOfActive ? (
              /* Cổng theo TỪNG nhóm, hẹp hơn cả Tổng quan: server gác
                 `isManager` ở cả bốn route nhóm duyệt, nên kể cả admin nền
                 tảng tới đây cũng chỉ nhận 403. Nói thẳng thay vì để màn dựng
                 một khối lỗi đỏ. */
              <ReportCenteredNotice
                icon={UserCog}
                title='Chỉ trưởng nhóm được chia bộ phận.'
                detail={
                  canViewBoardOfActive
                    ? 'Bạn được giao duyệt một số người trong nhóm này. Bản của họ nằm ở mục "Bộ phận của bạn".'
                    : 'Bạn đang tham gia nhóm này, không quản lý nó.'
                }
                action={
                  canViewBoardOfActive ? (
                    <Button
                      variant='outline'
                      size='sm'
                      className='mt-4'
                      onClick={() => openBoard(activeScopeId)}
                    >
                      Mở các bản bạn duyệt
                    </Button>
                  ) : (
                    nutVeBanCuaToi
                  )
                }
              />
            ) : view === 'pending-review' && !canViewBoardOfActive ? (
              /* Cùng cổng với bảng nhóm: danh sách chờ duyệt là dữ liệu của
                 nhiều người, nên thành viên thường không vào. */
              <ReportCenteredNotice
                icon={Users}
                title='Chỉ trưởng nhóm và người duyệt được xem danh sách chờ duyệt.'
                detail='Bạn đang tham gia nhóm này, không quản lý và không được giao duyệt ai.'
                action={nutVeBanCuaToi}
              />
            ) : view === 'pending-review' ? (
              <DailyReportPendingReview
                scopeId={activeScopeId}
                reportHref={
                  reportHref
                    ? (id) =>
                        `${reportHref(id, activeScopeId)}?from=${PENDING_QUEUE_FROM}`
                    : undefined
                }
              />
            ) : view === 'review-groups' ? (
              <DailyReportReviewGroups
                scopeId={activeScopeId}
                scopeName={activeItem?.name}
              />
            ) : view === 'summary' ? (
              <DailyReportSummary
                scopeId={activeScopeId}
                viewerId={session?.user?.id ?? null}
                onOpenReport={(id) => {
                  setIgnoreFocus(true);
                  setOpenedReportId(id);
                  if (onOpenReportRoute) onOpenReportRoute(id, activeScopeId);
                  else onViewChange('report');
                }}
              />
            ) : view === 'board' ? (
              <DailyReportBoard
                scopeId={activeScopeId}
                date={boardDate}
                onDateChange={handleBoardDateChange}
                reportHref={
                  reportHref
                    ? (id) => reportHref(id, activeScopeId)
                    : undefined
                }
              />
            ) : isLoading || isLoadingOutside ? (
              <ReportLoadingSpinner label='Đang tải báo cáo' />
            ) : isOutsideError ? (
              <FocusNotFound />
            ) : isTodayError && !report ? (
              /* Lỗi phải đứng TRƯỚC nhánh rỗng — lý do đầy đủ ở TodayLoadFailed.
             Kèm `!report` vì bản mở qua deep-link được tải riêng theo id, không
             phụ thuộc `my/today`: danh sách hỏng không được che mất nó. */
              <TodayLoadFailed onRetry={() => void refetchToday()} />
            ) : !report && isReviewOnlyActive ? (
              /* Nhóm mình CHỈ duyệt: không có bản nào để nộp ở đây, và đó KHÔNG
                 phải lỗi hay ngày nghỉ. Phải đứng trước `EmptyToday`: người chỉ
                 làm người duyệt thường có `my/today` rỗng, và khối đó sẽ nói
                 với họ rằng "hôm nay bạn không phải nộp" - đúng chữ nhưng sai
                 việc, vì việc của họ ở đây là duyệt. */
              <ReportCenteredNotice
                icon={ClipboardList}
                /* Không chèn chữ "nhóm" trước tên: tên nhóm thường đã bắt đầu
                   bằng "Nhóm", và câu thành "ở nhóm Nhóm Kinh doanh". */
                title={
                  <>
                    Bạn duyệt báo cáo ở {activeItem?.name ?? 'nhóm này'}, không
                    nộp bản ở đây.
                  </>
                }
                detail='Bản của bạn nằm ở nhóm bạn tham gia. Ở nhóm này bạn đọc và duyệt bản của những người được giao cho bạn.'
                action={
                  <Button
                    variant='outline'
                    size='sm'
                    className='mt-4'
                    onClick={() => openBoard(activeScopeId)}
                  >
                    Mở các bản bạn duyệt
                  </Button>
                }
              />
            ) : reports.length === 0 && !report ? (
              <EmptyToday
                /* Chỉ nhóm đang bật, và chỉ nhóm mình có bản phải nộp. `/my`
                   trả cả nhóm tạm dừng (để màn cấu hình bật lại được) lẫn nhóm
                   mình chỉ đứng ngoài duyệt - ở đây cả hai đều không có nghĩa:
                   tính nhóm chỉ-duyệt vào là nói "bạn thuộc nhóm X, hôm nay
                   nhóm nghỉ" với người chưa bao giờ phải nộp ở X. */
                scopes={(scopes ?? []).filter(
                  (s) => s.isEnabled && s.isMember !== false,
                )}
                emptyReason={data?.emptyReason ?? null}
                onOpenGroups={onOpenGroups}
                canCreateGroups={canCreateGroups}
                onRetry={() => void refetchToday()}
              />
            ) : !report ? (
              /* Nhóm đang chọn hôm nay không có bản. Nói thẳng thay vì để
                 `pickReport` mở bản của nhóm khác — cột trái vẫn sáng nhóm này
                 thì đó là sửa nhầm bản mà không có dấu hiệu gì. */
              <ReportCenteredNotice
                icon={ClipboardList}
                title={
                  <>
                    Hôm nay bạn không có bản báo cáo ở{' '}
                    {activeItem?.name ?? 'nhóm này'}.
                  </>
                }
                detail='Nhóm không báo cáo vào hôm nay, hoặc bạn được thêm vào sau khi bản của ngày đã được tạo.'
                action={
                  <Button
                    variant='outline'
                    size='sm'
                    className='mt-4'
                    onClick={() => onViewChange('history')}
                  >
                    Xem lịch sử của tôi
                  </Button>
                }
              />
            ) : (
              /* Form + cột ngữ cảnh. `key={report.id}` PHẢI ở nguyên trên
                 ReportForm và không được bọc thêm một lớp mang key khác: bỏ key
                 thì nội dung bản cũ rò sang bản mới, thêm key thừa thì mỗi lần
                 remount lại bắn một request lưu nháp. */
              <div className='flex flex-col gap-4 p-4 md:p-5 xl:flex-row xl:items-start'>
                <div className='min-w-0 flex-1'>
                  <ReportForm
                    key={report.id}
                    report={report}
                    isOwnReport={!isReviewingOther}
                    canViewBoard={canViewBoardOfActive}
                    boardLabel={
                      canViewGroupDataOfActive
                        ? 'Bảng nhóm'
                        : REVIEWER_BOARD_BAND.label
                    }
                    nextReviewHref={nextReviewHref}
                    onOpenTask={onOpenTask}
                    // Bảng phải theo ngày của CHÍNH bản đang xem, không phải hôm
                    // nay — bản ngoài hôm nay mở ra bảng hôm nay là vô nghĩa.
                    onOpenBoard={() =>
                      openBoard(report.scope.id, report.reportDate)
                    }
                  />
                </div>
                <DailyReportTodaySide
                  scopeId={report.scope.id}
                  marks={report.scope}
                  canViewBoard={canViewBoardOfActive}
                  board={activeBoard}
                  reportId={report.id}
                  otherOwner={isReviewingOther ? report.owner : null}
                  onOpenBoard={() =>
                    openBoard(report.scope.id, report.reportDate)
                  }
                  onOpenHistory={() => onViewChange('history')}
                  onOpenReport={(id) => {
                    setIgnoreFocus(true);
                    setOpenedReportId(id);
                    if (onOpenReportRoute)
                      onOpenReportRoute(id, report.scope.id);
                    else onViewChange('report');
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danh mục KPI — mount ở gốc workspace, ngang hàng với vùng nội dung chứ
          không lồng trong nó; `ResponsiveModal` tự lo phần portal.
          `scopeName` lấy từ `activeItem` (cột nhóm) chứ không từ `data` của
          bảng như bản cũ: nút nay mở được ở cả màn `report` và `summary`, hai
          màn KHÔNG mount `DailyReportBoard` nên `data` ở đó không tồn tại. */}
      {wasKpiModalOpened && (
        <DailyReportKpiModal
          scopeId={kpiConfigScopeId}
          scopeName={activeItem?.name}
          isOpen={Boolean(kpiConfigScopeId)}
          onClose={() => setKpiConfigScopeId(null)}
        />
      )}
    </div>
  );
}

/**
 * Bọc `memo` vì shell render lại vì những thứ KHÔNG liên quan tới không gian
 * Báo cáo: mở hộp thoại "Nhóm giao việc", đổi `?taskId=`, mở cấu hình nhóm, và
 * bốn truy vấn của shell lần lượt trả về. Không có `memo` thì mỗi lượt đó kéo
 * theo cả `ReportForm` (bốn ô nhập tự đo chiều cao), cột nhóm và cột ngữ cảnh
 * render lại, dù không prop nào của chúng đổi giá trị.
 *
 * HỢP ĐỒNG đi kèm: mọi prop dạng HÀM mà shell truyền xuống phải ổn định về định
 * danh — hiện đều là `useCallback` hoặc chính hàm `setState`. Truyền một
 * lambda viết thẳng trong JSX vào đây là `memo` mất tác dụng hoàn toàn, im lặng,
 * không có gì báo. `daily-report-route-shell.tsx` giữ đúng hợp đồng đó.
 */
export const DailyReportWorkspace = memo(DailyReportWorkspaceBase);
