/**
 * Single source of truth for the "điểm chính" (sharing composite) arithmetic.
 *
 * điểm chính = điểm mua hàng (order, đã trừ đảo điểm trùng đơn)
 *            + điểm KYC tuyến dưới (SUBORDINATE_KYC_COMPLETED)
 *            + điểm tiếp thị liên kết (AFFILIATE_PURCHASE_POINT_AWARDED)
 *
 * Every reader that surfaces this number MUST call this helper instead of
 * re-implementing the sum inline. Three inline copies had previously drifted
 * apart (one skipped the reversal netting, another dropped the affiliate leg),
 * so the admin members panel and the affiliate portal showed different totals
 * for the same user. Keeping the arithmetic in one place is what prevents that.
 *
 * Order points are netted against duplicate-award reversals
 * (sourceType `order_points_reversal`, stored as negative rows) and clamped at
 * zero, so the composite matches the user's wallet balance. Reversal points are
 * expected to be zero or negative; a positive value is treated as zero
 * adjustment defensively.
 */
export interface SharingCompositeInput {
  /** Gross positive order points across all ORDER_COMPLETED tiers. */
  orderGrossPoints: number;
  /** Reversal points (order_points_reversal), zero or negative. */
  orderReversalPoints: number;
  /** SUBORDINATE_KYC_COMPLETED points. */
  subordinateKycPoints: number;
  /** AFFILIATE_PURCHASE_POINT_AWARDED points. */
  affiliatePurchasePoints: number;
}

/** Net, reversal-aware order points (clamped at zero). */
export function computeNetOrderPoints(
  orderGrossPoints: number,
  orderReversalPoints: number,
): number {
  const reversal = Math.min(0, orderReversalPoints);
  return Math.max(0, orderGrossPoints + reversal);
}

/** The canonical "điểm chính" total. */
export function computeSharingComposite(input: SharingCompositeInput): number {
  return (
    computeNetOrderPoints(input.orderGrossPoints, input.orderReversalPoints) +
    input.subordinateKycPoints +
    input.affiliatePurchasePoints
  );
}

export interface SharingLevelInput {
  sharingCompositePoints: number;
  kycCount: number;
  minKycCount: number;
  level1Threshold: number;
  level2Threshold: number;
  level3Threshold: number;
  maxLevel: number;
}

/**
 * Cấp Cổ đông lan tỏa (x1/x2/x3) suy từ điểm chính — nguồn DUY NHẤT của phép
 * so ngưỡng, dùng chung cho cron công nhận và tra cứu ví HALF của đối tác.
 *
 * 5-KYC is a mandatory floor ONLY at L2/L3 — L1 depends solely on the
 * composite threshold (locked business rule, revised). A user who clears
 * the L2/L3 composite bar but not the KYC floor falls through to L1
 * (they still cleared >= level1Threshold).
 */
export function computeSharingLevel(params: SharingLevelInput): number {
  if (params.sharingCompositePoints >= params.level3Threshold && params.kycCount >= params.minKycCount) return params.maxLevel;
  if (params.sharingCompositePoints >= params.level2Threshold && params.kycCount >= params.minKycCount) return 2;
  if (params.sharingCompositePoints >= params.level1Threshold) return 1;
  return 0;
}
