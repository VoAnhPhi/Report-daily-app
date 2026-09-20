import { APIRouters } from '../APIRouters';
import { api } from '../index';
import { AuthUser } from '@/lib/auth';
import {
  ArchiveScopeResponse,
  BoardResponse,
  BoardStatusFilter,
  CloneTemplatePayload,
  CreateReportScopePayload,
  CreateTemplatePayload,
  DailyReport,
  DailyReportHelpRequest,
  DailyReportHelpRequestStatus,
  DailyReportGenerationPreview,
  DailyReportGenerationResult,
  DailyReportHistoryResponse,
  DailyReportKpi,
  DailyReportRevision,
  DailyReportScope,
  DailyReportScopeDetail,
  DailyReportScopeListItem,
  DailyReportStatus,
  DailyReportTemplate,
  DailyReportTemplateVersion,
  DraftResponse,
  GroupOutcomeResponse,
  HelpRequestWithReport,
  MyTodayResponse,
  PendingCountResponse,
  PendingReviewResponse,
  SaveAnswerPayload,
  SummaryResponse,
  ScopeMemberHistoryResponse,
  UpdateReportScopePayload,
  UpdateTemplatePayload,
  ReviewDailyReportPayload,
  ReviewGroupsResponse,
  SaveReviewGroupPayload,
  ScopeMemberInfo,
} from '@/types/daily-report.type';

/** Nối `onBehalfOfUserId` vào URL (làm thay) — cùng khuôn với tasks API. */
const withCare = (url: string, onBehalfOfUserId?: string): string => {
  if (!onBehalfOfUserId) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}onBehalfOfUserId=${encodeURIComponent(onBehalfOfUserId)}`;
};

/** Nối query string đã dựng sẵn, bỏ qua khi rỗng. */
const withQuery = (url: string, params: URLSearchParams): string => {
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
};

/** Tham số của `GET scope/:id/summary`, kèm phân trang ba danh sách. */
export interface SummaryQuery {
  from: string;
  to: string;
  memberPage?: number;
  memberLimit?: number;
  /** Id bộ phận, hoặc `none` cho người chưa thuộc bộ phận nào. */
  memberDepartment?: string;
  /** Giá trị của `DailyReportBoardState`; lọc thành viên có bản ở trạng thái đó. */
  reviewState?: string;
  /** Người đang xem ở chế độ "Theo thành viên": stat của họ luôn về trong `focusedMember`. */
  memberFocus?: string;
  openHelpPage?: number;
  resolvedHelpPage?: number;
  helpLimit?: number;
}

export interface GetMyReportsQuery {
  /** 'YYYY-MM-DD'. Khoảng tối đa 92 ngày inclusive, quá thì BE trả 422. */
  from: string;
  to: string;
  scopeId?: string;
  /** Contract mới lọc theo `status`; `isResponse` đã bị gỡ khỏi API. */
  status?: DailyReportStatus;
  page?: number;
  limit?: number;
}

export const createDailyReportsApis = ({
  accessToken,
  user,
}: {
  accessToken?: string;
  user?: AuthUser;
}) => {
  const opts = { accessToken, user };
  return {
    get: {
      /**
       * Cả trang Nhóm duyệt trong MỘT lượt gọi: các nhóm, thành viên của phạm
       * vi, người chưa được chia, và id của quản lý.
       */
      listReviewGroups: async (scopeId: string) => {
        const response = await api.get<ReviewGroupsResponse>(
          APIRouters.dailyReportScopes.reviewGroups(scopeId),
          opts,
        );
        return response.data;
      },

      /**
       * Bản hôm nay. BE CHỈ ĐỌC snapshot cron 07:30 sinh — không tạo bản mới.
       * Bỏ trống `date` là an toàn nhất: BE tính "hôm nay" theo
       * Asia/Ho_Chi_Minh, gửi ngày lệch múi giờ trình duyệt sẽ bị 422.
       */
      getMyToday: async (date?: string, onBehalfOfUserId?: string) => {
        const params = new URLSearchParams();
        if (date) params.append('date', date);
        const url = withCare(
          withQuery(APIRouters.dailyReports.myToday, params),
          onBehalfOfUserId,
        );
        const response = await api.get<MyTodayResponse>(url, opts);
        return response.data;
      },
      /** Chỉ dấu chưa nộp trên cột điều hướng — gọi nhẹ, thường xuyên. */
      getPendingCount: async (onBehalfOfUserId?: string) => {
        const response = await api.get<PendingCountResponse>(
          withCare(APIRouters.dailyReports.myPendingCount, onBehalfOfUserId),
          opts,
        );
        return response.data;
      },
      /** Lịch sử báo cáo của tôi. Envelope dùng `pageSize`, không phải `limit`. */
      getMyHistory: async (
        query: GetMyReportsQuery,
        onBehalfOfUserId?: string,
      ) => {
        const params = new URLSearchParams();
        params.append('from', query.from);
        params.append('to', query.to);
        if (query.scopeId) params.append('scopeId', query.scopeId);
        if (query.status) params.append('status', query.status);
        if (query.page) params.append('page', String(query.page));
        if (query.limit) params.append('limit', String(query.limit));
        const response = await api.get<DailyReportHistoryResponse>(
          withCare(
            withQuery(APIRouters.dailyReports.my, params),
            onBehalfOfUserId,
          ),
          opts,
        );
        return response.data;
      },
      getById: async (id: string, onBehalfOfUserId?: string) => {
        const response = await api.get<DailyReport>(
          withCare(APIRouters.dailyReports.byId(id), onBehalfOfUserId),
          opts,
        );
        return response.data;
      },
      /** Gợi ý auto-draft mới — không ghi DB. */
      getDraft: async (id: string, onBehalfOfUserId?: string) => {
        const response = await api.get<DraftResponse>(
          withCare(APIRouters.dailyReports.draft(id), onBehalfOfUserId),
          opts,
        );
        return response.data;
      },
      /** Lịch sử các lần nộp — append-only, mới nhất trước. */
      getRevisions: async (id: string, onBehalfOfUserId?: string) => {
        const response = await api.get<DailyReportRevision[]>(
          withCare(APIRouters.dailyReports.revisions(id), onBehalfOfUserId),
          opts,
        );
        return response.data;
      },
      /** Bảng theo dõi nhóm (trưởng nhóm + thành viên). */
      getBoard: async (
        scopeId: string,
        query?: { date?: string; status?: BoardStatusFilter },
      ) => {
        const params = new URLSearchParams();
        if (query?.date) params.append('date', query.date);
        if (query?.status) params.append('status', query.status);
        const response = await api.get<BoardResponse>(
          withQuery(APIRouters.dailyReports.board(scopeId), params),
          opts,
        );
        return response.data;
      },
      /**
       * Bản chờ kết luận của cả nhóm, XUYÊN NGÀY. Nguồn của badge "Nhóm (n)" và
       * của chip "Chờ duyệt" trên bảng.
       */
      getPendingReview: async (
        scopeId: string,
        query?: { page?: number; limit?: number },
      ) => {
        const params = new URLSearchParams();
        if (query?.page) params.append('page', String(query.page));
        if (query?.limit) params.append('limit', String(query.limit));
        const response = await api.get<PendingReviewResponse>(
          withQuery(APIRouters.dailyReports.pendingReview(scopeId), params),
          opts,
        );
        return response.data;
      },
      /** Nội dung đã nộp của cả nhóm trong một ngày. */
      getGroupOutcome: async (scopeId: string, date?: string) => {
        const params = new URLSearchParams();
        if (date) params.append('date', date);
        const response = await api.get<GroupOutcomeResponse>(
          withQuery(APIRouters.dailyReports.outcome(scopeId), params),
          opts,
        );
        return response.data;
      },
      /** Tổng hợp tuân thủ + việc tồn đọng lặp lại + yêu cầu hỗ trợ chưa và đã giải quyết. */
      getSummary: async (scopeId: string, query: SummaryQuery) => {
        const params = new URLSearchParams();
        params.append('from', query.from);
        params.append('to', query.to);
        /* Ba danh sách phân trang độc lập; tham số nào không truyền thì server
           dùng mặc định của nó, nên URL sạch ở ca thường. */
        if (query.memberPage) params.append('memberPage', String(query.memberPage));
        if (query.memberLimit)
          params.append('memberLimit', String(query.memberLimit));
        if (query.memberDepartment)
          params.append('memberDepartment', query.memberDepartment);
        if (query.reviewState) params.append('reviewState', query.reviewState);
        if (query.memberFocus)
          params.append('memberFocus', query.memberFocus);
        if (query.openHelpPage)
          params.append('openHelpPage', String(query.openHelpPage));
        if (query.resolvedHelpPage)
          params.append('resolvedHelpPage', String(query.resolvedHelpPage));
        if (query.helpLimit) params.append('helpLimit', String(query.helpLimit));
        const response = await api.get<SummaryResponse>(
          withQuery(APIRouters.dailyReports.summary(scopeId), params),
          opts,
        );
        return response.data;
      },
      getScopeMemberHistory: async (
        scopeId: string,
        query: GetMyReportsQuery & { memberId: string },
      ) => {
        const params = new URLSearchParams();
        params.append('memberId', query.memberId);
        params.append('from', query.from);
        params.append('to', query.to);
        if (query.status) params.append('status', query.status);
        if (query.page) params.append('page', String(query.page));
        if (query.limit) params.append('limit', String(query.limit));
        const response = await api.get<ScopeMemberHistoryResponse>(
          withQuery(APIRouters.dailyReports.memberHistory(scopeId), params),
          opts,
        );
        return response.data;
      },
      listKpis: async (scopeId: string, includeInactive = false) => {
        const params = new URLSearchParams();
        if (includeInactive) params.append('includeInactive', 'true');
        const response = await api.get<DailyReportKpi[]>(
          withQuery(APIRouters.dailyReportScopes.kpis(scopeId), params),
          opts,
        );
        return response.data;
      },
      /** Phạm vi báo cáo tôi được xem, kèm `name` + `isManager`. Không gồm bản đã archive. */
      getMyScopes: async () => {
        const response = await api.get<DailyReportScopeListItem[]>(
          APIRouters.dailyReportScopes.my,
          opts,
        );
        return response.data;
      },
      /** Cấu hình + danh sách thành viên của một phạm vi. */
      getScopeDetail: async (scopeId: string) => {
        const response = await api.get<DailyReportScopeDetail>(
          APIRouters.dailyReportScopes.byId(scopeId),
          opts,
        );
        return response.data;
      },
      /** Preview tạo báo cáo hôm nay — không ghi DB. */
      getTodayGenerationPreview: async (scopeId: string) => {
        const response = await api.get<DailyReportGenerationPreview>(
          APIRouters.dailyReportScopes.generateTodayPreview(scopeId),
          opts,
        );
        return response.data;
      },
      /** Bộ câu hỏi hệ thống + bộ của tôi, mỗi bộ kèm version mới nhất. */
      listTemplates: async () => {
        const response = await api.get<DailyReportTemplate[]>(
          APIRouters.dailyReportTemplates.base,
          opts,
        );
        return response.data;
      },
      /** Một bộ câu hỏi kèm ĐỦ mọi version, mới nhất trước. */
      getTemplate: async (id: string) => {
        const response = await api.get<DailyReportTemplate>(
          APIRouters.dailyReportTemplates.byId(id),
          opts,
        );
        return response.data;
      },
      /** Yêu cầu hỗ trợ do tôi tạo hoặc tôi được nhắc tên. Tối đa 100 bản ghi. */
      listMyHelpRequests: async (status?: DailyReportHelpRequestStatus) => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        const response = await api.get<HelpRequestWithReport[]>(
          withQuery(APIRouters.dailyReportHelpRequests.my, params),
          opts,
        );
        return response.data;
      },
    },
    patch: {
      updateKpi: async (
        scopeId: string,
        kpiId: string,
        payload: {
          name?: string;
          description?: string;
          sortOrder?: number;
          isActive?: boolean;
        },
      ) => {
        const response = await api.patch<DailyReportKpi>(
          APIRouters.dailyReportScopes.kpi(scopeId, kpiId),
          { ...opts, data: payload },
        );
        return response.data;
      },
      /** Lưu nháp. Chỉ ghi đè các câu được gửi lên; câu thiếu giữ nguyên. */
      saveAnswers: async (
        id: string,
        answers: SaveAnswerPayload[],
        achievedKpiIds?: string[],
        onBehalfOfUserId?: string,
      ) => {
        const response = await api.patch<DailyReport>(
          withCare(APIRouters.dailyReports.byId(id), onBehalfOfUserId),
          { ...opts, data: { answers, achievedKpiIds } },
        );
        return response.data;
      },
      updateScope: async (id: string, payload: UpdateReportScopePayload) => {
        const response = await api.patch<DailyReportScope>(
          APIRouters.dailyReportScopes.byId(id),
          { ...opts, data: payload },
        );
        return response.data;
      },
      /**
       * Sửa bộ câu hỏi = phát hành version mới; bản cũ giữ nguyên và mọi scope
       * chưa archive dùng bộ này được trỏ sang version mới.
       * Trả về `DailyReportTemplateVersion`, KHÔNG phải cả template.
       */
      updateTemplate: async (id: string, payload: UpdateTemplatePayload) => {
        const response = await api.patch<DailyReportTemplateVersion>(
          APIRouters.dailyReportTemplates.byId(id),
          { ...opts, data: payload },
        );
        return response.data;
      },
    },
    post: {
      /**
       * Kết luận của người duyệt trên một lần nộp.
       *
       * `CONTINUED` bắt buộc kèm >= 1 dòng chuyển tiếp; `REJECTED` bắt buộc
       * `comment`; hai quyết định kia phải KHÔNG kèm dòng nào. Server kiểm lại
       * toàn bộ, kể cả `taskId` có thuộc chính bản đang duyệt hay không, nên
       * đừng dựng lại luật đó ở client.
       */
      review: async (
        id: string,
        payload: ReviewDailyReportPayload,
        onBehalfOfUserId?: string,
      ) => {
        const response = await api.post<DailyReport>(
          withCare(APIRouters.dailyReports.review(id), onBehalfOfUserId),
          { ...opts, data: payload },
        );
        return response.data;
      },

      /** Tạo một nhóm duyệt: tên + người duyệt (>= 1) + thành viên (>= 1). */
      createReviewGroup: async (
        scopeId: string,
        payload: SaveReviewGroupPayload,
      ) => {
        const response = await api.post<ReviewGroupsResponse>(
          APIRouters.dailyReportScopes.reviewGroups(scopeId),
          { ...opts, data: payload },
        );
        return response.data;
      },

      /**
       * Lưu TOÀN BỘ một nhóm duyệt: tên, người duyệt, thành viên. Không cộng
       * dồn — bỏ tích một thành viên rồi lưu là họ ra khỏi nhóm.
       *
       * ⚠ `expectedUpdatedAt` BẮT BUỘC, lấy nguyên từ lần đọc danh sách: thiếu
       * thì server trả 422, còn người khác vừa sửa thì trả 409.
       */
      saveReviewGroup: async (
        scopeId: string,
        groupId: string,
        payload: SaveReviewGroupPayload,
      ) => {
        const response = await api.put<ReviewGroupsResponse>(
          APIRouters.dailyReportScopes.reviewGroup(scopeId, groupId),
          { ...opts, data: payload },
        );
        return response.data;
      },

      createKpi: async (
        scopeId: string,
        payload: { name: string; description?: string; sortOrder?: number },
      ) => {
        const response = await api.post<DailyReportKpi>(
          APIRouters.dailyReportScopes.kpis(scopeId),
          { ...opts, data: payload },
        );
        return response.data;
      },
      /** Nộp báo cáo (idempotent). Có thể gửi kèm answers để lưu + nộp một lần. */
      submit: async (
        id: string,
        answers?: SaveAnswerPayload[],
        achievedKpiIds?: string[],
        onBehalfOfUserId?: string,
      ) => {
        const response = await api.post<DailyReport>(
          withCare(APIRouters.dailyReports.submit(id), onBehalfOfUserId),
          { ...opts, data: { answers, achievedKpiIds } },
        );
        return response.data;
      },
      /** Mở lại bản đã nộp. Bắt buộc có lý do. */
      reopen: async (id: string, reason: string, onBehalfOfUserId?: string) => {
        const response = await api.post<DailyReport>(
          withCare(APIRouters.dailyReports.reopen(id), onBehalfOfUserId),
          { ...opts, data: { reason } },
        );
        return response.data;
      },
      /** Bật báo cáo hằng ngày cho một nhóm/đội. */
      createScope: async (payload: CreateReportScopePayload) => {
        const response = await api.post<DailyReportScope>(
          APIRouters.dailyReportScopes.base,
          { ...opts, data: payload },
        );
        return response.data;
      },
      /** Tạo báo cáo hôm nay theo snapshot 07:30, idempotent. */
      generateToday: async (scopeId: string) => {
        const response = await api.post<DailyReportGenerationResult>(
          APIRouters.dailyReportScopes.generateToday(scopeId),
          { ...opts, data: {} },
        );
        return response.data;
      },
      createTemplate: async (payload: CreateTemplatePayload) => {
        const response = await api.post<DailyReportTemplate>(
          APIRouters.dailyReportTemplates.base,
          { ...opts, data: payload },
        );
        return response.data;
      },
      cloneTemplate: async (id: string, payload: CloneTemplatePayload = {}) => {
        const response = await api.post<DailyReportTemplate>(
          APIRouters.dailyReportTemplates.clone(id),
          { ...opts, data: payload },
        );
        return response.data;
      },
      /** Tiếp nhận yêu cầu hỗ trợ: người được nhắc tên, hoặc người duyệt được bản của người hỏi. */
      acknowledgeHelp: async (id: string) => {
        const response = await api.post<DailyReportHelpRequest>(
          APIRouters.dailyReportHelpRequests.acknowledge(id),
          opts,
        );
        return response.data;
      },
      /**
       * Tích "Đã giải quyết": chính người hỏi, hoặc người duyệt được bản của
       * người hỏi (trưởng nhóm, người duyệt phụ trách). Cờ
       * `permissions.canResolveHelp` của bản nói trước ai bấm được.
       */
      resolveHelp: async (id: string) => {
        const response = await api.post<DailyReportHelpRequest>(
          APIRouters.dailyReportHelpRequests.resolve(id),
          opts,
        );
        return response.data;
      },
      /** Bỏ tích "Đã giải quyết", cùng người được tích. Không gửi thông báo. */
      reopenHelp: async (id: string) => {
        const response = await api.post<DailyReportHelpRequest>(
          APIRouters.dailyReportHelpRequests.reopen(id),
          opts,
        );
        return response.data;
      },
      /** Hủy yêu cầu — chỉ người yêu cầu. */
      cancelHelp: async (id: string) => {
        const response = await api.post<DailyReportHelpRequest>(
          APIRouters.dailyReportHelpRequests.cancel(id),
          opts,
        );
        return response.data;
      },
    },
    delete: {
      /**
       * Huỷ một việc đã chuyển tiếp. Huỷ KHÔNG đảo ngược kết luận `CONTINUED`
       * của báo cáo nguồn.
       *
       * Ai được huỷ do server quyết (`carryCancelDenial` bên acta-api) và trả
       * sẵn qua cờ `canCancel` của từng dòng - client chỉ đọc cờ, không tự suy
       * luật. Tóm tắt: quản lý luôn được; dòng người duyệt tạo thì người tạo
       * hoặc người đã xác nhận lại ở lượt duyệt sau. Nhóm đã lưu trữ thì không
       * ai huỷ được.
       */
      cancelCarryOver: async (carryOverId: string) => {
        const response = await api.delete<{ id: string; cancelledAt: string }>(
          APIRouters.dailyReports.cancelCarryOver(carryOverId),
          opts,
        );
        return response.data;
      },

      /**
       * Xoá một nhóm duyệt. Mọi người duyệt của nhóm mất quyền đọc và duyệt
       * những thành viên đó NGAY; bản của họ quay về cho quản lý phạm vi.
       */
      removeReviewGroup: async (scopeId: string, groupId: string) => {
        const response = await api.delete<ReviewGroupsResponse>(
          APIRouters.dailyReportScopes.reviewGroup(scopeId, groupId),
          opts,
        );
        return response.data;
      },

      archiveKpi: async (scopeId: string, kpiId: string) => {
        const response = await api.delete<{ success: true }>(
          APIRouters.dailyReportScopes.kpi(scopeId, kpiId),
          opts,
        );
        return response.data;
      },
      /**
       * Lưu trữ phạm vi báo cáo. KHÔNG phải "tắt": mọi report chuyển `ARCHIVED`,
       * scope biến mất khỏi `/my` và thao tác này không đảo ngược được — muốn
       * bật lại phải tạo scope mới. Tạm dừng thì dùng `updateScope({isEnabled:false})`.
       */
      removeScope: async (id: string) => {
        const response = await api.delete<ArchiveScopeResponse>(
          APIRouters.dailyReportScopes.byId(id),
          opts,
        );
        return response.data;
      },
    },
  };
};
