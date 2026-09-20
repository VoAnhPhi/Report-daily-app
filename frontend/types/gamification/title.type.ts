/**
 * User Title Types
 * Matches backend title DTOs and database schema
 */

// ==================== ENUMS ====================

export enum TitleRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
  MYTHIC = 'mythic',
}

// ==================== TITLE TYPES ====================

export interface UserTitle {
  id: string;
  name: string;
  description: string;
  rarity: TitleRarity;
  icon?: string;
  color?: string;
  pointsCost?: number;
  requiredLevel?: number;
  requiredAchievementId?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTitleDto {
  name: string;
  description: string;
  rarity: TitleRarity;
  icon?: string;
  color?: string;
  pointsCost?: number;
  requiredLevel?: number;
  requiredAchievementId?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateTitleDto {
  name?: string;
  description?: string;
  rarity?: TitleRarity;
  icon?: string;
  color?: string;
  pointsCost?: number;
  requiredLevel?: number;
  requiredAchievementId?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

// ==================== USER TITLE PROGRESS ====================

export interface UserTitleProgress {
  id: string;
  userId: string;
  titleId: string;
  isUnlocked: boolean;
  isEquipped: boolean;
  unlockedAt?: Date;
  equippedAt?: Date;
  title?: UserTitle;
}

// ==================== QUERY TYPES ====================

export interface TitleQuery {
  rarity?: TitleRarity;
  isActive?: boolean;
  isUnlocked?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'rarity' | 'pointsCost' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// ==================== RESPONSE TYPES ====================

export interface PaginatedTitles {
  data: UserTitle[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UserTitlesResponse {
  unlockedTitles: UserTitleProgress[];
  equippedTitle?: UserTitleProgress;
  availableTitles: UserTitle[];
}

export interface TitleUnlockCheckResponse {
  canUnlock: boolean;
  reason?: string;
  requirements: {
    level?: number;
    currentLevel?: number;
    points?: number;
    currentPoints?: number;
    achievement?: string;
    hasAchievement?: boolean;
  };
}

// ==================== ADMIN TYPES ====================

export interface TitleAnalytics {
  titleId: string;
  titleName: string;
  totalUnlocks: number;
  currentlyEquipped: number;
  popularityRank: number;
}
