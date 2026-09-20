import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  BUSINESS_FORM_REMINDER_QUEUE,
  BUSINESS_FORM_REMINDER_JOB,
  buildReminderJobId,
  BusinessFormReminderJob,
} from '../business-forms.constants';

@Injectable()
export class BusinessFormRemindersService {
  private readonly logger = new Logger(BusinessFormRemindersService.name);

  constructor(
    @InjectQueue(BUSINESS_FORM_REMINDER_QUEUE)
    private readonly queue: Queue<BusinessFormReminderJob>,
  ) {}

  private getDelayMs(): number {
    const days = parseInt(
      process.env.BUSINESS_FORM_NMI_REMINDER_DAYS ?? '3',
      10,
    );
    const safeDays = Number.isFinite(days) && days > 0 ? days : 3;
    return safeDays * 86_400_000;
  }

  async schedule(formId: string, reviewedAtMs: number): Promise<void> {
    const jobId = buildReminderJobId(formId, reviewedAtMs);
    try {
      await this.queue.add(
        BUSINESS_FORM_REMINDER_JOB,
        { formId },
        {
          jobId,
          delay: this.getDelayMs(),
          attempts: 3,
          backoff: { type: 'exponential', delay: 60_000 },
          removeOnComplete: { age: 86_400 * 7 },
          removeOnFail: { age: 86_400 * 30 },
        },
      );
      this.logger.log(`Scheduled reminder ${jobId}`);
    } catch (err) {
      this.logger.error(
        `Failed to schedule reminder ${jobId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async removePending(formId: string, reviewedAtMs: number): Promise<void> {
    const jobId = buildReminderJobId(formId, reviewedAtMs);
    try {
      const job = await this.queue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.log(`Removed pending reminder ${jobId}`);
      }
    } catch (err) {
      this.logger.warn(
        `Failed to remove reminder ${jobId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
