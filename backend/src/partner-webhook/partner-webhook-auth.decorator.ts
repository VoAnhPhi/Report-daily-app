import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Request } from 'express';
import type { WebhookPartnerInfo } from './dto/webhook.dto';

/**
 * Metadata key for partner webhook authentication
 */
export const PARTNER_WEBHOOK_AUTH_KEY = 'isPartnerWebhookAuth';

/**
 * Decorator to mark endpoints that require Partner Webhook authentication
 *
 * This decorator:
 * 1. Bypasses JWT auth guard (like @PartnerAuth and @Public)
 * 2. Activates PartnerWebhookGuard for HMAC signature verification
 *
 * Usage:
 * @PartnerWebhookAuth()
 * @Post('inbound/:slug')
 * async handleInbound(
 *   @WebhookPartner() partner: WebhookPartnerInfo,
 *   @WebhookEvent() event: string,
 * ) { ... }
 */
export const PartnerWebhookAuth = () => SetMetadata(PARTNER_WEBHOOK_AUTH_KEY, true);

/**
 * Extract WebhookPartnerInfo from request (set by PartnerWebhookGuard)
 */
export const WebhookPartner = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WebhookPartnerInfo => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.webhookPartner!;
  },
);

/**
 * Extract webhook event type from request (set by PartnerWebhookGuard)
 */
export const WebhookEvent = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.webhookEvent;
  },
);

/**
 * Extract webhook idempotency key from request (set by PartnerWebhookGuard, v2)
 */
export const WebhookIdempotencyKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.webhookIdempotencyKey;
  },
);
