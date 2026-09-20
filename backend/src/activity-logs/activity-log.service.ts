import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ActivityTargetType, ActivityType } from '@prisma/client';
import { JwtPayload } from '../auth/jwt-payload';
import { PrismaService } from '../common/services/prisma.service';
import {
  ActivityLogResponseDto,
  PaginatedActivityLogResponseDto,
} from './dto/activity-log-response.dto';
import { Cache } from 'cache-manager';
import { ActivityLogQueryDto } from './dto/activity-log-query.dto';
import { Prisma } from '@prisma/client';
import { GamificationService } from '../gamification/gamification.service';
import { ActivityLogsGateway } from './activity-logs.gateway';

export interface CreateActivityLogOptions {
  /**
   * Ghi thẳng, không đi qua cache chống trùng (`CACHE_TTL`, hiện là 2 phút).
   *
   * Dùng cho nhật ký kiểm toán: khoá chống trùng chỉ gồm
   * target + loại + người thực hiện, KHÔNG gồm nội dung thay đổi, nên hai lượt
   * sửa khác nhau trên cùng một đối tượng trong cùng khoảng TTL sẽ bị gộp làm
   * một và lượt sau biến mất khỏi nhật ký.
   */
  bypassDedup?: boolean;
}

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);
  private readonly CACHE_TTL = 120 * 1000; // 2 minutes in milliseconds

  /**
   * Get activity types by prefix (e.g., 'DOCUMENT_', 'TICKET_')
   */
  getActivityTypesByPrefix(prefix: string): ActivityType[] {
    return Object.values(ActivityType).filter((type) =>
      type.startsWith(prefix.toUpperCase() + '_'),
    );
  }

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly moduleRef: ModuleRef,
    private readonly activityLogsGateway: ActivityLogsGateway,
  ) {
    // Cleanup is now handled by ActivityLogCleanupCron to avoid
    // running expensive queries on every service instantiation
  }

  /**
   * Reports whether a KYC reward has already been granted, so no approval path
   * can pay for the same milestone twice.
   *
   * KYC rewards are emitted from several places — document approval, the status
   * endpoint, admin user creation, and the admin "set active" flow — and neither
   * ActivityLog nor ActivityPointTransaction carries a uniqueness constraint. The
   * dedup cache in createActivityLog does not close this: it expires after two
   * minutes and its key includes the acting admin, so two admins each get paid.
   * This is the durable check; call it before emitting any KYC reward.
   *
   * `subordinateId` scopes the SUBORDINATE_* rewards to one downline member,
   * since a referrer legitimately earns once per person they refer.
   */
  async hasKycRewardBeenGranted(
    activityType: ActivityType,
    beneficiaryId: string,
    subordinateId?: string,
  ): Promise<boolean> {
    const existing = await this.prisma.activityLog.findFirst({
      where: {
        activityType,
        targetId: beneficiaryId,
        targetType: ActivityTargetType.USER,
        ...(subordinateId
          ? { changes: { path: ['subordinateId'], equals: subordinateId } }
          : {}),
      },
      select: { id: true },
    });

    return !!existing;
  }

  async createActivityLog(
    targetId: string,
    targetType: ActivityTargetType,
    activityType: ActivityType,
    user: JwtPayload,
    description?: string,
    changes?: Record<string, any>,
    awaitGamification = false,
    options?: CreateActivityLogOptions,
  ): Promise<ActivityLogResponseDto> {
    try {
      // Bypass dedup cache for PRODUCT_* and INVOICE_* activity types - each change must always be recorded.
      // `options.bypassDedup` extends the same guarantee to audit-trail callers: the
      // dedup key ignores `changes`, so two different edits to the same target by the
      // same actor inside the TTL collapse into one row and the second edit vanishes.
      if (
        options?.bypassDedup ||
        activityType.startsWith('PRODUCT_') ||
        activityType.startsWith('INVOICE_')
      ) {
        const log = await this.prisma.activityLog.create({
          data: {
            targetId,
            targetType,
            activityType,
            uploaderId: user.id,
            description,
            changes,
          },
        });
        const dto = ActivityLogResponseDto.fromDocument(log);
        this.activityLogsGateway.emitLogCreated(dto);
        return dto;
      }

      // Create a unique key for this specific activity to prevent duplicates
      // For SUBORDINATE_KYC_COMPLETED, include subordinateId to prevent duplicate for same subordinate
      let duplicateKey = `activityLog:${targetId}:${targetType}:${activityType}:${user.id}`;
      if (
        activityType === ActivityType.SUBORDINATE_KYC_COMPLETED &&
        changes?.subordinateId
      ) {
        duplicateKey = `activityLog:${targetId}:${targetType}:${activityType}:${user.id}:${changes.subordinateId}`;
      }

      // Check if this exact activity was already logged recently (within 5 minutes)
      const existingActivity = await this.cacheManager.get(duplicateKey);
      if (existingActivity) {
        return ActivityLogResponseDto.fromDocument(existingActivity);
      }

      const log = await this.prisma.activityLog.create({
        data: {
          targetId,
          targetType,
          activityType,
          uploaderId: user.id,
          description,
          changes,
        },
      });

      // Cache the newly created log to prevent duplicates
      await this.cacheManager.set(duplicateKey, log, this.CACHE_TTL);

      // Fan out to any socket subscriber watching this target (e.g. admin
      // order detail page focused on the Activity Log panel). Emit before
      // the gamification branch so the UI sees the event regardless of
      // whether the activity type triggers points.
      this.activityLogsGateway.emitLogCreated(
        ActivityLogResponseDto.fromDocument(log),
      );

      const allowedActivityTypes = new Set<ActivityType>([
        ActivityType.SUBORDINATE_KYC_COMPLETED,
        ActivityType.SECOND_KYC_COMPLETED,
        ActivityType.SUBORDINATE_SECOND_KYC_COMPLETED,
        ActivityType.ACTIVE_POST_LOGGED,
        ActivityType.ORDER_COMPLETED,
        ActivityType.ORDER_COMPLETED_PRIORITY_PRODUCT, // Sản phẩm ưu tiên (product.flag === 'priority')
        ActivityType.ORDER_COMPLETED_SPECIAL_PRODUCT, // Sản phẩm đặc biệt (product.flag === 'special') - điểm kép
        ActivityType.PRO_POST_LOGGED,
      ]);

      if (!allowedActivityTypes.has(activityType)) {
        return ActivityLogResponseDto.fromDocument(log);
      }

      // Trigger gamification checks.
      // When targetType is USER, targetId is the userId who should receive points
      // Otherwise, use the actor (user.id) as they performed the action
      let gamificationUserId: string =
        targetType === ActivityTargetType.USER ? targetId : user.id;

      // Default: fire-and-forget so the common path stays non-blocking.
      // Opt-in (awaitGamification=true): await so the point transaction is
      // committed before this method returns. Required when the caller reads
      // the awarded points back immediately — e.g. the VAT-completion flow
      // gates the order-completed mail on points awarded, and would otherwise
      // race the unawaited award and read 0. A gamification failure is still
      // swallowed (logged) so it never breaks activity-log creation.
      if (awaitGamification) {
        try {
          await this.triggerGamificationChecks(
            gamificationUserId,
            activityType,
            targetType,
            targetId,
            changes, // Pass metadata (changes) to gamification
          );
        } catch (error) {
          this.logger.error('Failed to trigger gamification checks:', error);
        }
      } else {
        this.triggerGamificationChecks(
          gamificationUserId,
          activityType,
          targetType,
          targetId,
          changes, // Pass metadata (changes) to gamification
        ).catch((error) => {
          this.logger.error('Failed to trigger gamification checks:', error);
        });
      }

      return ActivityLogResponseDto.fromDocument(log);
    } catch (error) {
      this.logger.error(
        `Failed to create activity log for targetId: ${targetId}, targetType: ${targetType}, activityType: ${activityType}`,
        error.stack,
      );

      throw new Error(`Failed to create activity log: ${error.message}`);
    }
  }

  private async triggerGamificationChecks(
    userId: string,
    activityType: ActivityType,
    targetType: ActivityTargetType,
    targetId: string,
    metadata?: Record<string, any>,
  ) {
    // Only trigger gamification checks for specific activity types

    this.logger.log(
      `🎮 [Gamification] triggerGamificationChecks called - userId: ${userId}, activityType: ${activityType}, targetType: ${targetType}, targetId: ${targetId}`,
    );

    try {
      let gamificationService: GamificationService;
      try {
        gamificationService = this.moduleRef.get(GamificationService, {
          strict: false,
        });
        this.logger.log(
          `✅ [Gamification] GamificationService retrieved successfully for user ${userId}`,
        );
      } catch (error) {
        this.logger.error(
          `❌ [Gamification] Failed to get GamificationService for user ${userId}: ${error.message}`,
          error.stack,
        );
        return;
      }

      if (!gamificationService) {
        this.logger.error(
          `❌ [Gamification] GamificationService is null/undefined for user ${userId}, skipping gamification checks`,
        );
        return;
      }

      this.logger.log(
        `🎮 [Gamification] Calling onActivity for user ${userId} with activityType ${activityType}`,
      );

      await gamificationService.onActivity({
        userId,
        activityType,
        targetType,
        targetId,
        metadata, // Pass metadata to gamification service
      });

      this.logger.log(
        `✅ [Gamification] onActivity completed successfully for user ${userId} with activityType ${activityType}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ [Gamification] Failed to process gamification activity for user ${userId}, activityType ${activityType}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Clean up orphaned activity logs (logs with invalid uploaderId references)
   *
   * NOTE: This method is kept for manual calls, but cleanup is now primarily
   * handled by ActivityLogCleanupCron to avoid running expensive queries on
   * every service instantiation.
   *
   * Uses optimized SQL query with NOT EXISTS for better performance.
   */
  async cleanupOrphanedActivityLogs(): Promise<{ deleted: number }> {
    try {
      this.logger.log('Starting orphaned activity logs cleanup...');

      // Count orphaned logs first
      const countResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM activity_logs al
        WHERE al."uploaderId" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM users u
            WHERE u.id = al."uploaderId"
          )
      `;

      const orphanedCount = Number(countResult[0]?.count || 0);

      if (orphanedCount === 0) {
        this.logger.log('No orphaned activity logs found');
        return { deleted: 0 };
      }

      this.logger.log(
        `Found ${orphanedCount} orphaned activity logs to delete`,
      );

      // Delete orphaned activity logs using efficient SQL query
      // This is much faster than fetching all distinct uploaderIds and checking them
      await this.prisma.$executeRaw`
        DELETE FROM activity_logs
        WHERE "uploaderId" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM users
            WHERE users.id = activity_logs."uploaderId"
          )
      `;

      this.logger.log(`Deleted ${orphanedCount} orphaned activity logs`);
      return { deleted: orphanedCount };
    } catch (error) {
      this.logger.error('Error cleaning up orphaned activity logs:', error);
      return { deleted: 0 };
    }
  }

  /**
   * Get activity logs without uploader relation (fallback method)
   */
  private async findAllWithoutUploader(
    where: Prisma.ActivityLogWhereInput,
    skip: number,
    take: number,
  ) {
    return this.prisma.activityLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    });
  }

  async findAll(
    query: ActivityLogQueryDto = {},
  ): Promise<PaginatedActivityLogResponseDto> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Build where clause based on filters
    const where: Prisma.ActivityLogWhereInput = {};

    if (query.targetId) {
      where.targetId = query.targetId;
    }

    if (query.targetType) {
      where.targetType = query.targetType;
    }

    if (query.activityType) {
      where.activityType = query.activityType;
    }

    if (query.uploaderId) {
      where.uploaderId = query.uploaderId;
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};

      if (query.dateFrom) {
        const fromDate = new Date(query.dateFrom);
        where.createdAt.gte = fromDate;
        this.logger.log(`Filtering from date: ${fromDate.toISOString()}`);
      }

      if (query.dateTo) {
        // Set to end of day for dateTo
        const endDate = new Date(query.dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
        this.logger.log(`Filtering to date: ${endDate.toISOString()}`);
      }
    }

    if (query.description && query.description.trim().length >= 2) {
      const trimmedDescription = query.description.trim();
      where.description = {
        contains: trimmedDescription,
        mode: 'insensitive',
      };
    }

    // Handle user search filter - always search by user when searchQuery is provided
    if (query.searchQuery && query.searchQuery.trim().length >= 2) {
      const trimmedQuery = query.searchQuery.trim();
      const searchType = query.searchType || 'all';

      let userWhere: Prisma.UserWhereInput = {};

      if (searchType === 'email') {
        userWhere = { email: { contains: trimmedQuery, mode: 'insensitive' } };
      } else if (searchType === 'name') {
        userWhere = {
          fullName: { contains: trimmedQuery, mode: 'insensitive' },
        };
      } else if (searchType === 'referenceId') {
        userWhere = {
          referenceId: { contains: trimmedQuery, mode: 'insensitive' },
        };
      } else {
        // 'all' or no searchType - search in all user fields
        userWhere = {
          OR: [
            { email: { contains: trimmedQuery, mode: 'insensitive' } },
            { fullName: { contains: trimmedQuery, mode: 'insensitive' } },
            { referenceId: { contains: trimmedQuery, mode: 'insensitive' } },
          ],
        };
      }

      // Filter by uploader when user search is active
      where.uploader = userWhere;
    }

    // Get total count for pagination (only valid logs with uploaders)
    const total = await this.prisma.activityLog.count({
      where: {
        ...where,
        uploaderId: {
          not: undefined,
        },
      },
    });

    // Get activity logs with pagination
    let activityLogs;
    try {
      activityLogs = await this.prisma.activityLog.findMany({
        where,
        include: {
          uploader: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatar: true,
              role: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      });
    } catch (error) {
      this.logger.warn(
        'Activity logs with invalid uploader relations found, fetching without uploader data',
      );
      // Fallback: fetch without uploader relation
      activityLogs = await this.findAllWithoutUploader(where, skip, limit);
    }

    // Map to response DTOs, filtering out logs without valid uploaders
    const data = activityLogs.map((log) => {
      const fallbackUploader = log.uploader ?? this.buildFallbackUploader(log);
      return ActivityLogResponseDto.fromDocument({
        ...log,
        uploader: fallbackUploader,
      });
    });

    // Use the total count for pagination calculation
    const totalPages = Math.ceil(total / limit);

    return PaginatedActivityLogResponseDto.fromPaginatedResult({
      data,
      total,
      page,
      limit,
      totalPages,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildFallbackUploader(log: Record<string, any>) {
    const performedBy = this.extractPerformedBy(log?.changes);

    if (performedBy) {
      return {
        id: performedBy.id || log.uploaderId || 'system',
        fullName:
          performedBy.fullName ||
          performedBy.name ||
          performedBy.email ||
          'Hệ thống',
        email: performedBy.email || 'system@acta.vn',
        avatar: performedBy.avatar || '/placeholder.svg',
        role: performedBy.role || 'system',
        status: performedBy.status || 'active',
      };
    }

    if (log?.changes?.customerEmail) {
      return {
        id: log.changes.customerId || log.uploaderId || 'customer',
        fullName: log.changes.customerName || log.changes.customerEmail,
        email: log.changes.customerEmail,
        avatar: '/placeholder.svg',
        role: 'customer',
        status: 'active',
      };
    }

    return {
      id: log?.uploaderId || 'system',
      fullName: 'Hệ thống',
      email: 'system@acta.vn',
      avatar: '/placeholder.svg',
      role: 'system',
      status: 'active',
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractPerformedBy(changes?: Record<string, any> | null):
    | {
        id?: string;
        email?: string;
        fullName?: string;
        name?: string;
        avatar?: string;
        role?: string;
        status?: string;
        referenceId?: string;
      }
    | undefined {
    if (!changes || typeof changes !== 'object') {
      return undefined;
    }

    if (changes.performedBy && typeof changes.performedBy === 'object') {
      return changes.performedBy;
    }

    if (changes.actor && typeof changes.actor === 'object') {
      return changes.actor;
    }

    return undefined;
  }
}
