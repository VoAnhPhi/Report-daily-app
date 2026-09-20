/**
 * BullMQ queue name for the mail-notifications worker.
 *
 * All 3 order lifecycle mail types (order-placed, order-completed-with-points,
 * order-delivered) are dispatched through this single queue so that retry /
 * backoff / idempotency rules are enforced in one place
 * (MailNotificationsPublisher).
 *
 * Rule: NO producer may call queue.add() directly — always go via
 * MailNotificationsPublisher.enqueue(payload).
 *
 * @acta/events does NOT exist in this repo (see CONCERNS.md). Queue names are
 * local string constants.
 */
export const MAIL_NOTIFICATIONS_QUEUE = 'mail-notifications' as const;

/**
 * Supported mail types.
 * Phase 1 (orders): order-placed, order-completed-with-points, order-delivered.
 * Phase 4 (bug reporting, BUG-06/D-08): bug-assigned, bug-executing, bug-done.
 * Enhancement (D3): bug-reopened (DONE → EXECUTING).
 */
export const MAIL_TYPES = [
  'order-placed',
  'order-completed-with-points',
  'order-delivered',
  'bug-assigned',
  'bug-executing',
  'bug-done',
  'bug-reopened',
  'group-buy-placed',   // Phase 16 MAIL-01
  'task-assigned',      // Giao việc (business_form_tasks)
  'task-due-soon',
  'task-overdue',
  'training-cooldown-ended', // Phase 54 D-10 — kích-cầu override video hết làm lạnh
  // Cảnh báo reset ví — chiến dịch do quản trị viên bấm tay ở màn Rà soát reset ví.
  //
  // ⚠ Chia làm HAI loại có chủ ý. Một job chạy liền vài phút sẽ giữ chỗ của worker (processor
  // không khai `concurrency` nên BullMQ mặc định 1) và chặn toàn bộ mail đơn hàng / bug / giao
  // việc. Nên job khởi động chỉ dựng danh sách rồi rải ra các job con, mỗi job con đúng một lô
  // 100 mail (~1 giây). Cộng với `priority` thấp ở publisher, mail giao dịch chờ nhiều nhất là
  // một lô đang chạy dở thay vì cả chiến dịch.
  'wallet-reset-warning', // job khởi động: chạy truy vấn cohort rồi rải job con
  'wallet-reset-warning-chunk', // một lô <=100 mail
] as const;

/** Union of valid mail type strings — derived from MAIL_TYPES for single source of truth. */
export type MailType = (typeof MAIL_TYPES)[number];
