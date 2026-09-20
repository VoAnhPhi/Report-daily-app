import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash, randomBytes } from 'node:crypto';
import { MAIL_NOTIFICATIONS_QUEUE } from './mail-notifications.constants';
import { MailJobPayload } from './mail-job.types';
import { WALLET_RESET_WARNING_JOB_PRIORITY } from '../../admin/wallet-reset-preview/warning/dto/wallet-reset-warning.dto';

/**
 * MailNotificationsPublisher
 *
 * The ONLY authorised entry-point for adding jobs to the mail-notifications
 * BullMQ queue.  Downstream plans (02/03/04) inject this service via MailModule
 * and call `enqueue(payload)` — they must NEVER call queue.add() directly.
 *
 * Enforces:
 *   - jobId formula: `${mailType}-${orderId}`  (D-07 — idempotency, T-01-02)
 *   - Locked retry options from D-06  (T-01-05 — retry storm bound)
 *   - Payload typing via MailJobPayload discriminated union  (T-01-06)
 *
 * BullMQ deduplicates by jobId internally: re-enqueueing the same
 * (mailType, orderId) pair while the prior job is still in the active/completed
 * set is a no-op at the broker level.  The publisher does not need to pre-check
 * — that would be a TOCTOU race anyway.
 */
@Injectable()
export class MailNotificationsPublisher {
  constructor(
    @InjectQueue(MAIL_NOTIFICATIONS_QUEUE)
    private readonly queue: Queue<MailJobPayload>,
  ) {}

  /**
   * Enqueue a mail notification job.
   *
   * @param payload  Typed MailJobPayload — the discriminated union ensures
   *                 producers supply the correct data shape for each mail type.
   */
  async enqueue(
    payload: MailJobPayload,
  ): Promise<{ jobId: string; alreadyQueued: boolean }> {
    const jobId = this.buildJobId(payload);
    const isCampaign = this.isCampaignPayload(payload);

    // Chỉ chiến dịch mới cần biết "đã xếp hàng chưa" (người vận hành bấm nút hai lần).
    // Mail giao dịch bỏ qua lượt đọc này để không thêm một round-trip Redis cho mỗi đơn hàng —
    // BullMQ vẫn tự khử trùng theo jobId ở tầng broker như trước.
    const alreadyQueued = isCampaign
      ? Boolean(await this.queue.getJob(jobId))
      : false;

    if (!alreadyQueued) {
      await this.queue.add(payload.mailType, payload, {
        jobId,
        // ⚠ Chiến dịch KHÔNG được tự thử lại: một lượt retry là gửi lại cả lô 100 người.
        // Mail giao dịch giữ nguyên `attempts: 3` như trước — đừng gộp hai nhánh này.
        attempts: isCampaign ? 1 : 3,
        backoff: isCampaign ? undefined : { type: 'exponential', delay: 5000 },
        // `undefined` = KHÔNG khai ưu tiên = ưu tiên CAO NHẤT trong BullMQ v5. Nhờ vậy mọi mail
        // giao dịch hiện có tự động chen lên trước job chiến dịch mà không phải sửa gì ở producer.
        priority: isCampaign ? WALLET_RESET_WARNING_JOB_PRIORITY : undefined,
        // Giữ kết quả chiến dịch 7 ngày: không có bảng sổ nào, đây là dấu vết DUY NHẤT để
        // tuyến tra cứu trạng thái đọc được "đã gửi cho bao nhiêu người".
        removeOnComplete: isCampaign
          ? { age: 7 * 24 * 3600, count: 500 }
          : 10000,
        removeOnFail: isCampaign ? { age: 7 * 24 * 3600, count: 500 } : 5000,
      });
    }

    return { jobId, alreadyQueued };
  }

  /** Hai loại job của chiến dịch cảnh báo reset ví — dùng chung bộ options riêng. */
  private isCampaignPayload(payload: MailJobPayload): boolean {
    return (
      payload.mailType === 'wallet-reset-warning' ||
      payload.mailType === 'wallet-reset-warning-chunk'
    );
  }

  /**
   * Deterministic jobId formula per D-07.
   * Extracted into a private helper so unit tests can assert the rule in
   * isolation without coupling to the queue implementation.
   *
   * Order mails: `${mailType}-${orderId}` (D-07).
   * Bug mails:   `${mailType}-${bugId}-${transitionId}` (D-08) — transition-scoped
   *   so reassigning the same bug twice produces two distinct jobIds (no BullMQ
   *   dedup of the second reassignment mail, PITFALL-2).
   * NOTE: separator is '-' not ':' — BullMQ forbids ':' in custom job ids.
   * Examples:
   *   order-placed-abc123
   *   bug-assigned-bug123-7f3e...uuid
   */
  private buildJobId(payload: MailJobPayload): string {
    // group-buy-placed has both orderId and groupBuyId; handle first to avoid
    // the generic orderId branch producing a colon-containing jobId (BullMQ rejects colons).
    if (payload.mailType === 'group-buy-placed') {
      // Keyed by orderId + recipientUserId per MAIL-02
      // _ separator: BullMQ 5.71.1 rejects colons in jobIds
      return `groupbuy-placed_${payload.orderId}_${payload.recipientUserId}`;
    }
    if (payload.mailType === 'task-assigned') {
      // transition + role-scoped: mỗi lần giao / mỗi vai trò là một job riêng.
      return `task-assigned-${payload.taskId}-${payload.transitionId}-${payload.role}`;
    }
    if (
      payload.mailType === 'task-due-soon' ||
      payload.mailType === 'task-overdue'
    ) {
      const dueKey = payload.data.dueDate.replace(/\D/g, '');
      return `${payload.mailType}-${payload.taskId}-${dueKey}`;
    }
    if (payload.mailType === 'wallet-reset-warning') {
      if (payload.mode === 'dev_test') {
        // CỐ Ý không tất định: người vận hành phải bấm lại được nhiều lần trong lúc chỉnh
        // template. jobId tất định ở đây sẽ bị BullMQ khử trùng và lần bấm thứ hai im lặng
        // không làm gì.
        return `warntest_${Date.now()}_${randomBytes(3).toString('hex')}`;
      }
      // Tất định theo (bộ lọc + ngày): bấm hai lần cùng ngày với cùng bộ lọc không tạo lượt
      // thứ hai. Sang ngày mới thì tạo lượt mới — đúng ý cho chiến dịch nhắc nhiều đợt.
      const digest = createHash('sha256')
        .update(JSON.stringify(payload.filters))
        .digest('hex')
        .slice(0, 32);
      const day = new Date().toISOString().slice(0, 10);
      return `warn_${digest}_${day}`;
    }
    if (payload.mailType === 'wallet-reset-warning-chunk') {
      return `${payload.parentJobId}_c${payload.chunkIndex}`;
    }
    if (payload.mailType === 'training-cooldown-ended') {
      // P54 D-10 — within-tick dedup keyed by videoId+userId. The durable
      // once-per-cycle gate is the DB marker cooldownEndNotifiedAt (Pitfall 1),
      // not this jobId (it is evicted after removeOnComplete).
      return `training-cooldown-ended-${payload.videoId}-${payload.userId}`;
    }
    if ('orderId' in payload) {
      return `${payload.mailType}-${payload.orderId}`;
    }
    return `${payload.mailType}:${payload.bugId}:${payload.transitionId}`;
  }
}
