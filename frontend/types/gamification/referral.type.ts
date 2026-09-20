/**
 * Referral System Types
 * Matches backend referral DTOs and database schema
 */

// ==================== ENUMS ====================

export enum ReferralStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

// ==================== REFERRAL TYPES ====================

export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  referralCode: string;
  status: ReferralStatus;
  pointsAwarded: number;
  bonusPoints?: number;
  completedAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  referrer?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
  };
  referredUser?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
  };
}

// ==================== REFERRAL CODE ====================

export interface ReferralCode {
  code: string;
  referrerId: string;
  usageCount: number;
  maxUsage?: number;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
}

export interface GenerateReferralCodeDto {
  maxUsage?: number;
  expiresAt?: string;
}

// ==================== REFERRAL VALIDATION ====================

export interface ValidateReferralCodeDto {
  code: string;
}

export interface ValidateReferralCodeResponse {
  isValid: boolean;
  code?: string;
  referrerId?: string;
  referrerName?: string;
  reason?: string;
}

// ==================== REFERRAL COMPLETION ====================

export interface CompleteReferralDto {
  referralCode: string;
  email: string;
}

export interface CompleteReferralResponse {
  success: boolean;
  pointsAwarded: number;
  bonusPoints?: number;
  referral: Referral;
}

// ==================== REFERRAL STATS ====================

export interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalPointsEarned: number;
  totalBonusPoints: number;
  conversionRate: number;
  referralCode: string;
  recentReferrals: Referral[];
  topReferrers?: Array<{
    userId: string;
    userName: string;
    userAvatar?: string;
    referralCount: number;
    pointsEarned: number;
  }>;
}

// ==================== QUERY TYPES ====================

export interface ReferralQuery {
  status?: ReferralStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'completedAt' | 'pointsAwarded';
  sortOrder?: 'asc' | 'desc';
}

// ==================== RESPONSE TYPES ====================

export interface PaginatedReferrals {
  data: Referral[];
  total: number;
  page: number;
  totalPages: number;
}

// ==================== ADMIN TYPES ====================

export interface ReferralAnalytics {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  expiredReferrals: number;
  totalPointsAwarded: number;
  averagePointsPerReferral: number;
  conversionRate: number;
  topReferrers: Array<{
    userId: string;
    userName: string;
    userAvatar?: string;
    referralCount: number;
    completedCount: number;
    pointsEarned: number;
  }>;
  referralsByMonth: Array<{
    month: string;
    count: number;
    completed: number;
    pointsAwarded: number;
  }>;
}

export interface UpdateReferralStatusDto {
  status: ReferralStatus;
  pointsAwarded?: number;
  bonusPoints?: number;
}
