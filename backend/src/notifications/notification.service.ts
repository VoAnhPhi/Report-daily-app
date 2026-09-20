import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationAction,
  NotificationScope,
  Prisma,
  RelatedModel,
} from '@prisma/client';
import { AppCacheService } from '../common/cache/cache.service';
import { PrismaService } from '../common/services/prisma.service';
import { buildNotificationWrite } from './notification.utils';

export interface CreateNotificationDto {
  userId: string;
  relatedModel: RelatedModel;
  relatedModelId: string;
  action: NotificationAction;
  message: string;
  linkUrl?: string; // Optional URL for navigation
}

export interface UpdateNotificationDto {
  isRead?: boolean;
  message?: string;
}

export interface NotificationQuery {
  userId?: string;
  relatedModel?: RelatedModel;
  action?: NotificationAction;
  isRead?: boolean;
  page?: number | string;
  limit?: number | string;
}

type NotiCursor = { createdAt: string; id: string }; // ISO & id

function encodeCursor(c: NotiCursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

function decodeCursor(s?: string | null): NotiCursor | null {
  if (!s) return null;
  try {
    return JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: AppCacheService,
  ) {}

  private generateLinkUrl(
    relatedModel: RelatedModel,
    relatedModelId: string,
    action: NotificationAction,
  ): string {
    switch (relatedModel) {
      case RelatedModel.user:
        switch (action) {
          case NotificationAction.kyc_submitted:
            return `/admin/users?userId=${relatedModelId}`;
          case NotificationAction.approved:
            return '';
          case NotificationAction.kyc_approved:
            return ''; // No navigation for KYC approval notifications
          case NotificationAction.kyc_changing:
            return `/kyc`;
          case NotificationAction.direct_referral_verified:
            return ''; // No navigation for referral verification notifications
          case NotificationAction.direct_referral_registered:
            return ''; // No navigation for direct referral registered
          case NotificationAction.indirect_referral_registered:
            return ''; // No navigation for indirect referral registered
          case NotificationAction.liked:
            return ''; // Liked notifications should use original linkUrl from database
          case NotificationAction.commented:
            return ''; // Commented notifications should use original linkUrl from database
          default:
            return `/admin/users?userId=${relatedModelId}`;
        }
      case RelatedModel.post:
        return `/posts/${relatedModelId}`;
      case RelatedModel.document:
        return `/documents/${relatedModelId}`;
      case RelatedModel.news_item:
        return `/news/${relatedModelId}`;
      case RelatedModel.comment:
        return `/comments/${relatedModelId}`;
      case RelatedModel.system:
        return `/admin/system`;
      case RelatedModel.message:
        return ''; // No link for mention notifications
      default:
        return '/';
    }
  }

  async createNotification(data: CreateNotificationDto) {
    try {
      // Generate linkUrl if not provided (for future use after migration)
      const linkUrl =
        data.linkUrl !== undefined
          ? data.linkUrl
          : this.generateLinkUrl(
              data.relatedModel,
              data.relatedModelId,
              data.action,
            );

      const notification = await this.prisma.notification.create({
        data: {
          userId: data.userId,
          relatedModel: data.relatedModel,
          relatedModelId: data.relatedModelId,
          action: data.action,
          message: data.message,
          linkUrl: linkUrl,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatar: {
                select: {
                  id: true,
                  fileUrl: true,
                },
              },
            },
          },
        },
      });

      // Add linkUrl to the response for frontend use
      const notificationWithLink = {
        ...notification,
        linkUrl: linkUrl,
      };

      this.logger.log(
        `Notification created for user ${data.userId} with linkUrl: ${linkUrl}`,
      );
      this.logger.log(
        `📝 Created notification details: action=${data.action}, relatedModel=${data.relatedModel}, relatedModelId=${data.relatedModelId}`,
      );

      // Note: Socket events are now handled by the calling service
      // This method only creates the notification in the database

      return notificationWithLink;
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  async createNotificationWithCounter(
    data: CreateNotificationDto & {
      actorUserId?: string;
      postId?: string;
      commentId?: string;
      orderId?: string;
      messageId?: string;
      likeId?: string;
      scope?: NotificationScope;
      idempotencyKey?: string;
    },
  ) {
    try {
      // Build payload and link using utility
      const { linkUrl, payload } = buildNotificationWrite({
        action: data.action,
        actor: {
          id: data.actorUserId || '',
          fullName: null,
          avatarUrl: null,
        },
        refs: {
          relatedModel: data.relatedModel,
          relatedModelId: data.relatedModelId,
          postId: data.postId,
          commentId: data.commentId,
          orderId: data.orderId,
          messageId: data.messageId,
        },
      });

      // `mentioned` và `message_replied` sinh ra cho nhắc trong TIN NHẮN, nơi
      // không có trang nào để mở, nên link bị bỏ trắng. Nhắc trong bài viết hay
      // bình luận thì CÓ chỗ để mở (`/posts/{postId}`) — chặn theo tên hành
      // động là chặn nhầm cả trường hợp đó, và người bị nhắc nhận một thông báo
      // bấm vào không đi đâu cả. Điều kiện đúng là "có gì để mở hay không".
      const isUnlinkableMention =
        (data.action === NotificationAction.mentioned && !data.postId) ||
        data.action === NotificationAction.message_replied;
      const finalLinkUrl = isUnlinkableMention ? '' : linkUrl || data.linkUrl;

      // Use atomic transaction to create notification and update counter
      const result = await this.prisma.$transaction(
        async (tx) => {
          const notification = await tx.notification.create({
            data: {
              idempotencyKey: data.idempotencyKey,
              userId: data.userId,
              scope: data.scope || NotificationScope.personal,
              action: data.action,
              relatedModel: data.relatedModel,
              relatedModelId: data.relatedModelId,
              actorUserId: data.actorUserId,
              postId: data.postId,
              commentId: data.commentId,
              orderId: data.orderId,
              messageId: data.messageId,
              likeId: data.likeId,
              linkUrl: finalLinkUrl,
              message: data.message,
            },
          });

          await tx.notificationCounter.upsert({
            where: { userId: data.userId },
            update: {
              total: { increment: 1 },
              unread: { increment: 1 },
            },
            create: {
              userId: data.userId,
              total: 1,
              unread: 1,
            },
          });

          return notification;
        },
        {
          timeout: 20000, // 20 seconds timeout to handle database load
        },
      );

      return result;
    } catch (error) {
      if (
        data.idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.notification.findUnique({
          where: { idempotencyKey: data.idempotencyKey },
        });
        if (existing) return existing;
      }
      this.logger.error(
        `Failed to create notification with counter: ${error.message}`,
      );
      throw error;
    }
  }

  async getNotifications(query: NotificationQuery = {}) {
    const { page = 1, limit = 10, ...whereClause } = query;
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.NotificationWhereInput = {};
    if (whereClause.userId) where.userId = whereClause.userId;
    if (whereClause.relatedModel) where.relatedModel = whereClause.relatedModel;
    if (whereClause.action) where.action = whereClause.action;
    if (whereClause.isRead !== undefined) where.isRead = whereClause.isRead;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        select: {
          id: true,
          scope: true,
          action: true,
          message: true,
          linkUrl: true,
          isRead: true,
          createdAt: true,
          payload: true,
          // include nhẹ nếu cần live field ngoài payload
          actorUser: {
            select: {
              id: true,
              fullName: true,
              avatar: { select: { fileUrl: true } },
            },
          },
          postId: true,
          commentId: true,
          orderId: true,
          messageId: true,
          likeId: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limitNum,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1,
    };
  }

  async getNotificationById(id: string) {
    return this.prisma.notification.findUnique({
      where: { id },
      select: {
        id: true,
        scope: true,
        action: true,
        message: true,
        linkUrl: true,
        isRead: true,
        createdAt: true,
        payload: true,
        // include nhẹ nếu cần live field ngoài payload
        actorUser: {
          select: {
            id: true,
            fullName: true,
            avatar: { select: { fileUrl: true } },
          },
        },
        postId: true,
        commentId: true,
        orderId: true,
        messageId: true,
        likeId: true,
        // Include user info for backward compatibility
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatar: {
              select: {
                id: true,
                fileUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async updateNotification(id: string, data: UpdateNotificationDto) {
    // First check if notification exists
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      this.logger.error(`Notification with id ${id} not found for update`);
      throw new Error(`Notification with id ${id} not found`);
    }

    const result = await this.prisma.notification.update({
      where: { id },
      data,
      select: {
        id: true,
        scope: true,
        action: true,
        message: true,
        linkUrl: true,
        isRead: true,
        createdAt: true,
        payload: true,
        // include nhẹ nếu cần live field ngoài payload
        actorUser: {
          select: {
            id: true,
            fullName: true,
            avatar: { select: { fileUrl: true } },
          },
        },
        postId: true,
        commentId: true,
        orderId: true,
        messageId: true,
        likeId: true,
        // Include user info for backward compatibility
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatar: {
              select: {
                id: true,
                fileUrl: true,
              },
            },
          },
        },
      },
    });

    return result;
  }

  async markAsRead(id: string) {
    // First check if notification exists
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      this.logger.error(`Notification with id ${id} not found`);
      throw new Error(`Notification with id ${id} not found`);
    }

    // Use atomic transaction to mark as read and update counter
    const result = await this.prisma.$transaction(
      async (tx) => {
        const updatedNotification = await tx.notification.update({
          where: { id },
          data: { isRead: true },
        });

        // Only decrement counter if notification was previously unread
        if (!notification.isRead) {
          await tx.notificationCounter.upsert({
            where: { userId: notification.userId },
            update: { unread: { decrement: 1 } },
            create: { userId: notification.userId, total: 0, unread: 0 },
          });
        }

        return updatedNotification;
      },
      {
        timeout: 20000, // 20 seconds timeout to handle database load
      },
    );

    // Invalidate cache after marking as read
    await this.invalidateNotificationCache(notification.userId);

    return result;
  }

  async markAllAsRead(userId: string) {
    // Use atomic transaction to mark all as read and update counter
    const result = await this.prisma.$transaction(
      async (tx) => {
        // First check if user has any unread notifications
        const unreadCount = await tx.notification.count({
          where: { userId, isRead: false },
        });

        if (unreadCount === 0) {
          return {
            updatedCount: 0,
            message: 'No unread notifications to mark',
          };
        }

        const updateResult = await tx.notification.updateMany({
          where: { userId, isRead: false },
          data: { isRead: true },
        });

        // Update counter to set unread to 0
        await tx.notificationCounter.upsert({
          where: { userId },
          update: { unread: 0 },
          create: { userId, total: 0, unread: 0 },
        });

        return {
          updatedCount: updateResult.count,
          message: `Marked ${updateResult.count} notifications as read`,
        };
      },
      {
        timeout: 20000, // 20 seconds timeout to handle database load
      },
    );

    // Invalidate cache after marking all as read
    await this.invalidateNotificationCache(userId);

    return result;
  }

  async markNotificationsAsRead(ids: string[]) {
    // Get userIds before transaction for cache invalidation
    const notifications = await this.prisma.notification.findMany({
      where: { id: { in: ids } },
      select: { userId: true },
      distinct: ['userId'],
    });
    const userIds = notifications.map((n) => n.userId);

    // Use atomic transaction to mark notifications as read and update counter
    const result = await this.prisma.$transaction(
      async (tx) => {
        const updateResult = await tx.notification.updateMany({
          where: {
            id: { in: ids },
            isRead: false,
          },
          data: { isRead: true },
        });

        // Update counters for each affected user
        for (const userId of userIds) {
          await tx.notificationCounter.upsert({
            where: { userId },
            update: { unread: { decrement: updateResult.count } },
            create: { userId, total: 0, unread: 0 },
          });
        }

        return updateResult;
      },
      {
        timeout: 20000, // 20 seconds timeout to handle database load
      },
    );

    // Invalidate cache for all affected users
    for (const userId of userIds) {
      await this.invalidateNotificationCache(userId);
    }

    return result;
  }

  /**
   * Invalidate cache tags for notifications
   * This should be called when notifications are marked as read to refresh notification lists and stats
   */
  private async invalidateNotificationCache(userId: string): Promise<void> {
    try {
      await this.cacheService.invalidateTags([
        'notification:list',
        'notification:stats',
        'notification:unread',
        'notification:all',
        'notification:detail',
        `notification:user:${userId}`,
      ]);
    } catch (error) {
      this.logger.error(
        `❌ Failed to invalidate notification cache for user ${userId}:`,
        error,
      );
      // Don't fail the entire operation if cache invalidation fails
    }
  }

  async markAsSeen(userId: string) {
    const result = await this.prisma.notificationCounter.upsert({
      where: { userId },
      update: { lastSeenAt: new Date() },
      create: {
        userId,
        total: 0,
        unread: 0,
        lastSeenAt: new Date(),
      },
    });

    return result;
  }

  async deleteNotification(id: string) {
    return this.prisma.notification.delete({
      where: { id },
    });
  }

  async getUnreadCount(userId: string) {
    // Sử dụng NotificationCounter thay vì COUNT query để tăng performance
    const counter = await this.prisma.notificationCounter.findUnique({
      where: { userId },
      select: { unread: true },
    });

    return counter?.unread ?? 0;
  }

  async getNotificationStats(userId: string) {
    // Sử dụng NotificationCounter thay vì COUNT queries để tăng performance
    const counter = await this.prisma.notificationCounter.findUnique({
      where: { userId },
    });

    return {
      total: counter?.total ?? 0,
      unread: counter?.unread ?? 0,
      read: (counter?.total ?? 0) - (counter?.unread ?? 0),
      lastSeenAt: counter?.lastSeenAt ?? null,
    };
  }

  async getAllNotificationData(
    userId: string,
    opts?: { limit?: number; cursor?: string },
  ) {
    const limit = Math.min(Math.max(opts?.limit ?? 10, 1), 50); // 1..50
    const cursorObj = decodeCursor(opts?.cursor);

    const whereBase: Prisma.NotificationWhereInput = { userId };
    const whereCursor = cursorObj
      ? {
          OR: [
            { createdAt: { lt: new Date(cursorObj.createdAt) } },
            {
              AND: [
                { createdAt: new Date(cursorObj.createdAt) },
                { id: { lt: cursorObj.id } },
              ],
            },
          ],
        }
      : {};

    const [counters, rows] = await Promise.all([
      this.prisma.notificationCounter.findUnique({ where: { userId } }),
      this.prisma.notification.findMany({
        where: { ...whereBase, ...whereCursor },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1, // over-fetch để biết còn nữa không
        select: {
          id: true,
          scope: true,
          action: true,
          message: true,
          linkUrl: true,
          isRead: true,
          createdAt: true,
          payload: true,
          // include nhẹ nếu cần live field ngoài payload
          actorUser: {
            select: {
              id: true,
              fullName: true,
              avatar: { select: { fileUrl: true } },
            },
          },
          postId: true,
          commentId: true,
          orderId: true,
          messageId: true,
          likeId: true,
        },
      }),
    ]);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    const nextCursor = hasMore
      ? encodeCursor({
          createdAt: data[data.length - 1].createdAt.toISOString(),
          id: data[data.length - 1].id,
        })
      : null;

    return {
      stats: {
        total: counters?.total ?? 0,
        unread: counters?.unread ?? 0,
        lastSeenAt: counters?.lastSeenAt ?? null,
      },
      pages: [
        {
          data, // 10 bản ghi mixed (personal+system+global)
          nextCursor, // dùng để load trang sau
          pageSize: limit,
          nextPage: hasMore, // true/false để FE biết có trang tiếp theo
        },
      ],
    };
  }
}
