export const dailyReports = {
  base: '/daily-reports',
  myToday: '/daily-reports/my/today',
  myPendingCount: '/daily-reports/my/pending-count',
  my: '/daily-reports/my',
  byId: (id: string) => `/daily-reports/${id}`,
  draft: (id: string) => `/daily-reports/${id}/draft`,
  revisions: (id: string) => `/daily-reports/${id}/revisions`,
  submit: (id: string) => `/daily-reports/${id}/submit`,
  reopen: (id: string) => `/daily-reports/${id}/reopen`,
  /** Kết luận của người duyệt trên một lần nộp: Đạt / Tiếp tục / Trả lại. */
  review: (id: string) => `/daily-reports/${id}/review`,
  /** Huỷ một việc người duyệt đã chuyển tiếp. Huỷ mềm, không xoá cứng. */
  cancelCarryOver: (carryOverId: string) =>
    `/daily-reports/carry-overs/${carryOverId}`,
  board: (scopeId: string) => `/daily-reports/scope/${scopeId}/board`,
  /** Chờ duyệt XUYÊN NGÀY của một nhóm, không bó vào một ngày như `board`. */
  pendingReview: (scopeId: string) =>
    `/daily-reports/scope/${scopeId}/pending-review`,
  outcome: (scopeId: string) => `/daily-reports/scope/${scopeId}/outcome`,
  summary: (scopeId: string) => `/daily-reports/scope/${scopeId}/summary`,
  memberHistory: (scopeId: string) =>
    `/daily-reports/scope/${scopeId}/history`,
} as const;

export const dailyReportScopes = {
  base: '/daily-report-scopes',
  my: '/daily-report-scopes/my',
  byId: (id: string) => `/daily-report-scopes/${id}`,
  kpis: (id: string) => `/daily-report-scopes/${id}/kpis`,
  kpi: (id: string, kpiId: string) =>
    `/daily-report-scopes/${id}/kpis/${kpiId}`,
  generateTodayPreview: (id: string) =>
    `/daily-report-scopes/${id}/generate-today/preview`,
  generateToday: (id: string) => `/daily-report-scopes/${id}/generate-today`,
  /**
   * Nhóm duyệt CÓ TÊN: một cụm thành viên và những người duyệt cụm đó.
   *
   * `PUT .../:groupId` thay TOÀN BỘ tên, người duyệt và thành viên, không cộng
   * dồn - và bắt buộc gửi `expectedUpdatedAt` lấy từ lần đọc danh sách, nếu
   * không server trả 422. Người khác vừa sửa thì trả 409 thay vì ghi đè.
   */
  reviewGroups: (id: string) => `/daily-report-scopes/${id}/review-groups`,
  reviewGroup: (id: string, groupId: string) =>
    `/daily-report-scopes/${id}/review-groups/${groupId}`,
} as const;

export const dailyReportTemplates = {
  base: '/daily-report-templates',
  byId: (id: string) => `/daily-report-templates/${id}`,
  clone: (id: string) => `/daily-report-templates/${id}/clone`,
} as const;

export const dailyReportHelpRequests = {
  my: '/daily-report-help-requests/my',
  acknowledge: (id: string) => `/daily-report-help-requests/${id}/acknowledge`,
  resolve: (id: string) => `/daily-report-help-requests/${id}/resolve`,
  /** Bỏ tích "Đã giải quyết": yêu cầu về lại chưa giải quyết. */
  reopen: (id: string) => `/daily-report-help-requests/${id}/reopen`,
  cancel: (id: string) => `/daily-report-help-requests/${id}/cancel`,
} as const;
