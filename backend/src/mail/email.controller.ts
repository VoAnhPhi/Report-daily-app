import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EmailType } from '@prisma/client';
import { EmailService, CurrentUser, EmailResult } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';
import { CurrentUser as CurrentUserDecorator } from '../users/users.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailDiagnosticsService } from './email-diagnostics.service';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionCode } from '../common/enums/permission.enum';

/**
 * Trước đây lớp này chỉ có `JwtAuthGuard`, không mã quyền nào — `PermissionsGuard`
 * cho qua vì route không khai metadata. Hệ quả: mọi tài khoản đăng nhập được đều
 * gọi được `POST /emails/dry-run` (trả về danh sách người nhận thật) và
 * `POST /emails/test-send`. Rào cản duy nhất là `checkBroadcastPermissions` trong
 * service, và nó chỉ chặn nhánh gửi hàng loạt.
 *
 * Không route nào ở đây là `@Public` hay máy-với-máy: cả 15 route đều phục vụ
 * màn hình `/mail/**` của acta-admin, vốn đã được gác bằng đúng
 * `settings.manage_emails` ở thanh điều hướng. Đặt cổng ở đây chỉ là để backend
 * bắt kịp frontend.
 */
@Controller('emails')
@UseGuards(JwtAuthGuard)
@Permissions(PermissionCode.SETTINGS_MANAGE_EMAILS)
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly emailDiagnostics: EmailDiagnosticsService,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendEmail(
    @Body() dto: SendEmailDto,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<{
    message: string;
    ok: boolean;
    count: number;
    batches?: number;
    data?: unknown;
  }> {
    const result: EmailResult = await this.emailService.send(dto, currentUser);

    return {
      message: `Email sent successfully to ${result.count} recipients${result.batches ? ` in ${result.batches} batches` : ''}`,
      ok: result.ok,
      count: result.count,
      batches: result.batches,
      data: result.data,
    };
  }

  @Post('dry-run')
  @HttpCode(HttpStatus.OK)
  async dryRunEmail(@Body() dto: SendEmailDto): Promise<{
    message: string;
    recipientCount: number;
    recipients: string[];
    htmlContent: string;
  }> {
    const result = await this.emailService.dryRun(dto);

    return {
      message: `Dry run completed. Would send to ${result.recipientCount} recipients.`,
      recipientCount: result.recipientCount,
      recipients: result.recipients,
      htmlContent: result.htmlContent,
    };
  }

  @Get('history')
  async getEmailHistory(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    return this.emailService.getEmailHistory(pageNum, limitNum, currentUser);
  }

  @Get('drafts')
  async getDrafts(@CurrentUserDecorator() currentUser: CurrentUser) {
    return this.emailService.getDrafts(currentUser);
  }

  @Post('drafts')
  async saveDraft(
    @Body() dto: SendEmailDto,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return this.emailService.saveDraft(dto, currentUser);
  }

  @Get('drafts/:id')
  async getDraft(
    @Param('id') draftId: string,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return this.emailService.getDraft(draftId);
  }

  @Delete('drafts/:id')
  async deleteDraft(
    @Param('id') draftId: string,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return this.emailService.deleteDraft(draftId);
  }

  @Get('templates')
  async getTemplates(@CurrentUserDecorator() currentUser: CurrentUser) {
    return this.emailService.getTemplates();
  }

  @Post('templates')
  async createTemplate(
    @Body()
    templateData: {
      name: string;
      subject: string;
      content: string;
      category: EmailType;
      description?: string;
    },
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return this.emailService.createTemplate(templateData, currentUser);
  }

  @Patch('templates/:id')
  async updateTemplate(
    @Param('id') templateId: string,
    @Body()
    templateData: Partial<{
      name: string;
      subject: string;
      content: string;
      category: EmailType;
      description?: string;
    }>,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return this.emailService.updateTemplate(
      templateId,
      templateData,
      currentUser,
    );
  }

  @Delete('templates/:id')
  async deleteTemplate(
    @Param('id') templateId: string,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return this.emailService.deleteTemplate(templateId);
  }

  @Get('user-counts')
  async getUserCountsByRoles() {
    return this.emailService.getUserCountsByRoles();
  }

  @Get('unique-recipient-stats')
  async getUniqueRecipientStats(
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return this.emailService.getUniqueRecipientStats(currentUser);
  }

  @Get('diagnostics')
  async runEmailDiagnostics() {
    return this.emailDiagnostics.runDiagnostics();
  }

  @Post('test-send')
  async testEmailSending(@Body() body: { toEmail: string }) {
    return this.emailDiagnostics.testEmailSending(body.toEmail);
  }
}
