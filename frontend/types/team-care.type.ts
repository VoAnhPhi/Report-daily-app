// Types for team-level babysitter F3 care-commission ("thù lao chăm sóc"),
// aggregated by team. Mirrors backend DTOs in
// acta-main-server/src/babysitter/dto/team-care-summary.dto.ts & team-care-orders.dto.ts.

export type CareCommissionStatus =
  | 'pending'
  | 'calculated'
  | 'paid'
  | 'cancelled';

export type TeamCareMemberRole = 'leader' | 'chief' | 'member';

export interface TeamCareTotals {
  /** Đã nhận (calculated + paid), VND */
  earned: number;
  /** Chờ duyệt (pending), VND */
  pending: number;
  /** Tổng (earned + pending), VND */
  total: number;
}

export interface TeamCareMember {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: TeamCareMemberRole;
  earned: number;
  pending: number;
  total: number;
}

export interface TeamCareSummary {
  teamId: string;
  teamName: string;
  memberCount: number;
  summary: TeamCareTotals;
  /** Trang hiện tại của danh sách thành viên */
  members: TeamCareMember[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TeamCareOrderItem {
  id: string;
  orderCode: string | null;
  /** Người chăm (earner) */
  beneficiaryName: string;
  /** Khách được chăm sóc */
  babyName: string;
  amount: number;
  status: CareCommissionStatus;
  createdAt: string;
}

export interface PaginatedTeamCareOrders {
  data: TeamCareOrderItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
