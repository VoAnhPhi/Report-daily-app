import { SetMetadata } from '@nestjs/common';

/**
 * Public metadata key for partner authentication
 */
export const PARTNER_AUTH_KEY = 'isPartnerAuth';

/**
 * Decorator to mark endpoints that require Partner API authentication
 *
 * Usage:
 * @PartnerAuth()
 * @Post('check-phone')
 * async checkPhone(@Body() dto: CheckPhoneDto) {
 *   // ...
 * }
 *
 * The PartnerAuthGuard will verify:
 * - x-api-key header
 * - x-signature header (HMAC SHA256 of raw request body)
 *
 * @returns Decorator function
 */
export const PartnerAuth = () => SetMetadata(PARTNER_AUTH_KEY, true);
