import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/services/prisma.service';
import { startOfVietnamDay } from '../technical-activities/technical-activity.helpers';
import {
  WALLET_RESET_PREVIEW_DEFAULTS,
  WalletResetBuyGate,
  WalletResetCombine,
  WalletResetF1Mode,
  WalletResetPreviewDataset,
  WalletResetPreviewParams,
  WalletResetPreviewQueryDto,
  WalletResetPreviewResponse,
  WalletResetPreviewRow,
  WalletResetPreviewTotals,
} from './dto/wallet-reset-preview.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Trần số dòng phòng thủ cho một lần rà soát. Truy vấn chạy `LIMIT max + 1`; vượt
 * trần thì NÉM LỖI (tiếng Việt, nói rõ con số thật) chứ TUYỆT ĐỐI không cắt bớt
 * âm thầm — một bản xem trước bị cắt lặng lẽ sẽ khiến người vận hành tưởng danh
 * sách đã đủ và reset thiếu người.
 */
export const WALLET_RESET_PREVIEW_MAX_ROWS = 20000;

/** Kiểu số mà driver có thể trả về cho cột `numeric` (Decimal | number | string). */
type NumericLike = Prisma.Decimal | number | string | null;

/** Kiểu mốc thời gian mà driver có thể trả về cho cột `timestamp`. */
type DateLike = Date | string | null;

/** Một dòng THÔ của lượt A (cohort + số liệu tiền). Tên cột khớp SQL bên dưới. */
interface CohortRawRow {
  id: string;
  referenceId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  createdAt: DateLike;
  bought_count: number;
  new_f1_count: number;
  total_active_f1_count: number;
  training_balance: number;
  training_frozen: number;
  commission_balance: NumericLike;
  exempt_pc: NumericLike;
  exempt_f7: NumericLike;
  exempt_srr: NumericLike;
  consulting_f6: NumericLike;
  settled_rail: NumericLike;
  commission_wallet_updated_at: DateLike;
  resettable_a: NumericLike;
  resettable_b: NumericLike;
  has_blocking_withdrawal: boolean;
  joined_group_buy: boolean;
}

/** Một dòng THÔ của lượt B (mốc hoạt động cuối cùng). */
interface LastActiveRawRow {
  uid: string;
  last_active_at: DateLike;
}

/**
 * Đọc `numeric`/`Decimal` về `number`. Driver có thể trả `Prisma.Decimal`, số,
 * hoặc chuỗi tuỳ đường đi — xử lý cả ba, KHÔNG bao giờ trả `NaN` ra ngoài (§1).
 */
function toNumber(value: NumericLike): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const fromDecimal = value.toNumber();
  return Number.isFinite(fromDecimal) ? fromDecimal : 0;
}

/**
 * Đọc mốc thời gian THÔ về `Date`. Prisma trả `Date` cho cột `timestamp`, nhưng
 * chuỗi vẫn lọt qua được ở một số đường đi driver — nhận cả hai thay vì gọi
 * thẳng `.toISOString()` trên thứ có thể là chuỗi rồi vỡ lúc chạy.
 */
function toDate(value: DateLike | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Rà soát CHỈ ĐỌC: "ai sẽ bị chính sách reset ví rèn luyện + ví hoa hồng bắt".
 *
 * ⚠ KHÔNG GHI GÌ HẾT. Không đụng ví, không gọi `syncUserWallet` (đó là lệnh
 * GHI), không mở `$transaction`. Toàn bộ service là SELECT thuần.
 *
 * Hai lượt truy vấn thô:
 *   - Lượt A dựng cohort + mọi con số tiền trong MỘT câu lệnh (các CTE gộp sẵn
 *     theo người, tránh N+1 trên 20k dòng).
 *   - Lượt B chỉ đo `lastActiveAt`, PHẠM VI GÓI GỌN trong đúng danh sách id của
 *     lượt A, truyền id bằng MỘT tham số mảng (`= ANY($1::text[])`) — không bao
 *     giờ `IN (...)` với mỗi người một bind.
 *
 * §8: mọi tên bảng là tên `@@map` và mọi tên cột là tên cột THẬT.
 * §21: mọi giá trị động là bound param `Prisma.sql`; các literal enum được ghim
 * CỨNG trong văn bản SQL (rẽ nhánh ở TypeScript giữa các mảnh dựng sẵn), nên
 * KHÔNG có chuỗi nào của caller lọt vào SQL.
 */
@Injectable()
export class WalletResetPreviewService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tuyến JSON — cắt lát theo trang, `totals` vẫn tính trên TOÀN cohort. */
  async preview(
    query: WalletResetPreviewQueryDto,
  ): Promise<WalletResetPreviewResponse> {
    const dataset = await this.collect(query);

    const page = query.page ?? WALLET_RESET_PREVIEW_DEFAULTS.page;
    const limit = query.limit ?? WALLET_RESET_PREVIEW_DEFAULTS.limit;
    const start = (page - 1) * limit;

    return {
      params: dataset.params,
      totals: dataset.totals,
      page,
      limit,
      rows: dataset.rows.slice(start, start + limit),
    };
  }

  /**
   * Toàn bộ cohort (KHÔNG phân trang) — dùng cho bản xuất Excel và là lõi chung
   * của tuyến JSON.
   */
  async collect(
    query: WalletResetPreviewQueryDto,
  ): Promise<WalletResetPreviewDataset> {
    const params = this.resolveParams(query);

    const anchor = new Date(params.resetAnchor);
    const windowStart = new Date(params.windowStart);
    const measuredThrough = new Date(params.measuredThrough);

    const rawRows = await this.queryCohort(params, windowStart, anchor);

    if (rawRows.length > WALLET_RESET_PREVIEW_MAX_ROWS) {
      throw new BadRequestException(
        `Bộ lọc hiện tại khớp HƠN ${WALLET_RESET_PREVIEW_MAX_ROWS.toLocaleString('vi-VN')} người ` +
          `(đã đọc tới ${rawRows.length.toLocaleString('vi-VN')} dòng thì dừng). ` +
          'Bản xem trước không cắt bớt âm thầm để tránh reset thiếu người. ' +
          'Hãy thu hẹp bộ lọc: rút ngắn số ngày cửa sổ, hạ ngưỡng F1, đổi ghép điều kiện sang "and", ' +
          'hoặc bật "chỉ người còn tiền".',
      );
    }

    const lastActiveById = await this.queryLastActive(
      rawRows.map((row) => row.id),
    );

    const rows = rawRows.map((raw) =>
      this.mapRow(raw, lastActiveById.get(raw.id) ?? null, measuredThrough),
    );

    return { params, totals: this.buildTotals(rows), rows };
  }

  /**
   * Dựng ĐÚNG MỘT dòng cho người mang địa chỉ email cho trước, dùng nguyên bộ tham số và nguyên
   * phép tính của bản xem trước.
   *
   * Đường gọi duy nhất là lượt gửi thử: lá thư mẫu phải mang số liệu THẬT chạy qua đúng pipeline,
   * chứ không phải số cố định viết tay — số viết tay không chứng minh được gì về đường tính tiền
   * và sẽ lặng lẽ đúng mãi kể cả khi pipeline hỏng.
   *
   * Trả `null` khi không có người nào đang hoạt động mang địa chỉ đó.
   */
  async collectSingleByEmail(
    query: WalletResetPreviewQueryDto,
    email: string,
  ): Promise<{
    params: WalletResetPreviewParams;
    row: WalletResetPreviewRow;
  } | null> {
    const params = this.resolveParams(query);

    const anchor = new Date(params.resetAnchor);
    const windowStart = new Date(params.windowStart);
    const measuredThrough = new Date(params.measuredThrough);

    const rawRows = await this.queryCohort(params, windowStart, anchor, email);
    const raw = rawRows[0];
    if (!raw) return null;

    const lastActiveById = await this.queryLastActive([raw.id]);
    const row = this.mapRow(
      raw,
      lastActiveById.get(raw.id) ?? null,
      measuredThrough,
    );

    return { params, row };
  }

  // ==========================================================================
  // Chuẩn hoá tham số
  // ==========================================================================

  /**
   * Áp mặc định + dựng cửa sổ nửa mở [windowStart, resetAnchor).
   *
   * `measuredThrough = min(resetAnchor, now)`: mốc reset ĐƯỢC PHÉP nằm ở tương
   * lai, khi đó dữ liệu chỉ tồn tại tới hiện tại nên con số là DỰ BÁO.
   * `futureDays` là số ngày trọn vẹn còn chưa xảy ra (0 khi mốc ở quá khứ).
   */
  private resolveParams(
    query: WalletResetPreviewQueryDto,
  ): WalletResetPreviewParams {
    const anchor = new Date(query.resetAnchor);
    if (Number.isNaN(anchor.getTime())) {
      throw new BadRequestException(
        'Mốc ngày reset không hợp lệ — cần một chuỗi thời gian ISO 8601.',
      );
    }

    const windowDays =
      query.windowDays ?? WALLET_RESET_PREVIEW_DEFAULTS.windowDays;
    const windowStart = new Date(anchor.getTime() - windowDays * DAY_MS);

    const now = new Date();
    const measuredThrough =
      anchor.getTime() < now.getTime() ? anchor : now;
    const futureDays = Math.max(
      0,
      Math.floor((anchor.getTime() - measuredThrough.getTime()) / DAY_MS),
    );

    return {
      resetAnchor: anchor.toISOString(),
      windowStart: windowStart.toISOString(),
      windowEnd: anchor.toISOString(),
      measuredThrough: measuredThrough.toISOString(),
      futureDays,
      windowDays,
      minNewF1: query.minNewF1 ?? WALLET_RESET_PREVIEW_DEFAULTS.minNewF1,
      f1Mode: query.f1Mode ?? WALLET_RESET_PREVIEW_DEFAULTS.f1Mode,
      combine: query.combine ?? WALLET_RESET_PREVIEW_DEFAULTS.combine,
      buyGate: query.buyGate ?? WALLET_RESET_PREVIEW_DEFAULTS.buyGate,
      onlyWithBalance:
        query.onlyWithBalance ?? WALLET_RESET_PREVIEW_DEFAULTS.onlyWithBalance,
    };
  }

  // ==========================================================================
  // Lượt A — cohort + số liệu tiền (MỘT câu lệnh)
  // ==========================================================================

  private async queryCohort(
    params: WalletResetPreviewParams,
    windowStart: Date,
    anchor: Date,
    /**
     * Khi có giá trị: lấy ĐÚNG người mang địa chỉ này, BỎ QUA hai vị từ sàng lọc
     * (`combine` và `onlyWithBalance`). Mọi con số tiền vẫn tính y hệt.
     *
     * ⚠ Bỏ qua vị từ sàng lọc là CHỦ Ý, không phải sơ suất: đường gọi duy nhất là lượt gửi thử,
     * và nó phải dựng được lá thư kể cả khi tài khoản mẫu đang ĐẠT điều kiện (tức không nằm
     * trong cohort). Nếu giữ vị từ, nút gửi thử sẽ hỏng đúng vào lúc tài khoản mẫu hoạt động
     * bình thường — một chế độ hỏng vừa khó hiểu vừa không báo gì.
     */
    targetEmail?: string,
  ): Promise<CohortRawRow[]> {
    // ── Cổng "đã mua hàng" ───────────────────────────────────────────────────
    // Vị từ `vat_completed` được CHÉP NGUYÊN VĂN từ
    // `src/salaries/services/commitment-metrics.service.ts:203-210` (vị từ
    // đủ-điều-kiện đơn DÙNG CHUNG của CTV Mở Rộng). Cửa sổ chạy trên cột BẤT BIẾN
    // `order_vat.completedAt` (D-107-23) — KHÔNG dùng `updatedAt` (mutable) — và
    // khai thác đúng `@@index([status, completedAt])`.
    const buyGateFragment =
      params.buyGate === WalletResetBuyGate.order_completed
        ? Prisma.sql`
            SELECT c."userId" AS uid, COUNT(DISTINCT o."id")::int AS n
            FROM   "orders" o
            JOIN   "customers" c ON c."id" = o."customerId"
            WHERE  o."status" IN ('completed', 'temp_completed')
              AND  o."createdAt" >= ${windowStart}
              AND  o."createdAt" <  ${anchor}
              AND  c."userId" IS NOT NULL
            GROUP  BY c."userId"
          `
        : Prisma.sql`
            SELECT c."userId" AS uid, COUNT(DISTINCT o."id")::int AS n
            FROM   "order_vat" ov
            JOIN   "orders" o    ON o."id" = ov."orderId"
            JOIN   "customers" c ON c."id" = o."customerId"
            WHERE  ov."status" = 'completed'
              AND  ov."completedAt" >= ${windowStart}
              AND  ov."completedAt" <  ${anchor}
              AND  o."status" NOT IN ('cancelled', 'draft')
              AND  c."userId" IS NOT NULL
            GROUP  BY c."userId"
          `;

    // ── Ghép hai điều kiện trượt ────────────────────────────────────────────
    // `f1Mode` chỉ chọn giữa hai MẢNH SQL dựng sẵn — chuỗi của caller không bao
    // giờ thành văn bản SQL; riêng ngưỡng `minNewF1` là bound param.
    const f1CountExpr =
      params.f1Mode === WalletResetF1Mode.total_active
        ? Prisma.sql`COALESCE(tf.n, 0)`
        : Prisma.sql`COALESCE(nf.n, 0)`;
    const failBuy = Prisma.sql`COALESCE(b.n, 0) = 0`;
    const failF1 = Prisma.sql`${f1CountExpr} < ${params.minNewF1}`;
    const combineFragment =
      params.combine === WalletResetCombine.or
        ? Prisma.sql`(${failBuy} OR ${failF1})`
        : Prisma.sql`(${failBuy} AND ${failF1})`;

    // Biểu thức kịch bản A phải LẶP LẠI nguyên văn ở WHERE: PostgreSQL không cho
    // tham chiếu alias của SELECT trong WHERE.
    // Khớp từng số hạng với DEBIT của `WalletResetService.resetCommissionWallet`:
    // trừ Thù lao cá nhân, Thù lao kho vận (F7) VÀ Thù lao giới thiệu cổ đông
    // (miễn reset 2026-09). Thiếu số hạng thứ ba là thư cảnh báo doạ reset đúng
    // khoản thưởng mà cơ chế thật không đụng tới.
    const resettableAExpr = Prisma.sql`
      GREATEST(
        0,
        COALESCE(aw."availableBalance", 0)
          - COALESCE(pc.s, 0)
          - COALESCE(f7.s, 0)
          - COALESCE(srr.s, 0)
          - COALESCE(aw."settledCommissionTotal", 0)
      )`;

    const onlyWithBalanceFragment = params.onlyWithBalance
      ? Prisma.sql`(COALESCE(tw."balanceVnd", 0) > 0 OR ${resettableAExpr} > 0)`
      : Prisma.sql`TRUE`;

    // Hai chế độ chọn người, dùng CHUNG toàn bộ phần tính toán phía trên.
    const selectionFragment = targetEmail
      ? Prisma.sql`u."email" = ${targetEmail}`
      : Prisma.sql`${combineFragment} AND ${onlyWithBalanceFragment}`;

    // `status = 'active'` là một vị từ SÀNG LỌC COHORT, không phải điều kiện để các con số tiền
    // có nghĩa — ví và hoa hồng vẫn tính được cho tài khoản đang ở bước KYC. Lượt tra một người
    // (gửi thử) vì thế bỏ qua nó cùng lý do với hai vị từ kia; `deletedAt IS NULL` thì GIỮ, vì
    // dựng thư từ một tài khoản đã xoá là vô nghĩa.
    const statusFragment = targetEmail
      ? Prisma.sql`TRUE`
      : Prisma.sql`u."status" = 'active'`;

    const sql = Prisma.sql`
      WITH bought AS (${buyGateFragment}),
      -- F1 trực tiếp (depth = 1) MỚI trong cửa sổ. Closure bắc cầu qua
      -- users.referenceId ở CẢ HAI đầu: ancestorId/descendantId giữ referenceId,
      -- KHÔNG phải users.id.
      newf1 AS (
        SELECT anc."id" AS uid, COUNT(DISTINCT du."id")::int AS n
        FROM   "users" du
        JOIN   "user_referral_closures" uc
               ON uc."descendantId" = du."referenceId" AND uc."depth" = 1
        JOIN   "users" anc ON anc."referenceId" = uc."ancestorId"
        WHERE  du."createdAt" >= ${windowStart}
          AND  du."createdAt" <  ${anchor}
          AND  du."status" = 'active'
          AND  du."deletedAt" IS NULL
        GROUP  BY anc."id"
      ),
      -- Tổng F1 trực tiếp đang hoạt động — KHÔNG có cửa sổ nào cả.
      totf1 AS (
        SELECT anc."id" AS uid, COUNT(DISTINCT du."id")::int AS n
        FROM   "user_referral_closures" uc
        JOIN   "users" du  ON du."referenceId"  = uc."descendantId"
        JOIN   "users" anc ON anc."referenceId" = uc."ancestorId"
        WHERE  uc."depth" = 1
          AND  du."status" = 'active'
          AND  du."deletedAt" IS NULL
        GROUP  BY anc."id"
      ),
      -- ⚠ personal_commissions khoá theo "userId" — KHÔNG phải "beneficiaryId".
      -- Nhầm cột ở đây làm phần miễn trừ về 0 và THỔI PHỒNG mọi con số phía sau.
      -- commissionAmount NULLABLE nên bắt buộc COALESCE.
      pc AS (
        SELECT "userId" AS uid, COALESCE(SUM("commissionAmount"), 0)::numeric AS s
        FROM   "personal_commissions"
        WHERE  "status" = 'created' AND "deletedAt" IS NULL
        GROUP  BY "userId"
      ),
      -- F7 = Thù lao kho vận (được miễn trừ ở cả hai kịch bản).
      f7 AS (
        SELECT "beneficiaryId" AS uid, COALESCE(SUM("commissionAmount"), 0)::numeric AS s
        FROM   "affiliate_commissions"
        WHERE  "commissionLevel" = 'F7' AND "status" = 'calculated'
        GROUP  BY "beneficiaryId"
      ),
      -- Thù lao giới thiệu cổ đông (miễn trừ ở cả hai kịch bản, từ 2026-09).
      -- Ledger RIÊNG, không có trạng thái: Σ mọi dòng của người nhận chính là số
      -- hạng cộng của availableBalance. Khoá theo "beneficiaryId".
      srr AS (
        SELECT "beneficiaryId" AS uid, COALESCE(SUM("amount"), 0)::numeric AS s
        FROM   "shareholder_referral_rewards"
        GROUP  BY "beneficiaryId"
      ),
      -- F6 = Thù lao tư vấn. HIỆN KHÔNG nằm trong miễn trừ của cơ chế đang chạy;
      -- chỉ kịch bản B (giả định) mới trừ ra.
      f6 AS (
        SELECT "beneficiaryId" AS uid, COALESCE(SUM("commissionAmount"), 0)::numeric AS s
        FROM   "affiliate_commissions"
        WHERE  "commissionLevel" = 'F6' AND "status" = 'calculated'
        GROUP  BY "beneficiaryId"
      ),
      -- group_buy_members KHÔNG có cột "acceptedAt" (đã soi schema). Mốc đúng là
      -- "respondedAt" — đóng dấu khi CHẤP NHẬN hoặc từ chối — vì CTE này đã lọc
      -- status='accepted' nên nó chính là lúc người ta bấm đồng ý. "createdAt"
      -- (lúc được MỜI) sẽ bỏ sót người được mời trước cửa sổ nhưng đồng ý (và
      -- xuống tiền) TRONG cửa sổ — đúng nhóm mà cột cảnh báo này sinh ra để bắt.
      -- COALESCE về "createdAt" cho các dòng cũ chưa có dấu respondedAt.
      gb AS (
        SELECT "userId" AS uid, COUNT(*)::int AS n
        FROM   "group_buy_members"
        WHERE  "status" = 'accepted'
          AND  COALESCE("respondedAt", "createdAt") >= ${windowStart}
          AND  COALESCE("respondedAt", "createdAt") <  ${anchor}
        GROUP  BY "userId"
      )
      SELECT u."id",
             u."referenceId",
             u."fullName",
             u."phoneNumber",
             u."email",
             u."createdAt",
             COALESCE(b.n, 0)  AS bought_count,
             COALESCE(nf.n, 0) AS new_f1_count,
             COALESCE(tf.n, 0) AS total_active_f1_count,
             COALESCE(tw."balanceVnd", 0)::int AS training_balance,
             COALESCE(tw."frozenVnd", 0)::int  AS training_frozen,
             COALESCE(aw."availableBalance", 0)::numeric AS commission_balance,
             COALESCE(pc.s, 0) AS exempt_pc,
             COALESCE(f7.s, 0) AS exempt_f7,
             COALESCE(srr.s, 0) AS exempt_srr,
             COALESCE(f6.s, 0) AS consulting_f6,
             COALESCE(aw."settledCommissionTotal", 0)::numeric AS settled_rail,
             aw."updatedAt" AS commission_wallet_updated_at,
             ${resettableAExpr}::numeric AS resettable_a,
             GREATEST(
               0,
               COALESCE(aw."availableBalance", 0)
                 - COALESCE(pc.s, 0)
                 - COALESCE(f7.s, 0)
                 - COALESCE(srr.s, 0)
                 - COALESCE(f6.s, 0)
                 - COALESCE(aw."settledCommissionTotal", 0)
             )::numeric AS resettable_b,
             (bw."id" IS NOT NULL OR tww."id" IS NOT NULL) AS has_blocking_withdrawal,
             (COALESCE(gb.n, 0) > 0) AS joined_group_buy
      FROM "users" u
      LEFT JOIN bought b  ON b.uid  = u."id"
      LEFT JOIN newf1  nf ON nf.uid = u."id"
      LEFT JOIN totf1  tf ON tf.uid = u."id"
      LEFT JOIN "training_wallets"  tw ON tw."userId" = u."id"
      LEFT JOIN "affiliate_wallets" aw ON aw."userId" = u."id"
      LEFT JOIN pc ON pc.uid = u."id"
      LEFT JOIN f7 ON f7.uid = u."id"
      LEFT JOIN srr ON srr.uid = u."id"
      LEFT JOIN f6 ON f6.uid = u."id"
      LEFT JOIN gb ON gb.uid = u."id"
      -- Lệnh rút đang treo ở HAI sổ khác nhau: ví hoa hồng (affiliate) và ví rèn
      -- luyện. Bút toán điều chỉnh hệ thống KHÔNG tính là lệnh rút của người dùng.
      LEFT JOIN LATERAL (
        SELECT w."id"
        FROM   "affiliate_withdrawals" w
        WHERE  w."walletId" = aw."id"
          AND  w."status" IN ('pending', 'approved')
          AND  w."withdrawalType" <> 'system_adjustment'
        LIMIT  1
      ) bw ON TRUE
      LEFT JOIN LATERAL (
        SELECT r."id"
        FROM   "training_withdrawal_requests" r
        WHERE  r."userId" = u."id"
          AND  r."status" IN ('pending', 'approved')
        LIMIT  1
      ) tww ON TRUE
      WHERE u."deletedAt" IS NULL
        AND ${statusFragment}
        AND ${selectionFragment}
      ORDER BY resettable_a DESC, training_balance DESC, u."createdAt" ASC
      LIMIT ${WALLET_RESET_PREVIEW_MAX_ROWS + 1}
    `;

    return this.prisma.$queryRaw<CohortRawRow[]>(sql);
  }

  // ==========================================================================
  // Lượt B — mốc hoạt động cuối cùng, GÓI GỌN trong cohort
  // ==========================================================================

  /**
   * `GREATEST` của các nguồn hoạt động. PostgreSQL BỎ QUA NULL trong `GREATEST`,
   * nên kết quả chỉ NULL khi MỌI nguồn đều rỗng — đúng ngữ nghĩa "không rõ".
   * KHÔNG bao giờ trả số canh chừng kiểu 999.
   *
   * Bảy nguồn dưới đây đều đã đối chiếu tên `@@map` + tên cột THẬT với
   * `prisma/schema/*.prisma` (§8):
   *   - `training_wallet_txns."userId"`            (training-economy.prisma)
   *   - `orders."createdAt"` qua `customers."userId"` (order/customer.prisma)
   *   - `posts."userId"`, `comments."userId"`, `reactions."userId"` (social.prisma)
   *   - `activity_point_transactions."userId"`     (gamification.prisma)
   *   - `activity_logs."uploaderId"`               (activity-log.prisma — cột KHÔNG
   *     tên là `userId`)
   *
   * ĐÃ LOẠI (không dùng): `users.lastSeenAt` — cột CHẾT, không có chỗ nào ghi,
   * đọc vào chỉ tạo cảm giác chính xác giả.
   */
  private async queryLastActive(
    userIds: string[],
  ): Promise<Map<string, Date | null>> {
    const result = new Map<string, Date | null>();
    // Mảng rỗng → không chạy SQL (và cũng không có gì để đo).
    if (userIds.length === 0) return result;

    const rows = await this.prisma.$queryRaw<LastActiveRawRow[]>`
      SELECT u."id" AS uid,
             GREATEST(
               s_tx.ts, s_ord.ts, s_post.ts, s_cmt.ts,
               s_react.ts, s_point.ts, s_log.ts
             ) AS last_active_at
      FROM "users" u
      LEFT JOIN LATERAL (
        SELECT MAX(t."createdAt") AS ts
        FROM   "training_wallet_txns" t
        WHERE  t."userId" = u."id"
      ) s_tx ON TRUE
      LEFT JOIN LATERAL (
        SELECT MAX(o."createdAt") AS ts
        FROM   "orders" o
        JOIN   "customers" c ON c."id" = o."customerId"
        WHERE  c."userId" = u."id"
      ) s_ord ON TRUE
      LEFT JOIN LATERAL (
        SELECT MAX(p."createdAt") AS ts
        FROM   "posts" p
        WHERE  p."userId" = u."id"
      ) s_post ON TRUE
      LEFT JOIN LATERAL (
        SELECT MAX(cm."createdAt") AS ts
        FROM   "comments" cm
        WHERE  cm."userId" = u."id"
      ) s_cmt ON TRUE
      LEFT JOIN LATERAL (
        SELECT MAX(rc."createdAt") AS ts
        FROM   "reactions" rc
        WHERE  rc."userId" = u."id"
      ) s_react ON TRUE
      LEFT JOIN LATERAL (
        SELECT MAX(ap."createdAt") AS ts
        FROM   "activity_point_transactions" ap
        WHERE  ap."userId" = u."id"
      ) s_point ON TRUE
      LEFT JOIN LATERAL (
        SELECT MAX(al."createdAt") AS ts
        FROM   "activity_logs" al
        WHERE  al."uploaderId" = u."id"
      ) s_log ON TRUE
      WHERE u."id" = ANY(${userIds}::text[])
    `;

    for (const row of rows) result.set(row.uid, toDate(row.last_active_at));
    return result;
  }

  // ==========================================================================
  // Ghép A + B → DTO phẳng (§1 — không trả thẳng đối tượng Prisma)
  // ==========================================================================

  private mapRow(
    raw: CohortRawRow,
    lastActiveAt: Date | null,
    measuredThrough: Date,
  ): WalletResetPreviewRow {
    const trainingBalanceVnd = Number(raw.training_balance);
    const commissionResettableA = toNumber(raw.resettable_a);
    // `users.createdAt` là NOT NULL nên `toDate` không thể trả null ở đây; `?? ''`
    // chỉ để kiểu trả về khớp hợp đồng (`joinedAt: string`), không phải hành vi thật.
    const joinedAt = toDate(raw.createdAt);
    const walletUpdatedAt = toDate(raw.commission_wallet_updated_at);

    return {
      userId: raw.id,
      referenceId: raw.referenceId,
      fullName: raw.fullName,
      phoneNumber: raw.phoneNumber,
      email: raw.email,
      joinedAt: joinedAt ? joinedAt.toISOString() : '',
      boughtCount: Number(raw.bought_count),
      newF1Count: Number(raw.new_f1_count),
      totalActiveF1Count: Number(raw.total_active_f1_count),
      trainingBalanceVnd,
      trainingFrozenVnd: Number(raw.training_frozen),
      commissionBalance: toNumber(raw.commission_balance),
      exemptPersonalCommission: toNumber(raw.exempt_pc),
      exemptF7: toNumber(raw.exempt_f7),
      exemptShareholderReferral: toNumber(raw.exempt_srr),
      consultingF6: toNumber(raw.consulting_f6),
      settledRail: toNumber(raw.settled_rail),
      commissionResettableA,
      commissionResettableB: toNumber(raw.resettable_b),
      totalImpactA: trainingBalanceVnd + commissionResettableA,
      lastActiveAt: lastActiveAt ? lastActiveAt.toISOString() : null,
      daysInactive: this.daysInactive(lastActiveAt, measuredThrough),
      hasBlockingWithdrawal: raw.has_blocking_withdrawal === true,
      joinedGroupBuyInWindow: raw.joined_group_buy === true,
      commissionWalletUpdatedAt: walletUpdatedAt
        ? walletUpdatedAt.toISOString()
        : null,
    };
  }

  /**
   * Số ngày không hoạt động, đếm theo BIÊN NGÀY VIỆT NAM (`startOfVietnamDay`) —
   * người vận hành đọc theo lịch VN, đếm bằng ms thô sẽ lệch một ngày quanh nửa
   * đêm. Trả `null` khi không có mốc hoạt động nào (KHÔNG quy về 0: "không rõ"
   * khác hẳn "vừa hoạt động hôm nay").
   */
  private daysInactive(
    lastActiveAt: Date | null,
    measuredThrough: Date,
  ): number | null {
    if (!lastActiveAt) return null;
    const from = startOfVietnamDay(lastActiveAt).getTime();
    const to = startOfVietnamDay(measuredThrough).getTime();
    return Math.max(0, Math.round((to - from) / DAY_MS));
  }

  /** Tổng hợp trên TOÀN cohort — không bao giờ tính trên lát cắt phân trang. */
  private buildTotals(
    rows: WalletResetPreviewRow[],
  ): WalletResetPreviewTotals {
    return {
      rowCount: rows.length,
      trainingTotalVnd: rows.reduce((s, r) => s + r.trainingBalanceVnd, 0),
      commissionResettableATotal: rows.reduce(
        (s, r) => s + r.commissionResettableA,
        0,
      ),
      commissionResettableBTotal: rows.reduce(
        (s, r) => s + r.commissionResettableB,
        0,
      ),
      blockingWithdrawalCount: rows.filter((r) => r.hasBlockingWithdrawal)
        .length,
      groupBuyFlagCount: rows.filter((r) => r.joinedGroupBuyInWindow).length,
    };
  }
}
