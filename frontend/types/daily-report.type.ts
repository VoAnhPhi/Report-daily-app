/**
 * Kiểu dữ liệu Báo cáo hằng ngày — khớp contract server SAU vòng hardening
 * QA/QC 14/08/2026 (acta-main-server/docs/features/task-management/LICH-SU.md).
 *
 * Nguồn sự thật: acta-main-server `src/daily-reports/services/daily-reports.service.ts`
 * — `serializeReport()`, `scopeMeta()`, `getBoard()`, `getMyHistory()`, `getSummary()`.
 *
 * KHÔNG dùng `isResponse`: cột đó còn trong DB nhưng không thuộc API mới. UI đọc
 * `status` và `permissions` do server tính sẵn, không tự suy quyền từ role.
 */

/** Loại nhóm mà báo cáo gắn vào. */
export type DailyReportScopeType = 'assign_group' | 'team';

/**
 * Phân loại câu hỏi — quyết định quy tắc auto-draft. Chữ thường theo enum Prisma.
 *
 * `today` và `done_blocked` là bộ CŨ, ngừng sinh mới từ 25/08/2026 (`today` bị bỏ
 * vai, `done_blocked` tách đôi thành `done` + `blocked`). Chúng vẫn phải nằm
 * trong union vì `questionKind` trên câu trả lời là BẢN CHỤP: mọi báo cáo đã nộp
 * trước ngày đó vĩnh viễn mang hai giá trị này, và màn Tổng hợp/lịch sử đọc lại
 * chúng hằng ngày. Đừng dọn đi vì thấy "không ai gán nữa".
 */
export type DailyReportQuestionKind =
  | 'done'
  | 'blocked'
  | 'need_help'
  | 'tomorrow'
  | 'custom'
  | 'today'
  | 'done_blocked';

/** Vòng đời một bản báo cáo. CHỮ HOA theo enum Prisma. */
export type DailyReportStatus = 'DRAFT' | 'SUBMITTED' | 'REOPENED' | 'ARCHIVED';

/** Vòng đời một yêu cầu hỗ trợ. CHỮ HOA theo enum Prisma. */
export type DailyReportHelpRequestStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'CANCELLED';

/** Bộ lọc trạng thái của bảng theo dõi nhóm. */
export type BoardStatusFilter = 'all' | 'submitted' | 'pending' | 'missed';

/** Kết luận của người duyệt trên MỘT lần nộp. */
export type DailyReportReviewDecision = 'ACCEPTED' | 'CONTINUED' | 'REJECTED';

/**
 * TÁM trạng thái hiển thị của một dòng trên bảng theo dõi, do SERVER suy.
 *
 * Client chỉ render badge theo giá trị này. Tự suy lại từ `status` +
 * `reviewDecision` là hai bên lệch nhau lúc nào không biết - ba trạng thái dễ
 * nhầm nhất nằm đúng ở chỗ đó:
 *   · `CHO_DUYET` đòi người duyệt hành động;
 *   · `QUA_HAN_DUYET` nói người duyệt đã lỡ, KHÔNG phải thành viên làm sai;
 *   · `QUA_HAN_BO_SUNG` nói thành viên hết hạn sửa, chỉ quản lý gỡ được.
 */
export type DailyReportBoardState =
  | 'CHUA_NOP'
  | 'CHO_DUYET'
  | 'QUA_HAN_DUYET'
  | 'DA_DUYET'
  | 'TIEP_TUC'
  | 'QUA_HAN_BO_SUNG'
  | 'BI_TRA_LAI'
  | 'DA_MO_LAI';

/**
 * Dòng mà lượt duyệt trước đã chuyển đi từ chính bản này, gắn vào ứng viên
 * cùng chuỗi/cùng việc.
 */
export interface ExistingCarryOverRef {
  id: string;
  /** 'YYYY-MM-DD'. */
  toReportDate: string;
  note: string | null;
}

/**
 * Một việc người duyệt có thể chọn chuyển sang ngày làm việc kế tiếp.
 *
 * Danh sách do SERVER dựng: trạng thái công việc đổi được giữa lúc thành viên
 * nộp và lúc người duyệt mở ra đọc, nên client tự lọc là chắc chắn lệch.
 */
export interface ReviewCarryCandidate {
  key: string;
  /**
   * `task` = việc gắn trong bản; `carried` = dòng đã chuyển tiếp TỚI bản này;
   * `outgoing` = dòng lượt duyệt trước đã chuyển ĐI từ bản này mà không khớp
   * hai loại kia (việc gõ tay).
   */
  kind: 'task' | 'carried' | 'outgoing';
  taskId: string | null;
  code: string | null;
  title: string | null;
  status: string | null;
  note: string | null;
  continuesCarryOverId: string | null;
  /** Số LẦN đã chuyển tiếp của chuỗi — KHÔNG phải số ngày. */
  carriedCount: number;
  /** Chuỗi chạm ngưỡng cảnh báo; ngưỡng do server giữ. */
  isLongChain: boolean;
  /** Dòng đã chuyển đi của cùng việc: chọn ứng viên này là XÁC NHẬN LẠI dòng đó. */
  existingCarryOver: ExistingCarryOverRef | null;
  /**
   * Người đang xem huỷ được dòng mà ứng viên trỏ tới (dòng đáp xuống với
   * `carried`, dòng đi ra với `outgoing`). Server tính theo đúng luật huỷ.
   */
  canCancel: boolean;
  eligible: boolean;
  ineligibleReason: string | null;
}

/** Một dòng đã chuyển đi từ bản báo cáo, hiện ngay trên chính bản đó. */
export interface CarryOverView {
  id: string;
  chainId: string;
  taskId: string | null;
  code: string | null;
  title: string | null;
  status: string | null;
  note: string | null;
  /** 'YYYY-MM-DD'. */
  toReportDate: string;
  createdById: string;
  createdByName: string | null;
  /** Người duyệt đã xác nhận lại dòng ở lượt duyệt sau; `null` nếu chưa có. */
  confirmedById: string | null;
  confirmedByName: string | null;
  carriedCount: number;
  isLongChain: boolean;
  cancelledAt: string | null;
  /** Server tính theo đúng luật huỷ, cho người đang xem. */
  canCancel: boolean;
}

/**
 * Khối chuyển tiếp của một bản báo cáo. Server chỉ dựng ở hai đường đọc
 * (`my/today` và `:id`); mọi response khác trả khối rỗng.
 */
export interface DailyReportCarryPanel {
  /** Mọi dòng đã chuyển đi, KỂ CẢ dòng đã huỷ - nói rõ chứ không giấu. */
  outgoing: CarryOverView[];
}

/** Trục duyệt của một bản báo cáo, tách hẳn khỏi `status`. */
export interface DailyReportReviewInfo {
  decision: DailyReportReviewDecision | null;
  reviewedById: string | null;
  /**
   * Tên người đã kết luận. Optional vì cache dựng trước bản server mới không có
   * trường này; đọc qua `?? null`.
   */
  reviewerName?: string | null;
  /**
   * Lời người duyệt của kết luận đang đứng - với "Trả lại" đây chính là lý do
   * bắt buộc. Chỉ hai đường đọc một bản (`my/today`, `:id`) trả giá trị thật.
   */
  comment?: string | null;
  reviewedAt: string | null;
  reviewedRevisionNumber: number | null;
  /** Hạn duyệt đã chốt cứng lúc nộp; đổi cấu hình không dịch được mốc này. */
  deadlineAt: string | null;
  expiredAt: string | null;
  /** Cửa sổ sửa do người duyệt cấp — ngoại lệ duy nhất của hard stop. */
  editableUntil: string | null;
  /** Đủ SÁU điều kiện của API, không phải quyền ở mức phạm vi. */
  canReview: boolean;
  carryCandidates: ReviewCarryCandidate[];
}

/** Một dòng người duyệt gửi lên khi chọn "Tiếp tục thực hiện". */
export interface ReviewCarryOverInput {
  taskId?: string;
  /** Bắt buộc khi không có `taskId` VÀ không có `continuesCarryOverId`. */
  note?: string;
  /** Nối tiếp một dòng đã đáp xuống bản này, giữ nguyên chuỗi. */
  continuesCarryOverId?: string;
  /**
   * Xác nhận lại đích danh một dòng lượt duyệt trước đã chuyển đi từ bản này
   * (ứng viên `outgoing`). Phải đứng một mình: xác nhận là giữ nguyên dòng đã có.
   */
  confirmCarryOverId?: string;
}

/** Một người trong thẻ nhóm duyệt. */
export interface ReviewGroupPerson extends ScopeMemberInfo {
  /**
   * Còn tên trong nhóm/đội của phạm vi?
   *
   * Người duyệt đứng NGOÀI nhóm là hợp lệ, nên với họ cờ này chỉ là nhãn
   * "ngoài nhóm". Với THÀNH VIÊN thì `false` nghĩa là họ đã rời nhóm giao việc
   * và dòng đó nên được gỡ.
   */
  isScopeMember: boolean;
}

/** Một nhóm duyệt: tên + những người duyệt + những thành viên được phụ trách. */
export interface ReviewGroup {
  id: string;
  name: string;
  reviewers: ReviewGroupPerson[];
  members: ReviewGroupPerson[];
  createdAt: string;
  /**
   * Mốc chống ghi đè. Gửi lại NGUYÊN giá trị này khi lưu: người khác vừa sửa
   * thì server trả 409 thay vì xoá mất thay đổi của họ.
   */
  updatedAt: string;
}

/** `GET /daily-report-scopes/:id/review-groups` — cả trang trong một lượt gọi. */
export interface ReviewGroupsResponse {
  groups: ReviewGroup[];
  /** Thành viên hiện tại của phạm vi — nguồn duy nhất cho ô chọn của form. */
  scopeMembers: ScopeMemberInfo[];
  /**
   * Chưa thuộc nhóm duyệt nào — với họ chỉ quản lý phạm vi đọc và duyệt báo
   * cáo. Người quản lý cần thấy con số này để biết mình còn ôm bao nhiêu người.
   */
  unassignedMembers: ScopeMemberInfo[];
  /** Quản lý phạm vi: duyệt được mọi người nên form không mời họ làm người duyệt. */
  managerIds: string[];
}

/** Body của `POST` và `PUT` nhóm duyệt. Lưu TOÀN BỘ trạng thái, không cộng dồn. */
export interface SaveReviewGroupPayload {
  name: string;
  reviewerIds: string[];
  memberIds: string[];
  /** Bắt buộc khi SỬA, vắng mặt khi tạo mới. */
  expectedUpdatedAt?: string;
}

export interface ReviewDailyReportPayload {
  decision: DailyReportReviewDecision;
  /** Bắt buộc khi `REJECTED`. */
  comment?: string;
  /** Bắt buộc >= 1 khi `CONTINUED`, phải rỗng ở hai quyết định kia. */
  carryOvers?: ReviewCarryOverInput[];
}

export type TodayEmptyReason =
  | 'BEFORE_GENERATION'
  | 'NON_REPORTING_DAY'
  | 'NOT_IN_SNAPSHOT'
  | 'NO_SCOPE'
  | 'SYNCING';

// ── Nhóm / phạm vi ──────────────────────────────────────────────────────────

/**
 * Thông tin nhóm kèm theo mỗi bản báo cáo — `scopeMeta()`.
 * Đây là bản rút gọn, KHÁC với `DailyReportScope` (cả hàng cấu hình).
 */
export interface ReportScopeMeta {
  id: string;
  scopeType: DailyReportScopeType;
  /** Lấy từ nhóm gốc, hoặc `targetNameSnapshot` khi nhóm đã bị xóa. */
  name: string;
  /** Các mốc cố định do server dựng sẵn; client chỉ hiển thị. */
  generationLabel: string;
  reminderLabel: string;
  leaderSummaryLabel: string;
  hardStopMinute: number;
  hardStopLabel: string;
  weekdays: number[];
  timezone: string;
  /** Khác null = nhóm đã lưu trữ, toàn bộ chỉ đọc. */
  archivedAt: string | null;
  /** Khác null = đã hết 12 tháng retention, nội dung đã bị xóa. */
  purgedAt: string | null;
}

/**
 * Contract public của scope. Các cột lịch legacy không còn lộ qua API.
 */
export interface DailyReportScope {
  id: string;
  scopeType: DailyReportScopeType;
  assignGroupId: string | null;
  teamId: string | null;
  templateId: string;
  currentTemplateVersionId: string | null;
  isEnabled: boolean;
  weekdays: number[];
  timezone: string;
  notifyLeaderOnMissing: boolean;
  targetIdSnapshot: string | null;
  targetNameSnapshot: string | null;
  archivedAt: string | null;
  purgedAt: string | null;
  createdAt: string;
  updatedAt: string;
  name: string;
  isManager: boolean;
  canViewGroupData: boolean;
  /**
   * Người này được phân công duyệt một số thành viên của phạm vi. Server trả
   * board ĐÃ LỌC cho họ (`resolveVisibleMemberIds`), nên đây là cổng vào dải
   * "Nhóm" - nhưng KHÔNG mở "Tổng quan" (KPI vẫn gác bằng `canViewGroupData`).
   * Optional vì server cũ chưa trả; vắng = `false`.
   */
  isReviewer?: boolean;
  /**
   * Người này THUỘC phạm vi, tức có bản phải nộp ở đây. Vai duyệt không miễn
   * cho ai việc nộp bản của mình: người duyệt phụ trong nhóm vừa nộp vừa duyệt,
   * người duyệt phụ ngoài nhóm thì chỉ duyệt. Vắng (server cũ) = `true`.
   */
  isMember?: boolean;
  generationLabel: string;
  reminderLabel: string;
  leaderSummaryLabel: string;
  hardStopMinute: number;
  hardStopLabel: string;
  /** Số ngày làm việc của cửa sổ duyệt, tính cả ngày nộp. */
  reviewWindowDays: number;
}

/**
 * `GET /daily-report-scopes/my` — controller gắn thêm `name`, `isManager` và
 * `canViewGroupData` (admin/super admin có thể xem scope không thuộc mình).
 * Danh sách này KHÔNG bao gồm scope đã archive (`getScopesOfUser` lọc bỏ);
 * scope đã lưu trữ chỉ lộ ra qua `scope` meta của dòng lịch sử.
 */
export type DailyReportScopeListItem = DailyReportScope;

export interface ScopeMemberInfo {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  /**
   * Tài khoản đang hoạt động. CHỈ tài khoản đang hoạt động nhận được vai người
   * duyệt (server trả 422 cho người khác), nên form chia bộ phận đọc cờ này để
   * khỏi mời chọn một người chắc chắn bị từ chối. Optional vì cache dựng trước
   * bản server mới không có: vắng thì coi như đang hoạt động, tức giữ đúng hành
   * vi cũ.
   */
  isActive?: boolean;
}

export type DailyReportGenerationBlockedReason =
  | 'SCOPE_DISABLED'
  | 'SCOPE_ARCHIVED'
  | 'NON_REPORTING_DAY'
  | 'BEFORE_GENERATION_TIME'
  | 'PAST_HARD_STOP'
  | 'NO_TEMPLATE'
  | 'EMPTY_SNAPSHOT';

export interface DailyReportGenerationMember extends ScopeMemberInfo {
  reportStatus: DailyReportStatus | null;
}

export interface DailyReportGenerationExcludedMember extends ScopeMemberInfo {
  reason: 'NOT_IN_SNAPSHOT';
}

export interface DailyReportGenerationPreview {
  scopeId: string;
  scopeName: string;
  reportDate: string;
  timezone: string;
  snapshotAt: string;
  generationLabel: string;
  hardStopLabel: string;
  templateVersionId: string | null;
  canGenerate: boolean;
  blockedReason?: DailyReportGenerationBlockedReason;
  counts: {
    snapshotMembers: number;
    existingReports: number;
    toCreate: number;
  };
  includedMembers: DailyReportGenerationMember[];
  excludedMembers: DailyReportGenerationExcludedMember[];
}

export interface DailyReportGenerationResult {
  scopeId: string;
  reportDate: string;
  snapshotAt: string;
  totalMembers: number;
  createdReports: number;
  existingReports: number;
  notificationRecipients: number;
}

/** `GET /daily-report-scopes/:id` — có cả scope đã archive. */
export interface DailyReportScopeDetail extends DailyReportScopeListItem {
  members: ScopeMemberInfo[];
}

/** `DELETE /daily-report-scopes/:id` — archive, không hard-delete. */
export interface ArchiveScopeResponse {
  success: boolean;
  archivedAt: string;
}

export interface CreateReportScopePayload {
  scopeType: DailyReportScopeType;
  assignGroupId?: string;
  teamId?: string;
  templateId?: string;
  /** 1 = thứ Hai … 7 = Chủ nhật, không trùng, không rỗng. */
  weekdays?: number[];
  notifyLeaderOnMissing?: boolean;
  /**
   * Ba mốc giờ của RIÊNG nhóm, tính bằng phút từ 00:00. Server nhận đủ cả ba
   * (`CreateReportScopeDto` / `UpdateReportScopeDto` trong acta-main-server) và
   * kiểm chéo bằng `assertValidSchedule`; client phải kiểm trước kẻo ăn 422.
   *
   * `generateMinute` (07:30) KHÔNG nằm ở đây — nó là hằng số sản phẩm, đã bị gỡ
   * khỏi DTO. Giao diện cũ cho chọn nó là nói dối: bấm 09:00 thì worker vẫn
   * chạy 07:30.
   */
  /** Giờ khóa cứng. [451, 1439], mặc định 1380 = 23:00. */
  cutoffMinute?: number;
  /** Số phút TRƯỚC giờ khóa để mở cửa sổ nhắc. [1, 720], mặc định 390. */
  reminderBeforeMinutes?: number;
  /** Giờ gửi tổng hợp, cũng là hạn nộp. [451, 1439], mặc định 1040 = 17:20. */
  leaderSummaryMinute?: number;
}

export interface UpdateReportScopePayload {
  isEnabled?: boolean;
  templateId?: string;
  weekdays?: number[];
  notifyLeaderOnMissing?: boolean;
  /**
   * Ba mốc giờ của RIÊNG nhóm, tính bằng phút từ 00:00. Server nhận đủ cả ba
   * (`CreateReportScopeDto` / `UpdateReportScopeDto` trong acta-main-server) và
   * kiểm chéo bằng `assertValidSchedule`; client phải kiểm trước kẻo ăn 422.
   *
   * `generateMinute` (07:30) KHÔNG nằm ở đây — nó là hằng số sản phẩm, đã bị gỡ
   * khỏi DTO. Giao diện cũ cho chọn nó là nói dối: bấm 09:00 thì worker vẫn
   * chạy 07:30.
   */
  /** Giờ khóa cứng. [451, 1439], mặc định 1380 = 23:00. */
  cutoffMinute?: number;
  /** Số phút TRƯỚC giờ khóa để mở cửa sổ nhắc. [1, 720], mặc định 390. */
  reminderBeforeMinutes?: number;
  /** Giờ gửi tổng hợp, cũng là hạn nộp. [451, 1439], mặc định 1040 = 17:20. */
  leaderSummaryMinute?: number;
  /**
   * Số ngày làm việc của cửa sổ duyệt, TÍNH CẢ ngày nộp. [1, 30], mặc định 3.
   *
   * ⚠ Đổi giá trị chỉ áp cho lần nộp SAU đó: hạn của mỗi lần nộp đã chốt cứng
   * ngay lúc submit, nên sửa số này không cứu được báo cáo sắp hết hạn và cũng
   * không giết báo cáo đang chờ duyệt.
   */
  reviewWindowDays?: number;
}

// ── Báo cáo ─────────────────────────────────────────────────────────────────

/** Tệp đính kèm — cùng khuôn { id, name, url } với công việc. URL bắt buộc https. */
export interface ReportAttachment {
  id: string;
  name: string;
  url: string;
}

/** Vì sao một việc được gợi ý — `daily-report-draft.service.ts`. */
export type DraftSourceReason =
  | 'activity_today'
  | 'completed_today'
  | 'subtask_done_today'
  | 'in_progress_today'
  | 'updated_today'
  | 'overdue'
  | 'due_today'
  | 'carry_over'
  /**
   * Việc do NGƯỜI DUYỆT chuyển tiếp sang ngày này. Khác `carry_over` ngay trên:
   * cái đó là bộ máy gợi ý suy từ hạn công việc, cái này là quyết định đã ghi
   * của một con người.
   */
  | 'reviewer_carry_over'
  | 'due_tomorrow'
  | 'starts_tomorrow'
  | 'stalled'
  | 'recurring_blocker';

/**
 * Một việc con (checklist) đi kèm gợi ý. Id của nó KHÔNG bao giờ vào
 * `linkedTaskIds` — mảng đó chỉ nhận id `BusinessFormTask`.
 */
export interface DraftItem {
  id: string;
  label: string;
  done: boolean;
  /** Được chính người báo cáo tick xong trong ngày. */
  doneToday: boolean;
  reportDueAt?: string | null;
  completionDueAt?: string | null;
}

/** Nguồn gợi ý auto-draft — FE dựng chip công việc từ đây. */
export interface DraftSource {
  taskId: string;
  code: string | null;
  title: string;
  /** `personal` = việc riêng; `group` = việc được chia sẻ cho nhiều người. */
  scope: 'personal' | 'group';
  reason: DraftSourceReason;
  /**
   * Tiến độ việc con, đã bỏ việc con xoá mềm. VẮNG MẶT = việc không có checklist
   * — ẩn hẳn cụm tiến độ thay vì hiện 0/0, cùng luật với thẻ công việc.
   */
  itemsTotal?: number;
  itemsDone?: number;
  /** Đúng những việc con server đã in ra dòng gợi ý (đã cắt theo trần). */
  items?: DraftItem[];
}

/**
 * Một câu trả lời. Nhãn/gợi ý/bắt buộc đều là SNAPSHOT tại lúc sinh report, nên
 * báo cáo cũ không đổi khi trưởng nhóm phát hành bộ câu hỏi mới.
 */
export interface DailyReportAnswer {
  id: string;
  questionId: string;
  kind: DailyReportQuestionKind;
  label: string;
  hint: string | null;
  /** Nguồn sự thật là server — KHÔNG suy từ `kind`. */
  isRequired: boolean;
  allowTaskLink: boolean;
  sortOrder: number;
  content: string;
  /** Còn nguyên nội dung hệ thống gợi ý (người dùng chưa sửa). */
  isAutoDrafted: boolean;
  linkedTaskIds: string[];
  mentionedUserIds: string[];
  attachments: ReportAttachment[];
  /** Gợi ý đi kèm ngay trong answer — không phải gọi `/draft` riêng. */
  sources: DraftSource[];
  /** Placeholder tham khảo; không phải nội dung đã lưu của báo cáo. */
  suggestion: string | null;
}

/** Phiên bản bộ câu hỏi mà bản báo cáo bị khóa vào. */
export interface ReportTemplateVersionRef {
  id: string;
  version: number;
  nameSnapshot: string;
}

/**
 * Quyền do server tính — UI đọc thẳng, không tự suy từ role (doc 12 mục 14).
 *
 * CHỈ tin khi lấy từ `GET /daily-reports/:id`. PATCH / submit / reopen gọi
 * `serializeReport` không truyền `access` nên rơi về mặc định
 * `{isOwner:true, isManager:false}` — đừng ghi kết quả mutation vào cache chi tiết.
 */
export interface DailyReportPermissions {
  canEdit: boolean;
  /**
   * Cờ RIÊNG, không suy ra từ `canEdit`. Từ 20/08/2026 mốc tổng hợp (17:20)
   * không còn chặn nộp — chỉ `cutoffMinute` (23:00) mới đóng cả ba đường ghi.
   */
  canSubmit: boolean;
  canReopen: boolean;
  canViewHistory: boolean;
  /**
   * Người xem tích / bỏ tích được "Đã giải quyết" cho yêu cầu hỗ trợ của bản:
   * chính người hỏi, hoặc người duyệt được bản đó. Optional vì cache dựng trước
   * bản server mới không có; vắng = `false`.
   */
  canResolveHelp?: boolean;
}

/** Yêu cầu hỗ trợ. Server tự tạo khi submit có nội dung câu `need_help`. */
export interface DailyReportHelpRequest {
  id: string;
  reportId: string;
  answerId: string | null;
  requesterId: string;
  status: DailyReportHelpRequestStatus;
  content: string;
  linkedTaskIds: string[];
  mentionedUserIds: string[];
  acknowledgedById: string | null;
  acknowledgedAt: string | null;
  resolvedById: string | null;
  resolvedAt: string | null;
  cancelledById: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** `GET /daily-report-help-requests/my` gắn thêm ngữ cảnh bản báo cáo. Tối đa 100 dòng. */
export interface HelpRequestWithReport extends DailyReportHelpRequest {
  report: {
    id: string;
    scopeId: string;
    /** ISO datetime đầy đủ — KHÁC 'YYYY-MM-DD' của `DailyReport.reportDate`. */
    reportDate: string;
    userId: string;
  };
}

/** Người đã tích "Đã giải quyết". `fullName` null khi tài khoản đã bị xoá. */
export interface HelpResolver {
  id: string;
  fullName: string | null;
}

/** Yêu cầu hỗ trợ trong chi tiết một bản, kèm tên người đã giải quyết. */
export interface ReportHelpRequest extends DailyReportHelpRequest {
  /** Optional vì cache dựng trước bản server mới không có trường này. */
  resolvedBy?: HelpResolver | null;
}

/** Một bản báo cáo: một người × một ngày × một nhóm — `serializeReport()`. */
export interface DailyReport {
  id: string;
  scope: ReportScopeMeta;
  /** 'YYYY-MM-DD'. */
  reportDate: string;
  status: DailyReportStatus;
  /**
   * Chủ bản. Người đọc bản của người khác (trưởng nhóm, người duyệt phụ) cần
   * biết mình đang đọc bản CỦA AI. `fullName` optional vì cache cũ chỉ có `id`.
   */
  owner: { id: string; fullName?: string; avatarUrl?: string | null };
  /**
   * Trạng thái trên trục duyệt, do server suy bằng CÙNG hàm với bảng nhóm.
   * Optional vì cache cũ chưa có.
   */
  boardState?: DailyReportBoardState;
  /** Tách người sở hữu khỏi người thao tác (chế độ làm thay). */
  actors: {
    lastEditedById: string | null;
    submittedById: string | null;
    reopenedById: string | null;
  };
  isLocked: boolean;
  isMissed: boolean;
  /** Lần nộp đầu — mốc quyết định trễ hay đúng hạn. */
  firstSubmittedAt: string | null;
  lastSubmittedAt: string | null;
  lastEditedAt: string | null;
  reopenReason: string | null;
  templateVersion: ReportTemplateVersionRef | null;
  /**
   * Trục duyệt. Phân biệt "bị trả lại" với "được mở lại để bổ sung" bằng
   * `review.decision`, KHÔNG bằng `status`: một bản hoàn toàn có thể ở
   * `REOPENED` + `decision = ACCEPTED` cùng lúc.
   */
  review: DailyReportReviewInfo;
  /**
   * Việc người duyệt đã chuyển sang ngày làm việc kế tiếp từ bản này. Có thể
   * vắng trong cache cũ dựng trước khi server trả khối này, nên chỗ đọc phải
   * tự đỡ `undefined`.
   */
  carry?: DailyReportCarryPanel;
  permissions: DailyReportPermissions;
  answers: DailyReportAnswer[];
  /** Mới nhất trước. Có thể vắng trong fixture và cache cũ: đọc qua `?? []`. */
  helpRequests: ReportHelpRequest[];
  achievedKpis: DailyReportKpiAchievement[];
}

export interface DailyReportKpi {
  id: string;
  scopeId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  archivedAt: string | null;
}

export interface DailyReportKpiAchievement {
  id: string;
  kpiId: string;
  name: string;
  selectedAt: string;
}

/**
 * `GET /daily-reports/my/today`.
 *
 * TRƯỚC 07:30 server chỉ đọc. SAU 07:30 endpoint này còn materialize bù bản
 * còn thiếu (an toàn kép khi cron lỗi), luôn theo membership tại 07:30 chứ
 * không theo membership lúc gọi.
 *
 * `reports: []` KHÔNG cần đoán và không cần đối chiếu `pending-count`:
 * `emptyReason` nói thẳng lý do (`TodayEmptyReason`).
 */
export interface MyTodayResponse {
  date: string;
  reports: DailyReport[];
  emptyReason: TodayEmptyReason | null;
}

/** `GET /daily-reports/my/pending-count`. */
export interface PendingCountResponse {
  date: string;
  total: number;
  pending: number;
  missed: number;
  /**
   * Số bản đang chờ CHÍNH người này duyệt, còn trong hạn - trưởng nhóm lẫn người
   * duyệt phụ. Optional vì server cũ chưa trả; vắng = 0.
   */
  pendingReview?: number;
}

/** Một dòng lịch sử (rút gọn). */
export interface DailyReportHistoryItem {
  id: string;
  reportDate: string;
  scope: ReportScopeMeta;
  status: DailyReportStatus;
  isLocked: boolean;
  isMissed: boolean;
  submittedAt: string | null;
  /** 120 ký tự đầu của câu "Hôm nay làm những gì". */
  answerPreview: string;
  /**
   * Trục duyệt của dòng. Optional vì server cũ chưa trả. Chỉ in badge khi bản
   * NẰM TRONG vòng duyệt (`isInReviewCycle`): bản nộp trước khi có vòng duyệt
   * không có hạn và server vẫn suy nó là "Chờ duyệt".
   */
  boardState?: DailyReportBoardState;
  reviewDecision?: DailyReportReviewDecision | null;
  reviewDeadlineAt?: string | null;
}

/**
 * `GET /daily-reports/my`. Envelope riêng — dùng `pageSize`, KHÔNG phải `limit`
 * như `PaginatedResponse` dùng chung.
 */
export interface DailyReportHistoryResponse {
  data: DailyReportHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ScopeMemberHistoryResponse
  extends DailyReportHistoryResponse {
  member: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

/** Một câu trong `answersSnapshot` — cột Json, không có ràng buộc runtime. */
export interface DailyReportRevisionAnswer {
  questionId: string;
  kind: DailyReportQuestionKind;
  label: string;
  hint: string | null;
  isRequired: boolean;
  allowTaskLink: boolean;
  sortOrder: number;
  content: string;
  linkedTaskIds: string[];
  mentionedUserIds: string[];
  attachments: ReportAttachment[];
}

/** Bản snapshot bất biến của một lần nộp, mới nhất trước. */
export interface DailyReportRevision {
  id: string;
  reportId: string;
  revisionNumber: number;
  submittedById: string;
  submittedAt: string;
  isFirstSubmit: boolean;
  /** Cột legacy còn trong snapshot revision; UI không dùng để tính trạng thái. */
  isLate: boolean;
  /** Cột Json — kiểm `Array.isArray` trước khi duyệt. */
  answersSnapshot: DailyReportRevisionAnswer[];
  reopenReason: string | null;
  createdAt: string;
}

// ── Auto-draft ──────────────────────────────────────────────────────────────

export interface QuestionDraft {
  questionKind: DailyReportQuestionKind;
  content: string;
  linkedTaskIds: string[];
  sources: DraftSource[];
}

/** `GET /daily-reports/:id/draft` — tính lại gợi ý, không ghi DB. */
export interface DraftResponse {
  reportId: string;
  generatedAt: string;
  drafts: QuestionDraft[];
}

// ── Bảng theo dõi nhóm & tổng hợp ───────────────────────────────────────────

/** Trạng thái hỗ trợ của một dòng trên bảng nhóm, xem `BoardRow.helpStatus`. */
export type BoardHelpStatus = 'OPEN' | 'RESOLVED' | null;

/**
 * Một dòng trên bảng theo dõi nhóm. Dòng sinh TỪ report đã snapshot, không phải
 * từ danh sách thành viên hiện tại — người vào nhóm sau 07:30 không có dòng.
 */
export interface BoardRow {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  reportId: string;
  status: DailyReportStatus;
  isLocked: boolean;
  isMissed: boolean;
  firstSubmittedAt: string | null;
  lastSubmittedAt: string | null;
  /**
   * Trạng thái hỗ trợ của bản: `'OPEN'` còn một yêu cầu chưa giải quyết,
   * `'RESOLVED'` mọi yêu cầu đã được giải quyết, `null` không có yêu cầu nào.
   * Optional vì cache dựng trước bản server mới không có; vắng = `null`.
   */
  helpStatus?: BoardHelpStatus;
  /**
   * Nội dung yêu cầu hỗ trợ (bản còn mở, hoặc mới nhất), tối đa 160 ký tự.
   * Bộ lọc "Cần hỗ trợ" in câu này thay cho `preview`. Vắng ở cache cũ.
   */
  helpExcerpt?: string;
  /** Tên người nộp thay, null khi tự nộp. */
  submittedByName: string | null;
  preview: string;
  /** Trạng thái hiển thị, do server suy ở một chỗ. */
  boardState: DailyReportBoardState;
  reviewDecision: DailyReportReviewDecision | null;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewDeadlineAt: string | null;
  reviewExpiredAt: string | null;
}

/** Một KPI của nhóm, đo trong ĐÚNG một ngày của bảng theo dõi. */
export interface BoardKpiItem {
  kpiId: string;
  name: string;
  /** Số người đạt KPI này trong ngày — đếm theo NGƯỜI, không theo bản. */
  achievedMembers: number;
  /** Mẫu số = `stats.total`, gồm cả người chưa nộp. */
  totalMembers: number;
  /** `achievedMembers / totalMembers` đã làm tròn về số nguyên phần trăm. */
  percent: number;
}

/**
 * Tổng hợp KPI của ngày.
 *
 * Chỉ tính bản ĐÃ NỘP — cùng luật với `stats.submitted` ngay cạnh nó, nên hai
 * con số trên cùng một đầu bảng không chỏi nhau.
 */
export interface BoardKpiSummary {
  /**
   * Con số chung. Bằng trung bình cộng `percent` của `items`, nên bung danh sách
   * ra kiểm sẽ không thấy mâu thuẫn (chênh tối đa 1 điểm do làm tròn từng dòng).
   */
  achievedPercent: number;
  /** Danh mục KPI đang bật của nhóm — KPI không ai đạt vẫn có mặt với 0%. */
  items: BoardKpiItem[];
}

/** `GET /daily-reports/scope/:scopeId/board`. */
export interface BoardResponse {
  scope: ReportScopeMeta;
  date: string;
  stats: {
    /** Tổng nghĩa vụ đã snapshot — KHÔNG bị bộ lọc làm sai. */
    total: number;
    submitted: number;
    pending: number;
    missed: number;
    /**
     * BA con số rời nhau, không con nào cộng vào con nào: `missed` là thành
     * viên chưa làm, `pendingReview` là người duyệt chưa đọc, `expiredReview`
     * là người duyệt đã lỡ hẳn.
     */
    pendingReview: number;
    expiredReview: number;
    /** Bản `REOPENED` hết hạn sửa — không thuộc con số nào ở trên. */
    expiredEdit: number;
    needHelp: number;
    /** Số dòng còn lại sau khi lọc. */
    shown: number;
    /** Số thành viên người xem này được nhìn thấy. */
    visibleMemberCount: number;
    /** true khi board đã bị server lọc còn phần người xem phụ trách. */
    isFilteredToAssignment: boolean;
  };
  kpiSummary: BoardKpiSummary;
  rows: BoardRow[];
}

/** Người nộp bản, hoặc người duyệt của một bộ phận. */
export interface PendingReviewPerson {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

/** Bộ phận của người nộp, kèm những người duyệt bộ phận đó. */
export interface PendingReviewDepartment {
  id: string;
  name: string;
  reviewers: PendingReviewPerson[];
}

/**
 * Một bản đang chờ kết luận. Khác `BoardRow` ở chỗ khoá là BẢN, không phải
 * người: cùng một người có thể còn nhiều ngày chưa ai duyệt, và đó chính là thứ
 * bảng theo ngày không nói ra được.
 */
export interface PendingReviewRow {
  reportId: string;
  /** `yyyy-mm-dd` của NGÀY BÁO CÁO, không phải ngày nộp. */
  reportDate: string;
  owner: PendingReviewPerson;
  firstSubmittedAt: string | null;
  lastSubmittedAt: string | null;
  reviewDeadlineAt: string | null;
  /** Rỗng khi người nộp chưa thuộc bộ phận nào, tức trưởng nhóm tự duyệt. */
  departments: PendingReviewDepartment[];
  /** Người xem có bấm Duyệt được dòng này không. Trưởng nhóm: mọi dòng. */
  canReview: boolean;
}

/** `GET /daily-reports/scope/:scopeId/pending-review`. */
export interface PendingReviewResponse {
  scope: ReportScopeMeta;
  data: PendingReviewRow[];
  /** Mọi bản chờ duyệt người xem này được nhìn, không chỉ trang hiện tại. */
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** true khi server đã lọc còn phần người xem phụ trách. */
  isFilteredToAssignment: boolean;
}

export interface GroupOutcomeAnswer {
  kind: DailyReportQuestionKind;
  label: string;
  sortOrder: number;
  content: string;
}

export interface GroupOutcomeReport {
  reportId: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  submittedAt: string | null;
  answers: GroupOutcomeAnswer[];
}

/** `GET /daily-reports/scope/:scopeId/outcome`. */
export interface GroupOutcomeResponse {
  scope: ReportScopeMeta;
  date: string;
  stats: {
    total: number;
    submitted: number;
    pending: number;
  };
  /** Chỉ gồm các báo cáo đã nộp, vì đây là outcome đã chốt của nhóm. */
  reports: GroupOutcomeReport[];
}

/**
 * Trạng thái một ngày của một thành viên trong bảng tổng hợp.
 *
 * Ba giá trị này do server tính, client KHÔNG tự suy: `missed` nghĩa là đã qua
 * giờ khóa mà chưa nộp, còn `pending` là chưa nộp nhưng vẫn trong hạn — phân
 * biệt được hai cái đó cần biết giờ khóa của scope và giờ hiện tại theo múi
 * giờ nghiệp vụ, tức việc của server.
 */
export type SummaryDayStatus = 'submitted' | 'missed' | 'pending';

export interface SummaryMemberDay {
  /** 'YYYY-MM-DD'. */
  date: string;
  /** Mở bản báo cáo đầy đủ của thành viên ở ngày này. */
  reportId: string;
  status: SummaryDayStatus;
  /**
   * Trạng thái trên trục DUYỆT của ngày đó, do server suy - một nguồn với bảng
   * nhóm. Optional vì cache dựng trước bản server mới không có.
   */
  boardState?: DailyReportBoardState;
  reviewDecision?: DailyReportReviewDecision | null;
  /** Ai đã kết luận bản của ngày đó; `null` khi chưa ai duyệt. */
  reviewedBy?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  } | null;
}

export interface SummaryMemberStat {
  userId: string;
  fullName: string;
  /** Ảnh đại diện; `null` khi người dùng chưa đặt. */
  avatarUrl: string | null;
  /** Bộ phận người này thuộc về; rỗng nghĩa là chỉ trưởng nhóm duyệt họ. */
  departments?: { id: string; name: string }[];
  /** Bản của người này còn chờ kết luận trong khoảng; vắng = 0. */
  pendingReview?: number;
  /** Bản đã hết hạn duyệt mà không ai kết luận; vắng = 0. */
  expiredReview?: number;
  expected: number;
  submitted: number;
  missed: number;
  /** 0..1. */
  rate: number;
  /**
   * Từng ngày CÓ bản báo cáo trong khoảng, cũ nhất trước.
   *
   * Ngày không có bản thì KHÔNG nằm trong mảng — đó là chỗ trống dữ liệu (ngày
   * nghỉ của nhóm, hoặc người này chưa vào nhóm), không phải "không nộp".
   */
  days: SummaryMemberDay[];
}

/** Việc tồn đọng lặp lại từ 3 ngày trở lên, tối đa 20 mục. */
export interface RecurringBlocker {
  taskId: string;
  code: string | null;
  title: string;
  appearedDays: number;
}

export interface SummaryHelpRequest {
  id: string;
  status: DailyReportHelpRequestStatus;
  reportId: string;
  date: string;
  userId: string;
  fullName: string;
  excerpt: string;
  /** Chỉ dòng đã giải quyết mới có hai trường này. */
  resolvedAt?: string | null;
  resolvedBy?: HelpResolver | null;
}

/** `GET /daily-reports/scope/:scopeId/summary`. */
/** Một người đã đạt KPI trong khoảng ngày của bản tổng hợp. */
export interface SummaryKpiMember {
  userId: string;
  fullName: string;
  /** Ảnh đại diện; `null` khi người dùng chưa đặt. */
  avatarUrl: string | null;
}

export interface SummaryKpiStat {
  kpiId: string;
  /** `nameSnapshot` lúc tick — KPI đổi tên không làm bản cũ đọc sai. */
  name: string;
  achievedReports: number;
  achievedMembers: number;
  /**
   * Ai đã đạt KPI này. Sắp sẵn theo tên tiếng Việt từ server.
   *
   * OPTIONAL có chủ ý, dù server luôn trả. Đây là bản CHÉP TAY của response —
   * repo không có codegen, không có Swagger, không có gì kiểm lúc chạy — nên
   * trong cửa sổ lệch deploy (client mới gặp API cũ, hoặc bản còn nằm trong
   * cache `CACHE_TAG_BOARD` 15 giây của server) trường này VẮNG thật. Khai bắt
   * buộc rồi `.map` thẳng là màn trắng. Luôn đọc qua `?? []`.
   */
  members?: SummaryKpiMember[];
}

export interface SummaryDepartmentStat {
  /** `null` = cụm người chưa thuộc bộ phận nào. */
  id: string | null;
  name: string;
  reviewers: { id: string; fullName: string; avatarUrl: string | null }[];
  memberCount: number;
  expected: number;
  submitted: number;
  missed: number;
  pendingReview: number;
  /** 0..1. */
  rate: number;
}

export interface SummaryResponse {
  range: { from: string; to: string };
  workingDays: number;
  /**
   * Bốn con số của CẢ nhóm, tính trên mọi thành viên người xem thấy chứ không
   * theo trang. Optional vì cache cũ không có: khi vắng thì client cộng lại từ
   * `members` như trước (đúng khi chưa phân trang).
   */
  totals?: {
    expected: number;
    submitted: number;
    missed: number;
    /** 0..1. */
    rate: number;
  };
  /**
   * Danh bạ ĐỦ thành viên, nhẹ (không mang dải ngày). Ô chọn thành viên và tên
   * người đang xem đọc danh bạ này, KHÔNG đọc `members`: `members` chỉ còn một
   * trang, mà hai chỗ đó là điều hướng nên thiếu ai là mất đường vào.
   */
  memberDirectory?: { userId: string; fullName: string; avatarUrl: string | null }[];
  /** Đếm theo BẢN trong khoảng, cho khối trạng thái duyệt của Tổng quan. */
  reviewStateCounts?: Record<DailyReportBoardState, number>;
  /**
   * Thẻ tổng hợp của từng bộ phận người xem thấy, xếp theo tên; thẻ cuối có
   * `id = null` là người chưa thuộc bộ phận nào. Rỗng khi nhóm chưa chia bộ
   * phận. Vắng ở cache cũ.
   */
  departmentStats?: SummaryDepartmentStat[];
  /** Trang hiện tại của "Chi tiết theo thành viên". */
  members: SummaryMemberStat[];
  /**
   * Stat của người đang xem ở chế độ "Theo thành viên" khi họ KHÔNG nằm trong
   * trang; `null` khi không ai được chọn hoặc họ đã có trong `members`.
   */
  focusedMember?: SummaryMemberStat | null;
  membersTotal?: number;
  memberPage?: number;
  memberPageSize?: number;
  memberTotalPages?: number;
  recurringBlockers: RecurringBlocker[];
  /** Chưa giải quyết, bản mới nhất trước. Phân trang từ 16/09/2026. */
  openHelpRequests: SummaryHelpRequest[];
  openHelpTotal?: number;
  openHelpPage?: number;
  openHelpTotalPages?: number;
  /**
   * Đã giải quyết, vừa giải quyết trước. Optional cùng lý do với
   * `SummaryKpiStat.members`: đọc qua `?? []`.
   */
  resolvedHelpRequests?: SummaryHelpRequest[];
  resolvedHelpTotal?: number;
  resolvedHelpPage?: number;
  resolvedHelpTotalPages?: number;
  /** Cỡ trang dùng chung của hai danh sách hỗ trợ. */
  helpPageSize?: number;
  /** Người xem tích / bỏ tích được ở màn Tổng quan; vắng = `false`. */
  canResolveHelp?: boolean;
  kpis: SummaryKpiStat[];
}

// ── Bộ câu hỏi (template) ───────────────────────────────────────────────────

export interface DailyReportTemplateQuestion {
  id: string;
  templateId: string;
  templateVersionId: string | null;
  kind: DailyReportQuestionKind;
  label: string;
  hint: string | null;
  isRequired: boolean;
  allowTaskLink: boolean;
  sortOrder: number;
  /** true = câu lõi của công ty, không sửa/xóa được. */
  isCore: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyReportTemplateVersion {
  id: string;
  templateId: string;
  version: number;
  nameSnapshot: string;
  descriptionSnapshot: string | null;
  createdById: string | null;
  publishedAt: string;
  createdAt: string;
  questions: DailyReportTemplateQuestion[];
}

/**
 * `GET /daily-report-templates` trả `versions` CHỈ gồm bản mới nhất (`take: 1`);
 * `GET /daily-report-templates/:id` trả đủ mọi bản, mới nhất trước.
 * Lưu ý `PATCH /:id` trả về một `DailyReportTemplateVersion`, KHÔNG phải bộ này.
 */
export interface DailyReportTemplate {
  id: string;
  name: string;
  description: string | null;
  isSystemDefault: boolean;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  versions: DailyReportTemplateVersion[];
}

export interface TemplateQuestionPayload {
  kind: DailyReportQuestionKind;
  label: string;
  hint?: string;
  isRequired: boolean;
  allowTaskLink: boolean;
  /** 1–100, không trùng trong cùng bộ. */
  sortOrder: number;
}

export interface CreateTemplatePayload {
  name: string;
  description?: string;
  /** 1–20 câu. */
  questions: TemplateQuestionPayload[];
}

/** Sửa template = phát hành một version mới, bản cũ giữ nguyên. */
export interface UpdateTemplatePayload {
  name?: string;
  description?: string;
  questions?: TemplateQuestionPayload[];
}

export interface CloneTemplatePayload {
  /** Bỏ trống → server đặt "<tên gốc> — bản sao". */
  name?: string;
}

// ── Ghi ─────────────────────────────────────────────────────────────────────

/** Payload một câu khi lưu nháp / nộp. Chỉ câu được gửi mới bị ghi đè. */
export interface SaveAnswerPayload {
  questionId: string;
  /** Tối đa 5000 ký tự. */
  content?: string;
  isAutoDrafted?: boolean;
  /** Tối đa 50. */
  linkedTaskIds?: string[];
  /** Tối đa 50, chỉ người thuộc nghĩa vụ của báo cáo ngày đó. */
  mentionedUserIds?: string[];
  /** Tối đa 20, URL bắt buộc https. */
  attachments?: ReportAttachment[];
}
