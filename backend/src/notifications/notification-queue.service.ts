import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  NotificationAction,
  NotificationScope,
  RelatedModel,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import { BackgroundJobService } from '../common/services/background-job.service';
import { LoopRegistryService } from '../common/services/loop-registry.service';
import type { BackgroundJobRow } from '../common/services/background-job.types';
import { isBackgroundRole } from '../common/utils/background-role.util';

/**
 * P97 (WORKER-03 / RT-04 / D-97-1) — durable cross-process payload for a queued
 * notification. Persisted as the `background_jobs.payload` of a `notification`
 * row; the worker claims + drains it via {@link BackgroundJobService}. Plain data
 * only (no closures) so it survives the web→worker boundary.
 */
interface NotificationJobPayload {
  userId: string;
  relatedModel: RelatedModel;
  relatedModelId: string;
  action: NotificationAction;
  message: string;
  linkUrl?: string;
  actorUserId?: string;
  postId?: string;
  commentId?: string;
  orderId?: string;
  messageId?: string;
  likeId?: string;
  scope?: NotificationScope;
}

/** The loop's registry name + its `background_jobs` discriminator. */
const LOOP_NAME = 'notification-queue';

@Injectable()
export class NotificationQueueService implements OnApplicationBootstrap {
  private readonly logger = new Logger(NotificationQueueService.name);
  private readonly processing = new Set<string>();
  private readonly batchSize = 10; // Xử lý 10 notifications mỗi batch
  private readonly processingInterval = 1000; // Poll mỗi 1 giây
  private drainInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly notificationService: NotificationService,
    private readonly backgroundJob: BackgroundJobService,
    private readonly loopRegistry: LoopRegistryService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * P97: the drain starts ONLY under a background role (worker/mono), never in
   * web. In web the enqueue still writes a durable `background_jobs` row — the
   * worker claims and drains it, so a web-enqueued notification is never stranded.
   */
  onApplicationBootstrap(): void {
    if (!isBackgroundRole()) {
      return;
    }
    this.loopRegistry.register(LOOP_NAME);
    this.startDraining();
  }

  /**
   * Thêm notification vào queue — nay ghi một dòng `background_jobs` bền vững
   * (thay cho mảng in-memory) để worker có thể drain qua ranh giới web→worker.
   */
  async addToQueue(
    userId: string, // Người nhận notification
    relatedModel: RelatedModel,
    relatedModelId: string,
    action: NotificationAction,
    message: string,
    linkUrl?: string,
    priority: 'high' | 'normal' | 'low' = 'normal',
    // Các parameter mới
    actorUserId?: string, // Người trigger notification
    postId?: string, // ID bài viết được like
    commentId?: string, // ID comment được like
    orderId?: string, // ID order
    messageId?: string, // ID message
    likeId?: string, // ID của like
    scope?: 'personal' | 'system' | 'global',
  ): Promise<void> {
    // Build payload with only defined fields (JSON has no `undefined`).
    const payload: NotificationJobPayload = {
      userId,
      relatedModel,
      relatedModelId,
      action,
      message,
      ...(linkUrl !== undefined ? { linkUrl } : {}),
      ...(actorUserId !== undefined ? { actorUserId } : {}),
      ...(postId !== undefined ? { postId } : {}),
      ...(commentId !== undefined ? { commentId } : {}),
      ...(orderId !== undefined ? { orderId } : {}),
      ...(messageId !== undefined ? { messageId } : {}),
      ...(likeId !== undefined ? { likeId } : {}),
      ...(scope !== undefined ? { scope: scope as NotificationScope } : {}),
    };

    // `priority` no longer reorders an in-memory array; the durable table drains
    // FIFO by createdAt. Priority is retained in the signature for caller
    // compatibility but is now best-effort (non-money-path, cosmetic ordering).
    void priority;

    await this.backgroundJob.enqueue(
      'notification',
      payload as unknown as Prisma.InputJsonValue,
    );
  }

  /**
   * Start the worker-side drain poll: claim a batch of `notification` rows and
   * process each. Gated to background role by {@link onApplicationBootstrap}.
   */
  private startDraining(): void {
    if (this.drainInterval) {
      return;
    }
    this.logger.log('[NotificationQueue] Starting durable drain (background role)');
    this.drainInterval = setInterval(() => {
      this.drainOnce().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`[NotificationQueue] drain error: ${message}`);
      });
    }, this.processingInterval);
  }

  private async drainOnce(): Promise<void> {
    if (this.processing.size >= this.batchSize) {
      return;
    }
    const rows = await this.backgroundJob.claimBatch('notification', this.batchSize);
    for (const row of rows) {
      if (this.processing.has(row.id)) continue;
      this.processing.add(row.id);
      void this.processRow(row).finally(() => {
        this.processing.delete(row.id);
      });
    }
  }

  /**
   * Process one claimed notification row: create the notification, then mark the
   * durable row done. On failure, {@link BackgroundJobService.markFailed} handles
   * the attempts increment + re-queue-under-cap (durable retry — replaces the old
   * in-memory setTimeout backoff).
   */
  private async processRow(row: BackgroundJobRow): Promise<void> {
    const item = row.payload as unknown as NotificationJobPayload;
    try {
      await this.notificationService.createNotificationWithCounter({
        userId: item.userId, // Người nhận notification
        relatedModel: item.relatedModel,
        relatedModelId: item.relatedModelId,
        action: item.action,
        message: item.message,
        linkUrl: item.linkUrl,
        actorUserId: item.actorUserId, // Người trigger notification
        postId: item.postId, // ID bài viết được like
        commentId: item.commentId, // ID comment được like
        orderId: item.orderId, // ID order
        messageId: item.messageId, // ID message
        likeId: item.likeId, // ID của like
        scope: item.scope, // Scope của notification
      });
      await this.backgroundJob.markDone(row.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to process notification ${row.id}: ${message}`,
      );
      // Durable retry: increments attempts, re-queues under the cap, parks failed over-cap.
      await this.backgroundJob.markFailed(row.id);
    }
  }

  /**
   * Queue statistics — now reports live processing count (durable pending rows
   * live in the DB, no longer an in-memory array). Retained for the debug
   * controller endpoint.
   */
  getQueueStats(): {
    total: number;
    processing: number;
    highPriority: number;
    normalPriority: number;
    lowPriority: number;
  } {
    return {
      total: this.processing.size,
      processing: this.processing.size,
      highPriority: 0,
      normalPriority: 0,
      lowPriority: 0,
    };
  }

  /**
   * Clear all pending notifications — deletes undrained `notification` rows.
   */
  async clearQueue(): Promise<{ message: string; clearedCount: number }> {
    const { count } = await this.prisma.backgroundJob.deleteMany({
      where: { jobType: 'notification', status: 'pending' },
    });
    this.logger.log(`Cleared ${count} pending notifications from queue`);
    return { message: 'Queue cleared successfully', clearedCount: count };
  }

  /**
   * Retry a specific durable job by requeuing it to `pending`.
   */
  async retryItem(
    itemId: string,
  ): Promise<{ message: string; success: boolean }> {
    const { count } = await this.prisma.backgroundJob.updateMany({
      where: { id: itemId },
      data: { status: 'pending', claimedBy: null, claimedAt: null },
    });
    if (count === 0) {
      return { message: `Item ${itemId} not found in queue`, success: false };
    }
    this.logger.log(`Retried item ${itemId}`);
    return { message: `Item ${itemId} retried successfully`, success: true };
  }

  onModuleDestroy(): void {
    if (this.drainInterval) {
      clearInterval(this.drainInterval);
      this.drainInterval = null;
    }
  }
}
