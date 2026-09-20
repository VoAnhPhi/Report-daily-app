'use client';

import { Navbar } from '@/components/sites/home/navbar';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  useMyTaskCounts,
  useTask,
  useSharedAssignees,
} from '@/hooks/queries/task-queries';
import { TaskDetailModal } from '@/components/tasks/task-detail-modal';
import { TaskBoard } from '@/components/tasks/task-board';
import { TaskSheetView } from '@/components/tasks/task-sheet-view';
import { CreateTaskModal } from '@/components/tasks/create-task-modal';
import { CreateTaskSelectionModal } from '@/components/tasks/create-task-selection-modal';
import { CreateBusinessModal } from '@/components/tasks/create-business-modal';
import { SelectPartnerModal } from '@/components/tasks/select-partner-modal';
import { PartnerSidebar } from '@/components/tasks/partner-sidebar';
import { MainAssigneeSidebar } from '@/components/tasks/main-assignee-sidebar';
import {
  CaregiverProvider,
  useCaregiver,
} from '@/contexts/caregiver-context';
import { CaregiverSwitcher } from '@/components/tasks/caregiver-switcher';
import { TaskGroupModal } from '@/components/tasks/task-group-modal';
import { useLegacyReportRedirect } from '@/components/tasks/use-legacy-report-redirect';
import { reportTabState } from '@/components/daily-report/daily-report-utils';
import {
  SEGMENT_CLASS,
  SEGMENT_OFF_CLASS,
  SEGMENT_ON_CLASS,
  SEGMENT_TRACK_CLASS,
  WorkspaceSectionTabs,
} from '@/components/workspace/workspace-section-tabs';
import {
  TaskFilterBar,
  EMPTY_TASK_FILTERS,
  type TaskFilters,
} from '@/components/tasks/task-filter-bar';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Building2,
  ChevronDown,
  LayoutGrid,
  Rows3,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { DeletedTasksModal } from '@/components/tasks/deleted-tasks-modal';
import { createNhanVienNhanApis } from '@/app/api/nhan-vien-nhan';
import { NhanPanel } from '@/components/tasks/nhan-vien-nhan/nhan-panel';
import { ActaAiIcon } from '@/components/tasks/nhan-vien-nhan/acta-ai-icon';
import { isSuperAdmin } from '@/lib/permission-rbac';
import { useMyBusinessForms } from '@/hooks/queries/business-forms/business-forms-queries';
import {
  useMyReportScopes,
  useMyTodayReports,
  useReportPendingCount,
} from '@/hooks/queries/daily-report-queries';
import { TaskAssignmentStatus, TaskType } from '@/types/task.type';
import type { NhanViecKeoTha } from '@/types/nhan-vien-nhan.type';
import { Role } from '@/types/user.type';
import { useAuthPermissions } from '@/hooks/auth/use-auth-permissions';
import {
  TASK_TABS,
  type TaskTab,
  dayStartIso,
  dayEndIso,
} from '@/components/tasks/task-utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryState, parseAsStringEnum, parseAsString } from 'nuqs';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const VIEW_MODES = ['board', 'list'] as const;
type ViewMode = (typeof VIEW_MODES)[number];

/**
 * Hai màn lớn — Công việc và Báo cáo — chuyển bằng cụm segmented trên hàng tiêu
 * đề. Trước đây là một cột điều hướng 260px thường trực phục vụ đúng hai link
 * sống; cụm segmented làm cùng việc mà không ăn một pixel bề ngang nào của bảng.
 *
 * Bốn giá trị `report | history | board | summary` đều thuộc màn Báo cáo, chọn
 * bằng dải phẳng trong băng tiêu đề của tấm nội dung. Giữ chúng trong CÙNG một
 * tham số `?section=` thay vì thêm query thứ hai để link sâu đã gửi đi
 * (`?section=board` trong tài liệu và thông báo) không hỏng.
 */
const WORKSPACE_SECTIONS = [
  'tasks',
  'report',
  'history',
  'board',
  'summary',
] as const;
type WorkspaceSection = (typeof WORKSPACE_SECTIONS)[number];

/** Bốn giá trị sau `tasks` đều là màn con của Báo cáo — xem `ReportView`. */
const isReportSection = (s: WorkspaceSection) => s !== 'tasks';

// className dùng chung cho 5 nút tab (tách ra để khỏi lặp chuỗi dài 5 lần).
// `flex-none`: tab giữ bề ngang theo nhãn của nó và dải tab CUỘN NGANG khi hết
// chỗ (`w-max` + `overflow-x-auto` ở khối bọc). Chia đều bề ngang thì với năm
// tab trên điện thoại, mỗi nhãn chỉ còn vài chục pixel và bị cắt cụt.
// Tab gạch chân, không phải viên thuốc. Gạch dưới dùng màu nhấn — đây là một
// trong số ít chỗ màu lục được phép xuất hiện.
const TAB_TRIGGER_CLASS =
  'relative h-full min-h-10 flex-none rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 text-sm font-medium text-ws-ink-faint hover:text-ws-ink-soft transition-none data-[state=active]:border-ws-accent data-[state=active]:text-ws-ink data-[state=active]:bg-transparent data-[state=active]:shadow-none whitespace-nowrap';

/**
 * Khoá của bộ đếm mà máy chủ THẬT SỰ trả về (`GET /tasks/my-tasks/counts`).
 *
 * Suy thẳng từ kiểu trả về của hook thay vì chép tay bốn chuỗi: hôm nào máy chủ
 * đếm thêm một loại việc nữa thì kiểu này tự nới ra, còn chép tay thì hai bên
 * âm thầm trôi lệch và không cổng nào bắt được.
 */
type TaskCountKey = keyof NonNullable<
  ReturnType<typeof useMyTaskCounts>['data']
>;

// Cấu hình 5 tab: nhãn mobile/desktop. Việc chờ xác nhận tách hẳn ra tab riêng
// (khoá `sharedPending` trùng khoá đếm nên badge tự chạy), tab "Chung" chỉ còn việc đã tham gia.
//
// Tab "Nội bộ" là tab thứ năm, thêm sau một sự cố có thật — việc `CV260825004`:
// trợ lý tạo một việc loại `admin_internal` giao cho một nhân sự, người đó nhận
// được thông báo nhưng vào màn này thì KHÔNG tab nào lọc loại ấy nên việc biến
// mất khỏi tầm mắt chính chủ, còn ô tìm kiếm chỉ chạy trong phạm vi tab đang mở
// nên tìm cũng không ra. Lý do đầy đủ nằm ở chú thích của `TASK_TABS` trong
// `components/tasks/task-utils.ts`.
//
// Tab mới hiện với MỌI người dùng, kể cả ai chưa từng có việc nội bộ. Đó là chủ
// ý: các tab khác cũng đứng đó với số 0. Đừng dựng thêm cơ chế ẩn/hiện theo
// quyền — phạm vi truy vấn ở máy chủ đã giới hạn theo người dùng rồi, thêm một
// lớp ẩn nữa chỉ đẻ ra đúng loại lỗi vừa phải đi sửa: "tôi không thấy việc của
// tôi", mà lần sau còn khó truy hơn vì màn hình trông hoàn toàn bình thường.
//
// `countKey` tách khỏi `value` vì máy chủ hiện CHƯA đếm việc nội bộ. Để tab mới
// trỏ thẳng vào bộ đếm bằng chính `value` thì hoặc vỡ kiểu, hoặc phải chèn một
// phép ép kiểu che mất chuyện thiếu. Không có `countKey` thì `TabCount` tự trả
// null — tab vẫn hiện đầy đủ, chỉ chưa có chip số cho tới khi máy chủ trả thêm
// khoá; lúc đó chỉ việc điền `countKey` vào đây.
const TASK_TAB_META: {
  value: TaskTab;
  shortLabel: string;
  label: string;
  countKey?: TaskCountKey;
}[] = [
  {
    value: 'personal',
    shortLabel: 'Cá nhân',
    label: 'Việc cá nhân',
    countKey: 'personal',
  },
  {
    value: 'partner',
    shortLabel: 'Đối tác',
    label: 'Việc đối tác',
    countKey: 'partner',
  },
  { value: 'adminInternal', shortLabel: 'Nội bộ', label: 'Việc nội bộ' },
  {
    value: 'shared',
    shortLabel: 'Chung',
    label: 'Việc chung',
    countKey: 'shared',
  },
  {
    value: 'sharedPending',
    shortLabel: 'Chờ',
    label: 'Việc chờ tham gia',
    countKey: 'sharedPending',
  },
];

function TabCount({
  count,
  urgent,
  active,
}: {
  count?: number;
  /** Tô đỏ khi còn việc chờ xác nhận (tab "Chờ tham gia"). */
  urgent?: boolean;
  active?: boolean;
}) {
  if (count == null) return null;
  return (
    <span className='ml-1.5 inline-flex items-center gap-0.5 align-middle md:ml-2 md:gap-1'>
      <span
        title={urgent && count > 0 ? `${count} việc chưa xác nhận` : undefined}
        className={cn(
          'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none tabular-nums transition-colors md:h-[22px] md:min-w-[22px] md:px-1.5 md:text-[12px]',
          /* Ba tông, ba nghĩa khác nhau — xem `ws-count-*` trong globals.css:
             cần chú ý = `ws-danger`, đang xem = bộ đếm vàng đất, còn lại =
             trung tính. KHÔNG dùng `ws-void-*` như bản trước: đó là màu của
             trạng thái "Đã hủy", mượn sang nghĩa "chờ xác nhận" là phá luật 1
             của docs/features/task-workspace-ui/03-bo-mau.md. */
          urgent && count > 0
            ? 'bg-ws-danger text-white'
            : active
              ? 'bg-ws-count-bg text-ws-count-fg'
              : 'bg-ws-surface-alt text-ws-ink-soft',
        )}
      >
        {count}
      </span>
    </span>
  );
}

// Provider bọc NGOÀI phần thân để mọi hook (useMyTasks…) trong thân đọc được
// ngữ cảnh làm thay. Bọc trong JSX return sẽ không kịp cho các hook chạy trước đó.
export function TasksRouteShell() {
  return (
    <CaregiverProvider>
      <TasksPageInner />
    </CaregiverProvider>
  );
}

function TasksPageInner() {
  const { data: session, status } = useSession();
  const { hasRole, isLoadingPermissions } = useAuthPermissions();
  const { careUser } = useCaregiver();
  // Làm thay: chỉ được thao tác việc đối tác → ẩn các tab khác, ép tab partner.
  const isCareMode = !!careUser;
  const router = useRouter();
  useEffect(() => {
    if (status === 'unauthenticated') {
      // Giữ nguyên query (vd: focusTaskId của link chia sẻ) để sau đăng nhập mở lại đúng việc.
      const back = `/tasks${typeof window !== 'undefined' ? window.location.search : ''}`;
      router.replace(`/login?callbackUrl=${encodeURIComponent(back)}`);
    }
  }, [status, router]);
  const [activeTab, setActiveTab] = useQueryState(
    'tab',
    parseAsStringEnum<TaskTab>([...TASK_TABS]).withDefault('personal'),
  );
  const [viewParam, setViewMode] = useQueryState(
    'view',
    parseAsStringEnum<ViewMode>([...VIEW_MODES]),
  );
  const [section, setSection] = useQueryState(
    'section',
    parseAsStringEnum<WorkspaceSection>([...WORKSPACE_SECTIONS]).withDefault(
      'tasks',
    ),
  );
  // Giữ các URL cũ `/tasks?section=…` của Báo cáo hằng ngày còn sống. Là code
  // chết CÓ HẠN — điều kiện và cách xoá ghi trong chính file hook.
  useLegacyReportRedirect(section);
  const isMobile = useIsMobile();
  const viewMode: ViewMode = viewParam ?? (isMobile ? 'list' : 'board');
  const [selectedPartnerId, setSelectedPartnerId] = useState<
    string | undefined
  >();
  const [isMobilePartnerListOpen, setIsMobilePartnerListOpen] = useState(false);
  // Lọc theo người phụ trách chính — áp ở tab "việc chung" và "chờ tham gia", lọc ở backend.
  const [selectedMainAssigneeId, setSelectedMainAssigneeId] = useState<
    string | undefined
  >();
  const [isMobileAssigneeListOpen, setIsMobileAssigneeListOpen] =
    useState(false);
  const { data: partnerData } = useMyBusinessForms({
    limit: 100,
    onBehalfOfUserId: careUser?.id,
  });
  const selectedPartner = partnerData?.data?.find(
    (p) => p.id === selectedPartnerId,
  );

  // Bộ lọc dùng chung cho cả 3 tab. Search được debounce để tránh gọi API mỗi ký tự.
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_TASK_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(
      () => setDebouncedSearch(filters.search.trim()),
      400,
    );
    return () => clearTimeout(handler);
  }, [filters.search]);

  // Phần lọc dùng chung (search + trạng thái + khoảng ngày) áp cho mọi tab.
  const sharedFilterQuery = {
    search: debouncedSearch || undefined,
    category: filters.category,
    priority: filters.priority,
    createdByAdmin: filters.createdByAdmin,
    startFrom: dayStartIso(filters.startFrom),
    startTo: dayEndIso(filters.startTo),
    dueFrom: dayStartIso(filters.dueFrom),
    dueTo: dayEndIso(filters.dueTo),
  };

  // Prepare query based on active tab
  const getTaskQuery = () => {
    if (activeTab === 'personal')
      return { type: TaskType.PERSONAL, ...sharedFilterQuery };
    if (activeTab === 'partner') {
      return {
        type: TaskType.PARTNER_TASK,
        businessFormId: selectedPartnerId,
        ...sharedFilterQuery,
      };
    }
    /* Cùng khuôn với nhánh `personal`: chỉ lọc theo LOẠI, không kèm cờ `shared`.
       Bỏ `shared` đi là có chủ ý — phạm vi mặc định ở máy chủ là "việc tôi phụ
       trách chính hoặc hồ sơ của tôi", đúng chỗ mà việc trợ lý giao rơi vào
       (`mainAssigneeId`). Thêm `shared: true` vào đây thì lại đổi sang phạm vi
       "người liên quan" và việc tiếp tục biến mất, tức sửa xong vẫn y như cũ. */
    if (activeTab === 'adminInternal')
      return { type: TaskType.ADMIN_INTERNAL, ...sharedFilterQuery };
    if (activeTab === 'shared')
      return {
        shared: true,
        assignmentStatus: TaskAssignmentStatus.ACCEPTED,
        mainAssigneeId: selectedMainAssigneeId,
        ...sharedFilterQuery,
      };
    if (activeTab === 'sharedPending')
      return {
        shared: true,
        assignmentStatus: TaskAssignmentStatus.PENDING,
        mainAssigneeId: selectedMainAssigneeId,
        ...sharedFilterQuery,
      };
    return undefined;
  };

  // Danh sách việc do TaskBoard/TaskSheetView tự tải theo TỪNG cột status
  // (infinite scroll — giảm tải, không load hết 1 lần). Ở đây chỉ dựng query nền.

  // Hai tab việc chung / chờ tham gia đều có bộ lọc người phụ trách. Danh sách
  // người khác nhau theo trạng thái tham gia (đã nhận vs đang chờ) nên truyền
  // `status` để backend trả đúng tập. Lấy từ API (ổn định, không đổi theo bộ
  // lọc tạm); filter chạy ở backend qua query `mainAssigneeId`.
  const isSharedTab = activeTab === 'shared' || activeTab === 'sharedPending';
  const { data: mainAssignees = [] } = useSharedAssignees(
    isSharedTab,
    activeTab === 'sharedPending'
      ? TaskAssignmentStatus.PENDING
      : TaskAssignmentStatus.ACCEPTED,
  );

  /*
   * Hai khối dưới đây đặt lại bộ lọc NGAY TRONG render theo khuôn "điều chỉnh
   * state khi prop/state nguồn đổi" của React: giữ giá trị lượt trước trong
   * state, so sánh khi render, khác thì `setState` tại chỗ. React render lại
   * trước khi vẽ nên không nháy hình.
   *
   * Trước đây cả hai là `useEffect`. Effect chạy SAU khi commit, nên khi chuyển
   * qua lại giữa hai tab Việc chung / Chờ tham gia — hai tab DUY NHẤT có
   * `mainAssigneeId` trong `getTaskQuery()` — lượt vẽ đầu tiên của tab mới vẫn
   * mang người phụ trách của tab cũ và kịp bắn một lượt gọi API sai trước khi
   * effect dọn. Làm trong render thì lượt gọi thừa đó không bao giờ tồn tại.
   */

  // Đổi tab thì bỏ chọn: hai tab shared có tập người phụ trách khác nhau, giữ
  // lại dễ ra kết quả rỗng.
  const [prevTab, setPrevTab] = useState(activeTab);
  if (prevTab !== activeTab) {
    setPrevTab(activeTab);
    setSelectedMainAssigneeId(undefined);
  }

  // Đổi/thoát người được chăm: bỏ các bộ lọc phụ (đối tác/phụ trách của ngữ cảnh
  // cũ) để tránh lẫn. KHÔNG đụng focusTaskId (deep-link chia sẻ).
  const [prevCareUserId, setPrevCareUserId] = useState(careUser?.id);
  if (prevCareUserId !== careUser?.id) {
    setPrevCareUserId(careUser?.id);
    setSelectedPartnerId(undefined);
    setSelectedMainAssigneeId(undefined);
    setFilters(EMPTY_TASK_FILTERS);
  }

  // Làm thay chỉ còn tab đối tác → nếu đang ở tab khác thì kéo về partner.
  useEffect(() => {
    if (isCareMode && activeTab !== 'partner') setActiveTab('partner');
  }, [isCareMode, activeTab, setActiveTab]);

  const selectedMainAssignee = mainAssignees.find(
    (a) => a.id === selectedMainAssigneeId,
  );

  /**
   * Có bộ lọc nào đang bật không — quyết định câu trạng thái rỗng ("chưa có
   * việc" vs "bộ lọc không khớp") và chấm "Đã lọc" cạnh bộ đếm cột. Không tính
   * `activeTab` vì tab là điều hướng, không phải bộ lọc.
   */
  const hasActiveFilter =
    debouncedSearch.length > 0 ||
    filters.category !== undefined ||
    filters.priority !== undefined ||
    filters.createdByAdmin !== undefined ||
    filters.startFrom !== undefined ||
    filters.startTo !== undefined ||
    filters.dueFrom !== undefined ||
    filters.dueTo !== undefined ||
    (activeTab === 'partner' && !!selectedPartnerId) ||
    (isSharedTab && !!selectedMainAssigneeId);

  /**
   * Cột lọc phụ chỉ có nghĩa ở ba tab này — hai khối bên trong tự trả về null ở
   * các tab còn lại, nên nếu cứ chừa chỗ thì đó là 248px trống hoàn toàn.
   */
  const showFilterColumn = activeTab === 'partner' || isSharedTab;

  /** Xoá mọi bộ lọc kể cả hai bộ lọc phụ ở cột trái. */
  const handleClearAllFilters = () => {
    setFilters(EMPTY_TASK_FILTERS);
    setSelectedPartnerId(undefined);
    setSelectedMainAssigneeId(undefined);
  };

  // Badge count number task
  const { data: taskCounts } = useMyTaskCounts();

  // Mở popup chi tiết việc khi mở từ thông báo HOẶC từ link chia sẻ nội bộ
  // (?focusTaskId=<id>). useTask gọi GET /tasks/:id; backend chặn bằng hasTaskAccess.
  const [focusTaskId, setFocusTaskId] = useQueryState(
    'focusTaskId',
    parseAsString,
  );
  const { data: focusTask, error: focusTaskError } = useTask(focusTaskId || '');

  // Không có quyền xem (chia sẻ nội bộ): backend trả 403 → báo và đóng deep-link,
  // không mở popup, không thêm mình vào việc.
  useEffect(() => {
    if (!focusTaskId) return;
    if (
      (focusTaskError as { statusCode?: number } | null)?.statusCode === 403
    ) {
      toast.error('Bạn không có quyền xem công việc này');
      setFocusTaskId(null);
    }
  }, [focusTaskId, focusTaskError, setFocusTaskId]);

  /**
   * Deep-link từ thông báo Báo cáo hằng ngày. Server sinh hai dạng link:
   * `?focusReportId=<id>` (nhắc nộp / mở lại / hỗ trợ) và `?focusScopeId=<id>`
   * (tổng hợp gửi trưởng nhóm → mở thẳng bảng theo dõi).
   *
   * Chỉ đọc, KHÔNG có setter: hai giá trị này giờ chỉ phục vụ một việc — quyết
   * `section` để `useEffect` điều hướng phía trên biết đưa người dùng tới route
   * `/daily-reports/*` nào. Xoá chúng là link cũ ở lại `/tasks` trống, vì lúc
   * đó `section` giữ mặc định `'tasks'` và effect điều hướng return sớm.
   *
   * `?focusDate=` và `?date=` KHÔNG cần state: effect điều hướng đọc thẳng
   * chúng từ `window.location.search` rồi chuyển tiếp sang URL đích.
   */
  const [focusReportId] = useQueryState('focusReportId', parseAsString);
  const [focusScopeId] = useQueryState('focusScopeId', parseAsString);

  const { data: reportScopes } = useMyReportScopes();
  const { data: todayReports } = useMyTodayReports();
  const { data: reportPending } = useReportPendingCount();
  const isAdminUser =
    session?.user?.role === Role.ADMIN ||
    hasRole('super_admin') ||
    hasRole('SUPER_ADMIN');
  const hasActiveReportScope =
    reportScopes?.some((scope) => scope.isEnabled) ?? false;
  // Keep the tab visible while the membership query is loading to avoid a
  // flicker. Once it resolves, regular users need an enabled report group;
  // admins keep access for administration even without a membership.
  const canShowReportTab =
    isAdminUser ||
    reportScopes === undefined ||
    isLoadingPermissions ||
    hasActiveReportScope;
  const reportTab = reportTabState(reportScopes, reportPending, todayReports);
  /* Page KHÔNG còn tự tính nhóm đang xem: lối vào cấu hình đã chuyển vào
     `DailyReportWorkspace`, nơi biết chính xác scope nào đang mở và tự tính
     quyền theo scope đó. Giữ lại phép tính ở đây là hai nguồn sự thật cho cùng
     một câu hỏi, sớm muộn cũng trôi lệch. */

  useEffect(() => {
    if (!canShowReportTab) {
      if (isReportSection(section)) void setSection('tasks');
      return;
    }

    if (focusScopeId) {
      void setSection('board');
    } else if (focusReportId) {
      void setSection('report');
    }
  }, [canShowReportTab, focusReportId, focusScopeId, section, setSection]);

  // Thùng rác: mở popup riêng liệt kê việc đã xóa, click 1 việc → popup chi tiết (có nút khôi phục).
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  /** Trình quản lý nhóm giao việc — lối vào cấu hình báo cáo. */
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [isSelectPartnerModalOpen, setIsSelectPartnerModalOpen] =
    useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateBusinessModalOpen, setIsCreateBusinessModalOpen] =
    useState(false);
  const [targetBusinessFormId, setTargetBusinessFormId] = useState<
    string | undefined
  >();
  const [createTaskType, setCreateTaskType] = useState<TaskType | undefined>();

  /**
   * Nhân viên Nhàn — trợ lý AI, CHỈ super admin thấy nút. Cổng thật nằm ở máy
   * chủ (`@Roles('admin')` trên mọi route của module), nên chỗ này chỉ là ẩn
   * một lối vào vô dụng chứ không phải lớp bảo vệ.
   */
  const laSuperAdmin = isSuperAdmin(session?.user?.role);
  const [moTroLy, setMoTroLy] = useState(false);

  /**
   * Kéo một thẻ việc từ bảng sang khung chat để nhắc tới nó.
   *
   * ⚠ Vì sao ba mẩu trạng thái rời rạc chứ không phải một `Droppable` cho xong:
   * bảng dùng `@hello-pangea/dnd`, và `DragDropContext` của nó nằm BÊN TRONG
   * `TaskBoard`. Một `Droppable` chỉ ghép được với context bao quanh nó, nên
   * ngăn kéo trợ lý — vốn là anh em cùng hàng flex với vùng bảng — không thể là
   * ô thả thật nếu không nhấc context lên đây. Đã cân nhắc và KHÔNG làm: hàm
   * `onDragEnd` hiện tại gánh cả luồng đổi trạng thái việc (nhánh riêng cho cột
   * "Hoàn thành" đòi bằng chứng, nhánh cùng-cột hiện gợi ý), và làm hỏng nó là
   * hỏng thao tác chính của cả màn để đổi lấy một lối tắt.
   *
   * Cách đang dùng, đọc từ trên xuống:
   *  1. bảng báo "đang kéo việc này" (`onKeoThe`) → `viecDangKeo` bật vùng thả;
   *  2. ngăn kéo tự theo dõi con trỏ và báo ngược "con trỏ đang ở trong vùng
   *     thả hay không" → ghi vào một ref (ref chứ không state: nó chỉ được đọc
   *     đúng một lần, ngay trong sự kiện thả, và đổi mỗi khung hình);
   *  3. bảng báo "đã thả ra ngoài mọi cột" (`onThaNgoaiBang`) → chỉ khi đó mới
   *     hỏi tới ref, nên một cú thả không bao giờ vừa đổi trạng thái việc vừa
   *     chèn phần nhắc;
   *  4. `viecThaVaoTroLy` đi xuống ô soạn, ô soạn chèn xong thì gọi
   *     `daChenViecKeo` để xoá — nếu không, ô soạn dựng lại (đổi khổ màn) sẽ
   *     chèn lặp một phần nhắc mà người dùng không hề kéo lại.
   */
  const [viecDangKeo, setViecDangKeo] = useState<NhanViecKeoTha | null>(null);
  const [viecThaVaoTroLy, setViecThaVaoTroLy] =
    useState<NhanViecKeoTha | null>(null);
  const conTroTrongVungThaRef = useRef(false);

  const ghiConTroTrongVungTha = useCallback((trong: boolean) => {
    conTroTrongVungThaRef.current = trong;
  }, []);

  const batDauKeoThe = (viec: NhanViecKeoTha | null) => {
    // Cú kéo mới thì kết quả đo của cú trước không còn nghĩa gì — xoá ngay,
    // đừng đợi ngăn kéo dọn hộ.
    if (viec) conTroTrongVungThaRef.current = false;
    setViecDangKeo(viec);
  };

  const thaNgoaiBang = (viec: NhanViecKeoTha) => {
    if (!conTroTrongVungThaRef.current) return;
    setViecThaVaoTroLy(viec);
  };

  const daChenViecKeo = useCallback(() => setViecThaVaoTroLy(null), []);

  /**
   * Trợ lý nhắc công việc bằng MÃ (CV260625010) vì đó là thứ nó viết ra trong
   * câu trả lời, còn liên kết sâu sẵn có của màn này lại nhận ID. Đổi mã sang
   * id bằng chính điểm cuối gợi ý `@`, rồi tái dùng `?focusTaskId=` — không
   * dựng một cơ chế mở việc thứ hai song song.
   */
  const moViecTheoMa = async (code: string) => {
    const token = session?.accessToken;
    if (!token) {
      // KHÔNG thoát câm. Người dùng vừa bấm một chip mã việc rồi không thấy gì
      // xảy ra thì đọc ra là "nút chết", và họ sẽ bấm lại nhiều lần trước khi
      // báo lỗi. Nhánh này chỉ chạy khi phiên đăng nhập hỏng giữa chừng — hiếm,
      // nhưng im lặng đúng lúc hiếm mới là thứ khó truy nhất.
      toast.error('Phiên đăng nhập đã hết hạn, hãy tải lại trang rồi thử lại');
      return;
    }
    try {
      const kq = await createNhanVienNhanApis({
        accessToken: token,
        user: session?.user,
      }).get.searchMentions(code, 5);
      // KHÔNG lấy `kq.tasks[0]` khi mã không khớp: điểm cuối gợi ý tìm cả theo
      // tiêu đề, nên một mã sai sẽ trả về một việc khác và mở nhầm hồ sơ.
      const viec = kq.tasks.find((t) => t.code === code);
      if (!viec) {
        toast.error(`Không tìm thấy công việc ${code}`);
        return;
      }
      void setFocusTaskId(viec.id);
      void setSection('tasks');
    } catch {
      toast.error('Không mở được công việc');
    }
  };

  const handlePartnerSelect = (id?: string) => {
    setSelectedPartnerId(id);
    if (id && activeTab !== 'partner') {
      setActiveTab('partner');
    }
  };

  const handleAddTaskClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    // Làm thay chỉ tạo được việc đối tác → mở thẳng bước chọn đối tác,
    // bỏ popup chọn cá nhân/đối tác.
    if (isCareMode) {
      setIsSelectPartnerModalOpen(true);
      return;
    }
    setIsSelectionModalOpen(true);
  };

  /** Ô "Thêm việc" ở đáy cột / nút `+` trên đầu cột — cùng luồng với nút chính. */
  const handleAddTaskFromColumn = () => {
    if (isCareMode) {
      setIsSelectPartnerModalOpen(true);
      return;
    }
    setIsSelectionModalOpen(true);
  };

  const handleOpenTrash = (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    setIsTrashOpen(true);
  };

  const handleClearExtraFilter = () => {
    if (activeTab === 'partner') setSelectedPartnerId(undefined);
    else if (isSharedTab) setSelectedMainAssigneeId(undefined);
  };

  const handleSelectPersonal = () => {
    setCreateTaskType(TaskType.PERSONAL);
    setTargetBusinessFormId(undefined);
    setIsCreateModalOpen(true);
  };

  const handleSelectPartnerForm = (id: string) => {
    setCreateTaskType(TaskType.PARTNER_TASK);
    setTargetBusinessFormId(id);
    setIsCreateModalOpen(true);
  };

  const handleCloseCreate = () => {
    setCreateTaskType(undefined);
    setTargetBusinessFormId(undefined);
    setIsCreateModalOpen(false);
  };

  const handleMobilePartnerSelect = (id?: string) => {
    handlePartnerSelect(id);
    setIsMobilePartnerListOpen(false);
  };

  const handleMobileAssigneeSelect = (id?: string) => {
    setSelectedMainAssigneeId(id);
    setIsMobileAssigneeListOpen(false);
  };

  // Ô chọn đối tác cho mobile (tab "đối tác") — gắn vào TaskFilterBar.
  // Desktop dùng PartnerSidebar riêng nên chỉ hiện ở mobile.
  const mobilePartnerFilter =
    isMobile && activeTab === 'partner' ? (
      <>
        <span className='text-xs font-medium text-zinc-500'>Đối tác</span>
        <button
          type='button'
          onClick={() => setIsMobilePartnerListOpen(true)}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-lg border px-2.5 text-sm transition-colors',
            selectedPartnerId
              ? 'border-blue-300 bg-blue-50 text-blue-700'
              : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50',
          )}
        >
          <span className='flex min-w-0 items-center gap-2'>
            <Building2 className='h-4 w-4 shrink-0 opacity-70' />
            <span className='truncate'>
              {selectedPartner?.companyName ?? 'Tất cả đối tác'}
            </span>
          </span>
          <ChevronDown className='h-4 w-4 shrink-0 opacity-60' />
        </button>
      </>
    ) : undefined;

  // Ô chọn người phụ trách cho mobile (tab việc chung / chờ tham gia) — cùng slot với đối tác.
  const mobileAssigneeFilter =
    isMobile && isSharedTab ? (
      <>
        <span className='text-xs font-medium text-zinc-500'>Phụ trách</span>
        <button
          type='button'
          onClick={() => setIsMobileAssigneeListOpen(true)}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-lg border px-2.5 text-sm transition-colors',
            selectedMainAssigneeId
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50',
          )}
        >
          <span className='flex min-w-0 items-center gap-2'>
            <Users className='h-4 w-4 shrink-0 opacity-70' />
            <span className='truncate'>
              {selectedMainAssignee?.fullName ?? 'Tất cả người phụ trách'}
            </span>
          </span>
          <ChevronDown className='h-4 w-4 shrink-0 opacity-60' />
        </button>
      </>
    ) : undefined;

  /**
   * Hai khối lọc sẵn có nhét vào nhánh LỌC THEO của cột trái. Mỗi khối tự ẩn
   * theo tab đang xem, nên ở tab không liên quan nhánh này rỗng.
   */
  const sidebarFilters = (
    <>
      <PartnerSidebar
        selectedId={selectedPartnerId}
        onSelect={handlePartnerSelect}
        activeTab={activeTab}
        onCreatePartner={() => setIsCreateBusinessModalOpen(true)}
      />
      <MainAssigneeSidebar
        selectedId={selectedMainAssigneeId}
        onSelect={setSelectedMainAssigneeId}
        activeTab={activeTab}
        assignees={mainAssignees}
      />
    </>
  );

  if (status === 'loading' || !session) return null;

  return (
    /* `ws-scope` ở gốc màn: mọi primitive shadcn bên trong (Button, Input,
       Tabs, Select…) đổi da theo bảng màu Không gian làm việc mà không phải
       sửa file nào của chúng. Portal nằm ngoài cây này nên tự gắn riêng.

       HAI CHẾ ĐỘ CHIỀU CAO, chọn theo màn đang mở:

       • Công việc — `fixed inset-0`, cả màn khoá đúng một khung hình. Bảng cột
         cần thế: bốn cột phải cuộn ĐỘC LẬP với nhau, mà muốn vậy thì khung bao
         phải có chiều cao xác định.

       • Báo cáo — trang cuộn bình thường. Một bản báo cáo là bốn năm câu hỏi
         với ô nhập nhiều dòng, tức nội dung DÀI theo bản chất; nhốt nó trong
         một khung hình thì người dùng cuộn trong một hộp con nằm giữa trang,
         bánh xe chuột đổi ý nghĩa tuỳ con trỏ đang nằm đâu, và trên máy tính
         bảng thì đụng vào là cuộn nhầm lớp. Ở đây không có gì cần cuộn độc
         lập nên khung cứng chỉ đổi lại lấy phiền toái.

       `--ws-sticky-top` chốt mốc dính cho mọi thứ `sticky` bên trong màn Báo
       cáo (cột nhóm, các header của Bảng nhóm / Tổng hợp / Lịch sử).

       65px = ĐÁY của `Navbar`: `h-16` (64px) cộng `border-b` 1px, và con số
       đó không đổi theo breakpoint. Trước đây biến này lấy theo `pt-*` của
       `<main>` (80px / 96px) vì tưởng hai thứ là một — nhưng `pt` là khoảng
       THỞ giữa navbar và nội dung, còn mốc dính phải là chỗ navbar KẾT THÚC.
       Đặt cao hơn thì giữa đáy navbar và header dính hở ra một dải 15px trên
       mobile, 31px trên desktop, và các dòng dữ liệu trượt qua khe đó rồi mới
       biến mất — nhìn ra thành một vệt chữ lơ lửng nằm trên header dính. */
    <div
      className={cn(
        'ws-scope flex flex-col bg-ws-ground',
        isReportSection(section)
          ? 'min-h-screen [--ws-sticky-top:65px]'
          : 'fixed inset-0',
      )}
    >
      <Navbar session={session} />

      <main
        className={cn(
          'flex-1 px-4 pb-6 pt-20 md:px-6 md:pt-24',
          !isReportSection(section) && 'min-h-0 overflow-hidden',
        )}
      >
        <div
          className={cn(
            /* `w-full`, KHÔNG dùng class `container`.
             *
             * `app/globals.css` có `@media (max-width: 540px) { .container {
             * overflow-x: hidden } }` — CSS trần, ngoài mọi `@layer`, nên nó
             * thắng utility của Tailwind và không class nào ở đây đặt lại
             * được. Theo spec, `overflow-x: hidden` cộng `overflow-y: visible`
             * làm `overflow-y` tính ra `auto`, tức div này thành scroll
             * container. Chiều cao của nó lại bằng đúng nội dung nên nó không
             * bao giờ cuộn — mọi `position: sticky` bên trong lấy nó làm
             * scrollport và vĩnh viễn không kích hoạt.
             *
             * Hậu quả trên điện thoại: thanh chọn tháng của Lịch sử, băng
             * thống kê của Bảng nhóm, băng khoảng ngày của Tổng hợp, và cả
             * hàng nút "Nộp báo cáo" đều thôi bám — người dùng phải cuộn hết
             * bốn câu trả lời xuống tận đáy mới thấy nút nộp.
             *
             * `container` cũng không đóng góp gì ở đây: `mx-auto` đã có, và
             * bề ngang do `max-w-[1352px]`/`max-w-[1600px]` bên dưới quyết
             * định — max-width theo breakpoint của `container` chỉ có nguy cơ
             * chặn mốc 1600px. */
            'w-full mx-auto flex min-h-0 px-1',
            !isReportSection(section) && 'h-full',
            /* Bề ngang tổng nới ĐÚNG bằng bề ngang cột lọc, nên vùng bảng giữ
               nguyên ~1318px ở MỌI tab — thẻ việc không đổi kích thước khi
               chuyển tab. Trừ dần: `px-1` của container (8), viền tấm nội dung
               (2), cột lọc kèm viền phải (249, chỉ ở tab có lọc), `md:px-3` của
               vùng bảng (24).
                 Cá nhân + Nội bộ : 1352 − 8 − 2 −   0 − 24 = 1318
                 ba tab còn lại   : 1600 − 8 − 2 − 249 − 24 = 1317
               Lệch 1px do viền phải cột lọc, không nhìn ra được. `TaskBoard`
               chia `xl:grid-cols-4`, gap 16 → thẻ ≈ (1318 − 48)/4 ≈ 317px ở cả
               năm tab.

               ĐỪNG đóng cứng một giá trị cho cả hai nhánh: để nguyên 1600px thì
               hai tab không có cột lọc (Cá nhân, Nội bộ) sẽ để thẻ phình lên
               ~380px, đổi sang tab Đối tác lại co về ~317px — mắt phải đọc lại
               toàn bộ bố cục mỗi lần
               đổi tab. Cùng nhịp 240ms với cột lọc để hai chuyển động đi liền
               một mạch. */
            'transition-[max-width] duration-[240ms] ease-out motion-reduce:transition-none',
            /* Chỉ màn Công việc mới có cột lọc. Đọc thẳng `showFilterColumn` ở
               đây thì bề ngang màn Báo cáo lại nhảy theo tab việc đang chọn dở —
               hai thứ không liên quan gì tới nhau. */
            /* Panel trợ lý nới thêm ĐÚNG 440px — bằng bề ngang của chính nó —
               nên trên màn đủ rộng, vùng bảng giữ nguyên kích thước thẻ khi mở
               trợ lý. Máy hẹp hơn thì vẫn co lại, đúng nghĩa "đẩy bảng". Cùng
               phép cộng mà cột lọc đang dùng ở ngay trên. */
            section === 'tasks' && showFilterColumn
              ? moTroLy
                ? 'max-w-[2040px]'
                : 'max-w-[1600px]'
              : moTroLy
                ? 'max-w-[1792px]'
                : 'max-w-[1352px]',
          )}
        >
          <div className='flex min-h-0 min-w-0 flex-1 flex-col'>
            {/* Hàng tiêu đề màn — trên nền canvas, giữa navbar và tấm nội dung.
                KHÔNG dựng thêm một thanh công cụ riêng: `Navbar` toàn cục đã
                giữ vai trò đó, thêm nữa là hai thanh chồng nhau. */}
            <div className='flex shrink-0 flex-wrap items-center gap-3 pb-4'>
              <WorkspaceSectionTabs
                active={isReportSection(section) ? 'report' : 'tasks'}
                onTasks={() => void setSection('tasks')}
                onReport={() => router.push('/daily-reports/today')}
                reportTab={reportTab}
                showReport={canShowReportTab}
              />

              <span className='flex-1' />

              {/* Ô tìm THẬT, không phải nút giả mở modal. */}
              {section === 'tasks' && (
                /* Vòng focus đặt trên `label` bằng `focus-within:`, không đặt
                   trên `input`: ô nhập có `outline-none` và không có nền riêng,
                   nên viền phải vẽ quanh cả hộp mới thấy được.

                   Không dùng lại hằng `FOCUS_RING_GROUND` được dù nền dưới đúng
                   là `ws-ground` (dòng 618 của chính file này): cả họ
                   `FOCUS_RING*` viết theo biến thể `focus-visible:`, mà biến thể
                   đó áp cho CHÍNH phần tử nhận focus — ở đây là `input` con,
                   không phải `label`. Phải là `focus-within:`.

                   Trước lượt này ô tìm không có dấu hiệu focus nào: đo bằng phím
                   Tab thật thì `:focus-visible` khớp nhưng `outline: 1px none`
                   và `box-shadow: none` — con trỏ đã ở trong ô mà màn hình không
                   đổi một điểm ảnh nào. */
                <label className='flex h-10 w-full min-w-0 max-w-[272px] items-center gap-2.5 rounded-[11px] border border-ws-line bg-ws-surface px-3.5 focus-within:ring-2 focus-within:ring-ws-focus focus-within:ring-offset-1 focus-within:ring-offset-ws-ground sm:w-auto'>
                  <Search className='h-4 w-4 shrink-0 text-ws-ink-faint' />
                  <input
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                    placeholder='Tìm việc…'
                    aria-label='Tìm việc'
                    className='min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-ws-ink-faint'
                  />
                </label>
              )}

              {section === 'tasks' && <CaregiverSwitcher />}

              {/* Ba nút này thuộc về VIỆC. Trước đây chúng đứng cả ở màn Báo cáo
                  — đó chính là chỗ "lạc quẻ": màn báo cáo mặc toolbar của màn việc. */}
              {section === 'tasks' && (
                <>
                  {/* Nút "Đối tác mới" đã dời vào cột đối tác (dấu + cạnh
                      tiêu đề ĐỐI TÁC ở PartnerSidebar). Nó chỉ có nghĩa khi
                      đang xem tab Việc đối tác, mà hàng công cụ này thì hiện ở
                      cả năm tab — đứng đây là một nút không liên quan tới thứ
                      người dùng đang nhìn ở bốn tab còn lại. */}
                  <Button
                    variant='outline'
                    title='Việc đã xóa'
                    aria-label='Việc đã xóa'
                    onClick={handleOpenTrash}
                    className='h-10 w-10 shrink-0 rounded-[11px] border-ws-line bg-ws-surface p-0 text-ws-ink-soft hover:bg-ws-surface-alt'
                  >
                    <Trash2 className='h-[17px] w-[17px]' />
                  </Button>

                  {/* Nút trợ lý — CHỈ super admin. Dùng da `outline` giống
                      nút thùng rác chứ KHÔNG dùng `bg-ws-solid`: luật màu của
                      màn này cho mỗi màn đúng MỘT nút đen, và "Thêm việc" đã
                      giữ chỗ đó (docs 03-bo-mau.md). Icon vốn màu hổ phách nên
                      nó vẫn nổi bật mà không phải mượn màu của hành động chính. */}
                  {laSuperAdmin && (
                    <Button
                      variant='outline'
                      title='Nhân viên Nhàn'
                      aria-label='Nhân viên Nhàn'
                      aria-pressed={moTroLy}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        setMoTroLy((v) => !v);
                      }}
                      className={cn(
                        'h-10 w-10 shrink-0 rounded-[11px] border-ws-line p-0 hover:bg-ws-surface-alt',
                        moTroLy ? 'bg-ws-surface-sunken' : 'bg-ws-surface',
                      )}
                    >
                      <ActaAiIcon className='h-5 w-5' />
                    </Button>
                  )}

                  <Button
                    onClick={handleAddTaskClick}
                    className='h-10 shrink-0 rounded-[11px] bg-ws-solid px-4 text-[13.5px] font-semibold text-ws-solid-ink hover:opacity-90'
                  >
                    {/* Khe icon–chữ 8px là quá rộng cho một nút chỉ có hai
                        phần tử; 4px đủ để mắt tách chúng mà cụm vẫn đọc thành
                        một khối. */}
                    <Plus className='h-4 w-4 sm:mr-1' />
                    <span className='hidden sm:inline'>Thêm việc</span>
                  </Button>
                </>
              )}

              {/* Lối vào cấu hình — chỉ trưởng nhóm, và chỉ ở hai màn báo cáo. */}
              {/* Nút này mở trình quản lý NHÓM (danh sách + tạo + xoá), không
                  phải cấu hình. Cấu hình của một nhóm cụ thể nằm ở bánh răng
                  cạnh tên nhóm bên trong tấm nội dung — nó luôn thuộc về đúng
                  nhóm đang xem, còn hàng công cụ thì không biết nhóm nào. */}
              {/* Cùng khuôn với nút "Thêm việc" của màn Công việc: `h-10`,
                  `rounded-[11px]`, `px-4`, và chữ hiện từ CÙNG mốc `sm`.
                  Trước đây nút này dùng `px-3` và chỉ hiện chữ từ `lg`, nên ở
                  khổ 640–1023px nó co thành một ô icon hẹp trong khi nút bên
                  màn Công việc đã có chữ và rộng hơn — hai màn cạnh nhau mà
                  hàng công cụ đo hai kiểu, đổi màn là thấy nút nhảy kích
                  thước. */}
              {section !== 'tasks' && (
                <Button
                  variant='outline'
                  title='Quản lý nhóm giao việc'
                  onClick={() => setIsGroupModalOpen(true)}
                  className='h-10 shrink-0 rounded-[11px] border-ws-line bg-ws-surface px-4 text-[13.5px] font-semibold text-ws-ink-soft hover:bg-ws-surface-alt'
                >
                  <Users className='h-4 w-4 sm:mr-1' />
                  <span className='hidden sm:inline'>Nhóm giao việc</span>
                </Button>
              )}
            </div>

            {section === 'tasks' ? (
              /* Khung nội dung: tấm ws-surface bo 16px trên nền ws-ground */
              <section className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-ws-line bg-ws-surface'>
                <div className='flex shrink-0 items-center gap-3 border-b border-ws-line px-4 md:px-5'>
                  {/* `self-stretch` để khối tab cao BẰNG CẢ HÀNG.
                      Hàng này cao 60px vì hai cụm bên phải (chuyển chế độ xem,
                      nút Lọc) đều là 44px kèm `my-2`. Khối tab chỉ 40px và bị
                      `items-center` căn giữa, nên gạch chân của tab đang chọn
                      — vốn nằm ở đáy TAB — treo lơ lửng cách đường kẻ của
                      hàng đúng 10px, đọc ra như một gạch chân rời chứ không
                      phải chỉ báo tab. Kéo khối tab cao hết hàng thì gạch chân
                      dán đúng vào đường kẻ, giống hệt dải tab bên màn Báo
                      cáo. */}
                  <div className='flex min-w-0 flex-1 self-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                    <Tabs
                      value={activeTab}
                      onValueChange={(v) => setActiveTab(v as TaskTab)}
                      className='min-w-0 flex-1'
                    >
                      <TabsList className='h-full min-h-10 w-max justify-start rounded-none bg-transparent p-0'>
                        {(isCareMode
                          ? TASK_TAB_META.filter((t) => t.value === 'partner')
                          : TASK_TAB_META
                        ).map((tab) => (
                          <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className={TAB_TRIGGER_CLASS}
                          >
                            <span className='md:hidden'>{tab.shortLabel}</span>
                            <span className='hidden md:inline'>
                              {tab.label}
                            </span>
                            <TabCount
                              count={
                                tab.countKey
                                  ? taskCounts?.[tab.countKey]
                                  : undefined
                              }
                              urgent={tab.value === 'sharedPending'}
                              active={activeTab === tab.value}
                            />
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>

                  {/* Cụm chuyển chế độ xem — mục đang chọn NỔI lên nền trắng */}
                  <div className={cn(SEGMENT_TRACK_CLASS, 'my-2 shrink-0')}>
                    <button
                      type='button'
                      onClick={() => setViewMode('list')}
                      title='Bảng tính'
                      className={cn(
                        SEGMENT_CLASS,
                        viewMode === 'list'
                          ? SEGMENT_ON_CLASS
                          : SEGMENT_OFF_CLASS,
                      )}
                    >
                      <Rows3 className='h-4 w-4' />
                      <span className='hidden sm:inline'>Bảng tính</span>
                    </button>
                    <button
                      type='button'
                      onClick={() => setViewMode('board')}
                      title='Bảng cột'
                      className={cn(
                        SEGMENT_CLASS,
                        viewMode === 'board'
                          ? SEGMENT_ON_CLASS
                          : SEGMENT_OFF_CLASS,
                      )}
                    >
                      <LayoutGrid className='h-4 w-4' />
                      <span className='hidden sm:inline'>Bảng cột</span>
                    </button>
                  </div>

                  {/* Nút Lọc đứng CUỐI hàng, sau cụm chuyển chế độ xem: nó tác động lên
                    nội dung bảng chứ không phải lên việc chọn tab, nên thuộc về
                    cụm điều khiển bên phải. Chỉ còn icon, cao 42px bằng đúng cụm
                    bên cạnh. */}
                  <TaskFilterBar
                    className='my-2 shrink-0'
                    iconOnly
                    value={filters}
                    onChange={setFilters}
                    hideSearch
                    extraActiveCount={
                      isMobile &&
                      ((activeTab === 'partner' && selectedPartnerId) ||
                        (isSharedTab && selectedMainAssigneeId))
                        ? 1
                        : 0
                    }
                    onClearExtra={handleClearExtraFilter}
                    partnerSection={mobilePartnerFilter ?? mobileAssigneeFilter}
                  />
                </div>

                <div className='flex min-h-0 flex-1 overflow-hidden'>
                  {/* Cột lọc nằm TRONG khung, mặc định rộng 0. Chỉ trượt ra ở tab
                    Đối tác và hai tab Việc chung; tab khác nhường trọn bề ngang
                    cho bảng. Giữ trong DOM để có gì mà chuyển động; khi thu lại
                    thì khoá tương tác và ẩn khỏi trình đọc màn hình. */}
                  <div
                    aria-hidden={!showFilterColumn}
                    inert={!showFilterColumn ? true : undefined}
                    className={cn(
                      'hidden shrink-0 overflow-hidden transition-[width] duration-[240ms] ease-out md:block',
                      'motion-reduce:transition-none',
                      showFilterColumn
                        ? 'w-[248px] border-r border-ws-line'
                        : 'pointer-events-none w-0',
                    )}
                  >
                    <div className='h-full w-[248px] p-3'>{sidebarFilters}</div>
                  </div>

                  <div className='min-h-0 min-w-0 flex-1 overflow-hidden px-2 pb-3 pt-3 md:px-3'>
                    {viewMode === 'list' ? (
                      <TaskSheetView
                        baseQuery={getTaskQuery()}
                        hasActiveFilter={hasActiveFilter}
                        onAddTask={handleAddTaskFromColumn}
                        onClearFilters={handleClearAllFilters}
                      />
                    ) : (
                      <TaskBoard
                        baseQuery={getTaskQuery()}
                        hasActiveFilter={hasActiveFilter}
                        onAddTask={handleAddTaskFromColumn}
                        onClearFilters={handleClearAllFilters}
                        // Chỉ nối hai đường này khi người dùng thật sự có ngăn
                        // kéo trợ lý: người khác kéo thẻ thì không có gì để
                        // nghe, và một lần đặt trạng thái mỗi cú kéo là một lần
                        // vẽ lại cả trang không đổi lấy gì.
                        onKeoThe={laSuperAdmin ? batDauKeoThe : undefined}
                        onThaNgoaiBang={
                          laSuperAdmin ? thaNgoaiBang : undefined
                        }
                      />
                    )}
                  </div>
                </div>
              </section>
            ) : (
              /* `section !== 'tasks'` LUÔN bị `useEffect` phía trên điều hướng
                 sang `/daily-reports/*` — mọi nhánh của nó đều gọi
                 `router.replace`, không có lối thoát nào.
                 Trước đây chỗ này render `<DailyReportWorkspace>`: component
                 mount, bắn ba query, rồi bị điều hướng đi ngay. Người dùng
                 không bao giờ thấy một pixel nào của nó.
                 Trả `null` để giữ đúng hình dạng ternary mà không dựng gì. */
              null
            )}
          </div>

          {/* Ngăn kéo trợ lý — anh em cùng hàng flex với cột nội dung, KHÔNG
              phải lớp phủ: người dùng phải bấm được vào thẻ việc mà trợ lý vừa
              nhắc tới trong lúc khung chat vẫn mở. Chỉ dựng cho super admin để
              không tốn truy vấn lịch sử với người không bao giờ mở được nó. */}
          {laSuperAdmin && (
            <NhanPanel
              open={moTroLy}
              onClose={() => setMoTroLy(false)}
              onOpenTaskCode={(code) => void moViecTheoMa(code)}
              viecDangKeo={viecDangKeo}
              onConTroTrongVungTha={ghiConTroTrongVungTha}
              viecKeoVao={viecThaVaoTroLy}
              onDaChenViecKeo={daChenViecKeo}
            />
          )}
        </div>
      </main>

      {/* Modals select task type (personal/business form) */}
      <CreateTaskSelectionModal
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        onSelectPersonal={handleSelectPersonal}
        onSelectPartner={() => setIsSelectPartnerModalOpen(true)}
      />

      {/* Modal select business form - Create task */}
      <SelectPartnerModal
        isOpen={isSelectPartnerModalOpen}
        onClose={() => setIsSelectPartnerModalOpen(false)}
        onSelect={handleSelectPartnerForm}
      />

      {/* Modal create task */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreate}
        businessFormId={targetBusinessFormId}
        taskType={createTaskType}
      />

      <CreateBusinessModal
        isOpen={isCreateBusinessModalOpen}
        onClose={() => setIsCreateBusinessModalOpen(false)}
      />

      <DeletedTasksModal
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
      />

      {/* Popup chi tiết khi mở từ thông báo */}
      <TaskDetailModal
        task={focusTask ?? null}
        isOpen={!!focusTaskId && !!focusTask}
        onClose={() => setFocusTaskId(null)}
      />

      {/* Nhóm giao việc — lối vào cấu hình Báo cáo hằng ngày: nhóm → công tắc.
          Bật được ngay cả khi đang TẠO nhóm mới. */}
      <TaskGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onApply={() => setIsGroupModalOpen(false)}
        rowAction='edit'
      />

      {/* Mobile Partner Sidebar Drawer */}
      <Sheet
        open={isMobilePartnerListOpen}
        onOpenChange={setIsMobilePartnerListOpen}
      >
        <SheetContent
          side='bottom'
          className='ws-scope h-[80vh] p-0 rounded-t-2xl overflow-hidden flex flex-col'
        >
          <SheetHeader className='p-4 border-b border-zinc-100 shrink-0'>
            <SheetTitle className='text-left text-sm font-bold uppercase tracking-widest text-zinc-500'>
              Chọn đối tác để lọc
            </SheetTitle>
          </SheetHeader>
          <div className='flex-1 min-h-0 overflow-hidden bg-zinc-50'>
            <PartnerSidebar
              selectedId={selectedPartnerId}
              onSelect={handleMobilePartnerSelect}
              activeTab='partner'
              className='border-none rounded-none bg-transparent'
              onCreatePartner={() => setIsCreateBusinessModalOpen(true)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile Main-Assignee Sidebar Drawer */}
      <Sheet
        open={isMobileAssigneeListOpen}
        onOpenChange={setIsMobileAssigneeListOpen}
      >
        <SheetContent
          side='bottom'
          className='ws-scope h-[80vh] p-0 rounded-t-2xl overflow-hidden flex flex-col'
        >
          <SheetHeader className='p-4 border-b border-zinc-100 shrink-0'>
            <SheetTitle className='text-left text-sm font-bold uppercase tracking-widest text-zinc-500'>
              Chọn người phụ trách để lọc
            </SheetTitle>
          </SheetHeader>
          <div className='flex-1 min-h-0 overflow-hidden bg-zinc-50'>
            <MainAssigneeSidebar
              selectedId={selectedMainAssigneeId}
              onSelect={handleMobileAssigneeSelect}
              activeTab={activeTab}
              assignees={mainAssignees}
              className='border-none rounded-none bg-transparent'
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
