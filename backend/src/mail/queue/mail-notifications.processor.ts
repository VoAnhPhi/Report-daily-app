import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MAIL_NOTIFICATIONS_QUEUE, MailType } from './mail-notifications.constants';
import { MailJobPayload, isMailJobPayload } from './mail-job.types';
import { MailService } from '../mail.service';
import { handleOrderPlaced } from './handlers/order-placed.handler';
import { handleOrderCompletedWithPoints } from './handlers/order-completed-with-points.handler';
import { handleOrderDelivered } from './handlers/order-delivered.handler';
import { handleBugAssigned } from './handlers/bug-assigned.handler';
import { handleBugExecuting } from './handlers/bug-executing.handler';
import { handleBugDone } from './handlers/bug-done.handler';
import { handleBugReopened } from './handlers/bug-reopened.handler';
import { handleGroupBuyPlaced } from './handlers/group-buy-placed.handler.impl';
import { handleTaskAssigned } from './handlers/task-assigned.handler';
import { handleTaskDeadline } from './handlers/task-deadline.handler';
import { handleTrainingCooldownEnded } from './handlers/training-cooldown-ended.handler';
import { PrismaService } from '../../common/services/prisma.service';
import { handleWalletResetWarning } from './handlers/wallet-reset-warning.handler';
import { handleWalletResetWarningChunk } from './handlers/wallet-reset-warning-chunk.handler';
import { MailNotificationsPublisher } from './mail-notifications.publisher';
import { WalletResetPreviewService } from '../../admin/wallet-reset-preview/wallet-reset-preview.service';
import {
  WalletResetWarningChunkResult,
  WalletResetWarningKickoffResult,
} from '../../admin/wallet-reset-preview/warning/dto/wallet-reset-warning.dto';

/**
 * MailNotificationsProcessor
 *
 * BullMQ worker for the `mail-notifications` queue.
 *
 * Plan 01 skeleton:
 *   - Validates payload via `isMailJobPayload` (T-01-06 mitigation)
 *   - Dispatches by `mailType` to a typed handler dispatch table
 *   - All 3 handlers are stubs that throw NotImplemented — plans 02/03/04
 *     will replace each stub body with the real React Email render + Resend
 *     send, without changing the dispatch table structure.
 *
 * Logging follows the pattern from CLAUDE.md event-driven section:
 *   ✅ processed ${job.name} jobId=${job.id}
 *   ❌ failed job=${job.name}
 */
/**
 * Giá trị trả về của một handler.
 *
 * Mọi loại mail giao dịch trả `void` như trước. Chỉ hai loại của chiến dịch cảnh báo reset ví
 * trả dữ liệu, và dữ liệu đó được BullMQ lưu làm `returnvalue` của job.
 */
export type MailJobHandlerResult =
  | void
  | WalletResetWarningKickoffResult
  | WalletResetWarningChunkResult;

@Injectable()
@Processor(MAIL_NOTIFICATIONS_QUEUE)
export class MailNotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(MailNotificationsProcessor.name);

  constructor(
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
    // Chiến dịch cảnh báo reset ví: job khởi động cần chạy truy vấn cohort rồi tự rải job con
    // trở lại chính hàng đợi này.
    private readonly walletResetPreview: WalletResetPreviewService,
    private readonly publisher: MailNotificationsPublisher,
  ) {
    super();
  }

  /**
   * Dispatch table keyed by MailType.
   *
   * Plan 01-02: `order-placed` handler is now wired to `handleOrderPlaced`.
   * Plans 03 and 04 will replace the remaining two stubs.
   *
   * The handlers are typed as `(job: Job<MailJobPayload>) => Promise<void>`
   * so each plan can import the exact payload variant it needs via the
   * discriminated union after narrowing on `job.data.mailType`.
   */
  private readonly handlers: Record<
    MailType,
    (job: Job<MailJobPayload>) => Promise<MailJobHandlerResult>
  > = {
    'order-placed': async (job: Job<MailJobPayload>): Promise<void> => {
      await handleOrderPlaced(job, this.mailService);
    },

    'order-completed-with-points': async (job: Job<MailJobPayload>): Promise<void> => {
      await handleOrderCompletedWithPoints(job, this.mailService);
    },

    'order-delivered': async (job: Job<MailJobPayload>): Promise<void> => {
      await handleOrderDelivered(job, this.mailService);
    },

    'bug-assigned': async (job: Job<MailJobPayload>): Promise<void> => {
      await handleBugAssigned(job, this.mailService);
    },

    'bug-executing': async (job: Job<MailJobPayload>): Promise<void> => {
      await handleBugExecuting(job, this.mailService);
    },

    'bug-done': async (job: Job<MailJobPayload>): Promise<void> => {
      await handleBugDone(job, this.mailService);
    },

    'bug-reopened': async (job: Job<MailJobPayload>): Promise<void> => {
      await handleBugReopened(job, this.mailService);
    },

    'group-buy-placed': async (job: Job<MailJobPayload>): Promise<void> => {
      await handleGroupBuyPlaced(job, this.mailService, this.prisma);
    },

    'task-assigned': async (job: Job<MailJobPayload>): Promise<void> => {
      await handleTaskAssigned(job, this.mailService);
    },

    'task-due-soon': async (job: Job<MailJobPayload>): Promise<void> => {
      await handleTaskDeadline(job, this.mailService);
    },

    'task-overdue': async (job: Job<MailJobPayload>): Promise<void> => {
      await handleTaskDeadline(job, this.mailService);
    },

    'training-cooldown-ended': async (job: Job<MailJobPayload>): Promise<void> => {
      await handleTrainingCooldownEnded(job, this.mailService);
    },

    // Hai loại dưới đây TRẢ VỀ kết quả thay vì `void`: không có bảng sổ nào, nên `returnvalue`
    // của job là dấu vết DUY NHẤT để tuyến tra cứu trạng thái đọc "đã gửi cho bao nhiêu người".
    'wallet-reset-warning': (
      job: Job<MailJobPayload>,
    ): Promise<WalletResetWarningKickoffResult> =>
      handleWalletResetWarning(job, this.walletResetPreview, this.publisher),

    'wallet-reset-warning-chunk': (
      job: Job<MailJobPayload>,
    ): Promise<WalletResetWarningChunkResult> =>
      handleWalletResetWarningChunk(job, this.mailService),
  };

  async process(job: Job<MailJobPayload>): Promise<MailJobHandlerResult> {
    // T-01-06: Runtime guard rejects malformed payloads pushed directly to
    // Redis (bypassing the TypeScript publisher).  A guard failure throws so
    // BullMQ retries the job per D-06, then dead-letters after 3 attempts.
    if (!isMailJobPayload(job.data)) {
      const msg = `Invalid MailJobPayload for job=${job.name} jobId=${job.id} — rejecting`;
      this.logger.error(`❌ ${msg}`);
      throw new Error(msg);
    }

    const handler = this.handlers[job.data.mailType];

    // This branch is only reachable if a new mailType is added to the union
    // without adding a matching handler — treat as an internal programming error.
    if (!handler) {
      const msg = `No handler registered for mailType="${job.data.mailType}" jobId=${job.id}`;
      this.logger.error(`❌ ${msg}`);
      throw new Error(msg);
    }

    try {
      const result = await handler(job);
      // T-01-04: Log only jobId, never the payload body (contains PII).
      this.logger.log(`✅ processed ${job.name} jobId=${job.id}`);
      return result;
    } catch (err) {
      this.logger.error(`❌ failed job=${job.name} jobId=${job.id}`);
      // Re-throw so BullMQ applies the retry/backoff from D-06.
      throw err;
    }
  }
}
