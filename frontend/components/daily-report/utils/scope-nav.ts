/**
 * Điều hướng theo nhóm: dựng cột trái từ HỢP hai nguồn dữ liệu, chọn nhóm mặc
 * định theo màn đang xem, chuẩn hoá `?scope=`, và lấy bản hôm nay của đúng nhóm
 * đang chọn.
 */

import type {
  DailyReport,
  DailyReportScopeListItem,
} from '@/types/daily-report.type';

/** Một dòng ở cột nhóm. Gộp từ HAI nguồn — xem `buildScopeRailItems`. */
export interface ScopeRailItem {
  scopeId: string;
  name: string;
  /** Quyền cấu hình/trưởng nhóm, suy từ `/daily-report-scopes/my`. */
  isManager: boolean;
  /** Admin/super admin có thể xem dữ liệu nhóm dù không phải trưởng nhóm. */
  canViewGroupData: boolean;
  /** Được phân công duyệt một số thành viên của nhóm này. */
  isReviewer: boolean;
  /**
   * Có tên trong nhóm, tức có bản phải nộp ở đây. Người duyệt phụ đứng ngoài
   * nhóm là `isReviewer && !isMember`: họ chỉ duyệt, bản của họ ở nhóm khác.
   */
  isMember: boolean;
  /**
   * Mở được dải "Nhóm" (bảng theo dõi). Quản lý và admin thấy cả nhóm; người
   * duyệt phụ thấy đúng phần mình phụ trách vì server đã lọc sẵn. KHÔNG dùng
   * cờ này cho "Tổng quan": KPI ở đó vẫn gác bằng `canViewGroupData`.
   */
  canViewBoard: boolean;
  /** Bản của hôm nay ở nhóm này, nếu có. */
  report: DailyReport | null;
  /** Nhóm này chỉ đến từ `my/today`, KHÔNG có trong danh sách nhóm của tôi. */
  fromTodayOnly: boolean;
}

/** Nhóm mà người này chỉ duyệt, không có bản phải nộp. */
export const isReviewOnly = (item: ScopeRailItem) =>
  item.isReviewer && !item.isMember && !item.isManager;

/**
 * Dựng danh sách nhóm cho cột trái từ **hợp** của hai nguồn, không phải chỉ một.
 *
 * Vì sao phải hợp: `useMyReportScopes` KHÔNG kèm `onBehalfOfUserId` còn
 * `useMyTodayReports` thì CÓ (xem `hooks/queries/daily-report-queries.ts`). Ở
 * chế độ làm thay, `scopes` là nhóm của NGƯỜI ĐĂNG NHẬP còn `reports` là bản
 * của NGƯỜI ĐƯỢC CHĂM. Dựng cột trái từ mỗi `scopes` là nhóm nào người được
 * chăm có mà mình không có sẽ biến mất khỏi danh sách — và đó là bản mình đang
 * phải nộp hộ, tức mất hẳn đường vào. `ScopePicker` cũ liệt kê thẳng từ
 * `reports` nên không dính lỗi này; thay nó thì phải giữ lại tính chất đó.
 *
 * Thứ tự: nhóm mình quản lý → nhóm mình tham gia → nhóm mình chỉ duyệt → nhóm
 * chỉ có trong my/today. Trong mỗi cụm giữ nguyên thứ tự nguồn để danh sách
 * không nhảy giữa các lần vẽ.
 *
 * Cụm "chỉ duyệt" chia bằng DANH TÍNH mà server trả (`isReviewer` = có dòng
 * phân công, `isMember` = có tên trong nhóm), KHÔNG bằng `canViewGroupData`.
 * Cờ đó nói về quyền đọc dữ liệu nhóm và bật cho admin ở mọi dòng - chia cụm
 * theo nó là lỗi của cụm "Đang giám sát" đã bỏ (xem `daily-report-scope-rail.tsx`).
 */
export function buildScopeRailItems(
  scopes: DailyReportScopeListItem[] | undefined,
  reports: DailyReport[],
): ScopeRailItem[] {
  const reportOf = (scopeId: string): DailyReport | null =>
    reports.find((r) => r.scope.id === scopeId) ?? null;

  const enabled = (scopes ?? []).filter((s) => s.isEnabled);
  const known = new Set(enabled.map((s) => s.id));

  const fromScopes: ScopeRailItem[] = enabled.map((s) => {
    const canViewGroupData = s.canViewGroupData ?? s.isManager;
    const isReviewer = s.isReviewer ?? false;
    return {
      scopeId: s.id,
      name: s.name,
      isManager: s.isManager,
      canViewGroupData,
      isReviewer,
      // Server cũ chưa trả cờ này: coi như thuộc nhóm, đúng hành vi trước đây.
      isMember: s.isMember ?? true,
      canViewBoard: canViewGroupData || isReviewer,
      report: reportOf(s.id),
      fromTodayOnly: false,
    };
  });

  const extras: ScopeRailItem[] = [];
  for (const r of reports) {
    if (known.has(r.scope.id) || extras.some((e) => e.scopeId === r.scope.id)) {
      continue;
    }
    extras.push({
      scopeId: r.scope.id,
      name: r.scope.name,
      isManager: false,
      canViewGroupData: false,
      isReviewer: false,
      isMember: true,
      canViewBoard: false,
      report: r,
      fromTodayOnly: true,
    });
  }

  return [
    ...fromScopes.filter((i) => i.isManager),
    ...fromScopes.filter((i) => !i.isManager && !isReviewOnly(i)),
    ...fromScopes.filter((i) => isReviewOnly(i)),
    ...extras,
  ];
}

/** Sáu màn con của Báo cáo - cùng tập giá trị với `ReportView` của workspace. */
export type ReportViewKey =
  | 'report'
  | 'history'
  | 'board'
  | 'pending-review'
  | 'summary'
  | 'review-groups';

/**
 * Nhóm nào được chọn khi URL chưa nói. Tái lập ĐÚNG hành vi cũ để link đã phát
 * hành không đổi nghĩa:
 * - `board` / `summary` → nhóm đầu tiên mình quản lý (chính là
 *   `initialBoardScopeId` mà page đang tính ở `defaultBoardScopeId`);
 * - `report` / `history` → nhóm của bản đầu tiên trong `my/today`, vì đó là
 *   thứ người dùng vào màn này để làm.
 *
 * Để ở đây thay vì viết trong component để workspace và page dùng CHUNG một
 * luật — hai chỗ tự tính là sớm muộn cũng trôi lệch nhau.
 */
export function resolveDefaultScopeId(
  view: ReportViewKey,
  items: ScopeRailItem[],
  initialBoardScopeId: string | null,
  /**
   * Người xem có được mở nhóm NGOÀI danh sách của mình không.
   *
   * Chỉ admin nền tảng. `/daily-report-scopes/my` cố ý không trả nhóm mà họ
   * không thuộc về nữa (xem `getMy` bên `acta-api`), trong khi
   * `canViewGroupData()` ở server vẫn cho họ đọc board/summary của những nhóm
   * đó. Không có cờ này thì mọi link giám sát đều bị lặng lẽ thay bằng nhóm của
   * chính họ, và không ai hiểu vì sao link vừa gửi lại mở ra nhóm khác.
   *
   * Mặc định `false` để người dùng thường giữ nguyên hành vi cũ: `scopeId` lạ,
   * nhóm đã xoá hay nhóm vừa rời đều rơi êm về nhóm mặc định thay vì dựng một
   * khối lỗi. Với họ đó gần như luôn là link cũ, không phải chủ đích.
   */
  canOpenScopesOutsideList = false,
): string | null {
  if (
    view === 'board' ||
    view === 'pending-review' ||
    view === 'summary' ||
    view === 'review-groups'
  ) {
    if (
      initialBoardScopeId &&
      (canOpenScopesOutsideList ||
        items.some((i) => i.scopeId === initialBoardScopeId))
    ) {
      return initialBoardScopeId;
    }
    /* Ba màn, ba luật: bảng mở cho cả người duyệt phụ (server lọc sẵn), Tổng
       quan chỉ cho người xem được dữ liệu cả nhóm, còn chia nhóm duyệt thì
       đúng trưởng nhóm - kể cả admin nền tảng cũng không. */
    return (
      items.find((i) =>
        /* "Chờ duyệt" cùng cổng với bảng: người duyệt phụ vào được, server đã
           lọc sẵn về phần họ phụ trách. */
        view === 'board' || view === 'pending-review'
          ? i.canViewBoard
          : view === 'summary'
            ? i.canViewGroupData
            : i.isManager,
      )?.scopeId ?? null
    );
  }
  /* Màn "Báo cáo của tôi" mở vào bản CỦA MÌNH trước: vai duyệt không miễn cho
     ai việc nộp. Nhóm mình chỉ duyệt đứng sau cùng, chỉ được chọn khi không
     còn nhóm nào khác. */
  return (
    items.find((i) => i.report !== null)?.scopeId ??
    items.find((i) => !isReviewOnly(i))?.scopeId ??
    items[0]?.scopeId ??
    null
  );
}

/**
 * `?scope=` là chuỗi thô người dùng sửa tay được. Không hợp lệ thì coi như
 * chưa chọn gì và rơi về mặc định — KHÔNG dựng một khối lỗi, vì cùng đường đó
 * còn mang link do chính app sinh ra (dòng Lịch sử của nhóm đã lưu trữ).
 */
export function normalizeScopeParam(
  scopeParam: string | null,
  items: ScopeRailItem[],
): string | null {
  if (!scopeParam) return null;
  return items.some((i) => i.scopeId === scopeParam) ? scopeParam : null;
}

/**
 * Bản hôm nay của ĐÚNG nhóm đang chọn.
 *
 * Trả `undefined` nghĩa là "nhóm này hôm nay không có bản" — người gọi phải vẽ
 * khối nói rõ điều đó. TUYỆT ĐỐI không được để `pickReport` tự chọn tiếp trong
 * ca này: nhánh cuối của nó ("đúng 1 bản thì mở luôn") sẽ mở bản của NHÓM KHÁC
 * trong khi cột trái vẫn sáng nhóm này — đúng loại lỗi sửa nhầm bản mà
 * `pickReport` được viết ra để chặn.
 */
export function todayReportOfScope(
  reports: DailyReport[],
  scopeId: string | null,
): DailyReport | undefined {
  if (scopeId === null) return undefined;
  return reports.find((r) => r.scope.id === scopeId);
}

// ── Lịch trong ngày của một nhóm ────────────────────────────────────────────

/* ── Giá trị DỰ PHÒNG của bốn mốc trong ngày ────────────────────────────────
 *
 * Bốn hằng số dưới đây KHÔNG phải nguồn sự thật. Giá trị thật của một nhóm
 * luôn đến từ server: `generationLabel`, `reminderLabel`, `leaderSummaryLabel`,
 * `hardStopLabel` / `hardStopMinute` trên chính scope đó (docs 11 mục 2 —
 * "không hard-code các mốc giờ trong component").
 *
 * Chúng chỉ được dùng ở đúng hai tình huống:
 *   1. chưa có scope nào để đọc (đang tạo nhóm mới, server chưa đặt lịch), và
 *   2. nhãn server trả về không đọc được — lúc đó thà hiện mặc định của server
 *      còn hơn hiện `NaN:NaN`.
 * Có scope trong tay mà vẫn đọc hằng số ở đây là một lỗi, không phải một lối tắt.
 */
