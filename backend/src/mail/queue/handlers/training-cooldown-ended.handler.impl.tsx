import { render } from '@react-email/render';
import { Job } from 'bullmq';
import { MailJobPayload } from '../mail-job.types';
import {
  TrainingVideoCooldownEndedEmail,
  trainingVideoCooldownEndedSubject,
} from '../../templates/TrainingVideoCooldownEndedEmail';

// ---------------------------------------------------------------------------
// Minimal interface for the email-sending dependency.
//
// Structural interface (not importing MailService directly) keeps this handler
// independently testable without pulling in MailService's full dependency graph.
// ---------------------------------------------------------------------------

export interface TransactionalEmailSender {
  sendTransactionalEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void>;
}

// ---------------------------------------------------------------------------
// Handler — Phase 54 D-10 kích-cầu "đã hết làm lạnh" (override videos only).
//
// Idempotency: the once-per-cycle gate is the DB marker cooldownEndNotifiedAt
// stamped by TrainingCooldownService.sweepCooldownEndedNotifications() — this
// handler just renders + sends. Throws on render/send error → BullMQ retries
// with exponential backoff, then dead-letters.
// ---------------------------------------------------------------------------

export async function handleTrainingCooldownEnded(
  job: Job<MailJobPayload>,
  emailSender: TransactionalEmailSender,
): Promise<void> {
  const payload = job.data as Extract<
    MailJobPayload,
    { mailType: 'training-cooldown-ended' }
  >;
  const { data } = payload;

  const html = await render(<TrainingVideoCooldownEndedEmail {...data} />);

  await emailSender.sendTransactionalEmail({
    to: data.recipientEmail,
    subject: trainingVideoCooldownEndedSubject(data),
    html,
  });
}
