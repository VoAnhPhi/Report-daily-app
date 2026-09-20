/**
 * Phân loại + điều hướng thông báo XUYÊN ỨNG DỤNG (cross-repo).
 *
 * Bối cảnh: một `Notification` có thể sinh ra từ bất kỳ module nào của acta-api và
 * được đọc trong bất kỳ frontend nào (social / e-commerce / affiliate / admin).
 * Backend lưu `linkUrl` phần lớn ở dạng ĐƯỜNG DẪN TƯƠNG ĐỐI, còn frontend lại gọi
 * thẳng `router.push(linkUrl)` — nên mọi liên kết đều rơi vào tên miền đang đứng.
 * Ví dụ `'/salaries/commitment?q=vn-15480'` (đường của acta-admin) mở trên
 * `e-commerce.acta.vn` sẽ ra 404.
 *
 * File này là NGUỒN SỰ THẬT DUY NHẤT cho:
 *   1. mỗi `action` thuộc miền nào (để tô màu / gắn nhãn / chọn icon),
 *   2. mỗi `linkUrl` phải mở ở tên miền nào,
 *   3. host tương ứng theo môi trường (prod ↔ dev).
 *
 * ⚠ File này được NHÂN BẢN BYTE-IDENTICAL sang acta-social, acta-affiliate và
 * acta-admin. Sửa ở một repo thì phải chép sang ba repo còn lại trong cùng một
 * lượt, nếu không bốn ứng dụng sẽ điều hướng khác nhau cho cùng một thông báo.
 */

/** Năm miền hiển thị của trung tâm thông báo. */
export type NotificationDomain =
  | 'social'
  | 'shop'
  | 'income'
  | 'admin'
  | 'system';

/** Bốn miền có tên miền riêng (`system` không sở hữu host nào). */
export type NotificationAppDomain = Exclude<NotificationDomain, 'system'>;

/** Tầng môi trường suy ra từ hostname đang chạy. */
export type RuntimeTier = 'prod' | 'dev';

/* ────────────────────────────── HOST ────────────────────────────── */

/**
 * Bảng host cố định. Cố ý KHÔNG phụ thuộc hoàn toàn vào biến môi trường: các
 * file `.env` local chỉ khai `NEXT_PUBLIC_CLIENT_URL`, nên nếu chỉ dựa vào env
 * thì bản dev sẽ rơi về fallback production và đá người dùng sang prod thật.
 */
const DOMAIN_HOSTS: Record<NotificationAppDomain, Record<RuntimeTier, string>> =
  {
    social: { prod: 'https://acta.vn', dev: 'https://dev-social.acta.vn' },
    shop: {
      prod: 'https://e-commerce.acta.vn',
      dev: 'https://dev-e-commerce.acta.vn',
    },
    income: {
      prod: 'https://hoahong.acta.vn',
      dev: 'https://dev-affiliate.acta.vn',
    },
    admin: { prod: 'https://admin.acta.vn', dev: 'https://dev-admin.acta.vn' },
  };

/**
 * Cẩm nang ACTA (`acta-guides`). Không phải nguồn thông báo, nhưng dùng chung bộ
 * phân giải môi trường nên khai ở đây để mọi frontend trỏ về cùng một chỗ.
 */
const GUIDES_HOSTS: Record<RuntimeTier, string> = {
  prod: 'https://guides.acta.vn',
  dev: 'https://dev-guides.acta.vn',
};

/**
 * Ghi đè bằng env khi hạ tầng khai báo tường minh. Phải truy cập
 * `process.env.NEXT_PUBLIC_*` TRỰC TIẾP (không destructure, không index động) để
 * Next.js inline được giá trị lúc build.
 */
const DOMAIN_ENV_OVERRIDE: Record<NotificationAppDomain, string | undefined> = {
  social: process.env.NEXT_PUBLIC_SOCIAL_URL,
  shop: process.env.NEXT_PUBLIC_ECOMMERCE_URL,
  income: process.env.NEXT_PUBLIC_AFFILIATE_URL,
  admin: process.env.NEXT_PUBLIC_ADMIN_URL,
};

const GUIDES_ENV_OVERRIDE = process.env.NEXT_PUBLIC_GUIDES_URL;

/** Mọi host prod/dev đã biết → miền, dùng để phân loại `linkUrl` tuyệt đối. */
const HOST_TO_DOMAIN: ReadonlyArray<readonly [string, NotificationAppDomain]> = [
  ['acta.vn', 'social'],
  ['dev-social.acta.vn', 'social'],
  ['e-commerce.acta.vn', 'shop'],
  ['dev-e-commerce.acta.vn', 'shop'],
  ['hoahong.acta.vn', 'income'],
  ['dev-affiliate.acta.vn', 'income'],
  ['admin.acta.vn', 'admin'],
  ['dev-admin.acta.vn', 'admin'],
];

/**
 * Suy ra tầng môi trường từ hostname đang chạy.
 *
 * Quy ước hạ tầng ACTA: prod là `acta.vn` / `<app>.acta.vn`, dev là
 * `dev-<app>.acta.vn`. Chạy local (`localhost`) coi như dev để liên kết sang app
 * anh em trỏ về hạ tầng dev thay vì production.
 *
 * SSR trả `'prod'`: danh sách thông báo nằm trong Radix `DropdownMenuContent`
 * (chỉ mount khi mở) nên trên thực tế luôn phân giải phía client.
 */
export function detectRuntimeTier(): RuntimeTier {
  if (typeof window === 'undefined') return 'prod';
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')) {
    return 'dev';
  }
  return host.startsWith('dev-') || host.startsWith('dev.') ? 'dev' : 'prod';
}

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

/** Origin của một miền theo môi trường hiện tại (env ghi đè nếu có khai báo). */
export function getDomainOrigin(domain: NotificationAppDomain): string {
  const override = DOMAIN_ENV_OVERRIDE[domain];
  if (override) return stripTrailingSlash(override);
  return DOMAIN_HOSTS[domain][detectRuntimeTier()];
}

/** Origin của Cẩm nang ACTA theo môi trường hiện tại. */
export function getGuidesOrigin(): string {
  if (GUIDES_ENV_OVERRIDE) return stripTrailingSlash(GUIDES_ENV_OVERRIDE);
  return GUIDES_HOSTS[detectRuntimeTier()];
}

/* ─────────────────────── PHÂN LOẠI THEO ACTION ─────────────────────── */

/**
 * `action` → miền, cho những action CHỈ thuộc về một miền duy nhất.
 *
 * ⚠ Khoá là giá trị TRÊN DÂY (snake_case của enum Prisma `NotificationAction`).
 * acta-api không map lại qua ResponseDto nên client nhận đúng chuỗi Prisma.
 *
 * ⚠ Các động từ dùng chung (`approved`, `rejected`, `created`, `updated`,
 * `deleted`, `system_alert`) CỐ Ý không nằm đây: cùng một action được nhiều
 * module dùng cho nhiều miền khác nhau (vd `approved` = duyệt bài viết trên
 * social NHƯNG cũng là duyệt kho trên admin). Chúng được phân giải bằng
 * `linkUrl` ở bước sau.
 */
const ACTION_DOMAIN: Readonly<Record<string, NotificationDomain>> = {
  // ── Cộng đồng ──────────────────────────────────────────────────────
  liked: 'social',
  commented: 'social',
  mentioned: 'social',
  message_replied: 'social',
  shared: 'social',
  followed: 'social',
  unfollowed: 'social',
  viewed: 'social',
  downloaded: 'social',
  published: 'social',
  unpublished: 'social',
  kyc_submitted: 'social',
  kyc_approved: 'social',
  kyc_changing: 'social',
  kyc_changed: 'social',
  // Ví HALF nằm ở acta-social, KHÔNG phải cổng affiliate: giao diện ví
  // (`components/half-wallet/half-wallet-panel.tsx`) được render bên trong
  // trang `/kyc` của acta-social. Xếp nhầm sang 'income' là lỗi UAT bắt được.
  half_wallet_admin_processing: 'social',
  half_wallet_rejected: 'social',
  half_transfer_approved: 'social',
  half_transfer_rejected: 'social',
  half_manual_sent: 'social',
  training_video_completed: 'social',
  training_video_available: 'social',
  training_video_cooldown_ended: 'social',
  task_assigned: 'social',
  task_due_soon: 'social',
  task_overdue: 'social',
  task_points_earned: 'social',
  task_completed: 'social',
  task_status_changed: 'social',
  task_commented: 'social',
  task_deleted: 'social',
  task_restored: 'social',
  // Báo cáo hằng ngày — cùng miền với công việc vì cả hai sống trên màn /tasks.
  // Thiếu tám dòng này thì `resolveDomain` rơi xuống 'system' cho mọi thông báo
  // không có linkUrl, và chuông hiện biểu tượng xám mặc định.
  daily_report_reminder: 'social',
  daily_report_submitted: 'social',
  daily_report_missing: 'social',
  daily_report_reopened: 'social',
  daily_report_help_requested: 'social',
  daily_report_help_acknowledged: 'social',
  daily_report_help_resolved: 'social',
  daily_report_help_cancelled: 'social',
  birthday_reminder: 'social',

  // ── Mua sắm ────────────────────────────────────────────────────────
  rating_replied: 'shop',
  rating_edited: 'shop',
  group_buy_invite_received: 'shop',
  group_buy_accepted: 'shop',
  group_buy_declined: 'shop',
  group_buy_kicked: 'shop',
  group_buy_joined: 'shop',
  gift_recipient_notified: 'shop',
  gift_card_prepared: 'shop',
  gift_delivered_to_recipient: 'shop',

  // ── Thu nhập ───────────────────────────────────────────────────────
  direct_referral_registered: 'income',
  indirect_referral_registered: 'income',
  direct_referral_verified: 'income',
  salary_voucher_created: 'income',
  salary_voucher_accepted: 'income',
  salary_voucher_rejected: 'income',
  salary_voucher_settled: 'income',
  commitment_voucher_created: 'income',
  commitment_voucher_accepted: 'income',
  commitment_voucher_rejected: 'income',
  commitment_voucher_settled: 'income',
  commission_early_settled: 'income',
  commission_early_settle_clawback: 'income',

  // ── Quản trị ───────────────────────────────────────────────────────
  pending_approval: 'admin',
  mstl_eligible_pending: 'admin',
};

/* ──────────────────── PHÂN LOẠI THEO TIỀN TỐ ĐƯỜNG DẪN ──────────────────── */

/**
 * Tiền tố đường dẫn → miền sở hữu. Duyệt theo thứ tự khai báo, tiền tố DÀI đứng
 * trước để `/e-commerce/...` (admin) không bị `/e-...` nào khác nuốt mất.
 *
 * Chỉ liệt kê những tiền tố THỰC SỰ xuất hiện trong `linkUrl` do acta-api sinh
 * ra, cộng các đường lân cận cùng nhóm — cố tình không liệt kê đủ mọi route để
 * tránh đoán sai ở những path trùng tên giữa hai app (vd `/analytics` có ở cả
 * affiliate lẫn admin).
 */
const PATH_PREFIX_DOMAIN: ReadonlyArray<readonly [string, NotificationDomain]> =
  [
    // Quản trị — đặt trước vì nhiều đường admin trùng tiền tố với app khác
    ['/e-commerce/', 'admin'],
    ['/recognized-users', 'admin'],
    ['/salaries/', 'admin'],
    ['/business-forms/', 'admin'],
    ['/withdrawals', 'admin'],
    ['/reconciliation', 'admin'],
    ['/finance/', 'admin'],
    ['/admin/', 'admin'],
    ['/orders/', 'admin'],

    // Thu nhập
    ['/quy-thu-nhap', 'income'],
    ['/income-fund', 'income'],
    ['/tra-cuu-thu-nhap', 'income'],
    ['/personal-commissions', 'income'],
    ['/distribution-history', 'income'],
    ['/withdrawal-history', 'income'],
    ['/babysitter-earnings', 'income'],
    ['/team', 'income'],

    // Mua sắm
    ['/groupBuying', 'shop'],
    ['/group-buy', 'shop'],
    ['/product/', 'shop'],
    ['/products', 'shop'],
    ['/checkout', 'shop'],
    ['/qua-tang', 'shop'],
    ['/cart', 'shop'],
    ['/order/', 'shop'],

    // Cộng đồng
    ['/posts/', 'social'],
    ['/videos', 'social'],
    ['/stories', 'social'],
    ['/gamification', 'social'],
    ['/tasks', 'social'],
    ['/kyc', 'social'],
    ['/forum', 'social'],
    ['/news', 'social'],
    ['/livestream', 'social'],
    ['/tra-cuu-diem-nang-luc', 'social'],
  ];

/**
 * Đường dẫn CHẾT do acta-api sinh ra → đường thật.
 *
 * Hai mục dưới đây là lỗi có thật, đã đối chiếu với cây route của bốn frontend:
 *
 *  - `/half-wallet` (mặc định của `HalfNotificationService`) KHÔNG tồn tại ở bất
 *    kỳ app nào. Giao diện ví HALF của thành viên là `half-wallet-panel` được
 *    render bên trong trang `/kyc` của acta-social.
 *  - `/group-buy/{id}` (`GroupBuyService`) KHÔNG tồn tại; route thật của
 *    acta-e-commerce là `/groupBuying/{id}`.
 *
 * Sửa tận gốc phải làm ở acta-api; bảng này vá phía client để mọi thông báo ĐÃ
 * PHÁT RA từ trước không tiếp tục dẫn tới 404.
 */
const DEAD_PATH_REWRITES: ReadonlyArray<
  readonly [RegExp, (match: RegExpMatchArray) => string]
> = [
  [/^\/half-wallet(?:[/?#].*)?$/, () => '/kyc'],
  [/^\/group-buy\/([^/?#]+)(.*)$/, (m) => `/groupBuying/${m[1]}${m[2] ?? ''}`],
];

/**
 * Sửa những `linkUrl` TUYỆT ĐỐI mà backend gắn NHẦM TÊN MIỀN.
 *
 * Bình thường host tuyệt đối là tín hiệu mạnh nhất và được tin tưởng. Nhưng có
 * trường hợp backend tự sinh sai host, và khi đó tin host là tự nhân bản lỗi:
 *
 *  - `mstl_eligible_pending` gọi `adminDashboardUrl()`, hàm này từng dự phòng về
 *    `FRONTEND_DOMAIN` (= cổng mạng xã hội) khi `FRONTEND_ADMIN_DOMAIN` chưa
 *    khai. Kết quả là `https://acta.vn/recognized-users?userId=…`, trong khi
 *    `/recognized-users` CHỈ tồn tại trên acta-admin. Phát hiện khi chạy bộ phân
 *    loại trên 50 thông báo THẬT của DB dev — 6 bản ghi dính lỗi này.
 *
 * ⚠ Bảng này CỐ Ý rất hẹp: chỉ ghi những cặp (miền-theo-host, tiền-tố-đường-dẫn)
 * đã được chứng minh là sai. KHÔNG mở rộng thành luật "đường dẫn luôn thắng
 * host" — nhiều đường dẫn trùng tên giữa hai app (vd `/tasks` có ở cả social lẫn
 * admin), nên luật tổng quát sẽ bẻ nhầm những link vốn đang đúng.
 */
const HOST_PATH_CORRECTIONS: ReadonlyArray<{
  readonly hostDomain: NotificationAppDomain;
  readonly pathPrefix: string;
  readonly actualDomain: NotificationAppDomain;
}> = [
  {
    hostDomain: 'social',
    pathPrefix: '/recognized-users',
    actualDomain: 'admin',
  },
];

const correctHostDomain = (
  hostDomain: NotificationAppDomain,
  path: string,
): NotificationAppDomain => {
  for (const rule of HOST_PATH_CORRECTIONS) {
    if (rule.hostDomain === hostDomain && path.startsWith(rule.pathPrefix)) {
      return rule.actualDomain;
    }
  }
  return hostDomain;
};

/* ────────────────────────────── API ────────────────────────────── */

export interface NotificationTarget {
  /** Miền sở hữu đích đến. */
  domain: NotificationAppDomain;
  /** Đường dẫn tương đối đã chuẩn hoá (luôn bắt đầu bằng `/`). */
  path: string;
  /** URL tuyệt đối tới đúng host của miền, theo môi trường hiện tại. */
  href: string;
  /** `true` khi đích nằm ở tên miền KHÁC app đang chạy. */
  isExternal: boolean;
}

/**
 * Miền của CHÍNH repo này — dùng để biết một đích đến là nội bộ (điều hướng SPA)
 * hay xuyên miền (đổi hẳn tên miền).
 *
 * ⚠ ĐÂY LÀ DÒNG DUY NHẤT KHÁC NHAU giữa bốn bản sao của file này:
 *   acta-social → 'social' · acta-e-commerce → 'shop'
 *   acta-affiliate → 'income' · acta-admin → 'admin'
 */
export const CURRENT_APP_DOMAIN: NotificationAppDomain = 'social';

const applyDeadPathRewrite = (path: string): string => {
  for (const [pattern, rewrite] of DEAD_PATH_REWRITES) {
    const match = path.match(pattern);
    if (match) return rewrite(match);
  }
  return path;
};

const domainFromPath = (path: string): NotificationDomain | null => {
  for (const [prefix, domain] of PATH_PREFIX_DOMAIN) {
    if (path === prefix || path.startsWith(prefix)) return domain;
  }
  return null;
};

const domainFromHost = (host: string): NotificationAppDomain | null => {
  const normalized = host.toLowerCase().replace(/^www\./, '');
  for (const [knownHost, domain] of HOST_TO_DOMAIN) {
    if (normalized === knownHost) return domain;
  }
  return null;
};

/**
 * Miền HIỂN THỊ của một thông báo — quyết định màu ray, huy hiệu và nhãn.
 *
 * Thứ tự: host tuyệt đối → **tiền tố đường dẫn** → bảng `action` → `system`.
 *
 * ⚠ ĐƯỜNG DẪN THẮNG BẢNG `action`, không phải ngược lại. `linkUrl` là nơi
 * backend THẬT SỰ muốn dẫn tới, còn `action` chỉ là nhãn loại sự kiện — và
 * nhiều `action` được dùng lại cho hai miền khác nhau. Ví dụ có thật do UAT bắt
 * được: `commitment_voucher_created` vừa là thông báo cho THÀNH VIÊN
 * (`/quy-thu-nhap/cam-ket` → cổng affiliate) vừa là thông báo cho ADMIN
 * (`/salaries/commitment?q=…` → trang quản trị). Nếu tra `action` trước thì
 * thông báo của admin bị đẩy sang cổng affiliate và ra 404 — đúng cái lỗi mà
 * bản vá này sinh ra để diệt.
 */
export function classifyNotification(
  action: string | undefined,
  linkUrl?: string | null,
): NotificationDomain {
  const raw = (linkUrl ?? '').trim();

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const fromHost = domainFromHost(url.hostname);
      if (fromHost) return correctHostDomain(fromHost, url.pathname);
    } catch {
      // URL hỏng → rơi xuống các bước sau
    }
  }

  if (raw.startsWith('/')) {
    const byPath = domainFromPath(applyDeadPathRewrite(raw));
    if (byPath) return byPath;
  }

  const byAction = action ? ACTION_DOMAIN[action] : undefined;
  if (byAction) return byAction;

  return 'system';
}

/**
 * Đích đến đã phân giải của một thông báo, hoặc `null` khi thông báo không có
 * chỗ để đi (`linkUrl` rỗng — vd điểm thưởng nhiệm vụ, nhắc sinh nhật).
 *
 * Hàm này CHUẨN HOÁ CẢ HOST: một `linkUrl` đóng cứng
 * `https://admin.acta.vn/...` do acta-api sinh ra sẽ được dịch về
 * `https://dev-admin.acta.vn/...` khi đang chạy trên hạ tầng dev, nên người dùng
 * bản dev không bị đá sang production.
 */
export function resolveNotificationTarget(
  action: string | undefined,
  linkUrl?: string | null,
): NotificationTarget | null {
  const raw = (linkUrl ?? '').trim();
  if (!raw) return null;

  let path = raw;
  let domain: NotificationDomain | null = null;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const fromHost = domainFromHost(url.hostname);
      domain = fromHost ? correctHostDomain(fromHost, url.pathname) : null;
      path = `${url.pathname}${url.search}${url.hash}`;
      // Host lạ (không thuộc hệ sinh thái) → mở nguyên trạng, không viết lại.
      if (!domain) {
        return {
          domain: 'social',
          path: raw,
          href: raw,
          isExternal: true,
        };
      }
    } catch {
      return null;
    }
  }

  if (!path.startsWith('/')) path = `/${path}`;
  path = applyDeadPathRewrite(path);

  if (!domain) {
    // Đường dẫn trước, `action` chỉ là dự phòng — xem ghi chú ở
    // `classifyNotification`.
    domain = domainFromPath(path);
    if (!domain) {
      const byAction = action ? ACTION_DOMAIN[action] : undefined;
      if (byAction && byAction !== 'system') domain = byAction;
    }
  }

  // Không xác định được chủ sở hữu → giữ nguyên trong app hiện tại (hành vi cũ).
  const resolved: NotificationAppDomain =
    domain && domain !== 'system' ? domain : CURRENT_APP_DOMAIN;

  return {
    domain: resolved,
    path,
    href: `${getDomainOrigin(resolved)}${path}`,
    isExternal: resolved !== CURRENT_APP_DOMAIN,
  };
}
