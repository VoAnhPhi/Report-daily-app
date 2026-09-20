// ==================== ENUMS ====================

export type TaskType =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'one_time'
  | 'repeatable'
  | 'milestone';

export type TaskStatus =
  | 'active'
  | 'inactive'
  | 'scheduled'
  | 'expired'
  | 'archived';

export type UserTaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'claimed'
  | 'expired';

export type AchievementType =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'legendary';

export type AchievementCategory =
  | 'social'
  | 'commerce'
  | 'engagement'
  | 'learning'
  | 'community'
  | 'special'
  | 'progression';

export type ShopItemType =
  | 'consumable'
  | 'cosmetic'
  | 'booster'
  | 'badge'
  | 'title'
  | 'discount'
  | 'physical';

export type ShopItemRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

export type StreakType = 'login' | 'post' | 'order' | 'learning';

export type LeaderboardType = 'daily' | 'weekly' | 'monthly' | 'all_time';

// ==================== BASE MODELS ====================

export interface UserActivityStats {
  id: string;
  userId: string;
  currentPoints: number;
  totalPointsEarned: number;
  totalPointsSpent: number;
  currentLevel: number;
  currentExperience: number;
  experienceToNext: number;
  dailyPointsEarned: number;
  dailyTasksCompleted: number;
  weeklyPointsEarned: number;
  weeklyTasksCompleted: number;
  monthlyPointsEarned: number;
  monthlyTasksCompleted: number;
  dailyRank?: number;
  weeklyRank?: number;
  monthlyRank?: number;
  globalRank?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  code: string;
  title: string;
  description?: string;
  icon?: string;
  type: TaskType;
  status: TaskStatus;
  categoryId: string;
  targetCount: number;
  requiredActivityTypes: string[];
  conditions?: any;
  pointReward: number;
  experienceReward: number;
  achievementRewardIds: string[];
  isPublic: boolean;
  minUserLevel: number;
  cooldownHours?: number;
  startDate?: string;
  endDate?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserTask {
  id: string;
  userId: string;
  taskId: string;
  task?: Task;
  status: UserTaskStatus;
  currentCount: number;
  targetCount: number;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  claimedAt?: string;
  expiresAt?: string;
  pointsEarned: number;
  experienceEarned: number;
  createdAt: string;
  updatedAt: string;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  badge?: string;
  type: AchievementType;
  category: AchievementCategory;
  tier: number;
  isProgressBased: boolean;
  requiredCount: number;
  requiredActivityTypes: string[];
  conditions?: any;
  previousTierId?: string;
  nextTierId?: string;
  pointReward: number;
  experienceReward: number;
  title?: string;
  isActive: boolean;
  rarity: string;
  sortOrder: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  achievement?: Achievement;
  currentProgress: number;
  targetProgress: number;
  progressPercent: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  isPinned: boolean;
  isDisplayed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShopItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  type: ShopItemType;
  rarity: ShopItemRarity;
  pointCost: number;
  stock?: number;
  purchaseLimit?: number;
  effects?: any;
  duration?: number;
  isActive: boolean;
  isLimitedTime: boolean;
  startDate?: string;
  endDate?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserInventory {
  id: string;
  userId: string;
  itemId: string;
  item?: ShopItem;
  quantity: number;
  isEquipped: boolean;
  isActive: boolean;
  effectExpiresAt?: string;
  effectUsedAt?: string;
  metadata?: any;
  acquiredAt: string;
  updatedAt: string;
}

export interface Streak {
  id: string;
  userId: string;
  streakType: StreakType;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: string;
  milestoneHits: number;
  lastMilestone: number;
  nextMilestone: number;
  totalRewardsEarned: number;
  freezesAvailable: number;
  freezesUsed: number;
  frozenUntil?: string;
  isFrozen: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardEntry {
  id: string;
  leaderboardId: string;
  userId: string;
  rank: number;
  previousRank?: number;
  score: number;
  userDisplayName: string;
  userAvatar?: string;
  userLevel: number;
  createdAt: string;
  updatedAt: string;
}

export interface Leaderboard {
  id: string;
  name: string;
  description?: string;
  type: LeaderboardType;
  metric: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  entries?: LeaderboardEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface PointTransaction {
  id: string;
  userId: string;
  type: 'earn' | 'spend' | 'bonus' | 'penalty' | 'admin_adjustment';
  points: number;
  balance: number;
  experience: number;
  multiplier: number;
  sourceType: string;
  sourceId?: string;
  sourceName?: string;
  description?: string;
  isBonusEvent: boolean;
  metadata?: any;
  createdAt: string;
}

export interface GamificationEvent {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  pointsMultiplier: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== DASHBOARD ====================

export interface GamificationDashboard {
  stats: {
    currentPoints: number;
    totalPoints: number;
    currentLevel: number;
    currentExperience: number;
    experienceToNext: number;
    progressToNextLevel: number;
    currentLoginStreak: number;
    longestLoginStreak: number;
    dailyRank?: number;
    weeklyRank?: number;
    globalRank?: number;
    achievementsUnlocked: number;
    tasksCompletedToday: number;
    tasksCompletedThisWeek: number;
  };
  activeTasks: UserTask[];
  recentAchievements: UserAchievement[];
  streaks: {
    login: Streak;
    post?: Streak;
    order?: Streak;
    learning?: Streak;
  };
  nextLevel: {
    level: number;
    requiredExperience: number;
    pointReward: number;
    title: string;
  };
}

// ==================== API RESPONSES ====================

export interface TasksResponse {
  tasks: UserTask[];
  meta: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
}

export interface AchievementsResponse {
  achievements: UserAchievement[];
  summary: {
    total: number;
    unlocked: number;
    inProgress: number;
    locked: number;
    byCategory: Record<string, number>;
  };
}

export interface PointHistoryResponse {
  transactions: PointTransaction[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  summary: {
    totalEarned: number;
    totalSpent: number;
    currentBalance: number;
  };
}

export interface LeaderboardResponse {
  leaderboard: Leaderboard;
  entries: LeaderboardEntry[];
  userEntry?: {
    rank: number;
    score: number;
    previousRank?: number;
    change?: number;
  };
  meta: {
    total: number;
    lastUpdated: string;
  };
}

export interface StreaksResponse {
  streaks: {
    login?: Streak;
    post?: Streak;
    order?: Streak;
    learning?: Streak;
  };
  milestones: {
    upcoming: Array<{
      type: StreakType;
      days: number;
      daysRemaining: number;
      rewards: {
        points: number;
        experience: number;
        achievement?: string;
      };
    }>;
    completed: Array<{
      type: StreakType;
      days: number;
      completedAt: string;
      rewards: {
        points: number;
        experience: number;
      };
    }>;
  };
}

// ==================== ADMIN TYPES ====================

export interface AdminAnalyticsOverview {
  users: {
    total: number;
    active: number;
  };
  points: {
    totalEarned: number;
  };
  tasks: {
    total: number;
    completed: number;
  };
  achievements: {
    total: number;
    unlocked: number;
  };
  taskPerformance?: Array<{
    taskId: string;
    taskName: string;
    completionRate: number;
    participantCount: number;
    completionCount: number;
  }>;
  achievementUnlockRates?: Array<{
    achievementId: string;
    achievementName: string;
    unlockRate: number;
    unlockedCount: number;
  }>;
  pointsDistribution?: {
    totalEarned: number;
    totalSpent: number;
    averagePerUser: number;
  };
  recentActivity?: Array<{
    description: string;
    type: string;
    createdAt: string;
  }>;
}

export interface AdminUserStats {
  stats: UserActivityStats & {
    user?: {
      id: string;
      fullName: string;
      email: string;
      avatar?: any;
    };
  };
  tasks: Array<
    UserTask & {
      task: {
        id: string;
        title: string;
        type: TaskType;
      };
    }
  >;
  achievements: Array<
    UserAchievement & {
      achievement: {
        id: string;
        name: string;
        type: AchievementType;
      };
    }
  >;
}

// ==================== DTO TYPES ====================

export interface CreateTaskDto {
  code: string;
  title: string;
  description?: string;
  icon?: string;
  type: TaskType;
  status?: TaskStatus;
  categoryId: string;
  targetCount: number;
  requiredActivityTypes: string[];
  conditions?: any;
  pointReward: number;
  experienceReward: number;
  achievementRewardIds?: string[];
  isPublic?: boolean;
  minUserLevel?: number;
  cooldownHours?: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  icon?: string;
  status?: TaskStatus;
  targetCount?: number;
  pointReward?: number;
  experienceReward?: number;
  isPublic?: boolean;
  minUserLevel?: number;
}

export interface CreateAchievementDto {
  code: string;
  name: string;
  description?: string;
  icon?: string;
  badge?: string;
  type: AchievementType;
  category: AchievementCategory;
  tier?: number;
  isProgressBased?: boolean;
  requiredCount: number;
  requiredActivityTypes: string[];
  conditions?: any;
  previousTierId?: string;
  pointReward: number;
  experienceReward: number;
  title?: string;
  rarity?: string;
  isActive?: boolean;
}

export interface UpdateAchievementDto {
  name?: string;
  description?: string;
  icon?: string;
  pointReward?: number;
  experienceReward?: number;
  isActive?: boolean;
}

export interface AdjustPointsDto {
  points: number;
  reason: string;
  adminNote?: string;
}

export interface SpendPointsDto {
  amount: number;
  reason: string;
  itemId?: string;
}

export interface CreateEventDto {
  code: string;
  name: string;
  description?: string;
  type: string;
  pointsMultiplier?: number;
  startDate: string;
  endDate: string;
}

export interface CreateShopItemDto {
  code: string;
  name: string;
  description?: string;
  icon?: string;
  type: ShopItemType;
  rarity?: ShopItemRarity;
  pointCost: number;
  stock?: number;
  purchaseLimit?: number;
  effects?: any;
  duration?: number;
  isLimitedTime?: boolean;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export interface UpdateShopItemDto {
  name?: string;
  description?: string;
  pointCost?: number;
  stock?: number;
  isActive?: boolean;
  icon?: string;
  metadata?: Record<string, any>;
  effects?: any;
  duration?: number;
  purchaseLimit?: number;
  rarity?: ShopItemRarity;
  type?: ShopItemType;
}
