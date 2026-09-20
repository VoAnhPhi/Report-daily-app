import { render } from '@react-email/render';
import { Job } from 'bullmq';
import { MailJobPayload } from '../mail-job.types';
import { BugReopenedEmail, bugReopenedSubject } from '../../templates/BugReopenedEmail';

export interface TransactionalEmailSender {
  sendTransactionalEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void>;
}

/**
 * handleBugReopened — renders BugReopenedEmail and sends to ALL assignees AND
 * the creator (D3). MailService.sendTransactionalEmail takes a single `to`, so
 * we send once per deduped recipient.
 */
export async function handleBugReopened(
  job: Job<MailJobPayload>,
  emailSender: TransactionalEmailSender,
): Promise<void> {
  const payload = job.data as Extract<MailJobPayload, { mailType: 'bug-reopened' }>;
  const data = payload.data;

  const html = await render(<BugReopenedEmail {...data} />);
  const subject = bugReopenedSubject(data);

  const recipients = [...new Set(data.recipients.filter((to) => to))];
  for (const to of recipients) {
    await emailSender.sendTransactionalEmail({ to, subject, html });
  }
}
