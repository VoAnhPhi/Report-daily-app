import { render } from '@react-email/render';
import { Job } from 'bullmq';
import { MailJobPayload } from '../mail-job.types';
import {
  TaskDeadlineEmail,
  taskDeadlineSubject,
} from '../../templates/TaskDeadlineEmail';

export interface TransactionalEmailSender {
  sendTransactionalEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void>;
}

/**
 * handleTaskDeadline — render mail nhắc hạn (sắp hết hạn / quá hạn) và gửi tới từng người nhận đã dedupe.
 */
export async function handleTaskDeadline(
  job: Job<MailJobPayload>,
  emailSender: TransactionalEmailSender,
): Promise<void> {
  const payload = job.data as Extract<
    MailJobPayload,
    { mailType: 'task-due-soon' | 'task-overdue' }
  >;
  const variant = payload.mailType === 'task-overdue' ? 'overdue' : 'due-soon';
  const data = payload.data;

  const html = await render(<TaskDeadlineEmail variant={variant} {...data} />);
  const subject = taskDeadlineSubject(variant, data);

  const recipients = [...new Set(data.recipients.filter((to) => to))];
  for (const to of recipients) {
    await emailSender.sendTransactionalEmail({ to, subject, html });
  }
}
