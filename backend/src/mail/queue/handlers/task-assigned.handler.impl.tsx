import { render } from '@react-email/render';
import { Job } from 'bullmq';
import { MailJobPayload } from '../mail-job.types';
import {
  TaskAssignedEmail,
  taskAssignedSubject,
} from '../../templates/TaskAssignedEmail';

export interface TransactionalEmailSender {
  sendTransactionalEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void>;
}

/**
 * handleTaskAssigned — render TaskAssignedEmail và gửi tới từng người nhận
 * (cùng vai trò trong một job). Gửi 1 lần / email đã dedupe.
 */
export async function handleTaskAssigned(
  job: Job<MailJobPayload>,
  emailSender: TransactionalEmailSender,
): Promise<void> {
  const payload = job.data as Extract<
    MailJobPayload,
    { mailType: 'task-assigned' }
  >;
  const data = payload.data;

  const html = await render(<TaskAssignedEmail {...data} />);
  const subject = taskAssignedSubject(data);

  const recipients = [...new Set(data.recipients.filter((to) => to))];
  for (const to of recipients) {
    await emailSender.sendTransactionalEmail({ to, subject, html });
  }
}
