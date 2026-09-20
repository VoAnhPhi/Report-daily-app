/**
 * Community-shareholder ("Cổ đông") level-gate constants.
 *
 * Single source of truth for the badge math shared by:
 * - RecognizedUsersProcessingService.computeBadgeLevelsFromTransactions (daily-noon cron)
 * - ShareholderProgressService.computeForUserIds (batched referral-tab progress)
 *
 * DO NOT inline these values — always import from here so the cron grant and the
 * progress preview stay in lock-step.
 */
// Sàn KYC trực tiếp — CHỈ áp cho x2/x3; x1 không đòi KYC (calculateSharingLevel).
export const MIN_SUBORDINATE_KYC_COUNT = 5;
export const SHARING_LEVEL_1_THRESHOLD = 50_000;
export const SHARING_LEVEL_2_THRESHOLD = 100_000;
export const SHARING_LEVEL_3_THRESHOLD = 150_000;
export const ORDER_COMPLETED_TYPES = [
  'ORDER_COMPLETED',
  'ORDER_COMPLETED_SPECIAL_PRODUCT',
  'ORDER_COMPLETED_PRIORITY_PRODUCT',
] as const;
export const SUBORDINATE_KYC_CODE = 'SUBORDINATE_KYC_COMPLETED';
export const BUSINESS_POINT_AWARDED = 'BUSINESS_POINT_AWARDED';
// Affiliate-marketing points ("Điểm tiếp thị liên kết") awarded from approved
// affiliate-purchase requests. Written into the shared ActivityPointTransaction
// ledger with sourceType='affiliate_purchase'. Positive grants of this type are
// SUMMED directly into the sharing composite (order + kyc + affiliate) that
// gates all 3 sharing levels — they no longer waive the 5-KYC floor (which
// gates x2/x3 only; x1 has no KYC requirement).
export const AFFILIATE_PURCHASE_POINT_AWARDED = 'AFFILIATE_PURCHASE_POINT_AWARDED';
export const MAX_LEVEL_PER_TYPE = 3;
// Mã danh hiệu "Cổ đông lan tỏa" — danh hiệu DUY NHẤT xét bằng điểm chính, nên
// cũng là danh hiệu duy nhất bị thể lệ Video rèn luyện 11/09/2026 lọc lại
// (UserAnalyticsService.filterTrainingQualifyingShareholders). `professional` và
// `business` không xét bằng điểm chính nên không dính thể lệ đó.
export const SHARING_CODE = 'sharing';
