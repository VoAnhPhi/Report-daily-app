import { render } from '@react-email/render';
import * as React from 'react';
import { Job } from 'bullmq';
import { MailJobPayload } from '../mail-job.types';
import {
  OrderDeliveredEmail,
  orderDeliveredSubject,
} from '../../templates/OrderDeliveredEmail';

// ---------------------------------------------------------------------------
// Minimal interface for the email-sending dependency.
//
// Mirrors the pattern from order-completed-with-points.handler.tsx: a structural
// interface (not importing MailService directly) keeps this handler
// independently testable without pulling in MailService's full dependency
// graph (Prisma, UsersLookupPort, etc.).
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
 * handleOrderDelivered
 *
 * Renders the `OrderDeliveredEmail` React Email template and sends it via
 * the provided email sender dependency.
 *
 * Standalone function (not a class method) so it can be unit-tested without
 * instantiating `MailNotificationsProcessor` or its BullMQ dependencies.
 *
 * Throws on render or send error — lets BullMQ retry per D-06 (3 attempts,
 * exponential backoff).
 *
 * @param job          - The BullMQ job; job.data must be a valid
 *                       `order-delivered` MailJobPayload
 *                       (guaranteed by the processor's `isMailJobPayload`
 *                       guard before dispatch).
 * @param emailSender  - Injected email-sending dependency (MailService or mock).
 */
export async function handleOrderDelivered(
  job: Job<MailJobPayload>,
  emailSender: TransactionalEmailSender,
): Promise<void> {
  // The processor's isMailJobPayload guard already validated the payload before
  // dispatching here, so this narrow cast is safe.
  const payload = job.data as Extract<
    MailJobPayload,
    { mailType: 'order-delivered' }
  >;
  const data = payload.data;

  // Render React Email template to HTML string.
  // render() is async in @react-email/render v1+.
  const html = await render(React.createElement(OrderDeliveredEmail, data));

  const subject = orderDeliveredSubject(data);

  // Delegate send to the injected dependency — throws on Resend error so
  // BullMQ retries with exponential backoff (D-06).
  await emailSender.sendTransactionalEmail({
    to: data.customerEmail,
    subject,
    html,
  });
}
