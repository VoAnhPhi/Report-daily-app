import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

/**
 * Kiểu đếm F1 dùng cho ngưỡng "đủ F1".
 *
 * - `new_in_window`: chỉ đếm F1 ĐƯỢC TẠO trong cửa sổ [windowStart, resetAnchor).
 * - `total_active`: đếm TOÀN BỘ F1 trực tiếp đang `active` (không có cửa sổ).
 *
 * Hai con số này KHÁC HẲN nhau — `total_active` luôn ≥ `new_in_window` nên cùng
 * một ngưỡng sẽ bắt ít người hơn hẳn. Chọn nhầm là lệch toàn bộ danh sách.
 */
export enum WalletResetF1Mode {
  new_in_window = 'new_in_window',
  total_active = 'total_active',
}

/** Cách ghép hai điều kiện trượt (không mua hàng ∧/∨ thiếu F1). */
export enum WalletResetCombine {
  /** Chỉ bắt người TRƯỢT CẢ HAI (chặt hơn — mặc định). */
  and = 'and',
  /** Bắt người trượt BẤT KỲ điều kiện nào (rộng hơn). */
  or = 'or',
}

/** Cổng xác định "đã mua hàng trong kỳ". */
export enum WalletResetBuyGate {
  /**
   * Mặc định: đơn đã HOÀN TẤT XUẤT VAT — `order_vat.status='completed'` với
   * `order_vat.completedAt` (cột BẤT BIẾN do trigger DB đóng dấu) rơi trong cửa sổ.
   */
  vat_completed = 'vat_completed',
  /** Đơn ở trạng thái `completed`/`temp_completed`, đo theo `orders.createdAt`. */
  order_completed = 'order_completed',
}

/**
 * Giá trị mặc định của bộ tham số. KHÔNG đặt làm field initializer trong DTO:
 * `plainToInstance` không chạy `@Transform` cho khoá VẮNG MẶT trong query, nên
 * mặc định phải được áp ở tầng service bằng `??` mới chắc chắn đúng.
 */
export const WALLET_RESET_PREVIEW_DEFAULTS = {
  windowDays: 60,
  minNewF1: 2,
  f1Mode: WalletResetF1Mode.new_in_window,
  combine: WalletResetCombine.and,
  buyGate: WalletResetBuyGate.vat_completed,
  onlyWithBalance: true,
  page: 1,
  limit: 50,
} as const;

/**
 * Bộ lọc CHUNG cho cả hai tuyến `GET /admin/wallet-reset-preview` (JSON) và
 * `/export` (xlsx). `page`/`limit` chỉ có tác dụng ở tuyến JSON — bản xuất Excel
 * luôn ghi TOÀN BỘ cohort.
 *
 * Query string tới đây đều là CHUỖI. `enableImplicitConversion: true` của
 * ValidationPipe toàn cục đã ép chuỗi → số giúp, nhưng với boolean nó ép SAI
 * (`Boolean('false') === true`), nên `onlyWithBalance` phải đọc giá trị THÔ từ
 * `obj` trong `@Transform` (khuôn D-03 của `reward-preview.dto.ts`).
 */
export class WalletResetPreviewQueryDto {
  @IsISO8601()
  resetAnchor: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  windowDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  minNewF1?: number;

  @IsOptional()
  @IsEnum(WalletResetF1Mode)
  f1Mode?: WalletResetF1Mode;

  @IsOptional()
  @IsEnum(WalletResetCombine)
  combine?: WalletResetCombine;

  @IsOptional()
  @IsEnum(WalletResetBuyGate)
  buyGate?: WalletResetBuyGate;

  @IsOptional()
  // Đọc giá trị THÔ từ `obj` chứ KHÔNG dùng `value`: ValidationPipe toàn cục bật
  // `enableImplicitConversion`, nên chuỗi "false" đã bị đóng hộp thành boolean
  // `true` TRƯỚC khi `@Transform` chạy — đọc `value` không cứu lại được nữa.
  // Trả `undefined` khi vắng mặt để `@IsOptional()` bỏ qua và service áp mặc định.
  @Transform(({ obj }: { obj: Record<string, unknown> }) => {
    const raw = obj?.onlyWithBalance;
    if (raw === undefined || raw === null || raw === '') return undefined;
    if (raw === true || raw === 'true' || raw === '1') return true;
    if (raw === false || raw === 'false' || raw === '0') return false;
    return raw;
  })
  @IsBoolean()
  onlyWithBalance?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

/**
 * Bộ tham số đã CHUẨN HOÁ của một lần chạy, phản chiếu nguyên văn lên JSON và
 * lên sheet "Tham số" của file Excel. Mọi mốc thời gian là chuỗi ISO.
 */
export interface WalletResetPreviewParams {
  /** Mốc ngày reset do người vận hành nhập. */
  resetAnchor: string;
  /** Biên dưới cửa sổ = resetAnchor − windowDays (bao gồm). */
  windowStart: string;
  /** Biên trên cửa sổ = resetAnchor (KHÔNG bao gồm). */
  windowEnd: string;
  /** `min(resetAnchor, now)` — thực tế dữ liệu chỉ có tới đây. */
  measuredThrough: string;
  /** Số ngày TRỌN VẸN giữa measuredThrough và resetAnchor; 0 khi mốc ở quá khứ. */
  futureDays: number;
  windowDays: number;
  minNewF1: number;
  f1Mode: WalletResetF1Mode;
  combine: WalletResetCombine;
  buyGate: WalletResetBuyGate;
  onlyWithBalance: boolean;
}

/** Tổng hợp toàn cohort (KHÔNG phụ thuộc phân trang). */
export interface WalletResetPreviewTotals {
  rowCount: number;
  trainingTotalVnd: number;
  commissionResettableATotal: number;
  commissionResettableBTotal: number;
  blockingWithdrawalCount: number;
  groupBuyFlagCount: number;
}

/**
 * Một dòng xem trước. Tên field là HỢP ĐỒNG với bảng phía acta-admin — đổi tên
 * là vỡ bảng, đừng sửa mà không sửa cả hai đầu.
 */
export interface WalletResetPreviewRow {
  userId: string;
  referenceId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  /** ISO — `users.createdAt`. */
  joinedAt: string;
  /** Số đơn hợp lệ trong cửa sổ theo cổng `buyGate`. */
  boughtCount: number;
  /** Số F1 trực tiếp `active` được TẠO trong cửa sổ. */
  newF1Count: number;
  /** Tổng F1 trực tiếp `active` (không cửa sổ). */
  totalActiveF1Count: number;
  /** `training_wallets.balanceVnd`. */
  trainingBalanceVnd: number;
  /** `training_wallets.frozenVnd` — tiền đã chuyển sang mục đang giữ vì có lệnh rút. */
  trainingFrozenVnd: number;
  /** `affiliate_wallets.availableBalance` — chỉ để hiển thị. */
  commissionBalance: number;
  /** Σ `personal_commissions.commissionAmount` (status=created, chưa xoá mềm). */
  exemptPersonalCommission: number;
  /** Σ `affiliate_commissions.commissionAmount` mức F7 (Thù lao kho vận), status=calculated. */
  exemptF7: number;
  /** Σ `shareholder_referral_rewards.amount` (Thù lao giới thiệu cổ đông) — miễn trừ từ 2026-09. */
  exemptShareholderReferral: number;
  /** Σ mức F6 (Thù lao tư vấn), status=calculated — HIỆN KHÔNG được miễn trừ. */
  consultingF6: number;
  /** `affiliate_wallets.settledCommissionTotal` — rãnh đã tất toán sớm. */
  settledRail: number;
  /** Kịch bản A (cơ chế đang chạy): miễn thù lao cá nhân + F7 + thù lao giới thiệu cổ đông. */
  commissionResettableA: number;
  /** Kịch bản B (giả định): miễn thêm F6. */
  commissionResettableB: number;
  /** `trainingBalanceVnd + commissionResettableA`. */
  totalImpactA: number;
  /** ISO hoặc null khi MỌI nguồn hoạt động đều rỗng. KHÔNG bao giờ là số canh chừng. */
  lastActiveAt: string | null;
  /** Số ngày (VN) từ lần cuối hoạt động tới `measuredThrough`; null khi không rõ. */
  daysInactive: number | null;
  hasBlockingWithdrawal: boolean;
  joinedGroupBuyInWindow: boolean;
  commissionWalletUpdatedAt: string | null;
}

/** Thân JSON của `GET /admin/wallet-reset-preview`. */
export interface WalletResetPreviewResponse {
  params: WalletResetPreviewParams;
  totals: WalletResetPreviewTotals;
  page: number;
  limit: number;
  /** LÁT CẮT theo trang — `totals.rowCount` mới là tổng toàn cohort. */
  rows: WalletResetPreviewRow[];
}

/** Toàn bộ cohort chưa phân trang — đầu vào của cả JSON lẫn trình dựng Excel. */
export interface WalletResetPreviewDataset {
  params: WalletResetPreviewParams;
  totals: WalletResetPreviewTotals;
  rows: WalletResetPreviewRow[];
}
