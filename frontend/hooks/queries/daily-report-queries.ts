'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  createDailyReportsApis,
  GetMyReportsQuery,
  SummaryQuery,
} from '@/app/api/daily-reports';
import {
  BoardStatusFilter,
  CloneTemplatePayload,
  CreateReportScopePayload,
  CreateTemplatePayload,
  DailyReportGenerationPreview,
  DailyReportHelpRequestStatus,
  DailyReportScopeListItem,
  DailyReportReviewDecision,
  ReviewDailyReportPayload,
  SaveAnswerPayload,
  SaveReviewGroupPayload,
  UpdateReportScopePayload,
  UpdateTemplatePayload,
} from '@/types/daily-report.type';
import { useOnBehalfParam } from '@/contexts/caregiver-context';

/**
 * Trần `limit` của `GET /daily-reports/my` — `@Max(100)` ở DTO server
 * (`src/daily-reports/dto/daily-report.dto.ts`). Gửi lớn hơn thì ăn 422.
 */
const MAX_HISTORY_PAGE_SIZE = 100;

/** Khóa cache — cùng khuôn taskKeys (docs 04 mục 8). */
export const dailyReportKeys = {
  all: ['daily-reports'] as const,
  today: (date?: string) =>
    [...dailyReportKeys.all, 'today', date ?? 'now'] as const,
  pendingCount: () => [...dailyReportKeys.all, 'pending-count'] as const,
  detail: (id: string) => [...dailyReportKeys.all, 'detail', id] as const,
  draft: (id: string) => [...dailyReportKeys.all, 'draft', id] as const,
  revisions: (id: string) => [...dailyReportKeys.all, 'revisions', id] as const,
  history: (q: GetMyReportsQuery) =>
    [...dailyReportKeys.all, 'history', q] as const,
  board: (scopeId: string, date?: string) =>
    [...dailyReportKeys.all, 'board', scopeId, date ?? 'today'] as const,
  pendingReview: (scopeId: string, page?: number) =>
    [...dailyReportKeys.all, 'pending-review', scopeId, page ?? 1] as const,
  outcome: (scopeId: string, date?: string) =>
    [...dailyReportKeys.all, 'outcome', scopeId, date ?? 'today'] as const,
  summary: (
    scopeId: string,
    from: string,
    to: string,
    /* Phân trang và bộ lọc nằm TRONG khoá: đổi trang là một truy vấn khác, và
       react-query băm object theo thứ tự khoá nên hai lần gọi giống nhau vẫn
       trùng khoá. */
    paging?: Record<string, string | number | undefined>,
  ) =>
    [
      ...dailyReportKeys.all,
      'summary',
      scopeId,
      from,
      to,
      paging ?? {},
    ] as const,
  scopes: () => [...dailyReportKeys.all, 'scopes'] as const,
  kpis: (scopeId: string) =>
    [...dailyReportKeys.all, 'kpis', scopeId] as const,
  reviewGroups: (scopeId: string) =>
    [...dailyReportKeys.all, 'review-groups', scopeId] as const,
  memberHistory: (scopeId: string, memberId: string, from: string, to: string) =>
    [
      ...dailyReportKeys.all,
      'member-history',
      scopeId,
      memberId,
      from,
      to,
    ] as const,
  scopeDetail: (scopeId: string) =>
    [...dailyReportKeys.all, 'scope-detail', scopeId] as const,
  generationPreview: (scopeId: string) =>
    [...dailyReportKeys.all, 'generation-preview', scopeId] as const,
  templates: () => [...dailyReportKeys.all, 'templates'] as const,
  template: (id: string) => [...dailyReportKeys.all, 'template', id] as const,
  helpRequests: (status?: DailyReportHelpRequestStatus) =>
    [...dailyReportKeys.all, 'help-requests', status ?? 'all'] as const,
};

/**
 * Sau khi ghi một BẢN BÁO CÁO: dọn mọi truy vấn đọc lại chính bản đó, dù trực
 * tiếp hay qua tổng hợp. KHÔNG nuke toàn bộ `all` (cùng tinh thần
 * invalidateActivityScoped) — `templates`, `scope-detail`, `generation-preview`
 * không đổi theo nội dung bản báo cáo.
 *
 * Bản trước chỉ dọn 4 nhóm và **thiếu 5 nhóm**, nên sau khi nộp thì màn Lịch
 * sử, Tổng quan, Kết quả nhóm và danh sách Yêu cầu hỗ trợ vẫn vẽ số cũ cho tới
 * khi người dùng tự F5. Chỗ đau nhất là `help-requests`: nộp bài có điền câu
 * "Yêu cầu hỗ trợ" thì server TẠO một `DailyReportHelpRequest`
 * (`daily-reports.service.ts`, nhánh `help` trong `submit`) — một bản ghi mới
 * hoàn toàn mà client không hề biết là mình cần đọc lại.
 *
 * `revisions` và `draft` lọc theo `reportId` như `detail`; bốn nhóm còn lại
 * không mang `reportId` trong khoá nên phải dọn cả nhóm.
 *
 * Không lo refetch storm: `invalidateQueries` chỉ gọi mạng cho truy vấn ĐANG
 * hoạt động. Các màn không mở chỉ bị đánh dấu cũ, và chúng tải lại lúc mở nhờ
 * `refetchOnMount` đặt riêng cho khoá `daily-reports` (xem `components/providers`).
 */
function invalidateAfterWrite(queryClient: QueryClient, reportId?: string) {
  const perReportKeys = new Set(['detail', 'revisions', 'draft']);
  const aggregateKeys = new Set([
    'today',
    'pending-count',
    'board',
    'pending-review',
    'outcome',
    'summary',
    'history',
    'member-history',
    'help-requests',
  ]);
  /* TRẢ VỀ promise. react-query chờ giá trị `onSuccess` trả ra rồi mới coi
     mutation là xong (`await this.options.onSuccess?.(...)` trong query-core).
     Nuốt promise thì `isPending` tắt ngay khi POST về, trong lúc `/my/today`,
     `/board` và `/pending-count` còn đang bay: nút Nộp sáng lại, bấm nhịp hai
     vẫn gửi được, mà `submit` của server là idempotent nên trả 200 — người dùng
     nhận HAI toast "Đã nộp báo cáo hôm nay." cho một lần nộp. Cùng luật đã ghi ở
     `invalidateScopeConfig` bên dưới; chỗ này trước đây bỏ sót. */
  return queryClient.invalidateQueries({
    predicate: (query) => {
      if (query.queryKey[0] !== 'daily-reports') return false;
      const section = query.queryKey[1];
      if (typeof section !== 'string') return false;
      if (aggregateKeys.has(section)) return true;
      return (
        reportId !== undefined &&
        perReportKeys.has(section) &&
        query.queryKey[2] === reportId
      );
    },
  });
}

/**
 * Sau khi ghi DANH MỤC KPI của một nhóm.
 *
 * Bản trước chỉ dọn đúng `kpis(scopeId)` — danh sách trong chính hộp thoại đang
 * mở — nên thêm/xoá/đổi thứ tự một KPI xong thì đóng hộp thoại lại, đầu bảng
 * nhóm vẫn in khối "KPI ĐẠT ĐƯỢC" theo danh mục CŨ. `kpiSummary` là trường của
 * `GET /board` chứ không của `GET /kpis`, và màn Tổng quan cũng đọc lại danh mục
 * đó; hai khoá ấy không mang `scopeId` ở cùng vị trí nên dọn cả nhóm.
 *
 * `today` nằm trong danh sách vì form báo cáo dựng danh sách KPI để tick từ
 * `useReportKpis`, nhưng bản báo cáo lại mang `achievedKpis` đã chụp — xoá một
 * KPI đang được tick thì hai nguồn đó lệch nhau cho tới lần tải sau.
 */
function invalidateAfterKpiWrite(queryClient: QueryClient, scopeId: string) {
  /* TRẢ VỀ promise — cùng lý do đã ghi ở `invalidateAfterWrite`. */
  return queryClient.invalidateQueries({
    predicate: (query) => {
      if (query.queryKey[0] !== 'daily-reports') return false;
      const section = query.queryKey[1];
      if (section === 'kpis') return query.queryKey[2] === scopeId;
      return section === 'board' || section === 'summary' || section === 'today';
    },
  });
}

/**
 * Yêu cầu hỗ trợ đổi trạng thái làm lệch chip và `stats.needHelp` của bảng
 * nhóm, hai mục của Tổng quan, khối `helpRequests` của chi tiết bản, và bản
 * hôm nay của chính người hỏi (`today`) - dọn cả năm nhóm.
 *
 * TRẢ VỀ promise, cùng lý do đã ghi ở `invalidateAfterWrite`: ô tích phải giữ
 * trạng thái bận tới khi màn đã khớp server, không thì bấm nhịp hai gửi lại.
 */
function invalidateAfterHelpWrite(queryClient: QueryClient, reportId?: string) {
  return queryClient.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === 'daily-reports' &&
      (query.queryKey[1] === 'help-requests' ||
        query.queryKey[1] === 'board' ||
        query.queryKey[1] === 'summary' ||
        query.queryKey[1] === 'today' ||
        (reportId !== undefined &&
          query.queryKey[1] === 'detail' &&
          query.queryKey[2] === reportId)),
  });
}

/**
 * Đổi cấu hình phạm vi: dọn danh sách scope, chi tiết scope, và các nguồn phụ
 * thuộc nghĩa vụ trong ngày. KHÔNG dọn `templates` và `history` — chúng không
 * đổi theo cấu hình, dọn kèm chỉ tạo refetch thừa.
 */
function invalidateScopeConfig(queryClient: QueryClient) {
  // TRẢ VỀ promise. react-query chờ giá trị `onSuccess` trả ra trước khi coi
  // mutation là xong; nuốt promise ở đây khiến `isPending` tắt trong lúc refetch
  // `/my` còn bay, nút mở khoá sớm, và cú bấm kế tiếp đọc phải dữ liệu cũ. Khối
  // chọn ngày báo cáo đọc-sửa-ghi cả mảng nên mất luôn lần bấm trước.
  return queryClient.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === 'daily-reports' &&
      (query.queryKey[1] === 'scopes' ||
        query.queryKey[1] === 'scope-detail' ||
        query.queryKey[1] === 'generation-preview' ||
        query.queryKey[1] === 'board' ||
        query.queryKey[1] === 'today' ||
        query.queryKey[1] === 'pending-count'),
  });
}

/** Client API gắn token phiên hiện tại. */
function useDailyReportApis() {
  const { data: session } = useSession();
  return createDailyReportsApis({
    accessToken: session?.accessToken,
    user: session?.user,
  });
}

// ── Đọc ──────────────────────────────────────────────────────────────────────

/**
 * Bản báo cáo hôm nay của tôi. Trước 07:30 BE chỉ đọc; sau 07:30 BE materialize
 * bù bản còn thiếu theo snapshot 07:30. `reports: []` đi kèm `emptyReason` —
 * đọc thẳng cờ đó, không suy từ `pending-count` và không tự so đồng hồ.
 */
export function useMyTodayReports(enabled = true, date?: string) {
  const apis = useDailyReportApis();
  const onBehalfOfUserId = useOnBehalfParam();
  return useQuery({
    queryKey: [...dailyReportKeys.today(date), onBehalfOfUserId ?? 'self'],
    queryFn: () => apis.get.getMyToday(date, onBehalfOfUserId),
    enabled,
    staleTime: 30_000,
  });
}

/** Chỉ dấu chưa nộp trên cột điều hướng. */
export function useReportPendingCount() {
  const apis = useDailyReportApis();
  const onBehalfOfUserId = useOnBehalfParam();
  const { status } = useSession();
  return useQuery({
    queryKey: [...dailyReportKeys.pendingCount(), onBehalfOfUserId ?? 'self'],
    queryFn: () => apis.get.getPendingCount(onBehalfOfUserId),
    enabled: status === 'authenticated',
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

/** Lịch sử báo cáo của tôi. Khoảng tối đa 92 ngày — chặn ở UI trước khi gọi. */
export function useMyReportHistory(query: GetMyReportsQuery, enabled = true) {
  const apis = useDailyReportApis();
  const onBehalfOfUserId = useOnBehalfParam();
  return useQuery({
    queryKey: [...dailyReportKeys.history(query), onBehalfOfUserId ?? 'self'],
    queryFn: () => apis.get.getMyHistory(query, onBehalfOfUserId),
    enabled,
  });
}

/**
 * Lịch sử của MỘT tháng, tải cho tới khi đủ mọi bản trong khoảng.
 *
 * Vì sao cần hook riêng thay vì dùng thẳng `useMyReportHistory`: server trả
 * tối đa 100 bản mỗi trang và sắp `reportDate desc`, nên khi bị cắt thì phần
 * mất luôn nằm ở đầu CŨ của khoảng. Màn Lịch sử vẽ lịch từ danh sách này —
 * thiếu bản nghĩa là những ngày cũ hiện ra thành "không có bản báo cáo",
 * một khẳng định sai về chính người dùng. Thà tải thêm một lượt còn hơn vẽ
 * một cái lịch nói dối.
 *
 * Gộp các trang NGAY TRONG `queryFn` chứ không dùng `useQueries`: số trang chỉ
 * biết được sau lượt gọi đầu, nên với `useQueries` màn sẽ phải render hai nhịp
 * và tự ghép trạng thái tải. Gói trong một `queryFn` thì bên ngoài chỉ thấy
 * một `isLoading` và một khoá cache.
 *
 * `enabled = false` khi tháng nằm hoàn toàn trong tương lai — nơi gọi truyền
 * `null` và hook không hỏi gì cả.
 */
export function useMyReportMonth(
  range: { from: string; to: string } | null,
  scopeId?: string,
) {
  const apis = useDailyReportApis();
  const onBehalfOfUserId = useOnBehalfParam();
  const query: GetMyReportsQuery = {
    from: range?.from ?? '',
    to: range?.to ?? '',
    ...(scopeId ? { scopeId } : {}),
    page: 1,
    limit: MAX_HISTORY_PAGE_SIZE,
  };

  return useQuery({
    queryKey: [
      ...dailyReportKeys.history(query),
      'full',
      onBehalfOfUserId ?? 'self',
    ],
    enabled: range !== null,
    queryFn: async () => {
      const firstPage = await apis.get.getMyHistory(query, onBehalfOfUserId);
      if (firstPage.totalPages <= 1) return firstPage;

      /* Trần an toàn: một tháng có tối đa 31 ngày, nên 5 trang (500 bản) đã
         phủ được người thuộc 16 nhóm. Có trần để một `totalPages` sai từ
         server không biến thành vòng lặp gọi mạng vô tận. */
      const pageCount = Math.min(firstPage.totalPages, 5);
      const restPages = await Promise.all(
        Array.from({ length: pageCount - 1 }, (_, i) =>
          apis.get.getMyHistory({ ...query, page: i + 2 }, onBehalfOfUserId),
        ),
      );

      return {
        ...firstPage,
        data: [...firstPage.data, ...restPages.flatMap((r) => r.data)],
      };
    },
  });
}

/** Chi tiết một bản báo cáo — dùng cả khi mở rộng dòng ở bảng theo dõi nhóm. */
export function useDailyReport(id: string | null) {
  const apis = useDailyReportApis();
  const onBehalfOfUserId = useOnBehalfParam();
  return useQuery({
    queryKey: [
      ...dailyReportKeys.detail(id ?? 'none'),
      onBehalfOfUserId ?? 'self',
    ],
    queryFn: () => apis.get.getById(id as string, onBehalfOfUserId),
    enabled: id !== null,
  });
}

/** Lịch sử các lần nộp. Chỉ gọi khi `permissions.canViewHistory`. */
export function useReportRevisions(id: string | null, enabled = true) {
  const apis = useDailyReportApis();
  const onBehalfOfUserId = useOnBehalfParam();
  return useQuery({
    queryKey: [
      ...dailyReportKeys.revisions(id ?? 'none'),
      onBehalfOfUserId ?? 'self',
    ],
    queryFn: () => apis.get.getRevisions(id as string, onBehalfOfUserId),
    enabled: enabled && id !== null,
  });
}

/** Gợi ý auto-draft dựng lại (nút ↻). */
export function useReportDraft() {
  const apis = useDailyReportApis();
  const onBehalfOfUserId = useOnBehalfParam();
  return useMutation({
    mutationFn: (reportId: string) =>
      apis.get.getDraft(reportId, onBehalfOfUserId),
    /* Nút "Làm mới gợi ý" trước đây hỏng hoàn toàn im lặng: `useMutation` chỉ
       có `mutationFn`, mà QueryClient của repo cũng không khai
       `mutationCache.onError`. Server từ chối `GET /:id/draft` khi bản đã nộp
       hoặc quá giờ khoá — người dùng bấm, vòng xoay tắt, không có gì xảy ra và
       không có lời giải thích nào. */
    onError: (error) => {
      toast.error(errorMessage(error, 'Chưa dựng lại được gợi ý. Thử lại giúp.'));
    },
  });
}

/** Bảng theo dõi nhóm. */
export function useReportBoard(
  scopeId: string | null,
  date?: string,
  status?: BoardStatusFilter,
) {
  const apis = useDailyReportApis();
  return useQuery({
    queryKey: [...dailyReportKeys.board(scopeId ?? 'none', date), status],
    queryFn: () => apis.get.getBoard(scopeId as string, { date, status }),
    enabled: scopeId !== null,
    staleTime: 30_000,
  });
}

/** Số dòng mỗi trang của danh sách chờ duyệt xuyên ngày. */
export const PENDING_REVIEW_PAGE_SIZE = 50;

/**
 * Bản chờ kết luận của một nhóm, XUYÊN NGÀY.
 *
 * Không nhận `date`: bảng theo dõi là ảnh của MỘT ngày, còn việc của người
 * duyệt thì dồn qua nhiều ngày. Hai nguồn vì thế tách nhau, và chip "Chờ duyệt"
 * đọc nguồn này thay vì lọc trong mảng `rows` của một ngày.
 */
export function useReportPendingReview(
  scopeId: string | null,
  options?: { page?: number; enabled?: boolean },
) {
  const apis = useDailyReportApis();
  const page = options?.page;
  return useQuery({
    queryKey: dailyReportKeys.pendingReview(scopeId ?? 'none', page),
    /* `limit` CỐ Ý không phải tham số: hai nơi gọi (badge trên dải và danh sách
       trong bảng) dùng chung một queryKey để chỉ có MỘT request, nên hai cỡ
       trang khác nhau trên cùng một khoá sẽ cho ra dữ liệu tuỳ ai mount trước.
       Phân trang thật là việc của điểm 7 (đợt 3). */
    queryFn: () =>
      apis.get.getPendingReview(scopeId as string, {
        page,
        limit: PENDING_REVIEW_PAGE_SIZE,
      }),
    enabled: (options?.enabled ?? true) && scopeId !== null,
    staleTime: 30_000,
  });
}

/** Nội dung đã nộp của cả nhóm trong một ngày. */
export function useReportGroupOutcome(
  scopeId: string | null,
  date?: string,
  enabled = true,
) {
  const apis = useDailyReportApis();
  return useQuery({
    queryKey: dailyReportKeys.outcome(scopeId ?? 'none', date),
    queryFn: () => apis.get.getGroupOutcome(scopeId as string, date),
    enabled: enabled && scopeId !== null,
    staleTime: 30_000,
  });
}

/** Tổng hợp tuân thủ theo khoảng ngày. Khoảng tối đa 92 ngày. */
export function useReportSummary(
  scopeId: string | null,
  range: SummaryQuery,
  enabled = true,
) {
  const apis = useDailyReportApis();
  const { from, to, ...paging } = range;
  return useQuery({
    queryKey: dailyReportKeys.summary(scopeId ?? 'none', from, to, paging),
    queryFn: () => apis.get.getSummary(scopeId as string, range),
    enabled: enabled && scopeId !== null,
    staleTime: 60_000,
    /* Giữ dữ liệu trang cũ trong lúc trang mới đang bay: không có nó thì bấm
       số trang là cả danh sách nhảy về khung chờ rồi giật lại, và vị trí cuộn
       mất theo. */
    placeholderData: (previous) => previous,
  });
}

export function useReportKpis(scopeId: string | null) {
  const apis = useDailyReportApis();
  return useQuery({
    queryKey: dailyReportKeys.kpis(scopeId ?? 'none'),
    queryFn: () => apis.get.listKpis(scopeId as string),
    enabled: scopeId !== null,
    staleTime: 60_000,
  });
}

export function useCreateReportKpi() {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      scopeId,
      name,
      description,
    }: {
      scopeId: string;
      name: string;
      description?: string;
    }) => apis.post.createKpi(scopeId, { name, description }),
    onSuccess: (_data, vars) => {
      toast.success('Đã thêm KPI.');
      return invalidateAfterKpiWrite(queryClient, vars.scopeId);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Chưa thêm được KPI. Thử lại giúp.'));
    },
  });
}

export function useUpdateReportKpi() {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      scopeId,
      kpiId,
      payload,
    }: {
      scopeId: string;
      kpiId: string;
      payload: {
        name?: string;
        description?: string;
        sortOrder?: number;
        isActive?: boolean;
      };
    }) => apis.patch.updateKpi(scopeId, kpiId, payload),
    /* KHÔNG toast thành công: mutation này gánh cả việc đổi THỨ TỰ, mà đổi thứ
       tự là bấm liên tiếp — mỗi cú bấm một toast thì màn hình phủ kín toast cho
       một thao tác chẳng ai cần được xác nhận. Danh sách tự nhảy chỗ đã là phản
       hồi đủ rõ. Lỗi thì vẫn phải nói. */
    onSuccess: (_data, vars) =>
      invalidateAfterKpiWrite(queryClient, vars.scopeId),
    onError: (error) => {
      toast.error(errorMessage(error, 'Chưa cập nhật được KPI. Thử lại giúp.'));
    },
  });
}

export function useArchiveReportKpi() {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scopeId, kpiId }: { scopeId: string; kpiId: string }) =>
      apis.delete.archiveKpi(scopeId, kpiId),
    onSuccess: (_data, vars) => {
      /* "Ngừng dùng" chứ không "Đã xoá": server ARCHIVE chứ không xoá cứng —
         lịch sử và tổng hợp vẫn đọc được tên KPI đã chụp. Nói "đã xoá" là hứa
         một thứ hệ thống cố ý không làm. */
      toast.success('Đã ngừng dùng KPI này.');
      return invalidateAfterKpiWrite(queryClient, vars.scopeId);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Chưa ngừng dùng được KPI. Thử lại giúp.'));
    },
  });
}

export function useScopeMemberReportHistory(
  scopeId: string,
  memberId: string | null,
  range: { from: string; to: string },
) {
  const apis = useDailyReportApis();
  return useQuery({
    queryKey: dailyReportKeys.memberHistory(
      scopeId,
      memberId ?? 'none',
      range.from,
      range.to,
    ),
    queryFn: () =>
      apis.get.getScopeMemberHistory(scopeId, {
        memberId: memberId as string,
        ...range,
        page: 1,
        limit: MAX_HISTORY_PAGE_SIZE,
      }),
    enabled: memberId !== null,
  });
}

/** Các phạm vi báo cáo tôi thuộc về. */
export function useMyReportScopes(enabled = true) {
  const apis = useDailyReportApis();
  return useQuery({
    queryKey: dailyReportKeys.scopes(),
    queryFn: () => apis.get.getMyScopes(),
    enabled,
    staleTime: 60_000,
  });
}

/** Cấu hình + thành viên của một phạm vi (trang quản lý nhóm). */
export function useReportScopeDetail(scopeId: string | null) {
  const apis = useDailyReportApis();
  return useQuery({
    queryKey: dailyReportKeys.scopeDetail(scopeId ?? 'none'),
    queryFn: () => apis.get.getScopeDetail(scopeId as string),
    enabled: scopeId !== null,
    staleTime: 60_000,
  });
}

/** Preview danh sách thành viên và số bản sẽ tạo hôm nay. */
export function useTodayGenerationPreview(
  scopeId: string | null,
  enabled = true,
) {
  const apis = useDailyReportApis();
  return useQuery({
    queryKey: dailyReportKeys.generationPreview(scopeId ?? 'none'),
    queryFn: () => apis.get.getTodayGenerationPreview(scopeId as string),
    enabled: enabled && scopeId !== null,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

/** Bộ câu hỏi hệ thống + bộ của tôi. */
export function useReportTemplates(enabled = true) {
  const apis = useDailyReportApis();
  return useQuery({
    queryKey: dailyReportKeys.templates(),
    queryFn: () => apis.get.listTemplates(),
    enabled,
    staleTime: 5 * 60_000,
  });
}

/** Một bộ câu hỏi kèm đủ mọi version. */
export function useReportTemplate(id: string | null) {
  const apis = useDailyReportApis();
  return useQuery({
    queryKey: dailyReportKeys.template(id ?? 'none'),
    queryFn: () => apis.get.getTemplate(id as string),
    enabled: id !== null,
    staleTime: 5 * 60_000,
  });
}

/** Yêu cầu hỗ trợ do tôi tạo hoặc tôi được nhắc tên. */
export function useMyHelpRequests(
  status?: DailyReportHelpRequestStatus,
  enabled = true,
) {
  const apis = useDailyReportApis();
  return useQuery({
    queryKey: dailyReportKeys.helpRequests(status),
    queryFn: () => apis.get.listMyHelpRequests(status),
    enabled,
    staleTime: 30_000,
  });
}

// ── Ghi ──────────────────────────────────────────────────────────────────────

/** Lưu nháp (tự động sau khi ngừng gõ và khi rời trang). */
/**
 * Rút câu lỗi mà server thật sự gửi về, thay vì nuốt im.
 *
 * Ba mutation cấu hình scope trước đây chỉ có `onSuccess`. QueryClient của repo
 * (`components/providers/index.tsx`) cũng không khai `mutationCache.onError`, nên
 * mọi thất bại là hoàn toàn vô hình: công tắc xám một nhịp rồi bật về chỗ cũ.
 * Ba mã hay gặp nhất ở đây là 403 (không phải trưởng nhóm), 409 (nhóm đã có cấu
 * hình đang tạm dừng) và 422 (ngày báo cáo không hợp lệ).
 */
function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { message?: unknown })?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

/**
 * Mã lỗi mang nghĩa "thứ đang hiện trên màn đã cũ so với server": người khác
 * vừa chuyển/huỷ/xác nhận đúng việc này, bản vừa khoá, việc vừa xong, hay quyền
 * vừa đổi. Câu trả lời đúng cho cả bốn là TẢI LẠI - toast một mình để màn kẹt ở
 * trạng thái cũ, và bấm lại vẫn ra đúng lỗi đó cho tới khi F5, vì query client
 * của repo tắt `refetchOnWindowFocus`.
 */
const STALE_WRITE_STATUS = new Set([403, 404, 409, 422]);

function isStaleWriteError(error: unknown): boolean {
  const status = (error as { statusCode?: unknown } | null)?.statusCode;
  return typeof status === 'number' && STALE_WRITE_STATUS.has(status);
}

export function useSaveReportAnswers() {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  const onBehalfOfUserId = useOnBehalfParam();
  return useMutation({
    mutationFn: ({
      reportId,
      answers,
      achievedKpiIds,
    }: {
      reportId: string;
      answers: SaveAnswerPayload[];
      achievedKpiIds?: string[];
    }) =>
      apis.patch.saveAnswers(
        reportId,
        answers,
        achievedKpiIds,
        onBehalfOfUserId,
      ),
    onSuccess: (_data, vars) =>
      invalidateAfterWrite(queryClient, vars.reportId),
    onError: () => {
      toast.error('Chưa lưu được nháp. Nội dung của bạn vẫn còn đây.');
    },
  });
}

/** Nộp báo cáo. Idempotent — gọi lại trên bản đã nộp chỉ trả về bản hiện tại. */
export function useSubmitReport() {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  const onBehalfOfUserId = useOnBehalfParam();
  return useMutation({
    mutationFn: ({
      reportId,
      answers,
      achievedKpiIds,
    }: {
      reportId: string;
      answers?: SaveAnswerPayload[];
      achievedKpiIds?: string[];
    }) =>
      apis.post.submit(reportId, answers, achievedKpiIds, onBehalfOfUserId),
    /* `toast` gọi TRƯỚC rồi mới `return` promise: câu báo phải hiện ngay, còn
       `isPending` thì phải giữ cho tới khi refetch xong. */
    onSuccess: (_data, vars) => {
      toast.success('Đã nộp báo cáo hôm nay.');
      return invalidateAfterWrite(queryClient, vars.reportId);
    },
    /* Trước đây KHÔNG có nhánh này, mà QueryClient của repo cũng không khai
       `mutationCache.onError` — nên nộp hỏng là hoàn toàn vô hình: vòng xoay
       trên nút tắt đi và không có gì khác xảy ra. Người dùng chỉ còn cách bấm
       lại và đoán. Ba mã hay gặp: 409 (bản vừa bị đổi bởi request khác),
       422 (thiếu câu bắt buộc) và 403 (quá giờ khoá 23:00). */
    onError: (error) => {
      toast.error(errorMessage(error, 'Chưa nộp được báo cáo. Thử lại giúp.'));
    },
  });
}

/**
 * Ra quyết định duyệt trên một lần nộp.
 *
 * Không dựng lại luật kiểm ở đây: server kiểm sáu điều kiện và toàn bộ dòng
 * chuyển tiếp, kể cả việc `taskId` có thuộc chính bản đang duyệt hay không.
 * Việc của client là hiện đúng thông báo khi server từ chối - 409 nghĩa là
 * người khác vừa xử lý xong hoặc bản vừa quá hạn, và câu trả lời đúng cho cả
 * hai là tải lại.
 */
export function useReviewReport() {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  const onBehalfOfUserId = useOnBehalfParam();
  return useMutation({
    mutationFn: ({
      reportId,
      payload,
    }: {
      reportId: string;
      payload: ReviewDailyReportPayload;
    }) => apis.post.review(reportId, payload, onBehalfOfUserId),
    onSuccess: (_data, vars) => {
      toast.success(REVIEW_DONE_MESSAGE[vars.payload.decision]);
      return invalidateAfterWrite(queryClient, vars.reportId);
    },
    onError: (error, vars) => {
      toast.error(errorMessage(error, 'Chưa gửi được kết luận. Thử lại giúp.'));
      // Trả promise để `isPending` giữ tới khi màn đã khớp server.
      if (isStaleWriteError(error)) {
        return invalidateAfterWrite(queryClient, vars.reportId);
      }
    },
  });
}

const REVIEW_DONE_MESSAGE: Record<DailyReportReviewDecision, string> = {
  ACCEPTED: 'Đã duyệt đạt báo cáo này.',
  CONTINUED: 'Đã duyệt và chuyển việc sang ngày làm việc kế tiếp.',
  REJECTED: 'Đã trả lại báo cáo để thành viên sửa.',
};

/**
 * Trang Nhóm duyệt của một phạm vi: các nhóm có tên, thành viên của phạm vi,
 * người chưa được chia, và id của quản lý.
 *
 * Chỉ quản lý phạm vi gọi được (server gác `isManager`), nên chỉ bật query khi
 * người xem thật sự là quản lý — gọi bừa chỉ đổi lấy một dòng 403 trong log.
 */
export function useReviewGroups(scopeId: string | null, enabled = true) {
  const apis = useDailyReportApis();
  return useQuery({
    queryKey: dailyReportKeys.reviewGroups(scopeId ?? ''),
    queryFn: () => apis.get.listReviewGroups(scopeId as string),
    enabled: Boolean(scopeId) && enabled,
  });
}

/**
 * Lưu MỘT nhóm duyệt: không có `groupId` là tạo mới, có là sửa.
 *
 * Một hook cho cả hai vì form chỉ có một: cùng ba trường, cùng luật, cùng câu
 * trả lời của server (nguyên trang nhóm duyệt sau khi ghi).
 *
 * Lỗi 409 (người khác vừa sửa) và 422 (mốc cập nhật đã cũ) được TẢI LẠI danh
 * sách, không chỉ toast: `isStaleWriteError` gom đúng nhóm mã đó, và màn đứng
 * im với dữ liệu cũ thì người dùng bấm Lưu lại cũng ăn đúng lỗi ấy mãi.
 */
export function useSaveReviewGroup(scopeId: string | null) {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      payload,
    }: {
      groupId?: string;
      payload: SaveReviewGroupPayload;
    }) =>
      groupId
        ? apis.post.saveReviewGroup(scopeId as string, groupId, payload)
        : apis.post.createReviewGroup(scopeId as string, payload),
    onSuccess: (data, vars) => {
      queryClient.setQueryData(
        dailyReportKeys.reviewGroups(scopeId ?? ''),
        data,
      );
      /* Nói ra hiệu lực NGAY, vì đó là điều người dùng đang cần biết: quyền
         duyệt suy trực tiếp từ nhóm nên bản đã nộp hôm nay mở được liền. */
      toast.success(
        vars.groupId
          ? 'Đã lưu bộ phận. Áp dụng ngay cho các bản đang chờ duyệt.'
          : 'Đã tạo bộ phận. Người duyệt xem và duyệt được ngay hôm nay.',
      );
      return queryClient.invalidateQueries({
        queryKey: dailyReportKeys.board(scopeId ?? ''),
      });
    },
    onError: (error) => {
      toast.error(
        errorMessage(error, 'Chưa lưu được bộ phận. Thử lại giúp.'),
      );
      if (isStaleWriteError(error)) {
        return queryClient.invalidateQueries({
          queryKey: dailyReportKeys.reviewGroups(scopeId ?? ''),
        });
      }
    },
  });
}

/** Xoá một nhóm duyệt: người duyệt của nhóm mất quyền ngay. */
export function useDeleteReviewGroup(scopeId: string | null) {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) =>
      apis.delete.removeReviewGroup(scopeId as string, groupId),
    onSuccess: (data) => {
      queryClient.setQueryData(
        dailyReportKeys.reviewGroups(scopeId ?? ''),
        data,
      );
      toast.success('Đã xoá bộ phận. Bản của những người đó quay về cho bạn.');
      return queryClient.invalidateQueries({
        queryKey: dailyReportKeys.board(scopeId ?? ''),
      });
    },
    onError: (error) => {
      toast.error(
        errorMessage(error, 'Chưa xoá được bộ phận. Thử lại giúp.'),
      );
      if (isStaleWriteError(error)) {
        return queryClient.invalidateQueries({
          queryKey: dailyReportKeys.reviewGroups(scopeId ?? ''),
        });
      }
    },
  });
}

/**
 * Huỷ một việc người duyệt đã chuyển tiếp. Báo cáo nguồn giữ nguyên kết luận
 * CONTINUED.
 */
export function useCancelCarryOver(reportId: string) {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (carryOverId: string) =>
      apis.delete.cancelCarryOver(carryOverId),
    onSuccess: () => {
      toast.success('Đã huỷ việc chuyển tiếp.');
      return invalidateAfterWrite(queryClient, reportId);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Chưa huỷ được. Thử lại giúp.'));
      if (isStaleWriteError(error)) {
        return invalidateAfterWrite(queryClient, reportId);
      }
    },
  });
}

/** Mở lại bản đã nộp. Bắt buộc có lý do. */
export function useReopenReport() {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  const onBehalfOfUserId = useOnBehalfParam();
  return useMutation({
    mutationFn: ({ reportId, reason }: { reportId: string; reason: string }) =>
      apis.post.reopen(reportId, reason, onBehalfOfUserId),
    onSuccess: (_data, vars) => {
      toast.success('Đã mở lại báo cáo để chỉnh sửa.');
      return invalidateAfterWrite(queryClient, vars.reportId);
    },
    /* Cùng lý do với `useSubmitReport`: mở lại hỏng thì trước đây hoàn toàn vô
       hình. Hay gặp nhất là 403 sau mốc khoá 23:00 và 409 khi bản vừa bị người
       khác đổi. */
    onError: (error) => {
      toast.error(errorMessage(error, 'Chưa mở lại được báo cáo. Thử lại giúp.'));
    },
  });
}

/** Bật báo cáo hằng ngày cho nhóm. */
export function useCreateReportScope() {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReportScopePayload) =>
      apis.post.createScope(payload),
    onSuccess: (created) => {
      // Vá thẳng vào danh sách `/my` trước khi refetch. Không vá thì suốt vòng
      // refetch `scope` vẫn là null: công tắc hiện TẮT ngay sau toast báo thành
      // công, khối cấu hình chưa hiện, và bấm lại sẽ POST trùng → 409.
      queryClient.setQueryData<DailyReportScopeListItem[]>(
        dailyReportKeys.scopes(),
        (old) =>
          old && !old.some((s) => s.id === created.id)
            ? [...old, { ...created, name: '', isManager: true }]
            : old,
      );
      toast.success('Đã bật báo cáo hằng ngày cho nhóm.');
      return invalidateScopeConfig(queryClient);
    },
    onError: (error) => {
      toast.error(
        errorMessage(error, 'Chưa bật được báo cáo hằng ngày cho nhóm.'),
      );
    },
  });
}

/** Sửa cấu hình báo cáo của nhóm. */
export function useUpdateReportScope() {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      scopeId,
      payload,
    }: {
      scopeId: string;
      payload: UpdateReportScopePayload;
    }) => apis.patch.updateScope(scopeId, payload),
    onSuccess: () => {
      toast.success('Đã cập nhật cấu hình báo cáo.');
      return invalidateScopeConfig(queryClient);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Chưa cập nhật được cấu hình báo cáo.'));
    },
  });
}

/**
 * Lưu trữ phạm vi báo cáo — KHÔNG đảo ngược được. Mọi report chuyển `ARCHIVED`
 * và scope biến mất khỏi danh sách. Muốn tạm dừng thì gọi `useUpdateReportScope`
 * với `{ isEnabled: false }`.
 */
export function useRemoveReportScope() {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scopeId: string) => apis.delete.removeScope(scopeId),
    onSuccess: () => {
      toast.success('Đã lưu trữ báo cáo hằng ngày của nhóm.');
      return invalidateScopeConfig(queryClient);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Chưa lưu trữ được cấu hình báo cáo.'));
    },
  });
}

/** Tạo bản báo cáo hôm nay cho cả nhóm sau khi trưởng nhóm xác nhận preview. */
export function useGenerateTodayReports() {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scopeId: string) => apis.post.generateToday(scopeId),
    onSuccess: (result, scopeId) => {
      invalidateScopeConfig(queryClient);
      queryClient.invalidateQueries({
        queryKey: dailyReportKeys.generationPreview(scopeId),
      });
      toast.success(
        result.createdReports > 0
          ? `Đã tạo ${result.createdReports} báo cáo hôm nay.`
          : 'Báo cáo hôm nay đã được tạo trước đó.',
      );
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Chưa tạo được báo cáo hôm nay.'));
    },
  });
}

/** Tạo bộ câu hỏi riêng. */
export function useCreateReportTemplate() {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTemplatePayload) =>
      apis.post.createTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyReportKeys.templates() });
      toast.success('Đã tạo bộ câu hỏi mới.');
    },
  });
}

/** Sửa bộ câu hỏi — phát hành một phiên bản mới, bản cũ giữ nguyên. */
export function useUpdateReportTemplate() {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      payload,
    }: {
      templateId: string;
      payload: UpdateTemplatePayload;
    }) => apis.patch.updateTemplate(templateId, payload),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: dailyReportKeys.templates() });
      queryClient.invalidateQueries({
        queryKey: dailyReportKeys.template(vars.templateId),
      });
      // Phát hành version mới trỏ lại mọi scope chưa archive đang dùng bộ này.
      invalidateScopeConfig(queryClient);
      toast.success('Đã phát hành phiên bản mới của bộ câu hỏi.');
    },
  });
}

/** Nhân bản một bộ câu hỏi nhìn thấy được thành bộ của mình. */
export function useCloneReportTemplate() {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      payload,
    }: {
      templateId: string;
      payload?: CloneTemplatePayload;
    }) => apis.post.cloneTemplate(templateId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyReportKeys.templates() });
      toast.success('Đã nhân bản bộ câu hỏi.');
    },
  });
}

/** Tiếp nhận yêu cầu hỗ trợ. */
export function useAcknowledgeHelpRequest() {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; reportId?: string }) =>
      apis.post.acknowledgeHelp(id),
    onSuccess: (_data, vars) => {
      invalidateAfterHelpWrite(queryClient, vars.reportId);
      toast.success('Đã tiếp nhận yêu cầu hỗ trợ.');
    },
  });
}

/** Tích "Đã giải quyết" cho một yêu cầu hỗ trợ. */
export function useResolveHelpRequest() {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; reportId?: string }) =>
      apis.post.resolveHelp(id),
    onSuccess: (_data, vars) => {
      toast.success('Đã đánh dấu đã giải quyết.');
      return invalidateAfterHelpWrite(queryClient, vars.reportId);
    },
    /* 409 là người khác vừa tích hoặc bỏ tích đúng yêu cầu này: tải lại để ô
       tích khớp server, không thì bấm lại vẫn ra đúng lỗi đó. */
    onError: (error, vars) => {
      toast.error(errorMessage(error, 'Chưa đánh dấu được. Thử lại giúp.'));
      if (isStaleWriteError(error)) {
        return invalidateAfterHelpWrite(queryClient, vars.reportId);
      }
    },
  });
}

/** Bỏ tích "Đã giải quyết": yêu cầu về lại chưa giải quyết. */
export function useReopenHelpRequest() {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; reportId?: string }) =>
      apis.post.reopenHelp(id),
    onSuccess: (_data, vars) => {
      toast.success('Đã chuyển về chưa giải quyết.');
      return invalidateAfterHelpWrite(queryClient, vars.reportId);
    },
    onError: (error, vars) => {
      toast.error(errorMessage(error, 'Chưa bỏ tích được. Thử lại giúp.'));
      if (isStaleWriteError(error)) {
        return invalidateAfterHelpWrite(queryClient, vars.reportId);
      }
    },
  });
}

/** Hủy yêu cầu hỗ trợ — chỉ người yêu cầu. */
export function useCancelHelpRequest() {
  const apis = useDailyReportApis();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; reportId?: string }) =>
      apis.post.cancelHelp(id),
    onSuccess: (_data, vars) => {
      invalidateAfterHelpWrite(queryClient, vars.reportId);
      toast.success('Đã hủy yêu cầu hỗ trợ.');
    },
  });
}
