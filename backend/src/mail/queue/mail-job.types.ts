import { MAIL_TYPES, MailType } from './mail-notifications.constants';
import type { WalletResetPreviewQueryDto } from '../../admin/wallet-reset-preview/dto/wallet-reset-preview.dto';
import type { WalletResetWarningEmailProps } from '../../admin/wallet-reset-preview/warning/wallet-reset-warning-props.helper';

// ---------------------------------------------------------------------------
// Per-template data shapes
// Each interface contains exactly the fields the React Email template renders.
// No `any` — all fields are typed explicitly (CLAUDE.md rule).
// ---------------------------------------------------------------------------

/** A single line-item in order summary tables used by all 3 mail templates. */
export interface OrderItemSummary {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  thumbnail?: string;
}

/**
 * Data for the `order-placed` mail (MAIL-01).
 * Sent on payment success — confirms the order and shows estimated delivery.
 */
export interface OrderPlacedData {
  customerName: string;
  customerEmail: string;
  orderCode: string;
  items: OrderItemSummary[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  deliveryAddress: string;
  /** Human-readable delivery estimate, e.g. "3-5 ngày làm việc". */
  estimatedDelivery?: string;
  /**
   * Điểm cầu khách đến lấy hàng — CHỈ có với đơn "nhận tại kho".
   *
   * Kho được hệ thống tự ghim theo khu vực khách chọn, khách không tự chọn được điểm cầu
   * nào, nên nếu mail không nói thì khách không có cách nào biết đến đâu lấy hàng.
   * `undefined` với đơn giao tận nhà — khi đó khối này không được render.
   */
  pickupWarehouse?: {
    name: string;
    /** Địa chỉ một dòng; `null` khi kho chưa khai địa chỉ. */
    addressLine: string | null;
    phone: string | null;
  };
}

/**
 * Data for the `order-completed-with-points` mail (MAIL-02).
 * Sent after VAT-completion by admin — combines order summary + points award
 * in one mail per D-12.  `newPointBalance` is the post-award balance so the
 * user sees their updated total (not just the delta).
 */
export interface OrderCompletedWithPointsData {
  customerName: string;
  customerEmail: string;
  orderCode: string;
  items: OrderItemSummary[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  /** VAT amount included in total (shown separately for transparency). */
  vatAmount?: number;
  /** Points awarded for this order. */
  pointsAwarded: number;
  /** Post-award point balance — the number shown to the user. */
  newPointBalance: number;
  /** Name of admin who approved the VAT invoice (optional, for trust signal). */
  invoiceReviewerName?: string;
}

/**
 * Data for the `order-delivered` mail (MAIL-03 / MAIL-04).
 * Sent when GHN webhook confirms delivery (or recovery job confirms it via
 * direct GHN tracking API).
 */
export interface OrderDeliveredData {
  customerName: string;
  customerEmail: string;
  orderCode: string;
  items: OrderItemSummary[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  deliveryAddress: string;
  /** ISO-8601 timestamp of delivery confirmation. */
  deliveredAt?: string;
  /** GHN tracking code (shown in mail so user can track themselves). */
  trackingCode?: string;
}

// ---------------------------------------------------------------------------
// Bug-report transition mail data shapes (Phase 4, BUG-06 / D-08).
// Bug mails carry bugId + transitionId (NOT orderId/userId).
// ---------------------------------------------------------------------------

/**
 * Data for the `bug-assigned` mail — sent to ALL assignees AND the creator (D4/D-08).
 * `recipients` is the deduped to-list (assignee emails + creator email); the
 * handler sends one mail per recipient. `assigneeNames` is the rendered list of
 * assignee display names for the template body.
 */
export interface BugAssignedData {
  bugCode: string;
  bugLink: string;
  /** Direct admin link to the bug detail page ({ADMIN_URL}/bug-reports/{id}). */
  adminLink: string;
  description: string;
  assigneeNames: string[];
  creatorName: string;
  recipients: string[];
}

/** Data for the `bug-executing` mail — sent to creator only (D-08). */
export interface BugExecutingData {
  bugCode: string;
  bugLink: string;
  /** Direct admin link to the bug detail page. */
  adminLink: string;
  assigneeName: string;
  creatorName: string;
  creatorEmail: string;
}

/** Data for the `bug-done` mail — sent to creator only (D-08). */
export interface BugDoneData {
  bugCode: string;
  bugLink: string;
  /** Direct admin link to the bug detail page. */
  adminLink: string;
  assigneeName: string;
  creatorName: string;
  creatorEmail: string;
  /** ISO-8601 timestamp the bug was marked done. */
  doneAt: string;
}

/**
 * Data for the `bug-reopened` mail (D3) — sent to ALL assignees AND the creator
 * when a DONE bug is reopened (→ EXECUTING). `recipients` is the deduped to-list.
 */
export interface BugReopenedData {
  bugCode: string;
  bugLink: string;
  /** Direct admin link to the bug detail page. */
  adminLink: string;
  assigneeNames: string[];
  creatorName: string;
  recipients: string[];
}

/**
 * Data for the `group-buy-placed` mail (Phase 16, MAIL-01).
 * Sent to every frozen member (including leader) when the leader checks out.
 */
export interface GroupBuyPlacedData {
  recipientName: string;
  recipientEmail: string;
  leaderName: string;
  groupBuyId: string;
  orderId: string;
  orderCode: string;
  productName: string;
  quantity: number;
  total: number;
  /** Per-member personal share (order.subtotal / N). Undefined for pre-Phase-20 members with null individualContribution. */
  individualContribution?: number;
}

/**
 * Data for the `task-assigned` mail (giao việc — business_form_tasks).
 * One job per role: `main` = người chịu trách nhiệm, `support` = người hỗ trợ.
 * `recipients` chứa các email cùng vai trò; nội dung email tùy theo `role`.
 */
export interface TaskAssignedData {
  role: 'main' | 'support';
  taskTitle: string;
  /** Người giao việc (admin) hoặc người tạo việc. */
  assignerName: string;
  /** Luôn trỏ app social `${FRONTEND_DOMAIN}/tasks`. */
  taskUrl: string;
  /** Hạn chót đã format dd/MM/yyyy (nếu có). */
  dueDate?: string;
  recipients: string[];
}

/**
 * Data cho mail nhắc hạn công việc.
 */
export interface TaskDeadlineData {
  taskTitle: string;
  /** Hạn chót đã format dd/MM/yyyy. */
  dueDate: string;
  taskUrl: string;
  recipients: string[];
}

/**
 * Data cho mail kích-cầu "đã hết làm lạnh" (Phase 54 D-10).
 * CHỈ gửi cho video ghi đè (overrideCooldown=true) vừa hết thời gian làm lạnh,
 * tới user đã hoàn thành video đó ≥1 lần. Người nhận server-derived từ sweep
 * findMany — KHÔNG bao giờ do client cung cấp.
 *
 * Hiển thị tiền thưởng marketing-safe: chỉ nêu hệ số (pointsReward) + cách diễn
 * đạt theo cấp; KHÔNG tính VND chính xác per-user (tùy theo cấp người dùng P53).
 */
export interface TrainingCooldownEndedData {
  recipientName: string;
  recipientEmail: string;
  videoTitle: string;
  /** Hệ số điểm thưởng của video (marketing-safe — không phải VND per-user). */
  pointsReward: number;
  /** Mô tả video (Mux/admin nhập) — có thể trống. */
  description?: string;
  /** Mux thumbnail — chèn <Img> khi có; degrade text-only khi trống. */
  thumbnailUrl?: string;
  /** Deep-link tới feed social, vd `${FRONTEND_DOMAIN}/videos?v=${videoId}`. */
  videoUrl: string;
}

// ---------------------------------------------------------------------------
// Discriminated union — the canonical envelope for all mail jobs.
// jobId formula: order mails `${mailType}-${orderId}` (D-07);
// bug mails `${mailType}-${bugId}-${transitionId}` (D-08, transition-scoped).
// NOTE: '-' (not ':') — BullMQ forbids ':' in custom job ids.
// ---------------------------------------------------------------------------

export type MailJobPayload =
  | {
      mailType: 'order-placed';
      orderId: string;
      userId: string;
      data: OrderPlacedData;
    }
  | {
      mailType: 'order-completed-with-points';
      orderId: string;
      userId: string;
      data: OrderCompletedWithPointsData;
    }
  | {
      mailType: 'order-delivered';
      orderId: string;
      userId: string;
      data: OrderDeliveredData;
    }
  | {
      mailType: 'bug-assigned';
      bugId: string;
      transitionId: string;
      data: BugAssignedData;
    }
  | {
      mailType: 'bug-executing';
      bugId: string;
      transitionId: string;
      data: BugExecutingData;
    }
  | {
      mailType: 'bug-done';
      bugId: string;
      transitionId: string;
      data: BugDoneData;
    }
  | {
      mailType: 'bug-reopened';
      bugId: string;
      transitionId: string;
      data: BugReopenedData;
    }
  | {
      mailType: 'group-buy-placed';
      groupBuyId: string;
      orderId: string;
      recipientUserId: string;
      data: GroupBuyPlacedData;
    }
  | {
      mailType: 'task-assigned';
      taskId: string;
      transitionId: string;
      role: 'main' | 'support';
      data: TaskAssignedData;
    }
  | {
      mailType: 'task-due-soon';
      taskId: string;
      data: TaskDeadlineData;
    }
  | {
      mailType: 'task-overdue';
      taskId: string;
      data: TaskDeadlineData;
    }
  | {
      mailType: 'training-cooldown-ended';
      videoId: string;
      userId: string;
      data: TrainingCooldownEndedData;
    }
  // ---------------------------------------------------------------------
  // Chiến dịch cảnh báo reset ví.
  //
  // ⚠ Hai biến thể dưới đây KHÔNG có trường `data` và KHÔNG có khoá thực thể
  // (orderId/bugId/…) như mọi loại mail khác — chúng không gắn với một bản ghi
  // nào, mà mô tả một LƯỢT CHẠY. `isMailJobPayload` vì thế phải nhận diện
  // chúng ở một nhánh riêng, TRƯỚC các kiểm tra chung.
  // ---------------------------------------------------------------------
  | {
      mailType: 'wallet-reset-warning';
      mode: 'cohort' | 'dev_test';
      /**
       * Bộ lọc y hệt tuyến xem trước / xuất Excel. Job con được rải TỪ kết quả
       * chạy bộ lọc này ở worker — payload cố ý KHÔNG mang sẵn cohort, vì 20.000
       * dòng dữ liệu trong một job Redis là vài chục MB.
       */
      filters: WalletResetPreviewQueryDto;
      triggeredByUserId: string;
      triggeredByEmail: string;
      requestedAt: string;
    }
  | {
      mailType: 'wallet-reset-warning-chunk';
      /** jobId của job khởi động — dùng để gộp trạng thái khi tra cứu. */
      parentJobId: string;
      chunkIndex: number;
      /**
       * Props ĐÃ DỰNG SẴN cho tối đa 100 người nhận.
       *
       * ⚠ Mang props thay vì mang bộ lọc + offset là có chủ ý: bắt mỗi job con tự
       * chạy lại truy vấn cohort là 200 lượt truy vấn tổng hợp nặng cho một chiến dịch.
       */
      messages: Array<{
        key: string;
        to: string;
        props: WalletResetWarningEmailProps;
      }>;
    };

// ---------------------------------------------------------------------------
// Runtime guard — used by MailNotificationsProcessor to reject malformed jobs
// (T-01-06 threat mitigation).
// ---------------------------------------------------------------------------

/**
 * Type-guard for MailJobPayload.
 *
 * Validates structural invariants at runtime so a job pushed directly to
 * Redis (bypassing the TypeScript publisher) cannot crash the worker silently.
 * A failing guard causes process() to throw → BullMQ retries → dead-letter.
 */
export function isMailJobPayload(value: unknown): value is MailJobPayload {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate['mailType'] !== 'string') {
    return false;
  }

  if (!(MAIL_TYPES as readonly string[]).includes(candidate['mailType'])) {
    return false;
  }

  // Chiến dịch cảnh báo reset ví: không có khoá thực thể và không có `data`, nên
  // phải nhận diện TRƯỚC hai kiểm tra chung bên dưới, nếu không sẽ bị loại nhầm.
  if (candidate['mailType'] === 'wallet-reset-warning') {
    const mode = candidate['mode'];
    return (
      (mode === 'cohort' || mode === 'dev_test') &&
      candidate['filters'] !== null &&
      typeof candidate['filters'] === 'object' &&
      typeof candidate['triggeredByUserId'] === 'string'
    );
  }

  if (candidate['mailType'] === 'wallet-reset-warning-chunk') {
    return (
      typeof candidate['parentJobId'] === 'string' &&
      typeof candidate['chunkIndex'] === 'number' &&
      Array.isArray(candidate['messages'])
    );
  }

  // Order mails are keyed by orderId; bug mails (Phase 4) are keyed by bugId;
  // group-buy mails (Phase 15) are keyed by groupBuyId.
  // Accept any — a payload with none is malformed.
  const hasOrderId = typeof candidate['orderId'] === 'string';
  const hasBugId = typeof candidate['bugId'] === 'string';
  const hasGroupBuyId = typeof candidate['groupBuyId'] === 'string';
  const hasTaskId = typeof candidate['taskId'] === 'string';
  // training-cooldown-ended (Phase 54 D-10) is keyed by videoId.
  const hasVideoId = typeof candidate['videoId'] === 'string';
  if (!hasOrderId && !hasBugId && !hasGroupBuyId && !hasTaskId && !hasVideoId) {
    return false;
  }

  // Note: userId is required only on order payloads (the discriminated union
  // enforces that at compile time); bug payloads carry no userId, so the
  // runtime guard no longer hard-requires it.

  if (
    candidate['data'] === null ||
    typeof candidate['data'] !== 'object'
  ) {
    return false;
  }

  return true;
}

// Re-export MailType so consumers only need to import from mail-job.types.
export type { MailType };
