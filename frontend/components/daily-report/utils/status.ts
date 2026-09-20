/**
 * Vòng đời một bản báo cáo: chọn bản để mở, trạng thái mục Báo cáo trên cụm
 * chuyển màn, và phân loại một lần nộp theo `submittedAt` chứ không theo cờ
 * `isMissed` của server.
 */

import type {
  DailyReport,
  DailyReportScopeListItem,
  DailyReportStatus,
  MyTodayResponse,
  PendingCountResponse,
} from '@/types/daily-report.type';

/** Đã nộp = SUBMITTED. REOPENED nghĩa là đang sửa lại sau một lần nộp. */
export const isSubmitted = (status: DailyReportStatus): boolean =>
  status === 'SUBMITTED';

/** Bản đã lưu trữ chỉ đọc, không thao tác gì được. */
export const isArchived = (status: DailyReportStatus): boolean =>
  status === 'ARCHIVED';

/**
 * Bản này có NẰM TRONG vòng duyệt không - điều kiện để in trạng thái duyệt.
 *
 * Bản nộp trước khi có vòng duyệt (09/09/2026) không có hạn, không có kết luận,
 * không có mốc hết hạn, và server vẫn suy nó là "Chờ duyệt" mãi mãi vì cron chỉ
 * đóng những bản có hạn. In badge cho nó là nói với người dùng rằng một bản cũ
 * đang chờ ai đó đọc - điều không có thật.
 */
export function isInReviewCycle(review: {
  deadlineAt?: string | null;
  decision?: string | null;
  expiredAt?: string | null;
}): boolean {
  return Boolean(review.deadlineAt || review.decision || review.expiredAt);
}

/**
 * Chọn bản báo cáo để hiển thị trong hộp thoại.
 *
 * Thứ tự: bản lấy riêng theo deep-link (nếu có) → bản người dùng chỉ định →
 * bản duy nhất của hôm nay.
 *
 * Nhánh cuối chỉ chạy khi KHÔNG có chỉ định nào. Trước đây nó chạy cả khi
 * `selectedReportId` tìm không ra, nên deep-link tới bản của ngày cũ (trưởng
 * nhóm mở lại được bản cũ — `canReopen` bỏ ràng buộc `sameDay` với quản lý)
 * lặng lẽ mở bản HÔM NAY, và người dùng sửa nhầm bản mà không có dấu hiệu gì.
 * Tìm không thấy là lỗi, không phải lý do để thế bằng bản khác.
 *
 * Để ở đây thay vì viết thẳng trong component để kiểm thử được mà không dựng
 * cả cây React.
 */
export function pickReport(
  reports: DailyReport[],
  selectedReportId: string | null,
  outsideReport?: DailyReport,
): DailyReport | null {
  if (outsideReport) return outsideReport;
  const chosen = reports.find((r) => r.id === selectedReportId);
  if (chosen) return chosen;
  if (selectedReportId !== null) return null;
  // Thuộc đúng 1 nhóm → bỏ bước chọn (docs 06 mục 2).
  return reports.length === 1 ? reports[0] : null;
}

/** Sáu tình huống của mục "Báo cáo" — xem doc 13 để biết vì sao phải tách rõ. */
export type ReportTabState =
  | 'missed'
  | 'pending'
  | 'done'
  | 'dayoff'
  | 'upcoming'
  | 'missing'
  | 'syncing'
  | 'none';

/**
 * Trạng thái mục "Báo cáo" trên cụm chuyển màn.
 *
 * Vì sao KHÔNG chỉ đếm `pending-count`: nó đếm chính các hàng report server đã
 * sinh, nên `total === 0` gộp ba tình huống rất khác nhau — không thuộc nhóm nào
 * · hôm nay nhóm nghỉ · chưa tới giờ sinh. Nói gộp cả ba thành "không có gì" là
 * lý do người dùng bật báo cáo xong rồi tưởng tính năng hỏng
 * (`docs/features/task-management/13-vi-sao-khong-thay-nut-bao-cao.md`).
 * `my/today.emptyReason` là nguồn sự thật cho trạng thái rỗng; client không tự
 * suy từ đồng hồ local hoặc membership hiện tại.
 *
 * Chưa tải xong hai query thì trả `null` — nơi gọi tự quyết hiện gì trong lúc chờ.
 */
export function reportTabState(
  scopes: DailyReportScopeListItem[] | undefined,
  pending: PendingCountResponse | undefined,
  today: MyTodayResponse | undefined,
): {
  state: ReportTabState;
  badge: number;
  title: string;
} | null {
  if (!scopes || !pending || !today) return null;

  /* Số bản chờ duyệt chỉ đi vào chú giải của tab, không thành chip (UAT
     16/09/2026 lượt 2). */
  const reviewCount = pending.pendingReview ?? 0;
  const reviewNote =
    reviewCount > 0 ? ` · ${reviewCount} báo cáo chờ bạn duyệt` : '';

  // `/daily-report-scopes/my` trả CẢ scope đang tạm dừng (để màn cấu hình bật
  // lại được). Ở đây chỉ nhóm đang bật mới có nghĩa.
  const enabled = scopes.filter((s) => s.isEnabled);
  /* Nhóm mình CHỈ duyệt không có bản nào để nộp. Tính nó vào đây là nói với
     người duyệt đứng ngoài nhóm rằng họ "đã thuộc nhóm" và đang có bản chờ nộp. */
  const active = enabled.filter((s) => s.isMember !== false);
  if (active.length === 0)
    return {
      state: 'none',
      badge: 0,
      title:
        enabled.length > 0
          ? `Bạn không có bản phải nộp, chỉ duyệt báo cáo${reviewNote}`
          : 'Bạn chưa thuộc nhóm nào bật báo cáo',
    };

  const { total, pending: unsubmitted, missed } = pending;

  const state: ReportTabState = (() => {
    if (total > 0 && unsubmitted === 0) return 'done';
    if (unsubmitted > 0) return missed > 0 ? 'missed' : 'pending';
    if (today.emptyReason === 'BEFORE_GENERATION') return 'upcoming';
    if (today.emptyReason === 'NON_REPORTING_DAY') return 'dayoff';
    if (today.emptyReason === 'NOT_IN_SNAPSHOT') return 'missing';
    if (today.emptyReason === 'SYNCING') return 'syncing';
    return 'none';
  })();

  /* Nhãn giờ sinh của nhóm, do server dựng. KHÔNG có fallback `'07:30'`: chuỗi
     cứng đó vẫn đọc trôi chảy nên nó CHE mất lỗi — nhóm khác giờ sinh, hoặc
     response thiếu trường, đều hiện ra một mốc đúng-như-thật mà không ai phát
     hiện. Thiếu nhãn thì viết câu KHÔNG kèm giờ: nói ít đi thì vẫn đúng, nói
     một mốc bịa ra thì sai. */
  const at = active[0]?.generationLabel || null;

  const title: Record<ReportTabState, string> = {
    missed: `Đã khóa — ${missed} báo cáo chưa nộp`,
    pending: `Còn ${unsubmitted} báo cáo chưa nộp`,
    done: 'Đã nộp báo cáo hôm nay',
    dayoff: 'Hôm nay không phải ngày báo cáo của nhóm bạn',
    upcoming: at
      ? `Bản báo cáo hôm nay được mở lúc ${at}`
      : 'Bản báo cáo hôm nay chưa tới giờ mở',
    missing: at
      ? `Bạn không nằm trong danh sách đã chốt lúc ${at}`
      : 'Bạn không nằm trong danh sách đã chốt của hôm nay',
    syncing: 'Hệ thống đang đồng bộ báo cáo hôm nay',
    none: 'Bạn chưa thuộc nhóm nào bật báo cáo',
  };

  return {
    state,
    badge: unsubmitted,
    title: `${title[state]}${reviewNote}`,
  };
}

/** Trạng thái của MỘT bản báo cáo. */
export type SubmissionState =
  | 'submitted'
  | 'reopened'
  | 'archivedSubmitted'
  | 'archivedMissed'
  | 'missed'
  | 'pending';

/**
 * Nhãn NGẮN, để in cạnh tên nhóm trên một hàng.
 *
 * Giữ ngắn là một ràng buộc bố cục, không phải sở thích: hàng trong Lịch sử có
 * tên nhóm co được và nhãn này không co, nên "Không nộp trước khi khóa" (137px
 * đo ở 320px ngày 16/09/2026) ăn hết chỗ và tên nhóm bị cắt còn vài ký tự.
 * Phần định nghĩa ("trước khi khóa", "nhóm đã lưu trữ") chuyển sang
 * `SUBMISSION_STATE_DETAIL` và chỉ đọc cho trình đọc màn hình.
 */
export const SUBMISSION_STATE_LABEL: Record<SubmissionState, string> = {
  submitted: 'Đã nộp',
  reopened: 'Đã nộp · đang sửa lại',
  archivedSubmitted: 'Đã nộp · đã lưu trữ',
  archivedMissed: 'Không nộp · đã lưu trữ',
  missed: 'Không nộp',
  pending: 'Còn hạn',
};

/** Câu đủ nghĩa của cùng trạng thái, cho `sr-only` và `aria-label`. */
export const SUBMISSION_STATE_DETAIL: Record<SubmissionState, string> = {
  submitted: 'Đã nộp',
  reopened: 'Đã nộp, đang sửa lại',
  archivedSubmitted: 'Đã nộp, nhóm đã lưu trữ',
  archivedMissed: 'Không nộp, nhóm đã lưu trữ',
  missed: 'Không nộp trước khi khóa',
  pending: 'Chưa nộp, còn hạn',
};

/**
 * Bản này đã TỪNG được nộp chưa.
 *
 * Đọc `submittedAt`, KHÔNG đọc `isMissed`. Đây là chỗ sửa lỗi nặng nhất của
 * cả màn, và lý do nằm ở hai đoạn phía server:
 *
 *   `daily-reports.service.ts`  — isMissed = status !== SUBMITTED && đã khóa
 *   `daily-report-scope.service.ts` — khi trưởng nhóm xoá nhóm khỏi báo cáo:
 *        tx.dailyReport.updateMany({ where: { scopeId },
 *                                    data: { status: ARCHIVED } })
 *
 * Ghép lại: MỌI bản của nhóm đó — kể cả những bản đã nộp đúng hạn từ năm
 * ngoái — chuyển sang `ARCHIVED`, và vì `ARCHIVED !== SUBMITTED` nên chúng
 * đồng loạt mang `isMissed: true`. Bản trước đọc thẳng cờ đó, nên một người
 * nộp đủ mười hai tháng chỉ cần trưởng nhóm bấm xoá là mở Lịch sử ra thấy
 * toàn bộ quá khứ của mình bị ghi "Không nộp trước khi khóa".
 *
 * `submittedAt` thì không phép biến đổi nào đụng tới: `updateMany` khi lưu
 * trữ chỉ đặt `status`, và mở lại để sửa cũng chỉ đặt `status` +
 * `reopenedBy/At/Reason`. Nó là bằng chứng duy nhất sống sót qua cả hai, nên
 * nó là nguồn sự thật cho câu hỏi "đã từng nộp chưa".
 */
export function wasEverSubmitted(item: {
  status: DailyReportStatus;
  submittedAt: string | null;
}): boolean {
  return item.status === 'SUBMITTED' || item.submittedAt !== null;
}

/**
 * Phân loại một bản báo cáo.
 *
 * Thứ tự các nhánh là HỢP ĐỒNG: `ARCHIVED` phải đứng đầu để tách được "đã
 * nộp rồi nhóm mới bị lưu trữ" khỏi "chưa nộp và nhóm bị lưu trữ" — hai câu
 * chuyện khác hẳn nhau mà `status` gộp chung làm một.
 */
export function classifySubmission(item: {
  status: DailyReportStatus;
  submittedAt: string | null;
  isMissed: boolean;
}): SubmissionState {
  const submitted = wasEverSubmitted(item);
  if (item.status === 'ARCHIVED')
    return submitted ? 'archivedSubmitted' : 'archivedMissed';
  if (item.status === 'SUBMITTED') return 'submitted';
  if (item.status === 'REOPENED' && submitted) return 'reopened';
  return item.isMissed ? 'missed' : 'pending';
}

/** Bản đó có tính là "đã hoàn thành nghĩa vụ hôm đó" không. */
export function isSubmissionDone(t: SubmissionState): boolean {
  return t === 'submitted' || t === 'reopened' || t === 'archivedSubmitted';
}
