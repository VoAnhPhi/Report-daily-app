import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

export interface TenantContext {
  businessId: string | null;
  businessSlug: string | null;
  userId: string | null;
}

/** Single CLS store key under which the per-request tenant context lives. */
export const TENANT_CONTEXT_CLS_KEY = 'tenantContext';

/**
 * RequestContextService — read surface for the per-request JWT-derived tenant
 * context (businessId / businessSlug / userId).
 *
 * Backed by `nestjs-cls` (ClsService). The store is populated by the ClsGuard's
 * setup (see app.module + TenantContextResolver) BEFORE any other APP_GUARD runs,
 * so getBusinessId()/getUserId()/getBusinessSlug() resolve inside guards (e.g.
 * TenantGuard), controllers, AND services under NestJS 11 — where a middleware-set
 * AsyncLocalStorage context does NOT propagate to handlers.
 *
 * The public getter API is intentionally unchanged from the previous ALS-backed
 * implementation: all 19 consumers + TenantGuard keep working unchanged. When no
 * context is active (cron jobs, system flows, BullMQ workers) every getter returns
 * null and get() returns undefined — preserving the intentional cross-tenant
 * behaviour those flows rely on (§28).
 */
@Injectable()
export class RequestContextService {
  constructor(private readonly cls: ClsService) {}

  /**
   * Establish the context for a synchronous/async callback scope. Used by tests and
   * by any non-HTTP entry point that needs an explicit tenant scope. Mirrors the
   * previous AsyncLocalStorage.run signature.
   */
  run<T>(ctx: TenantContext, fn: () => T): T {
    return this.cls.run(() => {
      this.cls.set(TENANT_CONTEXT_CLS_KEY, ctx);
      return fn();
    });
  }

  /** Write the context into the active CLS store (used by the ClsGuard setup). */
  set(ctx: TenantContext): void {
    this.cls.set(TENANT_CONTEXT_CLS_KEY, ctx);
  }

  get(): TenantContext | undefined {
    if (!this.cls.isActive()) return undefined;
    return this.cls.get<TenantContext | undefined>(TENANT_CONTEXT_CLS_KEY);
  }

  getBusinessId(): string | null {
    return this.get()?.businessId ?? null;
  }

  getBusinessSlug(): string | null {
    return this.get()?.businessSlug ?? null;
  }

  getUserId(): string | null {
    return this.get()?.userId ?? null;
  }
}
