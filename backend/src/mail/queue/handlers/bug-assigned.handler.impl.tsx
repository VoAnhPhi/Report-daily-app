import { render } from '@react-email/render';
import { Job } from 'bullmq';
import { MailJobPayload } from '../mail-job.types';
import { BugAssignedEmail, bugAssignedSubject } from '../../templates/BugAssignedEmail';

export interface TransactionalEmailSender {
  sendTransactionalEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void>;
}

/**
 * handleBugAssigned — renders BugAssignedEmail and sends to ALL assignees AND
 * the creator (D4/D-08). MailService.sendTransactionalEmail takes a single
 * `to`, so we send once per deduped recipient.
 */
export async function handleBugAssigned(
  job: Job<MailJobPayload>,
  emailSender: TransactionalEmailSender,
): Promise<void> {
  const payload = job.data as Extract<MailJobPayload, { mailType: 'bug-assigned' }>;
  const data = payload.data;

  const html = await render(<BugAssignedEmail {...data} />);
  const subject = bugAssignedSubject(data);

  const recipients = [...new Set(data.recipients.filter((to) => to))];
  for (const to of recipients) {
    await emailSender.sendTransactionalEmail({ to, subject, html });
  }
}
