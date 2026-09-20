/**
 * Social Challenge Types
 * Matches backend challenge DTOs and database schema
 */

// ==================== ENUMS ====================

export enum ChallengeType {
  INDIVIDUAL = 'individual',
  TEAM = 'team',
  COMPETITIVE = 'competitive',
  COOPERATIVE = 'cooperative',
}

export enum ChallengeStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ParticipantStatus {
  JOINED = 'joined',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  WITHDRAWN = 'withdrawn',
}

// ==================== CHALLENGE TYPES ====================

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  status: ChallengeStatus;
  startDate: Date;
  endDate: Date;
  targetValue: number;
  pointsReward: number;
  experienceReward: number;
  maxParticipants?: number;
  isPublic: boolean;
  icon?: string;
  metadata?: Record<string, any>;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
}

export interface CreateChallengeDto {
  title: string;
  description: string;
  type: ChallengeType;
  startDate: string;
  endDate: string;
  targetValue: number;
  pointsReward: number;
  experienceReward: number;
  maxParticipants?: number;
  isPublic?: boolean;
  icon?: string;
  metadata?: Record<string, any>;
}

export interface UpdateChallengeDto {
  title?: string;
  description?: string;
  type?: ChallengeType;
  status?: ChallengeStatus;
  startDate?: string;
  endDate?: string;
  targetValue?: number;
  pointsReward?: number;
  experienceReward?: number;
  maxParticipants?: number;
  isPublic?: boolean;
  icon?: string;
  metadata?: Record<string, any>;
}

// ==================== PARTICIPANT TYPES ====================

export interface ChallengeParticipant {
  id: string;
  userId: string;
  challengeId: string;
  status: ParticipantStatus;
  progress: number;
  score: number;
  rank?: number;
  joinedAt: Date;
  completedAt?: Date;
  rewardClaimed: boolean;
  claimedAt?: Date;
  user?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  challenge?: Challenge;
}

export interface JoinChallengeDto {
  challengeId: string;
}

export interface UpdateChallengeProgressDto {
  challengeId: string;
  progress: number;
  score?: number;
}

export interface ClaimChallengeRewardDto {
  challengeId: string;
}

// ==================== LEADERBOARD TYPES ====================

export interface ChallengeLeaderboardEntry {
  userId: string;
  userName: string;
  userAvatar?: string;
  progress: number;
  score: number;
  rank: number;
  isCompleted: boolean;
  completedAt?: Date;
}

export interface ChallengeLeaderboard {
  challengeId: string;
  challengeTitle: string;
  entries: ChallengeLeaderboardEntry[];
  totalParticipants: number;
  myRank?: number;
  myProgress?: number;
}

// ==================== QUERY TYPES ====================

export interface ChallengeQuery {
  type?: ChallengeType;
  status?: ChallengeStatus;
  isPublic?: boolean;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'startDate' | 'endDate' | 'pointsReward' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ChallengeParticipantQuery {
  status?: ParticipantStatus;
  page?: number;
  limit?: number;
}

// ==================== RESPONSE TYPES ====================

export interface PaginatedChallenges {
  data: Challenge[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PaginatedParticipants {
  data: ChallengeParticipant[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ChallengeDetailResponse extends Challenge {
  participantCount: number;
  isParticipating: boolean;
  myParticipation?: ChallengeParticipant;
  topParticipants: ChallengeLeaderboardEntry[];
}

export interface MyChallengesResponse {
  active: ChallengeParticipant[];
  completed: ChallengeParticipant[];
  totalActive: number;
  totalCompleted: number;
}

// ==================== ADMIN ANALYTICS ====================

export interface ChallengeAnalytics {
  totalChallenges: number;
  activeChallenges: number;
  completedChallenges: number;
  totalParticipants: number;
  averageParticipantsPerChallenge: number;
  totalRewardsDistributed: number;
  completionRate: number;
  popularChallenges: Array<{
    challengeId: string;
    challengeTitle: string;
    participantCount: number;
    completionRate: number;
  }>;
  challengesByType: Record<ChallengeType, number>;
}
