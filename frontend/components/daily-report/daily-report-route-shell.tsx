'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Users } from 'lucide-react';
import { parseAsString, useQueryState } from 'nuqs';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Navbar } from '@/components/sites/home/navbar';
import { CaregiverProvider } from '@/contexts/caregiver-context';
import {
  DailyReportWorkspace,
  type ReportView,
} from './daily-report-workspace';
import { FOCUS_RING_GROUND, reportTabState } from './daily-report-utils';
import { WorkspaceSectionTabs } from '@/components/workspace/workspace-section-tabs';
import {
  useMyReportScopes,
  useMyTodayReports,
  useReportPendingCount,
} from '@/hooks/queries/daily-report-queries';
import { useTask } from '@/hooks/queries/task-queries';

/**
 * Ba hộp thoại của shell tải THEO YÊU CẦU, và chỉ vào cây sau lần mở đầu tiên.
 *
 * Cả ba trước đây nhập tĩnh và luôn được mount với `isOpen={false}`:
 * `task-detail-modal` 894 dòng + `task-group-modal` 809 + `daily-report-config-modal`
 * 119 (kéo theo cả `daily-report-config-panel`). Mọi lượt mở `/daily-reports/*`
 * đều trả giá cho ba thứ mà đa số phiên không bao giờ mở ra.
 *
 * `dynamic()` một mình KHÔNG đủ: component còn trong cây thì chunk vẫn tải ngay
 * lúc mount. Phải kèm cờ dính một chiều bên dưới. Và phải là cờ DÍNH chứ không
 * tháo hẳn khi đóng — tháo thì `isOpen` về `false` cùng lúc component biến mất,
 * hoạt ảnh đóng của Radix không kịp chạy.
 */
const TaskDetailModal = dynamic(() =>
  import('@/components/tasks/task-detail-modal').then((m) => m.TaskDetailModal),
);
const TaskGroupModal = dynamic(() =>
  import('@/components/tasks/task-group-modal').then((m) => m.TaskGroupModal),
);
const DailyReportConfigModal = dynamic(() =>
  import('./daily-report-config-modal').then((m) => m.DailyReportConfigModal),
);

interface Props {
  view: ReportView;
  scopeId?: string | null;
  reportId?: string | null;
}

function RouteContent({ view, scopeId = null, reportId = null }: Props) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [taskId, setTaskId] = useQueryState('taskId', parseAsString);
  const [legacyReportId, setLegacyReportId] = useQueryState(
    'focusReportId',
    parseAsString,
  );
  const [date] = useQueryState('date', parseAsString);
  const [scopeQuery] = useQueryState('scope', parseAsString);
  const [focusScopeQuery, setFocusScopeQuery] = useQueryState(
    'focusScopeId',
    parseAsString,
  );
  const [focusDateQuery, setFocusDateQuery] = useQueryState(
    'focusDate',
    parseAsString,
  );
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [configScopeId, setConfigScopeId] = useState<string | null>(null);
  /**
   * Ba cờ dính một chiều: "hộp thoại này đã từng cần tới chưa".
   *
   * Đặt trong lúc render chứ không trong `useEffect`, theo đúng khuôn React
   * dùng cho state suy từ prop (`syncedDateParam` trong
   * `daily-report-workspace.tsx` cũng vậy). Phải là lúc render vì `?taskId=` có
   * thể đã nằm sẵn trên URL ngay lượt đầu — chờ tới effect thì hộp thoại vẽ
   * chậm mất một khung hình so với bản nhập tĩnh cũ.
   */
  const [wasTaskModalNeeded, setWasTaskModalNeeded] = useState(false);
  const [wasGroupModalNeeded, setWasGroupModalNeeded] = useState(false);
  const [wasConfigModalNeeded, setWasConfigModalNeeded] = useState(false);
  if (!wasTaskModalNeeded && taskId) setWasTaskModalNeeded(true);
  if (!wasGroupModalNeeded && isGroupModalOpen) setWasGroupModalNeeded(true);
  if (!wasConfigModalNeeded && configScopeId) setWasConfigModalNeeded(true);
  const { data: task, error } = useTask(taskId ?? '');
  const { data: reportScopes } = useMyReportScopes();
  const { data: todayReports } = useMyTodayReports();
  const { data: reportPending } = useReportPendingCount();
  const reportTab = reportTabState(reportScopes, reportPending, todayReports);

  useEffect(() => {
    if (status === 'unauthenticated') {
      const back =
        typeof window === 'undefined'
          ? '/daily-reports'
          : `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?callbackUrl=${encodeURIComponent(back)}`);
    }
  }, [router, status]);

  useEffect(() => {
    if (!taskId) return;
    if ((error as { statusCode?: number } | null)?.statusCode === 403) {
      toast.error('Bạn không có quyền xem công việc này');
      void setTaskId(null);
    }
  }, [error, setTaskId, taskId]);

  const activeScopeId = scopeId ?? scopeQuery;
  /* `headerScopeId` / `headerScope` đã BỎ cùng nút KPI.
     Cả cụm đó tồn tại chỉ để tái lập luật chọn nhóm của `DailyReportWorkspace`
     ngay tại shell — thứ duy nhất cần tới là nút KPI, mà nút đó nay nằm TRONG
     bảng nhóm, nơi `scopeId` đã là prop sẵn có nên không phải đoán lại nhóm nào
     đang xem. Bỏ luôn cả một luật bị nhân đôi giữa hai file.
     Ai cần đọc lại luật gốc: `resolveDefaultScopeId` trong `utils/scope-nav.ts`
     và `activeScopeId` trong `daily-report-workspace.tsx`. */
  const tasksHref = activeScopeId
    ? `/tasks?scope=${encodeURIComponent(activeScopeId)}`
    : '/tasks';
  /**
   * `useCallback` cho hai hàm này KHÔNG phải là tối ưu vặt.
   *
   * Chúng là prop `onViewChange` / `viewHref` của `DailyReportWorkspace`. Dựng
   * lại ở mỗi lượt render của shell thì mọi `useCallback` bên trong workspace
   * (`openBoard`, `handleSelectBand`, `handleSelectScope`) đều đổi định danh
   * theo, và `useEffect` tiêu thụ deep-link cũng chạy lại — trong khi shell
   * render lại vì những thứ chẳng liên quan: mở hộp thoại nhóm, đổi
   * `?taskId=`, hay bốn truy vấn của shell lần lượt trả về.
   *
   * Cả hai vì thế phải nằm TRÊN nhánh `return null` của phiên đăng nhập: hook
   * không được gọi sau một lần return sớm.
   */
  const changeView = useCallback(
    (
      next: ReportView,
      nextScopeId?: string | null,
      nextDate?: string | null,
    ) => {
      if (next === 'report') {
        const targetScopeId = nextScopeId ?? activeScopeId;
        router.push(
          targetScopeId
            ? `/daily-reports/today?scope=${encodeURIComponent(targetScopeId)}`
            : '/daily-reports/today',
        );
      } else if (next === 'history') router.push('/daily-reports/history');
      else if (nextScopeId ?? activeScopeId) {
        const targetScopeId = nextScopeId ?? activeScopeId;
        const dateQuery =
          next === 'board' && nextDate
            ? `?date=${encodeURIComponent(nextDate)}`
            : '';
        router.push(
          `/daily-reports/${encodeURIComponent(targetScopeId as string)}/${next}${dateQuery}`,
        );
      }
    },
    [activeScopeId, router],
  );
  const viewHref = useCallback(
    (
      next: ReportView,
      nextScopeId?: string | null,
      nextDate?: string | null,
    ) => {
      if (next === 'report') {
        const targetScopeId = nextScopeId ?? activeScopeId;
        return targetScopeId
          ? `/daily-reports/today?scope=${encodeURIComponent(targetScopeId)}`
          : '/daily-reports/today';
      }
      if (next === 'history') return '/daily-reports/history';
      const targetScopeId = nextScopeId ?? activeScopeId;
      if (!targetScopeId) return null;
      const dateQuery =
        next === 'board' && nextDate
          ? `?date=${encodeURIComponent(nextDate)}`
          : '';
      return `/daily-reports/${encodeURIComponent(targetScopeId)}/${next}${dateQuery}`;
    },
    [activeScopeId],
  );

  /**
   * Bốn hàm còn lại mà workspace nhận. Cùng lý do với `changeView`: một hàm mới
   * ở mỗi lượt render là một prop mới, và workspace không có cách nào biết rằng
   * hành vi của nó không đổi.
   */
  const openTask = useCallback((id: string) => void setTaskId(id), [setTaskId]);
  /** MỘT khuôn URL cho bản chi tiết: link thật trên bảng nhóm và `router.push`
      của các lối vào khác đều dựng từ đây. */
  const reportHref = useCallback(
    (id: string, reportScopeId: string) =>
      `/daily-reports/${encodeURIComponent(reportScopeId)}/reports/${encodeURIComponent(id)}`,
    [],
  );
  const openReportRoute = useCallback(
    (id: string, reportScopeId?: string) => {
      if (reportScopeId) {
        router.push(reportHref(id, reportScopeId));
      } else {
        router.push(
          `/daily-reports/today?focusReportId=${encodeURIComponent(id)}`,
        );
      }
    },
    [reportHref, router],
  );
  const consumeFocus = useCallback(() => {
    void setLegacyReportId(null);
    void setFocusScopeQuery(null);
    void setFocusDateQuery(null);
  }, [setLegacyReportId, setFocusScopeQuery, setFocusDateQuery]);
  const openGroups = useCallback(() => setIsGroupModalOpen(true), []);

  /* Nhánh return sớm của phiên đăng nhập PHẢI đứng sau toàn bộ hook ở trên. */
  if (status === 'loading' || !session) return null;

  return (
    <div className='ws-scope min-h-screen bg-ws-ground [--ws-sticky-top:65px]'>
      <Navbar session={session} />
      <main
        aria-label='Báo cáo hằng ngày'
        className='px-4 pb-6 pt-20 md:px-6 md:pt-24'
      >
        <div className='mx-auto w-full max-w-[1352px]'>
          <div className='mb-3 flex flex-wrap items-center gap-2 sm:gap-3'>
            <WorkspaceSectionTabs
              active='report'
              onTasks={() => router.push(tasksHref)}
              onReport={() => router.push('/daily-reports/today')}
              reportTab={reportTab}
            />
            {/* Nút KPI ĐÃ RỜI khỏi hàng này (25/08). Hàng tiêu đề dùng chung
                cho CẢ BỐN màn Báo cáo — `ReportView` trong
                `daily-report-workspace.tsx` có đúng bốn giá trị: "Báo cáo của
                tôi" (`report`), "Lịch sử của tôi" (`history`), "Nhóm" (`board`)
                và "Tổng quan báo cáo" (`summary`). Năm `page.tsx` dưới
                `app/(routes)/daily-reports/` dựng shell này và cùng rơi vào
                bốn giá trị đó (route chi tiết một bản dùng lại `report`). Một nút
                chỉ có nghĩa ở màn "Nhóm" đứng ở đây thì ba trong bốn màn nó là
                nút thừa. Nay nó nằm ở hàng tiêu đề nhóm, cạnh nút "Cấu hình
                báo cáo" (`board/board-kpi-summary.tsx` → `BoardKpiManageButton`,
                mount từ `daily-report-workspace.tsx` — dời tới đó 26/08/2026,
                sau một chặng ngắn ở đầu bảng nhóm), cùng điều kiện `isManager`
                như cũ.
                Vì thế cả `railItems`/`headerScope` lẫn `DailyReportKpiModal`
                cũng không còn ở file này — bảng nhóm tự giữ modal của nó.
                LƯU Ý (đã kiểm bằng grep 25/08, không phải theo trí nhớ): sau
                lần dời này, nút trong đầu bảng nhóm là lối vào DUY NHẤT của
                `DailyReportKpiModal` trong cả repo. Màn `/tasks` KHÔNG có nút
                KPI nào — `components/tasks/` không có một tham chiếu "kpi" nào
                cả (kiểm lại bằng grep 25/08, vẫn đúng). Gỡ nốt nút ở bảng nhóm
                là mất hẳn đường vào danh mục KPI — và cũng vì lẽ đó nút bên
                kia phải nằm NGOÀI khối `{data && (`, chứ không chỉ là "có mặt
                trong file": bọc vào trong thì lối vào duy nhất tắt ngóm ở mọi
                lượt tải và mất hẳn khi bảng lỗi. */}
            {/* `title=` là chú thích của TRÌNH DUYỆT: chỉ hiện khi rê chuột,
                không hiện khi Tab tới, và trên cảm ứng thì không bao giờ hiện.
                Dưới 640px nút này chỉ còn cái icon, tức đúng ở khổ máy mà
                `title` vô dụng nhất thì nó lại là lời giải thích duy nhất.
                Tooltip của Radix hiện cả khi focus bằng bàn phím; `aria-label`
                lo phần trình đọc màn hình, độc lập với việc nhãn chữ có bị ẩn
                theo bề ngang hay không.
                `TooltipProvider` gói ngay tại chỗ — repo không có provider ở
                gốc, và `Tooltip` thiếu provider là ném lỗi lúc render. */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='outline'
                    aria-label='Nhóm giao việc'
                    onClick={() => setIsGroupModalOpen(true)}
                    className={cn(
                      /* `ml-auto` thay cho phần tử đệm `flex-1`: đệm cộng thêm
                         một khoảng `gap`, đủ để ở 320px nút này rớt xuống hàng
                         riêng (đo 17/09/2026). Dưới `sm` nút chỉ còn icon nên
                         vuông 40px thay vì đệm ngang 16px. */
                      'ml-auto h-10 w-10 shrink-0 rounded-ws-control border-ws-line bg-ws-surface px-0 text-ws-body font-semibold text-ws-ink-soft hover:bg-ws-surface-alt sm:w-auto sm:px-4',
                      FOCUS_RING_GROUND,
                    )}
                  >
                    <Users aria-hidden='true' className='h-4 w-4 sm:mr-1' />
                    <span className='hidden sm:inline'>Nhóm giao việc</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className='ws-scope text-ws-meta'>
                  Quản lý nhóm giao việc
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <DailyReportWorkspace
            view={view}
            onViewChange={changeView}
            viewHref={viewHref}
            historyHref='/daily-reports/history'
            onOpenTask={openTask}
            onOpenReportRoute={openReportRoute}
            reportHref={reportHref}
            initialBoardScopeId={activeScopeId}
            initialBoardDate={date}
            focusReportId={reportId ?? legacyReportId}
            focusScopeId={focusScopeQuery}
            focusDate={focusDateQuery}
            onFocusConsumed={consumeFocus}
            onOpenGroups={openGroups}
            onOpenScopeConfig={setConfigScopeId}
          />
        </div>
      </main>
      {wasTaskModalNeeded && (
        <TaskDetailModal
          task={task ?? null}
          isOpen={Boolean(taskId && task)}
          onClose={() => void setTaskId(null)}
        />
      )}
      {wasGroupModalNeeded && (
        <TaskGroupModal
          isOpen={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
          onApply={() => setIsGroupModalOpen(false)}
          rowAction='edit'
          /* Mở cấu hình đầy đủ CHỒNG lên hộp thoại nhóm, không đóng nó: hộp
             thoại cấu hình mở SAU nên portal của nó gắn vào `body` sau và nằm
             trên, và Radix xếp lớp dùng chung cho mọi dialog nên Esc hay bấm ra
             ngoài chỉ đóng lớp trên cùng. Đóng cấu hình là người dùng quay về
             đúng form nhóm đang sửa. */
          onOpenScopeConfig={setConfigScopeId}
        />
      )}
      {wasConfigModalNeeded && (
        <DailyReportConfigModal
          scopeId={configScopeId}
          /* Tên nhóm cho dòng "Chỉ áp dụng cho …". Trước đây không truyền nên
             dòng đó không bao giờ hiện, và mở chồng từ hộp thoại nhóm thì
             không có chữ nào nói đang cấu hình nhóm nào. */
          scopeName={reportScopes?.find((s) => s.id === configScopeId)?.name}
          isOpen={Boolean(configScopeId)}
          onClose={() => setConfigScopeId(null)}
        />
      )}
    </div>
  );
}

export function DailyReportRouteShell(props: Props) {
  return (
    <CaregiverProvider>
      <RouteContent {...props} />
    </CaregiverProvider>
  );
}
