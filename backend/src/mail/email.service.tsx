import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import {
  applyMailDeliveryGuard,
  isMailDeliverySuppressed,
} from './mail-delivery.guard';
import { CompanyShell } from './templates/CompanyShell';
import { UsersLookupPort } from './interfaces/users-lookup.port';
import { SendEmailDto, UserRole } from './dto/send-email.dto';
import { convertDeltaToHtmlUtil } from './utils/quill-to-html.util';
import * as sanitizeHtml from 'sanitize-html';
import { PrismaService } from '../common/services/prisma.service';
import { Role, EmailType, Prisma } from '@prisma/client';
import { JwtPayload } from '../auth/jwt-payload';

export interface CurrentUser extends JwtPayload {
  role: Role;
}

export interface EmailResult {
  ok: boolean;
  count: number;
  batches?: number;
  data?: any;
  errors?: string[];
}

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @Inject('UsersLookupPort') private readonly usersLookup: UsersLookupPort,
    private readonly prisma: PrismaService,
  ) {
    this.resend = applyMailDeliveryGuard(
      new Resend(process.env.RESEND_API_KEY),
      this.logger,
    );
  }

  private validateEmailConfig() {
    // No Resend call happens while delivery is suppressed, so a missing key is
    // not a misconfiguration in that mode. See mail-delivery.guard.ts.
    if (isMailDeliverySuppressed()) return;
    if (!process.env.RESEND_API_KEY) {
      throw new BadRequestException(
        'RESEND_API_KEY environment variable is not set',
      );
    }
  }

  private async sendEmailWithRetry<T>(
    emailFunction: () => Promise<T>,
    email: string,
    emailType: string,
    maxRetries: number = 3,
    delayMs: number = 1000,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await emailFunction();
        this.logger.log(
          `${emailType} email sent successfully to ${email} on attempt ${attempt}`,
        );
        return result;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Failed to send ${emailType} email to ${email} (attempt ${attempt}/${maxRetries}): ${error.message}`,
        );

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const waitTime = delayMs * Math.pow(2, attempt - 1);
          this.logger.log(
            `Retrying ${emailType} email send to ${email} in ${waitTime}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    // All retries failed
    this.logger.error(
      `Failed to send ${emailType} email to ${email} after ${maxRetries} attempts. Last error: ${lastError?.message}`,
      lastError?.stack,
    );
    throw lastError;
  }

  /**
   * Main method to send emails
   */
  async send(
    dto: SendEmailDto,
    currentUser: CurrentUser,
  ): Promise<EmailResult> {
    this.validateEmailConfig();

    // Check permissions for broadcast emails
    this.checkBroadcastPermissions(dto, currentUser);

    // Resolve all recipients
    const toEmails = await this.resolveRecipients(dto);

    if (toEmails.length === 0) {
      throw new BadRequestException('No valid recipients found');
    }

    // Build HTML content
    const htmlContent = await this.buildHtml(dto);

    // Map attachments
    const attachments = this.mapAttachments(dto);

    // Send emails and save to database
    const emailResult = await this.sendEmails(
      toEmails,
      dto,
      htmlContent,
      attachments,
    );

    // Save to database for analytics and history
    await this.saveSentEmail(dto, currentUser, toEmails, emailResult);

    return emailResult;
  }

  private checkBroadcastPermissions(
    dto: SendEmailDto,
    currentUser: CurrentUser,
  ) {
    const wantsBroadcast =
      (dto.recipients.roles?.length ?? 0) > 0 ||
      (dto.recipients.userIds?.length ?? 0) > 0 ||
      (dto.recipients.emails?.length ?? 0) > 5;

    if (
      wantsBroadcast &&
      currentUser.role !== Role.admin &&
      currentUser.role !== Role.moderator
    ) {
      throw new ForbiddenException(
        'Only admin and moderator roles can send broadcast emails',
      );
    }
  }

  private async resolveRecipients(dto: SendEmailDto): Promise<string[]> {
    const emails = new Set<string>();

    // Add direct emails
    dto.recipients.emails?.forEach((email) => emails.add(email.toLowerCase()));

    // Add users by IDs
    if (dto.recipients.userIds?.length) {
      const users = await this.usersLookup.findUsersByIds(
        dto.recipients.userIds,
      );
      users.forEach((user) => emails.add(user.email.toLowerCase()));
    }

    // Add users by roles
    if (dto.recipients.roles?.length) {
      const users = await this.usersLookup.findUsersByRoles(
        dto.recipients.roles,
        dto.includeInactiveUsers,
      );
      users.forEach((user) => emails.add(user.email.toLowerCase()));
    }

    return Array.from(emails);
  }

  private async buildHtml(dto: SendEmailDto): Promise<string> {
    let contentHtml = '';

    if (dto.html) {
      contentHtml = dto.html;
    } else if (dto.quillDelta) {
      contentHtml = convertDeltaToHtmlUtil(dto.quillDelta);
    } else {
      throw new BadRequestException(
        'Either html or quillDelta must be provided',
      );
    }

    // Sanitize HTML if requested (default true)
    if (dto.sanitizeHtml !== false) {
      contentHtml = this.sanitizeHtmlContent(contentHtml);
    }

    // Render with company shell
    return render(
      <CompanyShell
        title={dto.subject}
        previewText={dto.previewText}
        greeting={dto.greeting}
        contentHtml={contentHtml}
        footerNote={dto.footerNote}
      />,
    );
  }

  private sanitizeHtmlContent(html: string): string {
    return sanitizeHtml(html, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        'img',
        'span',
        'div',
        'p',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'blockquote',
        'code',
        'pre',
        'br',
        'hr',
      ]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        '*': ['style', 'class'],
        a: ['href', 'target', 'rel'],
        img: ['src', 'alt', 'width', 'height', 'style'],
      },
      allowedSchemes: ['http', 'https', 'mailto', 'data'],
      allowProtocolRelative: false,
      transformTags: {
        script: sanitizeHtml.simpleTransform('script', {
          'data-testid': 'script',
        }),
        style: sanitizeHtml.simpleTransform('style', {
          'data-testid': 'style',
        }),
      },
    });
  }

  private mapAttachments(dto: SendEmailDto) {
    return (
      dto.attachments?.map((att) => {
        // If custom filename is provided, preserve the original file extension
        let finalFilename = att.filename;
        if (att.customFilename && att.customFilename.trim()) {
          const originalExtension = att.filename.split('.').pop();
          const customName = att.customFilename.trim();
          // Only add extension if the custom name doesn't already have one
          finalFilename = customName.includes('.')
            ? customName
            : `${customName}.${originalExtension}`;
        }

        return {
          filename: finalFilename,
          path: att.path,
        };
      }) || []
    );
  }

  /**
   * Normalize tags to comply with Resend rules:
   * - ASCII letters, numbers, underscores, or dashes only
   * - Convert unicode to ASCII (strip diacritics), lowercase
   * - Replace spaces with dashes, remove invalid characters
   * - Collapse duplicate separators, trim edges
   */
  private normalizeResendTags(tags: string[] | undefined | null): string[] {
    if (!tags || tags.length === 0) return [];

    const normalized: string[] = [];
    const dropped: string[] = [];

    for (const rawTag of tags) {
      if (typeof rawTag !== 'string') continue;

      const ascii = rawTag
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '') // strip diacritics
        .toLowerCase();

      // Replace spaces with dashes, remove invalid chars, collapse repeats
      let safe = ascii
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/_{2,}/g, '_')
        .replace(/^[-_]+|[-_]+$/g, '');

      // Enforce non-empty after cleanup and reasonable length
      if (safe.length === 0) {
        dropped.push(rawTag);
        continue;
      }
      if (safe.length > 50) {
        safe = safe.slice(0, 50);
      }
      normalized.push(safe);
    }

    if (dropped.length > 0) {
      this.logger.warn(
        `Some tags were dropped due to Resend validation rules: ${dropped.join(', ')}`,
      );
    }

    return Array.from(new Set(normalized));
  }

  private async sendEmails(
    toEmails: string[],
    dto: SendEmailDto,
    htmlContent: string,
    attachments: any[],
  ): Promise<EmailResult> {
    const maxBatchSize = 100;
    const results: EmailResult = {
      ok: true,
      count: 0,
      batches: 0,
      errors: [],
    };

    // Normalize tags to satisfy Resend validation rules
    const safeTags = this.normalizeResendTags(dto.tags);

    /**
     * The two branches below differ in PRIVACY, not only in size.
     *
     * The single-send branch puts every address into one `to` array, so all
     * recipients read each other's address. The batch branch builds a separate
     * message per address (`to: email`) and still costs ONE HTTP call per
     * chunk. `perRecipientDelivery` lets a caller that must not leak addresses
     * take the batch branch even for a short list — the caller's alternative,
     * calling `send()` once per recipient, would be N sequential HTTP calls
     * (slow enough to trip a browser timeout on the caller's own route) plus N
     * `SentEmail` rows and N analytics increments for what is ONE mail-out.
     */
    const perRecipient = dto.perRecipientDelivery === true;

    try {
      if (!perRecipient && toEmails.length <= maxBatchSize) {
        // Send single batch
        const resendResponse = await this.sendEmailWithRetry(
          () =>
            this.resend.emails.send({
              from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
              to: toEmails,
              subject: dto.subject,
              html: htmlContent,
              cc: dto.cc,
              bcc: dto.bcc,
              attachments,
              headers: {
                'Content-Language': 'vi',
                'X-Language': 'Vietnamese',
                'X-Avatar-URL':
                  'https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vCxySMMK6XOR7LjVSTtyk1oFdHKD9E5xfCw3b',
              },
              tags: safeTags.map((tag) => ({ name: tag, value: tag })),
            }),
          `batch of ${toEmails.length} recipients`,
          'batch email',
        );

        // Validate Resend response
        if (!this.validateResendResponse(resendResponse, results)) {
          return results;
        }

        results.count = toEmails.length;
        results.batches = 1;
        results.data = resendResponse;
      } else {
        // Send in batches
        const batches: string[][] = [];
        for (let i = 0; i < toEmails.length; i += maxBatchSize) {
          batches.push(toEmails.slice(i, i + maxBatchSize));
        }

        results.batches = batches.length;

        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];

          const resendResponse = await this.sendEmailWithRetry(
            () =>
              this.resend.batch.send(
                batch.map((email) => ({
                  from: 'Liên minh Cộng đồng thực chiến (ACTA) <lienhe@acta.vn>',
                  to: email,
                  subject: dto.subject,
                  html: htmlContent,
                  cc: dto.cc,
                  bcc: dto.bcc,
                  attachments,
                  headers: {
                    'Content-Language': 'vi',
                    'X-Language': 'Vietnamese',
                    'X-Avatar-URL':
                      'https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vCxySMMK6XOR7LjVSTtyk1oFdHKD9E5xfCw3b',
                  },
                  tags: safeTags.map((tag) => ({ name: tag, value: tag })),
                })),
              ),
            `batch ${i + 1}/${batches.length} (${batch.length} recipients)`,
            'batch email',
          );

          // Validate Resend response for batch
          if (!this.validateResendResponse(resendResponse, results)) {
            this.logger.error(`Batch ${i + 1} failed validation`);
            continue;
          }

          results.count += batch.length;
        }
      }

      this.logger.log(
        `Email sent successfully to ${results.count} recipients in ${results.batches} batches`,
      );
      return results;
    } catch (error) {
      results.ok = false;
      results.errors = [error.message];
      this.logger.error(`Failed to send emails: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Validate Resend API response and update results accordingly
   */
  private validateResendResponse(response: any, results: EmailResult): boolean {
    try {
      // Check if response exists and has expected structure
      if (!response) {
        results.errors?.push('No response from Resend API');
        results.ok = false;
        return false;
      }

      // Log the full response for debugging
      this.logger.debug(
        'Resend API response:',
        JSON.stringify(response, null, 2),
      );

      // Check for errors in the response
      if (response.error) {
        results.errors?.push(
          `Resend API error: ${response.error.message || response.error}`,
        );
        results.ok = false;
        return false;
      }

      // Check if the response indicates success.
      // Two shapes are legitimate, and they must be tested in this order:
      // a batch send answers `{ data: { data: [{ id }, …] } }` — a LIST of ids,
      // one per message, with no `id` of its own — while a single send answers
      // `{ data: { id } }`. Testing only the second shape made every SUCCESSFUL
      // batch fall through to "Unexpected Resend response structure" below and
      // be reported as a failure, which is the worst possible lie: the mail is
      // already gone and the caller is told it was not sent.
      if (response.data && Array.isArray(response.data.data)) {
        this.logger.log(
          `Resend API accepted a batch of ${response.data.data.length} message(s)`,
        );
        return true;
      }

      if (response.data && response.data.id) {
        this.logger.log(
          `Resend API accepted email with ID: ${response.data.id}`,
        );
        return true;
      }

      // If we get here, the response structure is unexpected
      results.errors?.push(
        `Unexpected Resend response structure: ${JSON.stringify(response)}`,
      );
      results.ok = false;
      return false;
    } catch (error) {
      results.errors?.push(
        `Error validating Resend response: ${error.message}`,
      );
      results.ok = false;
      return false;
    }
  }

  /**
   * Dry run method for previewing emails without sending
   */
  async dryRun(dto: SendEmailDto): Promise<{
    recipientCount: number;
    htmlContent: string;
    recipients: string[];
  }> {
    this.validateEmailConfig();

    // Resolve recipients (without permission check for dry run)
    const recipients = await this.resolveRecipients(dto);

    if (recipients.length === 0) {
      throw new BadRequestException('No valid recipients found');
    }

    // Build HTML content
    const htmlContent = await this.buildHtml(dto);

    return {
      recipientCount: recipients.length,
      htmlContent,
      recipients,
    };
  }

  /**
   * Save sent email to database for analytics and history
   */
  private async saveSentEmail(
    dto: SendEmailDto,
    currentUser: CurrentUser,
    recipients: string[],
    result: EmailResult,
  ): Promise<void> {
    try {
      // Create sent email record
      const sentEmail = await this.prisma.sentEmail.create({
        data: {
          subject: dto.subject,
          content: dto.html || '',
          recipientCount: recipients.length,
          status: result.ok ? 'sent' : 'failed',
          priority: dto.tags?.includes('urgent') ? 'urgent' : 'normal',
          tags: dto.tags || [],
          metadata: {
            greeting: dto.greeting,
            footerNote: dto.footerNote,
            previewText: dto.previewText,
          },
          createdById: currentUser.id,
        },
      });

      // Create recipients records
      await this.prisma.emailRecipient.createMany({
        data: recipients.map((email) => ({
          email,
          sentEmailId: sentEmail.id,
          status: result.ok ? 'sent' : 'failed',
        })),
      });

      // Update daily analytics
      await this.updateDailyAnalytics(sentEmail, recipients.length);

      this.logger.log(
        `Saved sent email ${sentEmail.id} with ${recipients.length} recipients`,
      );
    } catch (error) {
      this.logger.error('Failed to save sent email to database', error);
      // Don't throw - we don't want DB errors to break email sending
    }
  }

  /**
   * Update daily email analytics
   */
  private async updateDailyAnalytics(
    sentEmail: any,
    recipientCount: number,
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.emailAnalyticsDaily.upsert({
      where: { date: today },
      update: {
        sentCount: { increment: 1 },
        deliveredCount:
          sentEmail.status === 'sent'
            ? { increment: recipientCount }
            : undefined,
      },
      create: {
        date: today,
        sentCount: 1,
        deliveredCount: sentEmail.status === 'sent' ? recipientCount : 0,
      },
    });
  }

  /**
   * Get email templates from database
   */
  async getTemplates(): Promise<any[]> {
    return this.prisma.emailTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create email template in database
   */
  async createTemplate(
    templateData: {
      name: string;
      subject: string;
      content: string;
      quillDelta?: Prisma.InputJsonValue;
      category: EmailType;
      description?: string;
    },
    currentUser: CurrentUser,
  ): Promise<unknown> {
    return this.prisma.emailTemplate.create({
      data: {
        name: templateData.name,
        subject: templateData.subject,
        content: templateData.content,
        quillDelta: templateData.quillDelta,
        category: templateData.category,
        description: templateData.description,
        createdById: currentUser.id,
      },
    });
  }

  /**
   * Get email drafts from database
   */
  async getDrafts(currentUser: CurrentUser): Promise<any[]> {
    return this.prisma.emailDraft.findMany({
      where: { createdById: currentUser.id },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Save email draft to database
   */
  async saveDraft(
    dto: SendEmailDto,
    currentUser: CurrentUser,
    draftId?: string,
  ): Promise<any> {
    const draftData = {
      subject: dto.subject,
      content: dto.html || '',
      // Prisma Json column accepts the structured shape via InputJsonValue.
      recipients: dto.recipients as unknown as Prisma.InputJsonValue,
      metadata: {
        greeting: dto.greeting,
        footerNote: dto.footerNote,
        previewText: dto.previewText,
        cc: dto.cc,
        bcc: dto.bcc,
        tags: dto.tags,
      } as Prisma.InputJsonValue,
      createdById: currentUser.id,
    };

    if (draftId) {
      return this.prisma.emailDraft.update({
        where: { id: draftId },
        data: draftData,
      });
    } else {
      return this.prisma.emailDraft.create({
        data: draftData,
      });
    }
  }

  /**
   * Get email draft by ID
   */
  async getDraft(draftId: string): Promise<any> {
    return this.prisma.emailDraft.findUnique({
      where: { id: draftId },
    });
  }

  /**
   * Delete email draft
   */
  async deleteDraft(draftId: string): Promise<void> {
    await this.prisma.emailDraft.delete({
      where: { id: draftId },
    });
  }

  /**
   * Get email history with pagination
   */
  async getEmailHistory(
    page: number = 1,
    limit: number = 20,
    currentUser?: CurrentUser,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (currentUser) {
      where.createdById = currentUser.id;
    }

    const [data, total] = await Promise.all([
      this.prisma.sentEmail.findMany({
        where,
        include: {
          template: true,
          recipients: {
            select: {
              email: true,
              status: true,
              openedAt: true,
              clickedAt: true,
            },
          },
        },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.sentEmail.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Update email template in database
   */
  async updateTemplate(
    templateId: string,
    templateData: Partial<{
      name: string;
      subject: string;
      content: string;
      quillDelta?: Prisma.InputJsonValue;
      category: EmailType;
      description?: string;
    }>,
    _currentUser: CurrentUser,
  ): Promise<unknown> {
    return this.prisma.emailTemplate.update({
      where: { id: templateId },
      data: {
        ...templateData,
        // category is already EmailType-typed in templateData; spread carries it through.
      },
    });
  }

  /**
   * Delete email template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    await this.prisma.emailTemplate.delete({
      where: { id: templateId },
    });
  }

  /**
   * Get user counts by roles for email composition UI
   */
  async getUserCountsByRoles(): Promise<
    Record<string, { active: number; inactive: number; total: number }>
  > {
    const userCounts = await this.prisma.user.groupBy({
      by: ['role', 'isActive'],
      _count: {
        id: true,
      },
    });

    const result: Record<
      string,
      { active: number; inactive: number; total: number }
    > = {};

    // Initialize all roles
    const allRoles = ['admin', 'collaborator', 'moderator', 'user'];
    allRoles.forEach((role) => {
      result[role] = { active: 0, inactive: 0, total: 0 };
    });

    // Populate counts
    userCounts.forEach(({ role, isActive, _count }) => {
      if (result[role]) {
        if (isActive) {
          result[role].active = _count.id;
        } else {
          result[role].inactive = _count.id;
        }
        result[role].total = result[role].active + result[role].inactive;
      }
    });

    return result;
  }

  /**
   * Get unique recipient statistics across all sent emails
   */
  async getUniqueRecipientStats(currentUser?: CurrentUser): Promise<{
    totalUniqueRecipients: number;
    totalEmailsSent: number;
    averageRecipientsPerEmail: number;
  }> {
    const where: any = {};
    if (currentUser) {
      where.createdById = currentUser.id;
    }

    // Get all unique email addresses that have received emails
    const uniqueRecipients = await this.prisma.emailRecipient.findMany({
      where: {
        sentEmail: where,
      },
      select: {
        email: true,
      },
      distinct: ['email'],
    });

    // Get total emails sent
    const totalEmailsSent = await this.prisma.sentEmail.count({ where });

    // Get total recipient count across all emails
    const totalRecipients = await this.prisma.emailRecipient.count({
      where: {
        sentEmail: where,
      },
    });

    const averageRecipientsPerEmail =
      totalEmailsSent > 0 ? Math.round(totalRecipients / totalEmailsSent) : 0;

    return {
      totalUniqueRecipients: uniqueRecipients.length,
      totalEmailsSent,
      averageRecipientsPerEmail,
    };
  }
}
