export const business_teams = {
  user: (userId: string) => `/business-teams/user/${userId}`,
  all: '/business-teams/all',
  userRequest: (teamId: string) => `/business-teams/${teamId}/user-request`,
  // & V2 endpoints - using /stats instead of /statistics -- PORTFOLIO MODE
  stats: (teamId: string) => `/business-teams/${teamId}/stats`,
  statsDashboard: (teamId: string) =>
    `/business-teams/${teamId}/stats/dashboard`,
  // & V2 endpoint for filtered stats by date range and criteria -- PORTFOLIO MODE
  membersStats: (teamId: string) => `/business-teams/${teamId}/members/stats`,
  statsByRange: (teamId: string) =>
    `/business-teams/performance/${teamId}/stats`,
  // ^ Performance member stats endpoint (with date filter)
  performanceMembersStats: (teamId: string) =>
    `/business-teams/performance/${teamId}/members/stats`,
  memberOrders: (teamId: string, userId: string) =>
    `/business-teams/${teamId}/members/${userId}/orders`,
  joinRequest: {
    value: '/business-teams/join-request',
  },
  leaveRequest: {
    value: '/business-teams/leave-request',
  },
  cancelJoinRequest: (requestId: string) =>
    `/business-teams/join-request/${requestId}`,
  orderEligibility: '/business-teams/user-order-eligibility',
} as const;
