/**
 * Seasonal Leaderboard Types
 * Matches backend season DTOs and database schema
 */

// ==================== ENUMS ====================

export enum SeasonStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  ENDED = 'ended',
  ARCHIVED = 'archived',
}

// ==================== SEASON TYPES ====================

export interface Season {
  id: string;
  name: string;
  description: string;
  status: SeasonStatus;
  startDate: Date;
  endDate: Date;
  theme?: string;
  icon?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSeasonDto {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  theme?: string;
  icon?: string;
  metadata?: Record<string, any>;
}

export interface UpdateSeasonDto {
  name?: string;
  description?: string;
  status?: SeasonStatus;
  startDate?: string;
  endDate?: string;
  theme?: string;
  icon?: string;
  metadata?: Record<string, any>;
}

// ==================== SEASON LEADERBOARD TYPES ====================

export interface SeasonLeaderboard {
  id: string;
  seasonId: string;
  name: string;
  description?: string;
  metric: 'points' | 'experience' | 'tasks' | 'achievements';
  isActive: boolean;
  metadata?: Record<string, any>;
  season?: Season;
}

export interface CreateSeasonLeaderboardDto {
  seasonId: string;
  name: string;
  description?: string;
  metric: 'points' | 'experience' | 'tasks' | 'achievements';
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateSeasonLeaderboardDto {
  name?: string;
  description?: string;
  metric?: 'points' | 'experience' | 'tasks' | 'achievements';
  isActive?: boolean;
  metadata?: Record<string, any>;
}

// ==================== LEADERBOARD ENTRY TYPES ====================

export interface SeasonLeaderboardEntry {
  id: string;
  leaderboardId: string;
  userId: string;
  value: number;
  rank: number;
  metadata?: Record<string, any>;
  lastUpdatedAt: Date;
  user?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    level?: number;
  };
  leaderboard?: SeasonLeaderboard;
}

export interface UpdateLeaderboardEntryDto {
  value: number;
  metadata?: Record<string, any>;
}

// ==================== QUERY TYPES ====================

export interface SeasonQuery {
  status?: SeasonStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'startDate' | 'endDate' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface SeasonLeaderboardQuery {
  metric?: 'points' | 'experience' | 'tasks' | 'achievements';
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

// ==================== RESPONSE TYPES ====================

export interface PaginatedSeasons {
  data: Season[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PaginatedLeaderboardEntries {
  data: SeasonLeaderboardEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SeasonDetailResponse extends Season {
  leaderboards: SeasonLeaderboard[];
  participantCount: number;
  isParticipating: boolean;
  myRank?: {
    leaderboardId: string;
    rank: number;
    value: number;
  };
}

export interface SeasonLeaderboardResponse {
  leaderboard: SeasonLeaderboard;
  entries: SeasonLeaderboardEntry[];
  totalParticipants: number;
  myEntry?: SeasonLeaderboardEntry;
}

export interface CurrentSeasonResponse {
  season?: Season;
  myProgress: {
    points: number;
    experience: number;
    tasksCompleted: number;
    achievementsUnlocked: number;
  };
  leaderboards: Array<{
    leaderboard: SeasonLeaderboard;
    myRank?: number;
    myValue?: number;
  }>;
}

export interface ArchivedSeasonsResponse {
  seasons: Array<{
    season: Season;
    myBestRanks: Array<{
      leaderboardId: string;
      leaderboardName: string;
      rank: number;
      value: number;
    }>;
  }>;
  total: number;
}

// ==================== ADMIN ANALYTICS ====================

export interface SeasonAnalytics {
  seasonId: string;
  seasonName: string;
  participantCount: number;
  totalPointsEarned: number;
  totalExperienceEarned: number;
  totalTasksCompleted: number;
  totalAchievementsUnlocked: number;
  averagePointsPerUser: number;
  topPerformers: Array<{
    userId: string;
    userName: string;
    userAvatar?: string;
    points: number;
    experience: number;
    tasks: number;
    achievements: number;
  }>;
  leaderboardStats: Array<{
    leaderboardId: string;
    leaderboardName: string;
    metric: string;
    participantCount: number;
    topValue: number;
    averageValue: number;
  }>;
}

export interface AllSeasonsAnalytics {
  totalSeasons: number;
  activeSeasons: number;
  completedSeasons: number;
  totalParticipants: number;
  totalPointsAwarded: number;
  averageParticipantsPerSeason: number;
  seasonComparison: Array<{
    seasonId: string;
    seasonName: string;
    participantCount: number;
    engagementRate: number;
  }>;
}
