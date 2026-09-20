/**
 * Tổng hợp KPI của MỘT NGÀY cho bảng theo dõi nhóm.
 *
 * Màn Tổng quan đã có phép đếm KPI nhưng theo cả KHOẢNG ngày
 * (`SummaryResponse.kpis`). Bảng nhóm cần đúng phép đếm đó thu về một ngày, cộng
 * một con số chung ở đầu bảng.
 *
 * Tách thành hàm thuần để test được mà không phải dựng mock Prisma: toàn bộ dữ
 * liệu đã nằm sẵn trong bộ nhớ ở `getBoard` (`kpiAchievements` vốn đã được
 * include), nên đây chỉ là phép đếm.
 */

import { DailyReportStatus } from '@prisma/client';

export interface DailyKpiSummaryItem {
  kpiId: string;
  name: string;
  /** Số người ĐẠT KPI này trong ngày, đếm theo người chứ không theo bản. */
  achievedMembers: number;
  /** Mẫu số — tổng nghĩa vụ đã chụp của ngày, bằng `stats.total`. */
  totalMembers: number;
  /** `achievedMembers / totalMembers`, làm tròn về số nguyên phần trăm. */
  percent: number;
}

export interface DailyKpiSummary {
  /**
   * Con số chung của ngày: tổng lượt đạt chia cho (số KPI × số người phải nộp).
   *
   * Phép này BẰNG trung bình cộng tỉ lệ của các dòng bên dưới — cố ý chọn vậy để
   * đầu bảng không bao giờ mâu thuẫn với danh sách khi người dùng bung ra kiểm.
   * Chênh lệch duy nhất có thể thấy là ≤ 1 điểm do mỗi dòng được làm tròn riêng
   * khi hiển thị; con số này tính từ số đếm thô nên nó mới là con số đúng.
   */
  achievedPercent: number;
  items: DailyKpiSummaryItem[];
}

interface KpiRef {
  id: string;
  name: string;
}

interface ReportRef {
  userId: string;
  status: DailyReportStatus;
  kpiAchievements: Array<{ kpiId: string; nameSnapshot: string }>;
}

const percentOf = (part: number, whole: number): number =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

/**
 * @param activeKpis  Danh mục KPI đang bật của nhóm, ĐÃ sắp theo `sortOrder`.
 * @param reports     Mọi bản báo cáo của ngày, kèm `kpiAchievements`.
 * @param totalMembers Tổng nghĩa vụ đã chụp của ngày (`stats.total`).
 */
export const buildDailyKpiSummary = (
  activeKpis: KpiRef[],
  reports: ReportRef[],
  totalMembers: number,
): DailyKpiSummary => {
  /*
   * CHỈ tính bản đã nộp — cùng luật với `SummaryResponse.kpis` và
   * `GroupOutcomeResponse`. Hai lý do, và lý do thứ hai mới là lý do bắt buộc:
   *
   *   1. KPI tick trong bản nháp chưa phải là kết quả đã chốt của nhóm.
   *   2. `stats.submitted` của chính bảng này cũng chỉ đếm SUBMITTED, nên nếu
   *      KPI đếm cả REOPENED thì hai con số cạnh nhau trên cùng một đầu bảng sẽ
   *      chỏi nhau — người xem đọc ra ngay và báo là lỗi.
   */
  const achievedBy = new Map<string, Set<string>>();
  const nameById = new Map<string, string>();
  for (const report of reports) {
    if (report.status !== DailyReportStatus.SUBMITTED) continue;
    for (const achievement of report.kpiAchievements) {
      const members = achievedBy.get(achievement.kpiId) ?? new Set<string>();
      members.add(report.userId);
      achievedBy.set(achievement.kpiId, members);
      // `nameSnapshot` là nguồn tên cho KPI đã bị lưu trữ — chính là việc mà cột
      // này sinh ra để làm.
      if (!nameById.has(achievement.kpiId)) {
        nameById.set(achievement.kpiId, achievement.nameSnapshot);
      }
    }
  }

  /*
   * Bắt đầu từ DANH MỤC chứ không từ danh sách đã đạt — khác hẳn màn Tổng quan.
   * Màn đó dựng danh sách từ achievement nên KPI không ai đạt thì biến mất khỏi
   * bảng; ở bảng theo dõi ngày thì đó lại chính là dòng trưởng nhóm cần thấy
   * nhất, nên nó phải hiện với 0%.
   */
  const items: DailyKpiSummaryItem[] = activeKpis.map((kpi) => {
    const achievedMembers = achievedBy.get(kpi.id)?.size ?? 0;
    return {
      kpiId: kpi.id,
      name: kpi.name,
      achievedMembers,
      totalMembers,
      percent: percentOf(achievedMembers, totalMembers),
    };
  });

  /*
   * KPI đã lưu trữ hoặc tắt SAU khi có người đạt trong ngày vẫn phải hiện, nếu
   * không thì xem lại một ngày cũ sẽ thấy công của người ta bốc hơi chỉ vì hôm
   * nay trưởng nhóm dọn danh mục.
   */
  const activeIds = new Set(activeKpis.map((kpi) => kpi.id));
  for (const [kpiId, members] of achievedBy) {
    if (activeIds.has(kpiId)) continue;
    items.push({
      kpiId,
      name: nameById.get(kpiId) ?? '',
      achievedMembers: members.size,
      totalMembers,
      percent: percentOf(members.size, totalMembers),
    });
  }

  const totalAchieved = items.reduce(
    (sum, item) => sum + item.achievedMembers,
    0,
  );
  return {
    achievedPercent: percentOf(totalAchieved, items.length * totalMembers),
    items,
  };
};
