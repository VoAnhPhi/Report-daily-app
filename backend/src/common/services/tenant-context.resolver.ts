import {
  Injectable,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppCacheService } from '../cache/cache.service';
import { TenantContext } from './request-context.service';
import { AllConfigType } from '../configs/types/index.type';
import { JwtPayload } from '../../auth/jwt-payload';
import { PrismaService } from './prisma.service';
import { Role } from '@prisma/client';

const SLUG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const ADMIN_ROLE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * TenantContextResolver — builds the per-request {businessId, businessSlug, userId}
 * tenant context from the inbound HTTP request (Bearer JWT + x-business-slug header).
 *
 * This holds the canonical context-building logic (JWT verify via JwtService +
 * JWT_SECRET_KEY, slug→businessId resolution with a 5-min cache, and the §28
 * anti-spoofing 403 on JWT/slug mismatch). Under NestJS 11 an AsyncLocalStorage
 * context set in a middleware does NOT propagate into route handlers/guards, so the
 * context store is instead established by the `nestjs-cls` ClsGuard (registered as
 * the first APP_GUARD); that guard's `setup` calls `resolve()` here and writes the
 * result into the CLS store. RequestContextService reads it back via ClsService.
 *
 * Kept as a standalone provider so the logic is reachable + unit-testable
 * independent of the CLS wiring (and so TenantContextMiddleware can delegate to it).
 */
@Injectable()
export class TenantContextResolver {
  private readonly logger = new Logger(TenantContextResolver.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly cache: AppCacheService,
    private readonly prisma: PrismaService,
  ) {}

  async resolve(req: Request): Promise<TenantContext> {
    // 1. Try to decode JWT (best-effort — JwtAuthGuard enforces validity later)
    let jwtBusinessId: string | null = null;
    let jwtUserId: string | null = null;

    const token = this.extractToken(req);
    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync<
          JwtPayload & { iat: number; exp: number }
        >(token, {
          secret: this.configService.getOrThrow('app.jwtSecretKey', {
            infer: true,
          }),
        });
        jwtBusinessId = payload.businessId ?? null;
        jwtUserId = payload.id ?? null;
      } catch {
        // Invalid/expired token — JwtAuthGuard will handle enforcement
      }
    }

    // 2. Read x-business-slug header (set by storefront middleware, Phase 6)
    const slug =
      (req.headers['x-business-slug'] as string | undefined) ?? null;

    let slugBusinessId: string | null = null;
    if (slug) {
      slugBusinessId = await this.resolveSlugToBusinessId(slug);
    }

    // 3. Anti-spoofing: if both are present and resolve to different businesses → 403
    if (
      jwtBusinessId !== null &&
      slugBusinessId !== null &&
      jwtBusinessId !== slugBusinessId
    ) {
      this.logger.warn(
        `[SECURITY] businessId mismatch — JWT: ${jwtBusinessId}, slug resolves to: ${slugBusinessId}. Request rejected.`,
      );
      throw new ForbiddenException(
        'Business context mismatch between token and slug header',
      );
    }

    // 4. Prefer JWT.businessId; fall back to slug-resolved
    let businessId = jwtBusinessId ?? slugBusinessId;

    // 5. Admins are CROSS-TENANT: tenant scoping must never narrow a platform
    // admin to a single business. An admin who also owns/was assigned a business
    // now carries that businessId in their JWT (multi-tenant backfill), which
    // would otherwise filter the admin's order/stats reads to that one business.
    // Role isn't in the JWT, so resolve it from the DB (cached). Null businessId
    // => downstream getBusinessId() reads see all tenants. Only checked when a
    // businessId is actually present, so non-business users pay no extra query.
    if (businessId && jwtUserId && (await this.isAdminUser(jwtUserId))) {
      businessId = null;
    }

    return {
      businessId,
      businessSlug: slug,
      userId: jwtUserId,
    };
  }

  /**
   * True when the user's primary role is platform admin. Cached (5 min) so the
   * per-request tenant resolve does not hit the DB every time for the same user.
   */
  private async isAdminUser(userId: string): Promise<boolean> {
    const cacheKey = `tenant:isadmin:${userId}`;
    const cached = await this.cache.get<boolean>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    const count = await this.prisma.user.count({
      where: { id: userId, role: Role.admin },
    });
    const isAdmin = count > 0;
    await this.cache.set(cacheKey, isAdmin, ADMIN_ROLE_CACHE_TTL_MS);
    return isAdmin;
  }

  private async resolveSlugToBusinessId(slug: string): Promise<string | null> {
    const cacheKey = `tenant:slug:${slug}`;
    const cached = await this.cache.get<string>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const business = await this.prisma.business.findUnique({
      where: { slug },
      select: { id: true },
    });

    const id = business?.id ?? null;
    if (id !== null) {
      await this.cache.set(cacheKey, id, SLUG_CACHE_TTL_MS);
    }

    return id;
  }

  private extractToken(req: Request): string | undefined {
    const auth = req.headers.authorization;
    if (!auth) return undefined;
    const [type, token] = auth.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
