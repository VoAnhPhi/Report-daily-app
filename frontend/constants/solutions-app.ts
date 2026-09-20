/**
 * Phân giải tên miền của ACTA Bản Đồ / Địa Điểm (`acta-solutions`) theo TẦNG
 * đang chạy — module THUẦN, không import gì của Next, để Jest thử được.
 *
 * ┌─ VÌ SAO KHÔNG DÙNG BIẾN MÔI TRƯỜNG ────────────────────────────────────┐
 * │ `Dockerfile` của kho này CHỈ khai 6 `ARG NEXT_PUBLIC_*`                 │
 * │ (GOOGLE_ANALYTICS, GOOGLE_TAG_MANAGER, API_URL, CRISP_WEBSITE_ID,      │
 * │ CLIENT_URL, TURNSTILE_SITE_KEY). Thêm `NEXT_PUBLIC_SOLUTIONS_URL` sẽ   │
 * │ bắt sửa 6 khối ở 4 tệp (Dockerfile ARG+ENV, Dockerfile.Production      │
 * │ ARG+ENV, Jenkinsfile withCredentials+build-arg, Jenkinsfile.development │
 * │ withCredentials+build-arg) CỘNG hai credential Jenkins mới. Sót một     │
 * │ khối ⇒ biến `undefined` trong container ⇒ mã lặng lẽ rơi về giá trị dự  │
 * │ phòng: đúng "số 0 im lặng" của §44. Đã có tiền lệ đo được — biến        │
 * │ `NEXT_PUBLIC_GUIDES_URL` của `getGuidesOrigin()` CHƯA BAO GIỜ được      │
 * │ truyền qua Docker, nên nhánh đóng cứng mới là nhánh thực sự chạy.       │
 * │ Bảng cứng cho KẾT QUẢ GIỐNG HỆT với 0 rủi ro.                           │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ VÌ SAO KHÔNG DÙNG `detectRuntimeTier()` CỦA notification-domains.ts ───┐
 * │ Hàm đó suy tầng từ `window.location.hostname` và trả `'prod'` khi SSR.  │
 * │ Docstring của chính nó nêu rõ tiền đề: danh sách thông báo nằm trong    │
 * │ Radix `DropdownMenuContent` (chỉ mount khi mở) nên "trên thực tế luôn   │
 * │ phân giải phía client". Banner này vẽ NGAY lần đầu ⇒ phá vỡ tiền đề.    │
 * │ Hệ quả đo được trên `dev-social.acta.vn`: HTML do máy chủ sinh mang     │
 * │ `href` của PROD, và React KHÔNG vá khác biệt THUỘC TÍNH khi hydrate     │
 * │ (react.dev/reference/react-dom/client/hydrateRoot: "There are no        │
 * │ guarantees that attribute differences will be patched up"), nên `href`  │
 * │ sai NẰM LẠI trong DOM — người bấm nút trên DEV bị đá sang PROD, không   │
 * │ lỗi đỏ, không cảnh báo. Vì vậy tầng được suy từ HEADER `Host` phía máy  │
 * │ chủ (xem `solutions-ecosystem-banner.tsx`), nơi câu trả lời đúng ngay   │
 * │ từ byte HTML đầu tiên và không có gì để lệch.                           │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠ Đo 2026-09-04, cả hai tầng đều SỐNG: `thodia.acta.vn` → 200 (Cloudflare
 * 104.26.12.67) và `dev-solutions.acta.vn` → 200 (27.118.20.174). Cả hai phục
 * vụ cùng một mã nguồn (`<title>` trùng từng ký tự).
 *
 * ⚠ `solutions.acta.vn` KHÔNG tồn tại (không có bản ghi DNS) — đừng đoán tên
 * miền theo quy ước `<app>.acta.vn` như các app anh em khác.
 */

export type SolutionsTier = 'prod' | 'dev';

/** Gốc URL của acta-solutions theo từng tầng. Đo sống ngày 2026-09-04. */
export const SOLUTIONS_ORIGINS: Record<SolutionsTier, string> = {
  prod: 'https://thodia.acta.vn',
  dev: 'https://dev-solutions.acta.vn',
};

/**
 * Tầng dùng khi KHÔNG suy được từ header.
 *
 * Cố ý chọn `prod`: một người dùng thật trên tầng dev bị đá sang prod chỉ là
 * phiền, còn một người dùng thật trên PROD bị đá sang dev là đưa họ vào môi
 * trường thử nghiệm với dữ liệu không thật. Hỏng về phía ít hại hơn.
 */
export const SOLUTIONS_FALLBACK_TIER: SolutionsTier = 'prod';

/**
 * Cắt cổng khỏi giá trị header `Host`, giữ nguyên địa chỉ IPv6.
 *
 * ⚠ Ba dạng đầu vào phải phân biệt được, và cách viết ngây thơ
 * (`raw.split(':')[0]`) làm HỎNG hai dạng sau:
 *   - `dev-social.acta.vn:3000` → `dev-social.acta.vn`  (cắt cổng)
 *   - `[::1]:3000`              → `::1`                 (IPv6 có ngoặc + cổng)
 *   - `::1`                     → `::1`                 (IPv6 trần, KHÔNG cổng)
 * Dạng thứ ba là lý do không thể chỉ đếm dấu hai chấm đầu tiên: IPv6 trần có
 * nhiều dấu hai chấm nhưng KHÔNG có cổng nào để cắt.
 */
export function hostOnly(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (!value) return '';

  // IPv6 có ngoặc vuông: phần trong ngoặc là host, phần sau `]` là cổng.
  if (value.startsWith('[')) {
    const close = value.indexOf(']');
    return close === -1 ? value.slice(1) : value.slice(1, close);
  }

  const firstColon = value.indexOf(':');
  if (firstColon === -1) return value;
  // Từ hai dấu hai chấm trở lên mà không có ngoặc ⇒ IPv6 trần, không có cổng.
  if (value.indexOf(':', firstColon + 1) !== -1) return value;
  return value.slice(0, firstColon);
}

/**
 * Suy tầng từ giá trị header `Host` / `X-Forwarded-Host`.
 *
 * Trả `null` khi KHÔNG NHẬN RA host — chứ không lặng lẽ đoán. Phân biệt
 * "không biết" với "biết chắc là prod" là điều kiện để chỗ gọi có thể kêu lên;
 * gộp hai thứ đó vào một giá trị là cách một cổng chết trong im lặng.
 *
 * Quy ước hạ tầng ACTA: prod là `acta.vn` / `<app>.acta.vn`, dev là
 * `dev-<app>.acta.vn`. Chạy local coi như dev để không đá người đang phát triển
 * sang production thật.
 */
export function resolveSolutionsTier(
  rawHost: string | null | undefined,
): SolutionsTier | null {
  if (!rawHost) return null;

  // Qua nhiều lớp proxy, `X-Forwarded-Host` là danh sách ngăn bằng dấu phẩy và
  // mục TRÁI NHẤT là Host gốc của trình duyệt — đó mới là thứ ta cần.
  const first = rawHost.split(',')[0] ?? '';
  const host = hostOnly(first);
  if (!host) return null;

  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    return 'dev';
  }
  if (host.endsWith('.localhost')) return 'dev';

  if (host === 'acta.vn' || host.endsWith('.acta.vn')) {
    return host.startsWith('dev-') || host.startsWith('dev.') ? 'dev' : 'prod';
  }

  return null;
}

/** Gốc URL acta-solutions cho một tầng; `null` ⇒ dùng tầng dự phòng. */
export function solutionsOriginForTier(tier: SolutionsTier | null): string {
  return SOLUTIONS_ORIGINS[tier ?? SOLUTIONS_FALLBACK_TIER];
}
