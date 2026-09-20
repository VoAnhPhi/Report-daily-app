import type { Prisma } from '@prisma/client';

/**
 * P97 (D-97-1 / RT-04 / WORKER-03) — types for the durable cross-process
 * background-job handoff (the `background_jobs` table / {@link BackgroundJobService}).
 *
 * These back the 5 in-memory `setInterval` loops that Plans 06/07 convert to the
 * DB-poll handoff. The discriminator set is closed: adding a loop = adding a member
 * here (compile-time exhaustiveness at every enqueue/claim call-site).
 */

/**
 * The closed set of background job discriminators — one per in-memory loop
 * (BLUEPRINT §5e / D-97-1). `affiliate-order-completed` is the money-path member.
 */
export type BackgroundJobType =
  | 'affiliate-order-completed'
  | 'notification'
  | 'activity-log'
  | 'point-award'
  | 'cron-job';

/** Lifecycle status stored as a plain String column (no Prisma enum — §38). */
export type BackgroundJobStatus = 'pending' | 'claimed' | 'done' | 'failed';

/**
 * A row as returned by the `$queryRaw` claim (RETURNING *) — quoted camelCase
 * columns map 1:1 to the {@link BackgroundJob} model fields. `payload` comes back
 * as parsed JSON. Typed explicitly (not `any`) so the raw-SQL claim stays
 * Prisma-first (§21).
 */
export interface BackgroundJobRow {
  id: string;
  jobType: BackgroundJobType;
  payload: Prisma.JsonValue;
  status: BackgroundJobStatus;
  claimedBy: string | null;
  claimedAt: Date | null;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}
