import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { AppCacheService } from '../../common/cache/cache.service';
import { Prisma, PointTransactionType } from '@prisma/client';
import { GamificationGateway } from '../gamification.gateway';
import { BackgroundJobService } from '../../common/services/background-job.service';
import { LoopRegistryService } from '../../common/services/loop-registry.service';
import type { BackgroundJobRow } from '../../common/services/background-job.types';
import { isBackgroundRole } from '../../common/utils/background-role.util';

interface PointAwardJob {
  userId: string;
  amount: number;
  sourceType: string;
  sourceId?: string;
  multiplier?: number;
  description?: string;
  metadata?: Prisma.InputJsonValue;
  activityType?: string;
  experience?: number;
  userTaskId?: string; // To uniquely identify job per user+task
  timestamp: number;
}

const LOOP_NAME = 'point-award-queue';

@Injectable()
export class PointAwardQueueService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PointAwardQueueService.name);
  private readonly processingJobs = new Set<string>(); // Track jobs being processed (userId:userTaskId)
  private readonly batchSize = 5;
  private readonly processingInterval = 500; // Poll every 500ms
  private drainInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: AppCacheService,
    @Inject(forwardRef(() => GamificationGateway))
    private readonly gamificationGateway: GamificationGateway,
    private readonly backgroundJob: BackgroundJobService,
    private readonly loopRegistry: LoopRegistryService,
  ) {}

  /**
   * P97 (WORKER-03): the drain starts ONLY under a background role (worker/mono),
   * never in web. The enqueue still writes a durable `background_jobs` row in web,
   * so a web-enqueued point-award is drained by the worker (never stranded).
   */
  onApplicationBootstrap(): void {
    if (!isBackgroundRole()) {
      return;
    }
    this.loopRegistry.register(LOOP_NAME);
    this.startDraining();
  }

  /**
   * Add a point award job to the queue — nay ghi một dòng `background_jobs` bền
   * vững (jobType `point-award`) thay cho mảng in-memory. Idempotency key
   * `userId:userTaskId` được giữ trong payload; bộ chặn processingJobs (best-effort,
   * cùng process) vẫn bỏ qua job đang được xử lý.
   */
  async enqueue(job: Omit<PointAwardJob, 'timestamp'>): Promise<void> {
    // Create unique job key: userId + userTaskId (or just userId if no userTaskId)
    const jobKey = job.userTaskId
      ? `${job.userId}:${job.userTaskId}`
      : job.userId;

    // Best-effort concurrent-dedup: skip if this specific job is currently draining
    // in THIS process (preserves the pre-P97 in-flight guard for mono).
    if (this.processingJobs.has(jobKey)) {
      this.logger.debug(
        `Job ${jobKey} already being processed, skipping duplicate`,
      );
      return;
    }

    const payload: PointAwardJob = {
      ...job,
      timestamp: Date.now(),
    };

    await this.backgroundJob.enqueue(
      'point-award',
      payload as unknown as Prisma.InputJsonValue,
    );

    this.logger.debug(`Enqueued point award job ${jobKey} (durable)`);
  }

  /**
   * Worker-side drain poll: claim a batch of `point-award` rows and process each
   * sequentially (preserves the pre-P97 one-at-a-time DB pacing). Gated to
   * background role by {@link onApplicationBootstrap}.
   */
  private startDraining(): void {
    if (this.drainInterval) {
      return;
    }
    this.logger.log('[PointAwardQueue] Starting durable drain (background role)');
    this.drainInterval = setInterval(() => {
      this.drainOnce().catch((error: unknown) => {
        this.logger.error(
          `[PointAwardQueue] drain error:`,
          error instanceof Error ? error.stack : error,
        );
      });
    }, this.processingInterval);
  }

  private async drainOnce(): Promise<void> {
    const rows = await this.backgroundJob.claimBatch(
      'point-award',
      this.batchSize,
    );
    // Sequential processing (small delay) to avoid overwhelming the database —
    // mirrors the pre-P97 sequential queue processor.
    for (const row of rows) {
      await this.processRow(row);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  private async processRow(row: BackgroundJobRow): Promise<void> {
    const job = row.payload as unknown as PointAwardJob;
    const jobKey = job.userTaskId
      ? `${job.userId}:${job.userTaskId}`
      : job.userId;

    this.processingJobs.add(jobKey);
    try {
      await this.processJob(job);
      await this.backgroundJob.markDone(row.id);
      this.logger.debug(`Successfully processed point award job ${jobKey}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to process point award job ${jobKey}:`,
        error instanceof Error ? error.stack : error,
      );
      // Preserve pre-P97 "no retry" semantics: park immediately as failed
      // (maxAttempts=1 → no re-queue), avoiding infinite loops.
      await this.backgroundJob.markFailed(row.id, 1);
    } finally {
      this.processingJobs.delete(jobKey);
    }
  }

  /**
   * Process a single job without transaction
   */
  private async processJob(job: PointAwardJob): Promise<void> {
    const finalAmount = Math.floor(job.amount * (job.multiplier || 1));

    // Step 1: Get or create user stats (without transaction)
    const stats = await this.prisma.userActivityStats.upsert({
      where: { userId: job.userId },
      update: {},
      create: {
        userId: job.userId,
        currentPoints: 0,
        totalPoints: 0,
        dailyPoints: 0,
        weeklyPoints: 0,
        monthlyPoints: 0,
        yearlyPoints: 0,
        totalExperience: 0,
        dailyActivities: 0,
        weeklyActivities: 0,
        monthlyActivities: 0,
        yearlyActivities: 0,
        tasksCompleted: 0,
      },
    });

    // Step 2: Calculate new balance
    const newBalance = stats.currentPoints + finalAmount;

    // Step 3: Create transaction record (without transaction wrapper)
    const experienceAmount = job.experience || 0;
    await this.prisma.activityPointTransaction.create({
      data: {
        userId: job.userId,
        type: PointTransactionType.earn,
        points: finalAmount,
        balance: newBalance,
        experience: experienceAmount,
        multiplier: job.multiplier || 1,
        sourceType: job.sourceType,
        sourceId: job.sourceId,
        sourceName: job.description,
        description: job.description,
        metadata: job.metadata || {},
        activityType: job.activityType || undefined,
      },
    });

    // Step 4: Update user stats (without transaction wrapper)
    const updateData: Prisma.UserActivityStatsUpdateInput = {
      totalPoints: { increment: finalAmount },
      currentPoints: { increment: finalAmount },
      dailyPoints: { increment: finalAmount },
      weeklyPoints: { increment: finalAmount },
      monthlyPoints: { increment: finalAmount },
      yearlyPoints: { increment: finalAmount },
    };

    if (experienceAmount > 0) {
      updateData.totalExperience = { increment: experienceAmount };
    }

    await this.prisma.userActivityStats.update({
      where: { userId: job.userId },
      data: updateData,
    });

    this.logger.log(
      `✅ Awarded ${finalAmount} points to user ${job.userId} (source: ${job.sourceType})`,
    );

    // Emit socket event for real-time update in gamification widget
    this.gamificationGateway.emitPointsAwarded(
      job.userId,
      finalAmount,
      job.description || `Hoàn thành nhiệm vụ`,
    );

    // Invalidate gamification cache
    await this.cacheService.invalidateTags([
      'gamification:stats',
      'gamification:dashboard',
      'gamification:points-history',
      'gamification:leaderboard',
      'admin:gamification:transactions',
    ]);
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueSize: 0,
      processing: this.drainInterval !== null,
      processingJobs: Array.from(this.processingJobs),
    };
  }

  onModuleDestroy(): void {
    if (this.drainInterval) {
      clearInterval(this.drainInterval);
      this.drainInterval = null;
    }
  }
}
