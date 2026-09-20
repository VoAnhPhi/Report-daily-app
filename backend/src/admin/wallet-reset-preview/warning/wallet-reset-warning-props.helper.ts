import {
  WalletResetBuyGate,
  WalletResetCombine,
  WalletResetF1Mode,
  WalletResetPreviewParams,
  WalletResetPreviewRow,
} from '../dto/wallet-reset-preview.dto';

/*
 * ⚠ KHÔNG có hàm dựng props "mẫu" với số viết tay ở file này, và đừng thêm lại.
 * Lượt gửi thử đọc dữ liệu THẬT của một tài khoản qua `collectSingleByEmail`, chạy đúng pipeline
 * tính tiền của bản xem trước. Một bộ số cố định sẽ luôn hiển thị đẹp kể cả khi đường tính tiền
 * đã hỏng — tức là nó không kiểm chứng được điều duy nhất mà nút gửi thử sinh ra để kiểm chứng.
 */

/**
 * Dựng props cho mail cảnh báo reset ví.
 *
 * ⚠ KIỂU `WalletResetWarningEmailProps` CỐ Ý khai ở đây chứ không khai trong file template
 * `.tsx`. `.split/shared-base.manifest` khớp hậu tố `.helper.ts` nhưng KHÔNG khớp `.tsx`, nên chỉ
 * file này được `sync-shared-base.sh` giữ đồng bộ giữa CORE và WORKERS. Template và
 * `mail-job.types.ts` (payload job con) đều import kiểu từ đây ⇒ một nguồn duy nhất cho cả ba nơi.
 *
 * Toàn bộ hàm ở đây là hàm THUẦN — không Nest, không Prisma, không I/O — nên test được trực tiếp.
 */

/** Một dòng trong bảng "điều kiện cần đạt" của mail. */
export interface WalletResetWarningConditionProps {
  /** Tên tiêu chí, vd "Giới thiệu thành viên tuyến F1". */
  label: string;
  /** Mức cần đạt, vd "tối thiểu 3 người đăng ký mới". */
  requirement: string;
}

/**
 * Props của `WalletResetWarningEmail`.
 *
 * Mọi số tiền là VND nguyên đồng; mọi mốc thời gian đã được ĐỊNH DẠNG SẴN thành chuỗi
 * `dd/MM/yyyy` ở tầng gọi. Template chỉ trình bày, KHÔNG tính toán và KHÔNG định dạng ngày —
 * container chạy `TZ=UTC` nên mọi phép đổi ngày phải làm một lần, đúng một chỗ (xem
 * `formatVietnamDay` bên dưới).
 */
export interface WalletResetWarningEmailProps {
  memberName: string;
  /** Mốc ngày dự kiến reset ví. */
  resetAnchorLabel: string;
  /** Đầu cửa sổ xét điều kiện. */
  windowStartLabel: string;
  /** Độ dài cửa sổ xét, tính bằng ngày. */
  windowDays: number;
  /** Số dư ví rèn luyện có thể bị đưa về 0. */
  trainingVnd: number;
  /** Phần ví hoa hồng có thể bị đưa về 0 — kịch bản A. */
  commissionVnd: number;
  /** `trainingVnd + commissionVnd`. Tầng gọi tính sẵn; template KHÔNG tự cộng lại. */
  totalVnd: number;
  conditions: WalletResetWarningConditionProps[];
  /** true ⇒ phải đạt CẢ HAI điều kiện; false ⇒ chỉ cần một trong hai. */
  requiresAllConditions: boolean;
  /** Link tuyệt đối tới cổng affiliate. */
  overviewUrl: string;
}

/**
 * Định dạng một mốc ISO thành `dd/MM/yyyy` theo giờ Việt Nam.
 *
 * ⚠ KHÔNG dùng `setHours()` / `getDate()`: container chạy `TZ=UTC` (không Dockerfile nào đặt `TZ`),
 * nên mọi phép tính ngày dựa trên giờ máy đều lệch 7 giờ và in sai ngày ở cả hai đầu kỳ.
 * `Intl.DateTimeFormat` với `timeZone` tường minh là cách duy nhất đúng mà không cần thư viện.
 */
export function formatVietnamDay(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
}

/**
 * Dựng bảng điều kiện TỪ CHÍNH bộ lọc đã chạy.
 *
 * ⚠ Không hard-code câu chữ điều kiện: người vận hành đổi `minNewF1` / `f1Mode` / `buyGate` là đổi
 * luôn nghĩa của danh sách, và một lá mail nêu sai điều kiện còn tệ hơn không gửi — member sẽ làm
 * đúng việc mà hệ thống không tính.
 */
export function buildConditionLines(
  params: WalletResetPreviewParams,
): WalletResetWarningConditionProps[] {
  const f1Label =
    params.f1Mode === WalletResetF1Mode.new_in_window
      ? 'Giới thiệu thành viên tuyến F1 đăng ký mới'
      : 'Duy trì thành viên tuyến F1 đang hoạt động';

  const buyLabel =
    params.buyGate === WalletResetBuyGate.vat_completed
      ? 'Có đơn hàng đã hoàn tất xuất VAT'
      : 'Có đơn hàng đã hoàn thành';

  return [
    {
      label: f1Label,
      requirement: `tối thiểu ${params.minNewF1.toLocaleString('vi-VN')} người`,
    },
    {
      label: buyLabel,
      requirement: 'ít nhất 1 đơn hàng',
    },
  ];
}

/**
 * Dựng props cho MỘT người trong cohort.
 *
 * ⚠ `commissionVnd` lấy `commissionResettableA`, KHÔNG phải `commissionResettableB` và cũng không
 * phải `commissionBalance`:
 *   • Kịch bản A là cơ chế reset ĐANG CHẠY — miễn trừ thù lao cá nhân + thù lao kho vận (F7) +
 *     thù lao giới thiệu cổ đông (từ 2026-09).
 *   • Kịch bản B miễn trừ thêm thù lao tư vấn (F6) nhưng là giả định CHƯA áp dụng.
 *   • `commissionBalance` là số dư thô hiển thị trên app, CAO HƠN phần thực sự bị reset.
 * In nhầm sang B là báo thiếu, in nhầm sang số dư thô là doạ quá tay — cả hai đều là sự cố niềm tin.
 *
 * `totalVnd` lấy thẳng `row.totalImpactA` (backend đã cộng) thay vì cộng lại tại đây: hai phép cộng
 * ở hai nơi là hai cơ hội để mail in một số còn hệ thống reset một số khác.
 */
export function buildWarningProps(
  row: WalletResetPreviewRow,
  params: WalletResetPreviewParams,
  overviewUrl: string,
): WalletResetWarningEmailProps {
  return {
    memberName: row.fullName?.trim() || 'Quý thành viên',
    resetAnchorLabel: formatVietnamDay(params.resetAnchor),
    windowStartLabel: formatVietnamDay(params.windowStart),
    windowDays: params.windowDays,
    trainingVnd: row.trainingBalanceVnd,
    commissionVnd: row.commissionResettableA,
    totalVnd: row.totalImpactA,
    conditions: buildConditionLines(params),
    requiresAllConditions: params.combine === WalletResetCombine.and,
    overviewUrl,
  };
}
