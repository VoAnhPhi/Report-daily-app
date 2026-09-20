/**
 * P97 (D-97-3 / SPLIT-05) — the single background-role gate every downstream
 * decoupling plan (04,05,06,07,08,09,10) imports to include background providers
 * ONLY outside the web process.
 *
 * `background` = the complement of `web`: a `worker` runs the full background
 * surface, and today's all-in-one `mono` must keep running it too (behavior-
 * preserving default — D-97-3). So the gate is defined as `!isWebRole()` rather
 * than `isWorkerRole()`, which would wrongly exclude `mono`.
 *
 * Imports {@link isWebRole} by full path — `role.util` is intentionally
 * un-barrelled (P96 / role.util.ts:16-19).
 */

import { isWebRole } from './role.util';

/**
 * True for `worker` and `mono`, false for `web`. The gate for mounting crons /
 * BullMQ processors / in-memory loop drains: web reaches 0/0/0 (arming the P96
 * self-check fail-fast), worker + mono carry the full background surface.
 */
export function isBackgroundRole(): boolean {
  return !isWebRole();
}

/**
 * Conditionally include background-only providers/imports in a module composition:
 * returns `[]` under `web` (so no cron/processor/loop provider is instantiated in
 * the web tier), and the given `providers` unchanged under `worker`/`mono`.
 *
 * @example
 *   providers: [
 *     ...backgroundProviders([SomeCronService, SomeLoopService]),
 *   ]
 */
export function backgroundProviders<T>(providers: T[]): T[] {
  return isBackgroundRole() ? providers : [];
}
