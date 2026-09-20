import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../common/configs/types/index.type';
import { PrismaService } from '../../common/services/prisma.service';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { IS_EXTERNAL_APP_KEY } from '../../common/decorators/external-app.decorator';
import { OPTIONAL_AUTH_KEY } from '../../common/decorators/optional-auth.decorator';
import { JwtPayload } from '../jwt-payload';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { tokenCacheKey } from '../auth-utils';
import { ACCOUNT_DEACTIVATED_VN } from '../../constants/messages';
import { UserStatus } from '@prisma/client';
import { PARTNER_AUTH_KEY } from '../../partner-auth/partner-auth.decorator';
import { PARTNER_WEBHOOK_AUTH_KEY } from '../../partner-webhook/partner-webhook-auth.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfigType>,
    private reflector: Reflector,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    super();
  }

  getRequest(context: ExecutionContext): Request {
    return context.switchToHttp().getRequest();
  }

  getResponse(context: ExecutionContext) {
    return context.switchToHttp().getResponse();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = this.getRequest(context);
    const route = request ? `${request.method} ${request.url}` : 'Unknown';

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const isExternalApp = this.reflector.getAllAndOverride<boolean>(
      IS_EXTERNAL_APP_KEY,
      [context.getHandler(), context.getClass()],
    );

    const isOptionalAuth = this.reflector.getAllAndOverride<boolean>(
      OPTIONAL_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    const isPartnerAuth = this.reflector.getAllAndOverride<boolean>(
      PARTNER_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    const isPartnerWebhookAuth = this.reflector.getAllAndOverride<boolean>(
      PARTNER_WEBHOOK_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic || isExternalApp || isPartnerAuth || isPartnerWebhookAuth) {
      return true;
    }

    const response = this.getResponse(context);

    // Add cache control headers
    if (response && response.setHeader) {
      response.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate',
      );
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Expires', '0');
      response.setHeader('Surrogate-Control', 'no-store');
    }

    const token = this.extractTokenFromHeader(request);

    // For optional auth: if no token, allow access but without user
    if (isOptionalAuth && !token) {
      return true;
    }

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const keyRead = tokenCacheKey(token);
      const cachedUser = await this.cacheManager.get(keyRead);
      if (cachedUser) {
        request.user = cachedUser;
        return true;
      }

      const payload: JwtPayload & { iat: number; exp: number } =
        await this.jwtService.verifyAsync(token, {
          secret: this.configService.getOrThrow('app.jwtSecretKey', {
            infer: true,
          }),
        });

      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < currentTime) {
        throw new TokenExpiredError(
          'Token expired',
          new Date(payload.exp * 1000),
        );
      }

      const existUser = await this.prisma.user.findUnique({
        where: {
          id: payload.id,
          deletedAt: null,
          verificationDate: {
            not: null,
          },
        },
        select: {
          id: true,
          email: true,
          phoneNumber: true,
          referenceId: true,
          role: true,
          status: true,
        },
      });

      if (!existUser) {
        throw new UnauthorizedException('User not found');
      }

      // Deactivated accounts lose access on the very next request, no matter
      // how long their JWT still lives. Kept OUT of the `where` clause so the
      // client gets a distinct "deactivated" error instead of "User not found".
      // NOTE: the cachedUser short-circuit above never fires today (nothing
      // .set()s tokenCacheKey — line below discards its return value). If that
      // cache is ever wired up, this status check MUST move above it or be
      // invalidated on status change.
      if (existUser.status === UserStatus.inactive) {
        throw new ForbiddenException(ACCOUNT_DEACTIVATED_VN);
      }

      request.user = {
        ...existUser,
        accessToken: token,
        iat: payload.iat,
        exp: payload.exp,
      };

      tokenCacheKey(token);

      return true;
    } catch (error) {
      // Preserve the deactivated-account error — the generic fallbacks below
      // would mask it as "Invalid token".
      if (error instanceof ForbiddenException) {
        throw error;
      }
      if (error instanceof TokenExpiredError) {
        throw new HttpException(
          { statusCode: HttpStatus.GONE, message: 'Access token expired', error: 'TokenExpired' },
          HttpStatus.GONE,
        );
      }
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer') {
      return undefined;
    }

    return token;
  }
}
