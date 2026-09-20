/**
 * SPLIT-01 (Phase 96) — the single source of the process-`ROLE` contract for the
 * acta-api 3-repo split (BLUEPRINT §5a / §6).
 *
 * One `acta-api` codebase boots as either a **web** process (HTTP tier), a
 * **worker** process (crons/queues/loops, no `app.listen`), or today's all-in-one
 * **mono** — selected by env `ROLE ∈ {web, worker, mono}`, default `mono`.
 *
 * D-96-3 — invalid/unknown `ROLE` fails fast: {@link parseRole} normalizes (trim +
 * lowercase) then exact-matches; unset/empty → `mono` (the locked zero-change
 * default); any other value **throws** rather than silently falling back to `mono`.
 * A worker container with a typo'd `ROLE` must NOT quietly become `mono` (which
 * runs HTTP **and** every cron) — that reintroduces the money-path cron
 * double-fire the whole role gate exists to prevent. Fail loud at boot.
 *
 * This module imports nothing and is intentionally NOT re-exported from a
 * `common/utils` barrel — entrypoints import it by full path (D-96-1: keep the
 * Phase 96 diff to net-new files only).
 */

/** Locked env contract (BLUEPRINT §5a / D-96-3): ROLE ∈ {web, worker, mono}. */
export type ProcessRole = 'web' | 'worker' | 'mono';

/** The canonical role set, in contract order. */
export const PROCESS_ROLES: readonly ProcessRole[] = [
  'web',
  'worker',
  'mono',
] as const;

/**
 * Normalize (trim + lowercase) then exact-match a raw `ROLE` value against
 * {@link PROCESS_ROLES}.
 *
 * - Unset / empty / whitespace-only → `'mono'` (locked zero-change default).
 * - A normalized value in the contract set → that {@link ProcessRole}.
 * - Anything else → **throws** an `Error` naming the offending raw value and the
 *   expected set `web|worker|mono` (D-96-3 fail-fast — never a silent `mono`).
 */
export function parseRole(raw: string | undefined): ProcessRole {
  const normalized = (raw ?? '').trim().toLowerCase();
  if (normalized === '') {
    return 'mono';
  }
  if ((PROCESS_ROLES as readonly string[]).includes(normalized)) {
    return normalized as ProcessRole;
  }
  throw new Error(
    `unknown ROLE '${raw ?? ''}', expected web|worker|mono`,
  );
}

/** The active process role, read from `process.env.ROLE` (throws on unknown). */
export function getRole(): ProcessRole {
  return parseRole(process.env.ROLE);
}

/** True only when the active role is `worker`. */
export function isWorkerRole(): boolean {
  return getRole() === 'worker';
}

/** True only when the active role is `web`. */
export function isWebRole(): boolean {
  return getRole() === 'web';
}

/** True only when the active role is `mono` (includes the unset default). */
export function isMonoRole(): boolean {
  return getRole() === 'mono';
}
