import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../common/services/prisma.service';
import { Role } from '../../common/enums/role.enum';
import {
  PaginatedReviewGatingAuditLogDto,
  ReviewGatingConfigAuditLogResponseDto,
  ReviewGatingConfigResponseDto,
  ReviewGatingUserSnapshot,
} from './dto/review-gating-config-response.dto';
import { ReviewGatingHistoryQueryDto } from './dto/review-gating-history-query.dto';

/**
 * Stores per-feature toggles for the review-approval workflow.
 *
 * When `isEnabled = false` for a feature, Super Admins (Role.ADMIN) bypass
 * the review queue: their actions on that feature take effect immediately
 * and the corresponding review record is auto-approved with their userId.
 * Other roles continue to flow through the normal pending-review queue.
 *
 * Records are upserted on first read so we never throw NotFound for valid
 * feature keys; the default value is `isEnabled = true` (gate active).
 */
@Injectable()
export class ReviewGatingConfigService {
  private readonly logger = new Logger(ReviewGatingConfigService.name);

  /**
   * In-memory cache of the gate state, keyed by featureKey. Refreshed
   * on every mutation; reads use the cache when fresh to avoid hammering
   * the DB from the per-request `shouldBypass` checks.
   */
  private cache = new Map<string, boolean>();
  private cacheExpiresAt = 0;
  private readonly CACHE_TTL_MS = 30_000;

  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ReviewGatingConfigResponseDto[]> {
    const rows = await this.prisma.reviewGatingConfig.findMany({
      orderBy: { featureKey: 'asc' },
    });
    const userIds = Array.from(
      new Set(rows.map((r) => r.updatedBy).filter((id): id is string => !!id)),
    );
    const userMap = await this.resolveUserMap(userIds);
    return rows.map((r) =>
      ReviewGatingConfigResponseDto.fromEntity(
        r,
        r.updatedBy ? (userMap.get(r.updatedBy) ?? null) : null,
      ),
    );
  }

  async upsert(
    featureKey: string,
    isEnabled: boolean,
    updatedBy: string,
  ): Promise<ReviewGatingConfigResponseDto> {
    const [row] = await this.prisma.$transaction([
      this.prisma.reviewGatingConfig.upsert({
        where: { featureKey },
        create: { featureKey, isEnabled, updatedBy },
        update: { isEnabled, updatedBy },
      }),
      this.prisma.reviewGatingConfigAuditLog.create({
        data: {
          featureKey,
          isEnabled,
          changedById: updatedBy,
        },
      }),
    ]);
    this.invalidateCache();
    const userMap = await this.resolveUserMap([updatedBy]);
    return ReviewGatingConfigResponseDto.fromEntity(
      row,
      userMap.get(updatedBy) ?? null,
    );
  }

  async bulkUpsert(
    updates: Array<{ featureKey: string; isEnabled: boolean }>,
    updatedBy: string,
  ): Promise<ReviewGatingConfigResponseDto[]> {
    const rows = await this.prisma.$transaction(
      updates.map((u) =>
        this.prisma.reviewGatingConfig.upsert({
          where: { featureKey: u.featureKey },
          create: {
            featureKey: u.featureKey,
            isEnabled: u.isEnabled,
            updatedBy,
          },
          update: { isEnabled: u.isEnabled, updatedBy },
        }),
      ),
    );
    if (updates.length > 0) {
      // Audit log writes are append-only and don't need to be inside the same
      // transaction as the upserts — keeping them separate sidesteps the
      // Prisma `$transaction` array-vs-callback union type that fails to
      // narrow when the array contains heterogeneous models.
      await this.prisma.reviewGatingConfigAuditLog.createMany({
        data: updates.map((u) => ({
          featureKey: u.featureKey,
          isEnabled: u.isEnabled,
          changedById: updatedBy,
        })),
      });
    }
    this.invalidateCache();
    const userMap = await this.resolveUserMap([updatedBy]);
    const userSnapshot = userMap.get(updatedBy) ?? null;
    return rows.map((r) =>
      ReviewGatingConfigResponseDto.fromEntity(r, userSnapshot),
    );
  }

  /**
   * Returns the gate state for a single feature. When no row exists, falls
   * back to `defaultEnabled` (ON by default — the gate is active until an
   * admin disables it). Pass `false` for features that should default OFF.
   */
  async isGateEnabled(
    featureKey: string,
    defaultEnabled = true,
  ): Promise<boolean> {
    const map = await this.getStateMap();
    return map.get(featureKey) ?? defaultEnabled;
  }

  /**
   * Returns true when the requesting user is allowed to bypass the review
   * queue for the given feature. Bypass requires BOTH:
   *   1. user role is Role.ADMIN (Super Admin)
   *   2. gate is currently disabled for this feature
   */
  async shouldBypass(featureKey: string, userId: string): Promise<boolean> {
    const enabled = await this.isGateEnabled(featureKey);
    if (enabled) return false;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === Role.ADMIN;
  }

  /**
   * Paginated audit log of every toggle. Powers the `Lịch sử` tab on
   * the Hệ thống → Cấu hình duyệt page.
   */
  async findHistory(
    query: ReviewGatingHistoryQueryDto,
  ): Promise<PaginatedReviewGatingAuditLogDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = query.featureKey ? { featureKey: query.featureKey } : {};

    const [rows, total] = await Promise.all([
      this.prisma.reviewGatingConfigAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.reviewGatingConfigAuditLog.count({ where }),
    ]);

    const userIds = Array.from(new Set(rows.map((r) => r.changedById)));
    const userMap = await this.resolveUserMap(userIds);

    return {
      data: rows.map((r) =>
        ReviewGatingConfigAuditLogResponseDto.fromEntity(
          r,
          userMap.get(r.changedById) ?? null,
        ),
      ),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  private async resolveUserMap(
    userIds: string[],
  ): Promise<Map<string, ReviewGatingUserSnapshot>> {
    if (userIds.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true, email: true },
    });
    const map = new Map<string, ReviewGatingUserSnapshot>();
    for (const u of users) {
      map.set(u.id, { id: u.id, fullName: u.fullName, email: u.email });
    }
    return map;
  }

  private async getStateMap(): Promise<Map<string, boolean>> {
    const now = Date.now();
    if (now < this.cacheExpiresAt && this.cache.size > 0) {
      return this.cache;
    }
    const rows = await this.prisma.reviewGatingConfig.findMany({
      select: { featureKey: true, isEnabled: true },
    });
    this.cache.clear();
    for (const r of rows) this.cache.set(r.featureKey, r.isEnabled);
    this.cacheExpiresAt = now + this.CACHE_TTL_MS;
    return this.cache;
  }

  private invalidateCache(): void {
    this.cache.clear();
    this.cacheExpiresAt = 0;
  }
}
