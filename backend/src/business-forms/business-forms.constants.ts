export const BUSINESS_FORM_REMINDER_QUEUE = 'business-form-reminders';
export const BUSINESS_FORM_REMINDER_JOB = 'send-needs-more-info-reminder';

export const BUSINESS_FORM_NOTIFICATION_QUEUE = 'business-form-notifications';
export const BUSINESS_FORM_NOTIFICATION_JOB = 'dispatch-status-notification';

export const BUSINESS_FORM_ACTIVE_TAXCODE_INDEX = 'business_form_active_taxcode_uq';

export const BUSINESS_FORM_ZNS_CODES = {
  STATUS_IN_REVIEW: 'business_form.status_in_review',
  STATUS_NEEDS_MORE_INFO: 'business_form.status_needs_more_info',
  STATUS_APPROVED: 'business_form.status_approved',
  STATUS_REJECTED: 'business_form.status_rejected',
  NEEDS_MORE_INFO_REMINDER: 'business_form.needs_more_info_reminder',
  ADMIN_CREATED: 'business_form.admin_created',
} as const;

export type BusinessFormZnsCode =
  (typeof BUSINESS_FORM_ZNS_CODES)[keyof typeof BUSINESS_FORM_ZNS_CODES];

export type BusinessFormNotificationTransition =
  | 'in_review'
  | 'needs_more_info'
  | 'approved'
  | 'rejected'
  | 'admin-create';

export interface BusinessFormDispatchJob {
  formId: string;
  fromStatus: string | null;
  toStatus: string;
  transition: BusinessFormNotificationTransition;
  actorId: string;
}

export interface BusinessFormReminderJob {
  formId: string;
}

export function buildReminderJobId(formId: string, reviewedAtMs: number): string {
  return `bf-nmi-reminder:${formId}:${reviewedAtMs}`;
}
