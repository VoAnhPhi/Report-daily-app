import { render } from '@react-email/render';
import { Job } from 'bullmq';
import { PrismaService } from '../../../common/services/prisma.service';
import { MailJobPayload } from '../mail-job.types';
import { GroupBuyPlacedEmail } from '../../templates/GroupBuyPlacedEmail';

// ---------------------------------------------------------------------------
// Minimal interface for the email-sending dependency.
//
// Using a structural interface (not importing MailService directly) keeps this
// handler independently testable without pulling in MailService's full
// dependency graph (Prisma, UsersLookupPort, etc.).
// ---------------------------------------------------------------------------

export interface TransactionalEmailSender {
  sendTransactionalEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void>;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * handleGroupBuyPlaced
 *
 * Claim-before-send sent-guard pattern (MAIL-02 / T-16-30 duplicate-mail mitigation):
 *
 *   1. Resolve the GroupBuyMember row by (groupBuyId, recipientUserId).
 *      If missing (member removed and row deleted) → return silently.
 *
 *   2. CLAIM atomically: updateMany({ where: { id, placedMailSentAt: null },
 *      data: { placedMailSentAt: now } }).
 *      If count === 0 → another run already claimed → return without sending
 *      (at-most-once; no duplicate email even if the previous run crashed
 *      after Resend returned success).
 *
 *   3. Only when count === 1: render + send via Resend.
 *      The claim is already persisted — do NOT write placedMailSentAt again
 *      after send.
 *
 * Accepted trade-off: if a run claims (count===1) then crashes BEFORE Resend
 * completes, that one member misses the placed email. The order is still
 * recorded in the DB. This is the safe direction for "never duplicate" over
 * "never miss" per MAIL-02 requirements.
 *
 * Throws on render/send error → BullMQ retries with exponential backoff (D-06).
 * A retry after a post-claim crash sees count===0 and returns without resending.
 *
 * @param job          BullMQ job; data is validated by isMailJobPayload before dispatch.
 * @param emailSender  Injected MailService (or mock in tests).
 * @param prisma       Injected PrismaService for the atomic claim.
 */
export async function handleGroupBuyPlaced(
  job: Job<MailJobPayload>,
  emailSender: TransactionalEmailSender,
  prisma: PrismaService,
): Promise<void> {
  const payload = job.data as Extract<MailJobPayload, { mailType: 'group-buy-placed' }>;
  const { groupBuyId, recipientUserId, data } = payload;

  // Step 1: resolve member row (need the id for the atomic claim).
  const member = await prisma.groupBuyMember.findFirst({
    where: { groupBuyId, userId: recipientUserId },
    select: { id: true },
  });

  if (!member) {
    // Member row gone (e.g. removed from group) — skip silently.
    return;
  }

  // Step 2: CLAIM — atomic updateMany where placedMailSentAt is still null.
  // If another run already claimed, count === 0 and we bail out (at-most-once).
  const claim = await prisma.groupBuyMember.updateMany({
    where: { id: member.id, placedMailSentAt: null },
    data: { placedMailSentAt: new Date() },
  });

  if (claim.count !== 1) {
    // Already claimed by a prior run — do NOT send (at-most-once guarantee).
    return;
  }

  // Step 3: claim.count === 1 → we own this send. Render + send now.
  // Do NOT write placedMailSentAt after send — the claim already persisted it.
  const html = await render(<GroupBuyPlacedEmail {...data} />);

  await emailSender.sendTransactionalEmail({
    to: data.recipientEmail,
    subject: `Đơn hàng nhóm đã được đặt — ${data.orderCode}`,
    html,
  });
}
