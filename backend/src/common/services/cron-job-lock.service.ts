import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

interface PrismaErrorLike {
  code?: string;
  message?: string;
  meta?: unknown;
  stack?: string;
}

function toPrismaError(error: unknown): PrismaErrorLike {
  if (error && typeof error === 'object') {
    return error as PrismaErrorLike;
  }
  return { message: String(error) };
}

@Injectable()
export class CronJobLockService {
  private readonly logger = new Logger(CronJobLockService.name);
  private readonly instanceId: string;
  private readonly DEFAULT_LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes default

  constructor(private readonly prisma: PrismaService) {
    // Generate unique instance ID (hostname + process ID)
    this.instanceId = `${process.env.HOSTNAME || 'unknown'}-${process.pid}`;
  }

  async onModuleInit() {
    // Test table exists on startup
    await this.testTableExists();
  }

  /**
   * Try to acquire a lock for a cron job
   * Returns true if lock was acquired, false if already locked by another instance
   */
  async tryAcquireLock(
    jobName: string,
    lockDurationMs: number = this.DEFAULT_LOCK_DURATION_MS,
  ): Promise<boolean> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + lockDurationMs);

      // Try to acquire lock using upsert with conditional logic
      const lock = await this.prisma.cronJobLock.upsert({
        where: { jobName },
        update: {
          // Only update if lock is expired or not locked
          lockedBy: this.instanceId,
          lockedAt: now,
          expiresAt,
        },
        create: {
          jobName,
          lockedBy: this.instanceId,
          lockedAt: now,
          expiresAt,
        },
      });

      // Check if we successfully acquired the lock
      // If expiresAt is in the past or lockedBy matches our instance, we got it
      const isExpired = lock.expiresAt && new Date(lock.expiresAt) < now;
      const isLockedByUs = lock.lockedBy === this.instanceId;
      const wasNotLocked = !lock.lockedAt || isExpired;

      if (isLockedByUs || wasNotLocked) {
        // Update with our lock info
        if (!isLockedByUs) {
          await this.prisma.cronJobLock.update({
            where: { jobName },
            data: {
              lockedBy: this.instanceId,
              lockedAt: now,
              expiresAt,
            },
          });
        }

        this.logger.log(
          `🔒 [CronJobLock] Acquired lock for job '${jobName}' (instance: ${this.instanceId})`,
        );
        return true;
      }

      // Lock is held by another instance
      this.logger.warn(
        `⚠️ [CronJobLock] Job '${jobName}' is already locked by instance '${lock.lockedBy}' (expires at: ${lock.expiresAt})`,
      );
      return false;
    } catch (error) {
      this.logger.error(
        `❌ [CronJobLock] Failed to acquire lock for job '${jobName}': ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Try to acquire a lock, atomically reclaiming an expired lock or refreshing
   * our own. Reliable for distributed (multi-instance) systems.
   *
   * ATOMIC acquisition — no find-then-create TOCTOU (the previous
   * deleteMany→findUnique→create sequence raced between the find and the create,
   * throwing P2002 at ERROR level on every multi-instance 5-minute tick; the lock
   * still worked, but the noise buried real errors):
   *
   *   (1) A single `updateMany` matches the row ONLY when the lock is expired or
   *       already ours, refreshing it in place. Postgres row-locks the UPDATE, so
   *       two racers serialise — the loser re-evaluates the WHERE against the
   *       winner's fresh row and matches 0 rows. A non-zero count = we hold it.
   *   (2) If (1) matched nothing, the row is either absent or held by a LIVE other
   *       instance. We attempt a single `create`; a P2002 means another instance
   *       just created/holds it — an EXPECTED outcome under contention, logged at
   *       debug and returning false (NOT error). This is the ONLY place P2002 can
   *       surface here and it is benign (the loser cleanly skips its sweep).
   */
  async tryAcquireLockWithCleanup(
    jobName: string,
    lockDurationMs: number = this.DEFAULT_LOCK_DURATION_MS,
  ): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + lockDurationMs);

    try {
      // (1) Atomically reclaim an expired lock or refresh our own — a single
      // row-locked UPDATE, so concurrent racers serialise correctly.
      const reclaimed = await this.prisma.cronJobLock.updateMany({
        where: {
          jobName,
          OR: [{ expiresAt: { lt: now } }, { lockedBy: this.instanceId }],
        },
        data: {
          lockedBy: this.instanceId,
          lockedAt: now,
          expiresAt,
        },
      });

      if (reclaimed.count > 0) {
        this.logger.log(
          `🔒 [CronJobLock] ✅ Acquired lock for job '${jobName}' (instance: ${this.instanceId})`,
        );
        return true;
      }

      // (2) No reclaimable row matched — either no lock row exists yet, or a live
      // lock is held by another instance. Try to create it.
      try {
        await this.prisma.cronJobLock.create({
          data: {
            jobName,
            lockedBy: this.instanceId,
            lockedAt: now,
            expiresAt,
          },
        });
        this.logger.log(
          `🔒 [CronJobLock] ✅ Created lock for job '${jobName}' (instance: ${this.instanceId})`,
        );
        return true;
      } catch (createError: unknown) {
        const createErr = toPrismaError(createError);
        // EXPECTED under multi-instance contention: another instance created or
        // holds the lock first. Benign — log at debug and stand down.
        if (createErr.code === 'P2002') {
          this.logger.debug(
            `⚠️ [CronJobLock] Job '${jobName}' is held by another instance (lost create race) — skipping`,
          );
          return false;
        }
        throw createError;
      }
    } catch (error: unknown) {
      const err = toPrismaError(error);
      // Genuinely unexpected — P2002 is handled above and never reaches here.
      this.logger.error(
        `❌ [CronJobLock] Unexpected error acquiring lock for job '${jobName}':`,
        {
          errorCode: err.code,
          errorMessage: err.message,
          errorMeta: err.meta,
          instanceId: this.instanceId,
          jobName,
        },
      );
      return false;
    }
  }

  /**
   * Release a lock for a cron job
   */
  async releaseLock(jobName: string): Promise<void> {
    try {
      // Use deleteMany instead of delete to handle case where lock doesn't exist
      // Also check that lock is ours before deleting
      const result = await this.prisma.cronJobLock.deleteMany({
        where: {
          jobName,
          lockedBy: this.instanceId, // Only delete if it's our lock
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `🔓 [CronJobLock] Released lock for job '${jobName}' (instance: ${this.instanceId})`,
        );
      } else {
        // Lock doesn't exist or is held by another instance
        // Check to see which case it is
        const lock = await this.prisma.cronJobLock.findUnique({
          where: { jobName },
        });

        if (!lock) {
          this.logger.debug(
            `🔓 [CronJobLock] Lock for job '${jobName}' already removed (may have expired)`,
          );
        } else if (lock.lockedBy !== this.instanceId) {
          this.logger.warn(
            `⚠️ [CronJobLock] Cannot release lock for job '${jobName}' - locked by another instance '${lock.lockedBy}'`,
          );
        }
      }
    } catch (error: unknown) {
      const err = toPrismaError(error);
      // Handle P2025 (record not found) gracefully
      if (err.code === 'P2025') {
        this.logger.debug(
          `🔓 [CronJobLock] Lock for job '${jobName}' not found (may have been cleaned up)`,
        );
        return;
      }

      this.logger.error(
        `❌ [CronJobLock] Failed to release lock for job '${jobName}': ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Test if the cron_job_locks table exists and is accessible
   */
  async testTableExists(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1 FROM cron_job_locks LIMIT 1`;
      this.logger.log(
        '✅ [CronJobLock] Table cron_job_locks exists and is accessible',
      );
      return true;
    } catch (error: unknown) {
      const err = toPrismaError(error);
      if (err.message?.includes('does not exist') || err.code === '42P01') {
        this.logger.error(
          '❌ [CronJobLock] Table cron_job_locks does NOT exist! Please run migration.',
        );
      } else {
        this.logger.error(
          `❌ [CronJobLock] Error checking table: ${err.message}`,
        );
      }
      return false;
    }
  }

  /**
   * Clean up all expired locks
   */
  async cleanupExpiredLocks(): Promise<number> {
    try {
      const now = new Date();
      const result = await this.prisma.cronJobLock.deleteMany({
        where: {
          expiresAt: { lt: now },
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `🧹 [CronJobLock] Cleaned up ${result.count} expired lock(s)`,
        );
      }

      return result.count;
    } catch (error) {
      this.logger.error(
        `❌ [CronJobLock] Failed to cleanup expired locks: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }
}
