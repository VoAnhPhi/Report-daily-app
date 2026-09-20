import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DailyReportEmailTemplateKey,
  DailyReportEmailTemplateStatus,
  Prisma,
} from '@prisma/client';
import * as sanitizeHtml from 'sanitize-html';
import { PrismaService } from 'src/common/services/prisma.service';
import { MailService } from 'src/mail/mail.service';
import { renderDailyReportEmail } from 'src/mail/templates/DailyReportShell';
import {
  PublishDailyReportEmailTemplateDto,
  UpdateDailyReportEmailTemplateDto,
} from '../dto/daily-report-email-template.dto';
import {
  DAILY_REPORT_HARD_STOP_LABEL,
  DAILY_REPORT_LEADER_SUBMISSION_LABEL,
  dailyReportLink,
} from '../constants/daily-report.constants';
import { DAILY_REPORT_EMAIL_CONTENT } from '../constants/daily-report-email-content';
import { randomUUID } from 'node:crypto';

type TemplateVariables = Record<string, string | number>;

interface TemplateDefinition {
  allowed: string[];
  required: string[];
  fallbackSubject: string;
  fallbackContent: string;
}

const COMMON = [
  'recipientName',
  'scopeName',
  'reportDate',
  'actionUrl',
  'hardStopTime',
  'leaderSubmitTime',
];

const REQUIRED_COMMON = COMMON.filter((name) => name !== 'leaderSubmitTime');

const DEFINITIONS: Record<DailyReportEmailTemplateKey, TemplateDefinition> = {
  DAILY_REPORT_READY: {
    allowed: COMMON,
    required: REQUIRED_COMMON,
    fallbackSubject: DAILY_REPORT_EMAIL_CONTENT.DAILY_REPORT_READY.subject,
    fallbackContent: DAILY_REPORT_EMAIL_CONTENT.DAILY_REPORT_READY.content,
  },
  DAILY_REPORT_REMINDER: {
    allowed: [...COMMON, 'remainingTime'],
    required: [...REQUIRED_COMMON, 'remainingTime'],
    fallbackSubject: DAILY_REPORT_EMAIL_CONTENT.DAILY_REPORT_REMINDER.subject,
    fallbackContent: DAILY_REPORT_EMAIL_CONTENT.DAILY_REPORT_REMINDER.content,
  },
  DAILY_REPORT_LEADER_SUMMARY: {
    allowed: [...COMMON, 'submittedCount', 'missingCount', 'totalCount'],
    required: [
      ...REQUIRED_COMMON,
      'submittedCount',
      'missingCount',
      'totalCount',
    ],
    fallbackSubject:
      DAILY_REPORT_EMAIL_CONTENT.DAILY_REPORT_LEADER_SUMMARY.subject,
    fallbackContent:
      DAILY_REPORT_EMAIL_CONTENT.DAILY_REPORT_LEADER_SUMMARY.content,
  },
};

/** Nhãn cảnh báo của test-send — nằm TRONG thân email, trước khi bọc khung ACTA. */
const TEST_BANNER =
  '<div style="background-color:#fff3cd;border:1px solid #facc15;border-radius:8px;padding:12px 16px;margin:0 0 24px;color:#854d0e;font-size:14px;line-height:1.5;">' +
  '<strong>TEST</strong> — không phải sự kiện Daily Report thật.</div>';

/**
 * Biến mẫu cho preview / test-send trong màn admin.
 *
 * Là HÀM chứ không phải hằng: `actionUrl` dựng qua `dailyReportLink` nên phải
 * đọc `FRONTEND_DOMAIN` lúc gọi, không phải lúc import module — nếu chốt sớm,
 * preview trên dev sẽ hiện link production.
 */
const sampleVariables = (): TemplateVariables => ({
  recipientName: 'Nguyễn Văn A',
  scopeName: 'Nhóm Kinh doanh Miền Nam',
  reportDate: '17/08/2026',
  actionUrl: dailyReportLink('demo'),
  hardStopTime: DAILY_REPORT_HARD_STOP_LABEL,
  leaderSubmitTime: DAILY_REPORT_LEADER_SUBMISSION_LABEL,
  remainingTime: '50 phút',
  submittedCount: 8,
  missingCount: 2,
  totalCount: 10,
});

const VARIABLE_PATTERN = /{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g;

@Injectable()
export class DailyReportEmailTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async list() {
    const templates = await this.prisma.dailyReportEmailTemplate.findMany({
      include: {
        currentVersion: {
          select: {
            id: true,
            version: true,
            publishedAt: true,
            publishedById: true,
          },
        },
      },
      orderBy: { systemKey: 'asc' },
    });
    return templates.map((template) => ({
      ...template,
      isSystem: true,
      ...this.definitionMeta(template.systemKey),
    }));
  }

  async updateDraft(
    key: DailyReportEmailTemplateKey,
    dto: UpdateDailyReportEmailTemplateDto,
    userId: string,
  ) {
    await this.getByKey(key);
    const updated = await this.prisma.dailyReportEmailTemplate.updateMany({
      where: { systemKey: key, draftRevision: dto.expectedRevision },
      data: {
        draftSubject: dto.subject,
        draftContent: dto.content,
        draftQuillDelta:
          (dto.quillDelta as Prisma.InputJsonValue | undefined) ?? undefined,
        draftRevision: { increment: 1 },
        updatedById: userId,
      },
    });
    if (updated.count !== 1) {
      throw new ConflictException(
        'Mẫu email đã được người khác cập nhật; vui lòng tải lại',
      );
    }
    const template = await this.getByKey(key);
    await this.writeAudit(this.prisma, template.id, 'DRAFT_UPDATED', userId, {
      revision: template.draftRevision,
    });
    return template;
  }

  async validateDraft(key: DailyReportEmailTemplateKey) {
    const template = await this.getByKey(key);
    return this.validateContent(
      key,
      template.draftSubject,
      template.draftContent,
    );
  }

  async preview(
    key: DailyReportEmailTemplateKey,
    variables: TemplateVariables = {},
  ) {
    const rendered = await this.renderDraft(key, variables);
    return {
      systemKey: key,
      subject: rendered.subject,
      html: await renderDailyReportEmail(rendered.subject, rendered.html),
      variables: rendered.variables,
      isTest: false,
    };
  }

  /**
   * Render bản nháp thành thân email đã sanitize — CHƯA bọc khung ACTA.
   *
   * Tách riêng vì test-send còn phải chèn nhãn TEST vào giữa thân và khung;
   * nếu bọc trước thì nhãn sẽ nằm ngoài `<!DOCTYPE html>`.
   */
  private async renderDraft(
    key: DailyReportEmailTemplateKey,
    variables: TemplateVariables,
  ) {
    const template = await this.getByKey(key);
    const validation = this.validateContent(
      key,
      template.draftSubject,
      template.draftContent,
    );
    if (!validation.valid) throw new BadRequestException(validation);
    const merged = { ...sampleVariables(), ...variables };
    return {
      ...this.render(template.draftSubject, template.draftContent, merged),
      variables: merged,
    };
  }

  async publish(
    key: DailyReportEmailTemplateKey,
    dto: PublishDailyReportEmailTemplateDto,
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const template = await tx.dailyReportEmailTemplate.findUnique({
        where: { systemKey: key },
      });
      if (!template) throw new NotFoundException('Không tìm thấy mẫu email');
      if (template.draftRevision !== dto.expectedRevision) {
        throw new ConflictException(
          'Mẫu email đã được người khác cập nhật; vui lòng tải lại',
        );
      }
      const validation = this.validateContent(
        key,
        template.draftSubject,
        template.draftContent,
      );
      if (!validation.valid) throw new BadRequestException(validation);
      const claimed = await tx.dailyReportEmailTemplate.updateMany({
        where: {
          id: template.id,
          draftRevision: dto.expectedRevision,
        },
        data: {
          draftRevision: { increment: 1 },
          updatedById: userId,
        },
      });
      if (claimed.count !== 1) {
        throw new ConflictException(
          'Mẫu email đã được người khác cập nhật; vui lòng tải lại',
        );
      }
      const latest = await tx.dailyReportEmailTemplateVersion.aggregate({
        where: { templateId: template.id },
        _max: { version: true },
      });
      const version = await tx.dailyReportEmailTemplateVersion.create({
        data: {
          templateId: template.id,
          version: (latest._max.version ?? 0) + 1,
          subject: template.draftSubject,
          content: template.draftContent,
          quillDelta:
            (template.draftQuillDelta as Prisma.InputJsonValue | null) ??
            undefined,
          publishedById: userId,
        },
      });
      await tx.dailyReportEmailTemplate.update({
        where: { id: template.id },
        data: {
          status: DailyReportEmailTemplateStatus.PUBLISHED,
          currentVersionId: version.id,
          updatedById: userId,
        },
      });
      await this.writeAudit(tx, template.id, 'PUBLISHED', userId, {
        version: version.version,
        versionId: version.id,
      });
      return version;
    });
  }

  async versions(key: DailyReportEmailTemplateKey) {
    const template = await this.getByKey(key);
    return this.prisma.dailyReportEmailTemplateVersion.findMany({
      where: { templateId: template.id },
      orderBy: { version: 'desc' },
    });
  }

  async audits(key: DailyReportEmailTemplateKey) {
    const template = await this.getByKey(key);
    return this.prisma.$queryRaw<
      Array<{
        id: string;
        action: string;
        actorId: string;
        metadata: Prisma.JsonValue | null;
        createdAt: Date;
      }>
    >`
      SELECT "id", "action", "actorId", "metadata", "createdAt"
      FROM "daily_report_email_template_audits"
      WHERE "templateId" = ${template.id}
      ORDER BY "createdAt" DESC
      LIMIT 100`;
  }

  async setInactive(key: DailyReportEmailTemplateKey, userId: string) {
    const template = await this.getByKey(key);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.dailyReportEmailTemplate.update({
        where: { systemKey: key },
        data: {
          status: DailyReportEmailTemplateStatus.INACTIVE,
          updatedById: userId,
        },
      });
      await this.writeAudit(tx, template.id, 'INACTIVATED', userId);
      return updated;
    });
  }

  async testSend(
    key: DailyReportEmailTemplateKey,
    userId: string,
    variables: TemplateVariables = {},
  ) {
    const [rendered, user, template] = await Promise.all([
      this.renderDraft(key, variables),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      }),
      this.getByKey(key),
    ]);
    if (!user?.email) {
      throw new BadRequestException('Tài khoản admin chưa có email nhận thử');
    }
    await this.mail.sendTransactionalEmail({
      to: user.email,
      subject: `[TEST] ${rendered.subject}`,
      html: await renderDailyReportEmail(
        rendered.subject,
        `${TEST_BANNER}${rendered.html}`,
      ),
    });
    await this.writeAudit(this.prisma, template.id, 'TEST_SENT', userId, {
      recipient: user.email,
    });
    return { success: true, recipient: user.email };
  }

  async renderPublished(
    key: DailyReportEmailTemplateKey,
    variables: TemplateVariables,
  ): Promise<{
    subject: string;
    html: string;
    templateVersionId: string | null;
  }> {
    const template = await this.prisma.dailyReportEmailTemplate.findUnique({
      where: { systemKey: key },
      include: { currentVersion: true },
    });
    const definition = DEFINITIONS[key];
    const published =
      template?.status === DailyReportEmailTemplateStatus.PUBLISHED
        ? template.currentVersion
        : null;
    const rendered = this.render(
      published?.subject ?? definition.fallbackSubject,
      published?.content ?? definition.fallbackContent,
      {
        ...variables,
        hardStopTime: variables.hardStopTime ?? DAILY_REPORT_HARD_STOP_LABEL,
        leaderSubmitTime:
          variables.leaderSubmitTime ?? DAILY_REPORT_LEADER_SUBMISSION_LABEL,
      },
    );
    if (/{{\s*[A-Za-z]/.test(`${rendered.subject}${rendered.html}`)) {
      throw new BadRequestException('Email Daily Report còn biến chưa resolve');
    }
    return {
      subject: rendered.subject,
      html: await renderDailyReportEmail(rendered.subject, rendered.html),
      templateVersionId: published?.id ?? null,
    };
  }

  private async getByKey(key: DailyReportEmailTemplateKey) {
    const template = await this.prisma.dailyReportEmailTemplate.findUnique({
      where: { systemKey: key },
    });
    if (!template) throw new NotFoundException('Không tìm thấy mẫu email');
    return template;
  }

  private definitionMeta(key: DailyReportEmailTemplateKey) {
    const definition = DEFINITIONS[key];
    return {
      allowedVariables: definition.allowed,
      requiredVariables: definition.required,
    };
  }

  private validateContent(
    key: DailyReportEmailTemplateKey,
    subject: string,
    content: string,
  ) {
    const definition = DEFINITIONS[key];
    const source = `${subject}\n${content}`;
    const used = new Set<string>();
    for (const match of source.matchAll(VARIABLE_PATTERN)) used.add(match[1]);
    const unknownVariables = [...used].filter(
      (variable) => !definition.allowed.includes(variable),
    );
    const missingVariables = definition.required.filter(
      (variable) => !used.has(variable),
    );
    const hardcodedUrls = source.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
    return {
      valid:
        unknownVariables.length === 0 &&
        missingVariables.length === 0 &&
        hardcodedUrls.length === 0,
      unknownVariables,
      missingVariables,
      hardcodedUrls,
      ...this.definitionMeta(key),
    };
  }

  private render(
    subject: string,
    content: string,
    variables: TemplateVariables,
  ): { subject: string; html: string } {
    const replace = (source: string) =>
      source.replace(VARIABLE_PATTERN, (_whole, name: string) =>
        this.escapeHtml(String(variables[name] ?? '')),
      );
    return {
      subject: replace(subject).replace(/<[^>]+>/g, ''),
      html: sanitizeHtml(replace(content), {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        // `style` phải được giữ: email client không đọc `<style>` ổn định nên
        // toàn bộ trình bày của mẫu ACTA nằm ở inline CSS. Bỏ nó đi là email về
        // lại dạng text trần. Thẻ `<style>`/`<script>` vẫn bị loại vì không nằm
        // trong allowedTags.
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          '*': ['style', 'class'],
          a: ['href', 'target', 'rel', 'style'],
          img: ['src', 'alt', 'width', 'height', 'style'],
          // Layout email vẫn phải dựng bằng table — Outlook không hỗ trợ
          // flex/grid, và các thuộc tính dưới đây là phần trình bày, không
          // phải kênh chèn script.
          table: [
            'style',
            'class',
            'width',
            'align',
            'bgcolor',
            'border',
            'cellpadding',
            'cellspacing',
            'role',
          ],
          tr: ['style', 'class', 'align', 'bgcolor', 'valign'],
          td: [
            'style',
            'class',
            'width',
            'height',
            'align',
            'bgcolor',
            'valign',
            'colspan',
            'rowspan',
          ],
          th: [
            'style',
            'class',
            'width',
            'height',
            'align',
            'bgcolor',
            'valign',
            'colspan',
            'rowspan',
          ],
        },
        allowedSchemes: ['http', 'https', 'mailto'],
        allowProtocolRelative: false,
      }),
    };
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async writeAudit(
    db: Prisma.TransactionClient | PrismaService,
    templateId: string,
    action: string,
    actorId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const metadataJson = metadata ? JSON.stringify(metadata) : null;
    await db.$executeRaw`
      INSERT INTO "daily_report_email_template_audits"
        ("id", "templateId", "action", "actorId", "metadata", "createdAt")
      VALUES
        (${randomUUID()}, ${templateId}, ${action}, ${actorId}, CAST(${metadataJson} AS JSONB), NOW())`;
  }
}
