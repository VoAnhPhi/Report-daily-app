import { Logger } from '@nestjs/common';
import type { CreateBatchOptions, CreateEmailOptions, Resend } from 'resend';

/**
 * Outbound mail guard.
 *
 * Before this guard existed, `MailService`/`EmailService` handed every payload
 * straight to Resend with a live API key, so a developer running the API on
 * localhost mailed real people from the production sender (lienhe@acta.vn).
 * Nothing in `src/mail` looked at the environment.
 *
 * The guard wraps the Resend client itself (`emails.send` and `batch.send`)
 * instead of the ~86 individual call sites, so a new call site cannot bypass it
 * and no existing response handling (`result.error`, `result.data.id`) changes
 * shape.
 *
 * Behaviour outside the production deployment:
 *   MAIL_REDIRECT_TO set        -> send, but force every recipient to that one
 *                                  address and prefix the subject with the
 *                                  original recipients.
 *   otherwise                   -> do not send; log `[MAIL-SKIPPED]` and return
 *                                  a success-shaped response.
 *
 * `APP_ENV` identifies the deployment tier because optimized development
 * images intentionally run with `NODE_ENV=production`. When APP_ENV is absent
 * (local/legacy runtimes), NODE_ENV remains the fallback.
 *
 * In the production deployment mail always goes out untouched: MAIL_ENABLED
 * cannot silence it and MAIL_REDIRECT_TO cannot divert it. A misconfigured
 * production env must never swallow customer mail.
 */

/** Fake message id returned for skipped sends so callers keep their happy path. */
export const SKIPPED_EMAIL_ID = 'mail-skipped-non-production';

export type MailDeliveryMode = 'send' | 'redirect' | 'skip';

function isProductionDeployment(): boolean {
  const appEnv = process.env.APP_ENV?.trim().toLowerCase();
  if (appEnv) return appEnv === 'production';
  return process.env.NODE_ENV?.trim().toLowerCase() === 'production';
}

/** Trimmed MAIL_REDIRECT_TO, or null when unset/blank. */
export function getMailRedirectTo(): string | null {
  const value = process.env.MAIL_REDIRECT_TO?.trim();
  return value ? value : null;
}

export function resolveMailDeliveryMode(): MailDeliveryMode {
  if (isProductionDeployment()) return 'send';
  if (getMailRedirectTo()) return 'redirect';
  return 'skip';
}

/**
 * True when the runtime will not talk to Resend at all. Callers that would
 * otherwise throw on a missing RESEND_API_KEY can use this to stay quiet, which
 * is what makes "just delete the key from .env" a safe local setup.
 */
export function isMailDeliverySuppressed(): boolean {
  return resolveMailDeliveryMode() === 'skip';
}

function toRecipientList(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  return [];
}

function readString(payload: CreateEmailOptions, key: string): string {
  const value = (payload as unknown as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

/** `to` + `cc` + `bcc` flattened for logging and for the redirect subject tag. */
function describeRecipients(payload: CreateEmailOptions): string {
  const record = payload as unknown as Record<string, unknown>;
  const recipients = [
    ...toRecipientList(record.to),
    ...toRecipientList(record.cc),
    ...toRecipientList(record.bcc),
  ];
  return recipients.length > 0 ? recipients.join(', ') : '(no recipient)';
}

/**
 * Rewrites a payload so it can only reach `redirectTo`. `cc`/`bcc` are dropped
 * rather than redirected — keeping them would send the same mail several times.
 */
function withRedirectedRecipients(
  payload: CreateEmailOptions,
  redirectTo: string,
): CreateEmailOptions {
  const original = describeRecipients(payload);
  const record: Record<string, unknown> = { ...payload };
  record.to = redirectTo;
  delete record.cc;
  delete record.bcc;
  record.subject = `[DEV -> ${original}] ${readString(payload, 'subject')}`;
  return record as unknown as CreateEmailOptions;
}

/**
 * Patches a Resend instance in place and returns it. Call once, in the service
 * constructor, right after `new Resend(...)`.
 */
export function applyMailDeliveryGuard(client: Resend, logger: Logger): Resend {
  const emailsApi = client.emails;
  const originalEmailSend = emailsApi.send.bind(emailsApi);

  emailsApi.send = async (payload, options) => {
    const mode = resolveMailDeliveryMode();

    if (mode === 'skip') {
      logger.warn(
        `[MAIL-SKIPPED] to=${describeRecipients(payload)} subject="${readString(payload, 'subject')}" ` +
          `— set MAIL_REDIRECT_TO to send only to a safe test inbox.`,
      );
      return { data: { id: SKIPPED_EMAIL_ID }, error: null, headers: null };
    }

    const redirectTo = mode === 'redirect' ? getMailRedirectTo() : null;
    if (redirectTo) {
      logger.warn(
        `[MAIL-REDIRECTED] to=${redirectTo} (original: ${describeRecipients(payload)})`,
      );
      return originalEmailSend(
        withRedirectedRecipients(payload, redirectTo),
        options,
      );
    }

    return originalEmailSend(payload, options);
  };

  const batchApi = client.batch;
  const originalBatchSend = batchApi.send.bind(batchApi);

  batchApi.send = (async (payload: CreateBatchOptions, options?: unknown) => {
    const mode = resolveMailDeliveryMode();

    if (mode === 'skip') {
      logger.warn(
        `[MAIL-SKIPPED] batch of ${payload.length} message(s) — ` +
          `set MAIL_REDIRECT_TO to send only to a safe test inbox.`,
      );
      return {
        data: { data: payload.map(() => ({ id: SKIPPED_EMAIL_ID })) },
        error: null,
        headers: null,
      };
    }

    const redirectTo = mode === 'redirect' ? getMailRedirectTo() : null;
    if (redirectTo) {
      // Every message in the batch lands in the same inbox — expect N copies.
      logger.warn(
        `[MAIL-REDIRECTED] batch of ${payload.length} message(s) to=${redirectTo}`,
      );
      return originalBatchSend(
        payload.map((message) => withRedirectedRecipients(message, redirectTo)),
        options as Parameters<typeof originalBatchSend>[1],
      );
    }

    return originalBatchSend(
      payload,
      options as Parameters<typeof originalBatchSend>[1],
    );
  }) as typeof batchApi.send;

  const mode = resolveMailDeliveryMode();
  if (mode === 'skip') {
    logger.warn(
      '[MAIL-GUARD] Outbound mail is DISABLED (non-production, no MAIL_REDIRECT_TO).',
    );
  } else if (mode === 'redirect') {
    logger.warn(
      `[MAIL-GUARD] Outbound mail is REDIRECTED to ${getMailRedirectTo()}.`,
    );
  }

  return client;
}
