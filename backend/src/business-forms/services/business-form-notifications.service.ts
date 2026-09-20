import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  BUSINESS_FORM_NOTIFICATION_QUEUE,
  BUSINESS_FORM_NOTIFICATION_JOB,
  BUSINESS_FORM_ZNS_CODES,
  BusinessFormDispatchJob,
  BusinessFormNotificationTransition,
  BusinessFormZnsCode,
} from '../business-forms.constants';

interface FormSnapshot {
  id: string;
  companyName: string;
  taxCode: string;
  adminNote: string | null;
  reviewedAt: Date | null;
  reviewedBy?: { fullName: string } | null;
}

@Injectable()
export class BusinessFormNotificationsService {
  private readonly logger = new Logger(BusinessFormNotificationsService.name);

  constructor(
    @InjectQueue(BUSINESS_FORM_NOTIFICATION_QUEUE)
    private readonly queue: Queue<BusinessFormDispatchJob>,
  ) {}

  async enqueueDispatch(job: BusinessFormDispatchJob): Promise<void> {
    try {
      await this.queue.add(BUSINESS_FORM_NOTIFICATION_JOB, job, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 86_400 * 7 },
        removeOnFail: { age: 86_400 * 30 },
      });
    } catch (err) {
      this.logger.error(
        `Failed to enqueue dispatch for form ${job.formId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  codeFor(transition: BusinessFormNotificationTransition): BusinessFormZnsCode {
    switch (transition) {
      case 'in_review':
        return BUSINESS_FORM_ZNS_CODES.STATUS_IN_REVIEW;
      case 'needs_more_info':
        return BUSINESS_FORM_ZNS_CODES.STATUS_NEEDS_MORE_INFO;
      case 'approved':
        return BUSINESS_FORM_ZNS_CODES.STATUS_APPROVED;
      case 'rejected':
        return BUSINESS_FORM_ZNS_CODES.STATUS_REJECTED;
      case 'admin-create':
        return BUSINESS_FORM_ZNS_CODES.ADMIN_CREATED;
    }
  }

  buildVariables(
    transition: BusinessFormNotificationTransition,
    form: FormSnapshot,
  ): Record<string, string> {
    const formUrl = `${process.env.SOCIAL_APP_URL ?? ''}/new-business/${form.id}/edit`;
    const base: Record<string, string> = {
      companyName: form.companyName,
      mstCode: form.taxCode,
      formId: form.id,
      formUrl,
    };
    if (transition === 'needs_more_info' || transition === 'rejected') {
      base.adminNote = form.adminNote ?? '';
    }
    if (transition === 'approved' || transition === 'admin-create') {
      base.reviewerName = form.reviewedBy?.fullName ?? '';
    }
    return base;
  }
}
