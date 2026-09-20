export interface ReviewGatingUserSnapshot {
  id: string;
  fullName: string | null;
  email: string | null;
}

export class ReviewGatingConfigResponseDto {
  featureKey: string;

  isEnabled: boolean;

  updatedAt: string;

  updatedBy: string | null;

  updatedByUser: ReviewGatingUserSnapshot | null;

  static fromEntity(
    entity: {
      featureKey: string;
      isEnabled: boolean;
      updatedAt: Date;
      updatedBy: string | null;
    },
    user: ReviewGatingUserSnapshot | null = null,
  ): ReviewGatingConfigResponseDto {
    return {
      featureKey: entity.featureKey,
      isEnabled: entity.isEnabled,
      updatedAt: entity.updatedAt.toISOString(),
      updatedBy: entity.updatedBy,
      updatedByUser: user,
    };
  }
}

export class ReviewGatingConfigAuditLogResponseDto {
  id: string;

  featureKey: string;

  isEnabled: boolean;

  note: string | null;

  changedAt: string;

  changedById: string;

  changedBy: ReviewGatingUserSnapshot | null;

  static fromEntity(
    entity: {
      id: string;
      featureKey: string;
      isEnabled: boolean;
      note: string | null;
      changedById: string;
      createdAt: Date;
    },
    user: ReviewGatingUserSnapshot | null = null,
  ): ReviewGatingConfigAuditLogResponseDto {
    return {
      id: entity.id,
      featureKey: entity.featureKey,
      isEnabled: entity.isEnabled,
      note: entity.note,
      changedAt: entity.createdAt.toISOString(),
      changedById: entity.changedById,
      changedBy: user,
    };
  }
}

export interface PaginatedReviewGatingAuditLogDto {
  data: ReviewGatingConfigAuditLogResponseDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
