import { render } from '@react-email/render';
import { Job } from 'bullmq';
import { MailJobPayload } from '../mail-job.types';
import { BugExecutingEmail, bugExecutingSubject } from '../../templates/BugExecutingEmail';

export interface TransactionalEmailSender {
  sendTransactionalEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void>;
}

/**
 * handleBugExecuting — renders BugExecutingEmail and sends to the creator only
 * (D-08).
 */
export async function handleBugExecuting(
  job: Job<MailJobPayload>,
  emailSender: TransactionalEmailSender,
): Promise<void> {
  const payload = job.data as Extract<MailJobPayload, { mailType: 'bug-executing' }>;
  const data = payload.data;

  const html = await render(<BugExecutingEmail {...data} />);
  const subject = bugExecutingSubject(data);

  await emailSender.sendTransactionalEmail({ to: data.creatorEmail, subject, html });
}
