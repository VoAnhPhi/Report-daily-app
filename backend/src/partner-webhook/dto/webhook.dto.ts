import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';

/**
 * Supported webhook event types from partners
 */
export enum WebhookEventType {
  USER_LOGIN = 'user.login',
  USER_REGISTER = 'user.register',
  QUIZ_START = 'quiz.start',
  QUIZ_SUBMIT = 'quiz.submit',
  QUIZ_COMPLETE = 'quiz.complete',
  NUMBER_SELECT = 'number.select',
  PRIZE_WIN = 'prize.win',
}

/**
 * Partner info attached to request by PartnerWebhookGuard
 */
export interface WebhookPartnerInfo {
  id: string;
  name: string;
  slug: string;
}

/**
 * Webhook event payload interface (body sent by partner)
 */
export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, any>;
}

/**
 * Extend Express Request to include webhook fields set by PartnerWebhookGuard
 */
declare global {
  namespace Express {
    interface Request {
      webhookPartner?: WebhookPartnerInfo;
      webhookEvent?: string;
      webhookTimestamp?: string;
      // v2 fields
      webhookIdempotencyKey?: string;
      webhookAttempt?: number;
      webhookMaxAttempts?: number;
      webhookIsDuplicate?: boolean;
    }
  }
}

/**
 * Webhook secret response from partner
 */
export interface WebhookSecretResponse {
  secret: string;
  note?: string;
}

/**
 * Webhook subscription response from partner
 */
export interface WebhookSubscriptionResponse {
  id: string;
  url: string;
  event: string;
  description?: string;
  is_active: boolean;
  createdAt: string;
}

/**
 * Webhook test response from partner
 */
export interface WebhookTestResponse {
  success: boolean;
  event: string;
  fired_to: string[];
  message: string;
}

/**
 * DTO for fetching webhook secret from partner
 */
export class FetchWebhookSecretDto {
  @IsString()
  @IsNotEmpty()
  partnerSlug!: string;
}

/**
 * DTO for storing a webhook secret manually (partner gave you the secret directly)
 */
export class StoreWebhookSecretDto {
  @IsString()
  @IsNotEmpty()
  partnerSlug!: string;

  @IsString()
  @IsNotEmpty()
  secret!: string;
}

/**
 * DTO for subscribing to partner webhook
 */
export class SubscribeWebhookDto {
  @IsString()
  @IsNotEmpty()
  partnerSlug!: string;

  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(WebhookEventType)
  event!: WebhookEventType;

  @IsString()
  @IsOptional()
  description?: string;
}

/**
 * DTO for testing webhook
 */
export class TestWebhookDto {
  @IsString()
  @IsNotEmpty()
  partnerSlug!: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(WebhookEventType)
  event!: WebhookEventType;
}
