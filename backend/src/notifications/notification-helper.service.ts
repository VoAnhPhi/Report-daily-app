import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationAction, RelatedModel } from '@prisma/client';

@Injectable()
export class NotificationHelperService {
  private readonly logger = new Logger(NotificationHelperService.name);

  constructor(private readonly notificationService: NotificationService) {}

  async createPostNotification(
    userId: string,
    postId: string,
    action: NotificationAction,
    message: string,
    actorUserId?: string,
  ) {
    return this.notificationService.createNotificationWithCounter({
      userId,
      relatedModel: RelatedModel.post,
      relatedModelId: postId,
      action,
      message,
      // Các field mới cho implementation mới
      actorUserId,
      postId,
      scope: 'personal', // Post notification thường là personal
    });
  }

  async createNewsNotification(
    userId: string,
    newsId: string,
    action: NotificationAction,
    message: string,
    actorUserId?: string,
  ) {
    return this.notificationService.createNotificationWithCounter({
      userId,
      relatedModel: RelatedModel.news_item, // Updated enum
      relatedModelId: newsId,
      action,
      message,
      // Các field mới cho implementation mới
      actorUserId,
      scope: 'system', // News notification thường là system
    });
  }

  async createDocumentNotification(
    userId: string,
    documentId: string,
    action: NotificationAction,
    message: string,
    actorUserId?: string,
  ) {
    return this.notificationService.createNotificationWithCounter({
      userId,
      relatedModel: RelatedModel.document,
      relatedModelId: documentId,
      action,
      message,
      // Các field mới cho implementation mới
      actorUserId,
      scope: 'system', // Document notification thường là system
    });
  }

  async createUserNotification(
    userId: string,
    targetUserId: string,
    action: NotificationAction,
    message: string,
    actorUserId?: string,
  ) {
    return this.notificationService.createNotificationWithCounter({
      userId,
      relatedModel: RelatedModel.user,
      relatedModelId: targetUserId,
      action,
      message,
      // Các field mới cho implementation mới
      actorUserId,
      scope: 'personal', // User notification thường là personal
    });
  }

  async createCommentNotification(
    userId: string,
    commentId: string,
    action: NotificationAction,
    message: string,
    actorUserId?: string,
  ) {
    return this.notificationService.createNotificationWithCounter({
      userId,
      relatedModel: RelatedModel.comment,
      relatedModelId: commentId,
      action,
      message,
      // Các field mới cho implementation mới
      actorUserId,
      commentId,
      scope: 'personal', // Comment notification thường là personal
    });
  }

  async createSystemNotification(
    userId: string,
    action: NotificationAction,
    message: string,
    actorUserId?: string,
  ) {
    return this.notificationService.createNotificationWithCounter({
      userId,
      relatedModel: RelatedModel.system,
      relatedModelId: 'system',
      action,
      message,
      // Các field mới cho implementation mới
      actorUserId,
      scope: 'system', // System notification là system
    });
  }

  async createBatchNotifications(
    userIds: string[],
    relatedModel: RelatedModel,
    relatedModelId: string,
    action: NotificationAction,
    message: string,
    actorUserId?: string,
    scope?: 'personal' | 'system' | 'global',
  ) {
    const notifications = userIds.map((userId) =>
      this.notificationService.createNotificationWithCounter({
        userId,
        relatedModel,
        relatedModelId,
        action,
        message,
        // Các field mới cho implementation mới
        actorUserId,
        scope: scope || 'system', // Default to system for batch notifications
      }),
    );

    return Promise.all(notifications);
  }
}
