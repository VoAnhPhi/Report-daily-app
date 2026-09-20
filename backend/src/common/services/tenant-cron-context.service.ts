import { Injectable, Logger } from '@nestjs/common';
import {
  RequestContextService,
  TenantContext,
} from './request-context.service';

/**
 * TenantCronContextService (Phase 98, D-98-3/D-98-4) — the thin cron/worker
 * tenant-context helper.
 *
 * A cron runs OUTSIDE an HTTP request, so `TenantClsGuard` never fires and no
 * tenant context exists in the CLS store. Whatever a cron seeds (or fails to
 * seed) is exactly what `OrderQueryService.withTenantScope()` reads when it
 * decides whether to inject a `businessId` filter into a money query. This
 * helper is the ONE sanctioned way to seed that context off the HTTP path — a
 * LỚP MỎNG over `RequestContextService.run()` (which already does
 * `cls.run(() => { cls.set(KEY, ctx); return fn() })`). It introduces NO second
 * CLS / AsyncLocalStorage (D-98-3): the app has a single CLS, entered by the
 * guard on the HTTP path and by `run()` here off it.
 *
 * Two entry points, deliberately distinct (D-98-4 — do NOT conflate them):
 *
 *   • {@link runInTenantContext} — a PER-TENANT sweep. Seeds a real `businessId`
 *     so `withTenantScope` narrows the sweep's money reads to exactly that
 *     tenant. Callers that fan out over many tenants MUST loop
 *     `for each businessId → runInTenantContext(businessId, () => …)` — never one
 *     wrap for the whole batch.
 *
 *   • {@link runAsSystemCron} — a GLOBAL / cross-tenant sweep that still wants an
 *     actor for its ActivityLog/audit writes. Seeds `businessId: null` so
 *     `withTenantScope` stays UNFILTERED (the sweep keeps seeing every tenant's
 *     rows — wrapping such a sweep in a tenant businessId would silently drop
 *     other tenants' rows, the critical money bug T-98-01). Only the actor
 *     (`userId = SYSTEM_CRON_USER_ID`) is seeded.
 *
 * The seeded object matches the `TenantContext` shape `TenantClsGuard` writes
 * byte-for-byte (`businessId` / `businessSlug` / `userId`), so getters resolve
 * identically to the HTTP path.
 */
@Injectable()
export class TenantCronContextService {
  private readonly logger = new Logger(TenantCronContextService.name);

  /**
   * Warn-ONCE latch for an unset `SYSTEM_CRON_USER_ID` (D-98-4). Mirrors the
   * warn-and-continue precedent at `scheduled-cron.service.ts:224-230`: a missing
   * actor env must never throw and never abort a sweep — but it also must not
   * spam the log every fire, so the warning is emitted at most once per process.
   */
  private warnedMissingActor = false;

  constructor(private readonly requestContext: RequestContextService) {}

  /**
   * Run `fn` inside a per-tenant context scoped to `businessId`. Inside `fn`,
   * `getBusinessId()` returns `businessId` and `getUserId()` returns the cron
   * actor (`SYSTEM_CRON_USER_ID`, or null when unset). The return value and async
   * completion of `fn` propagate unchanged; an error thrown inside `fn` bubbles
   * to the caller unchanged.
   */
  runInTenantContext<T>(businessId: string, fn: () => T): T {
    const ctx: TenantContext = {
      businessId,
      businessSlug: null,
      userId: process.env.SYSTEM_CRON_USER_ID ?? null,
    };
    return this.requestContext.run(ctx, fn);
  }

  /**
   * Run `fn` as a GLOBAL cron under a seeded system actor with `businessId: null`.
   * `withTenantScope` therefore stays unfiltered (cross-tenant sweep preserved),
   * while `getUserId()` inside `fn` returns `SYSTEM_CRON_USER_ID` for actor-attributed
   * ledger/ActivityLog writes. When `SYSTEM_CRON_USER_ID` is unset it warns once and
   * STILL runs `fn` (userId null) — it never throws (D-98-4). Return value / async
   * completion / thrown errors propagate unchanged.
   */
  runAsSystemCron<T>(fn: () => T): T {
    const actorId = process.env.SYSTEM_CRON_USER_ID ?? null;
    if (actorId === null && !this.warnedMissingActor) {
      this.warnedMissingActor = true;
      this.logger.warn(
        '[TENANT_CRON_CONTEXT] SYSTEM_CRON_USER_ID env var unset; seeding system ' +
          'cron context with userId=null (actor unattributed). Sweep still runs.',
      );
    }
    const ctx: TenantContext = {
      businessId: null,
      businessSlug: null,
      userId: actorId,
    };
    return this.requestContext.run(ctx, fn);
  }
}
