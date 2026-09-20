export const babysitter = {
  // Danh sách người tôi đang chăm sóc (approved-active + pending) — cho dropdown "làm thay".
  myBabies: '/babysitter/my-babies',
  // Team-level "thù lao chăm sóc" (F3 care-commission) aggregation
  teamCareTotal: (teamId: string) => `/babysitter/team/${teamId}/care-total`,
  teamCareSummary: (teamId: string) =>
    `/babysitter/team/${teamId}/care-summary`,
  teamCareOrders: (teamId: string) =>
    `/babysitter/team/${teamId}/care-orders`,
} as const;
