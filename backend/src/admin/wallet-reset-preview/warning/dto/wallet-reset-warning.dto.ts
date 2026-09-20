import type { MailDeliveryMode } from '../../../../mail/mail-delivery.guard';

/**
 * Hợp đồng HTTP của ba tuyến gửi mail cảnh báo reset ví.
 *
 * Tên trường là HỢP ĐỒNG với `acta-admin` (`types/admin/wallet-reset-preview.type.ts`) — đổi tên ở
 * đây là vỡ màn hình bên kia, đừng sửa một đầu.
 */

/** Chế độ chạy của một lượt gửi. */
export type WalletResetWarningMode = 'cohort' | 'dev_test';

/** Trần một lô mail — bằng trần lô của Resend, cũng là kích thước một job con. */
export const WALLET_RESET_WARNING_BATCH_SIZE = 100;

/** Hộp thư NHẬN lá thư gửi thử. */
export const WALLET_RESET_WARNING_DEV_TEST_EMAIL = 'acta_vn@yopmail.com';

/**
 * Tài khoản mà lá thư gửi thử LẤY DỮ LIỆU (khác với hộp thư nhận ở trên).
 *
 * Số liệu trong thư mẫu chạy qua đúng pipeline của bản xem trước — mốc ngày, cách đếm F1, cổng
 * mua hàng và cả ba con số tiền đều đọc từ truy vấn, không có giá trị nào viết tay. Nhờ vậy nút
 * gửi thử kiểm chứng được đường tính tiền chứ không chỉ kiểm chứng bố cục.
 */
export const WALLET_RESET_WARNING_DEV_TEST_SOURCE_EMAIL =
  'dorothytran015@gmail.com';

/**
 * Ưu tiên BullMQ của mọi job chiến dịch.
 *
 * ⚠ Con số này là lý do duy nhất khiến việc dùng chung hàng đợi `mail-notifications` không làm
 * nghẽn mail giao dịch. Trong BullMQ v5, job KHÔNG khai `priority` được coi là ưu tiên CAO NHẤT,
 * nên mọi loại mail sẵn có (đơn hàng, bug, giao việc) tự động chen lên trước mà không phải sửa gì.
 * Hạ số này về 0/undefined là biến chiến dịch thành ngang hàng mail đơn hàng.
 */
export const WALLET_RESET_WARNING_JOB_PRIORITY = 10;

/** Phản hồi `202` của hai tuyến xếp hàng. */
export interface WalletResetWarningEnqueueResponse {
  jobId: string;
  mode: WalletResetWarningMode;
  /** true khi lượt gửi với đúng bộ lọc này đã được xếp hàng trước đó (không tạo lượt mới). */
  alreadyQueued: boolean;
  /**
   * HTML của lá mail mẫu, CHỈ có ở tuyến gửi thử.
   *
   * ⚠ Có mặt là để xem template được NGAY, kể cả khi `mail-delivery.guard` đang ở chế độ `skip`
   * và không lá thư nào thật sự đi. Đây là đường xem template chính, không phải tiện ích phụ.
   */
  previewHtml?: string;
}

/** Kết quả job khởi động — trả về làm `returnvalue` của job. */
export interface WalletResetWarningKickoffResult {
  /** Số người khớp bộ lọc (trước khi lọc email). */
  cohortSize: number;
  /** Số job con đã rải. */
  chunkCount: number;
  /** Số người bị bỏ qua vì không có email dùng được. KHÔNG tính là lỗi. */
  skippedNoEmail: number;
  startedAt: string;
}

/** Kết quả một job con. */
export interface WalletResetWarningChunkResult {
  chunkIndex: number;
  attempted: number;
  sent: number;
  failed: number;
  /** Tối đa 5 thông điệp lỗi mẫu — đủ để chẩn đoán, không đủ để phình payload. */
  sampleErrors: string[];
}

/** Trạng thái gộp của một lượt gửi (job khởi động + toàn bộ job con). */
export interface WalletResetWarningStatusResponse {
  jobId: string;
  /** `waiting` | `active` | `completed` | `failed` | `unknown` (job đã bị dọn khỏi Redis). */
  state: string;
  cohortSize: number | null;
  chunkCount: number | null;
  chunksDone: number;
  attempted: number;
  sent: number;
  failed: number;
  skippedNoEmail: number;
  failedReason: string | null;
  sampleErrors: string[];
}

/** Cờ điều khiển hiển thị cho `acta-admin`. */
export interface WalletResetWarningCapabilities {
  /** Người đang gọi có phải super admin không — đọc từ DB, không từ JWT. */
  canSendWarning: boolean;
  /** Có hiện nút "Gửi thử (dev)" không (true ⇔ không phải môi trường production). */
  devTestEnabled: boolean;
  /**
   * Chế độ gửi thư hiện tại của máy chủ.
   *
   * ⚠ Trả về cho FE để người vận hành biết thư có THẬT SỰ đi hay không: ở chế độ `skip`,
   * `mail-delivery.guard` nuốt toàn bộ thư và trả về phản hồi hình dạng thành công, nên nếu màn
   * hình im lặng thì người vận hành sẽ thấy "đã gửi" mà hộp thư rỗng và tưởng hệ thống hỏng.
   */
  mailDeliveryMode: MailDeliveryMode;
}
