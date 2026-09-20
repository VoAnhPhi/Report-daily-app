import { Injectable, Logger } from '@nestjs/common';
import type { BackgroundJob, Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import type {
  BackgroundJobRow,
  BackgroundJobStatus,
  BackgroundJobType,
} from './background-job.types';

/**
 * P97 (D-97-1 / RT-04 / WORKER-03) — durable cross-process background-job handoff.
 *
 * The 5 in-memory `setInterval` loops (Plans 06/07) hand work across the web→worker
 * boundary through the `background_jobs` table instead of an in-process array: web
 * {@link enqueue}s a `pending` row; the worker {@link claimBatch}es a batch and
 * drains it. Mirrors the DB-backed {@link CronJobLockService} pattern the team
 * already trusts (Postgres, not Redis) — same `instanceId` convention, same
 * `toPrismaError` narrowing, zero `any` (§21).
 *
 * Single-drain (T-97-01) is guaranteed by a Postgres `FOR UPDATE SKIP LOCKED`
 * claim: two concurrent worker replicas never claim the same row (double-drain =
 * double money-path credit). Proven by the live-DB concurrent spec.
 *
 * NOT registered in any module here — Plans 06/07/10 wire it into the worker/mono
 * composition.
 */

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

/** Default max delivery attempts before a job is parked as `failed` (T-97-03). */
const DEFAULT_MAX_ATTEMPTS = 3;

@Injectable()
export class BackgroundJobService {
  private readonly logger = new Logger(BackgroundJobService.name);
  private readonly instanceId: string;

  constructor(private readonly prisma: PrismaService) {
    // Same identity shape as CronJobLockService (hostname + pid) so the claiming
    // worker is inspectable in `background_jobs.claimedBy`.
    this.instanceId = `${process.env.HOSTNAME || 'unknown'}-${process.pid}`;
  }

  /**
   * Durably enqueue a job. Writes a `pending` row the worker will later claim.
   * `payload` MUST carry businessId/tenant for money-path jobTypes so P98 can
   * reconstruct the CLS context (T-97-02) — never derive tenant from ambient
   * worker context.
   */
  async enqueue(
    jobType: BackgroundJobType,
    payload: Prisma.InputJsonValue,
  ): Promise<BackgroundJobRow> {
    const created = await this.prisma.backgroundJob.create({
      data: { jobType, payload, status: 'pending' },
    });
    return this.toRow(created);
  }

  /**
   * Atomically claim up to `batchSize` pending rows of `jobType` for this worker
   * instance. Prisma has no `UPDATE … LIMIT … RETURNING`, so this is a raw CTE:
   * the inner `SELECT … FOR UPDATE SKIP LOCKED LIMIT` row-locks only unclaimed
   * rows (concurrent racers skip locked rows rather than blocking), and the outer
   * UPDATE flips them to `claimed` and RETURNS them. This is the Postgres-native
   * single-drain guarantee (T-97-01). Uses the `@@map` table `background_jobs` and
   * real quoted column names (§8).
   */
  async claimBatch(
    jobType: BackgroundJobType,
    batchSize: number,
  ): Promise<BackgroundJobRow[]> {
    const rows = await this.prisma.$queryRaw<BackgroundJobRow[]>`
      UPDATE "background_jobs"
      SET "status" = 'claimed',
          "claimedBy" = ${this.instanceId},
          "claimedAt" = now(),
          "updatedAt" = now()
      WHERE "id" IN (
        SELECT "id" FROM "background_jobs"
        WHERE "status" = 'pending' AND "jobType" = ${jobType}
        ORDER BY "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${batchSize}
      )
      RETURNING *;
    `;
    return rows;
  }

  /** Mark a claimed job as successfully drained. */
  async markDone(id: string): Promise<void> {
    try {
      await this.prisma.backgroundJob.update({
        where: { id },
        data: { status: 'done', updatedAt: new Date() },
      });
    } catch (error: unknown) {
      const err = toPrismaError(error);
      if (err.code === 'P2025') {
        this.logger.debug(
          `[BackgroundJob] markDone: job '${id}' not found (already removed?)`,
        );
        return;
      }
      throw error;
    }
  }

  /**
   * Record a failed drain: increment `attempts`; re-queue to `pending` while under
   * `maxAttempts`, otherwise park as `failed` — no infinite retry storm (T-97-03).
   * The increment + status flip run in one `$transaction` on `tx` (§20) so the
   * attempt count and the derived status can never diverge.
   */
  async markFailed(
    id: string,
    maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const bumped = await tx.backgroundJob.update({
          where: { id },
          data: { attempts: { increment: 1 }, updatedAt: new Date() },
        });
        const status: BackgroundJobStatus =
          bumped.attempts >= maxAttempts ? 'failed' : 'pending';
        await tx.backgroundJob.update({
          where: { id },
          data:
            status === 'pending'
              ? { status, claimedBy: null, claimedAt: null, updatedAt: new Date() }
              : { status, updatedAt: new Date() },
        });
      });
    } catch (error: unknown) {
      const err = toPrismaError(error);
      if (err.code === 'P2025') {
        this.logger.debug(
          `[BackgroundJob] markFailed: job '${id}' not found (already removed?)`,
        );
        return;
      }
      throw error;
    }
  }

  /** Narrow a Prisma-typed row to the discriminated {@link BackgroundJobRow}. */
  private toRow(job: BackgroundJob): BackgroundJobRow {
    return {
      id: job.id,
      jobType: job.jobType as BackgroundJobType,
      payload: job.payload,
      status: job.status as BackgroundJobStatus,
      claimedBy: job.claimedBy,
      claimedAt: job.claimedAt,
      attempts: job.attempts,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
