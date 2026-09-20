import { Role, UserStatus } from './user.type';

export type StatisticsViewType =
  | 'totalPoints'
  | 'recognizedPosts'
  | 'revenuePreTax'
  | 'directReferrals'
  | 'likeCount';

export type StatisticsPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface GrowthData {
  currentValue: number;
  previousValue: number;
  growthPercentage: number;
  growthAmount: number;
  trend: 'increase' | 'decrease' | 'stable';
}

export interface StatisticsUserResponse {
  id: string;
  fullName: string;
  avatarUrl?: string;
  status: UserStatus;
  referenceId: string;
  verificationDate?: Date | null;
  role: Role;
  rank: number;
  totalReferrals: number;
  totalPostsReactions: number;
}

export interface UserEngagementStats {
  id: string;
  fullName: string;
  avatarUrl?: string;
  referenceId: string;
  status: UserStatus;
  role: Role;
  rank: number;

  // New engagement metrics
  completedOrders: number;
  totalSpending: number;
  directReferrals: number;
  activePosts: number;
  totalPoints: number;

  // Legacy compatibility
  totalReferrals: number;
  totalPostsReactions: number;

  // Growth analysis (optional)
  completedOrdersGrowth?: GrowthData;
  totalSpendingGrowth?: GrowthData;
  directReferralsGrowth?: GrowthData;
  activePostsGrowth?: GrowthData;
  totalPointsGrowth?: GrowthData;
}

export interface StatisticsPostUser {
  id: string;
  fullName: string;
  avatarUrl?: string;
  referenceId: string;
}

export interface StatisticsPostResponse {
  id: string;
  title?: string;
  thumbnailUrl?: string;
  user: StatisticsPostUser;
  reactionCount: number;
  rank: number;
  publishedAt: Date;
}

export interface CurrentUserStatisticsRanking {
  // Engagement metrics
  completedOrders: number;
  totalSpending: number;
  directReferrals: number;
  activePosts: number;
  totalPoints: number;

  rank: number;
  totalUsers: number;
  percentage: number;

  // Growth analysis (optional)
  completedOrdersGrowth?: GrowthData;
  totalSpendingGrowth?: GrowthData;
  directReferralsGrowth?: GrowthData;
  activePostsGrowth?: GrowthData;
  totalPointsGrowth?: GrowthData;
}

export interface PaginatedStatisticsResponse {
  data: UserEngagementStats[];
  currentUserStatistics: CurrentUserStatisticsRanking;
  total: number;
  page: number;
  totalPages: number;
  period: string;
  viewType: string;
}

export interface StatisticsQuery {
  view?: StatisticsViewType;
  period?: StatisticsPeriod;
  referenceId?: string;
  searchQuery?: string;
  page?: number;
  limit?: number;
  showGrowth?: boolean;
  sort?: string;
  [key: string]: unknown;
}

// Type guard for UserEngagementStats
export function isUserEngagementStats(item: any): item is UserEngagementStats {
  return (
    'completedOrders' in item &&
    'totalSpending' in item &&
    'directReferrals' in item &&
    'activePosts' in item
  );
}

// Utility type for engagement data
export type EngagementStatisticsData = {
  data: UserEngagementStats[];
  currentUserStatistics: CurrentUserStatisticsRanking;
  total: number;
  page: number;
  totalPages: number;
  period: string;
  viewType: string;
};

// API response wrapper types
export interface StatisticsApiResponse {
  success: boolean;
  data?: PaginatedStatisticsResponse;
  error?: string;
  message?: string;
}

export interface StatisticsApiError {
  success: false;
  error: string;
  message?: string;
  statusCode?: number;
}
