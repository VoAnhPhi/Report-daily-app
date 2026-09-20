import { render } from '@react-email/render';
import { Job } from 'bullmq';
import { MailJobPayload } from '../mail-job.types';
import { BugDoneEmail, bugDoneSubject } from '../../templates/BugDoneEmail';

export interface TransactionalEmailSender {
  sendTransactionalEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void>;
}

/**
 * handleBugDone — renders BugDoneEmail and sends to the creator only (D-08).
 */
export async function handleBugDone(
  job: Job<MailJobPayload>,
  emailSender: TransactionalEmailSender,
): Promise<void> {
  const payload = job.data as Extract<MailJobPayload, { mailType: 'bug-done' }>;
  const data = payload.data;

  const html = await render(<BugDoneEmail {...data} />);
  const subject = bugDoneSubject(data);

  await emailSender.sendTransactionalEmail({ to: data.creatorEmail, subject, html });
}
