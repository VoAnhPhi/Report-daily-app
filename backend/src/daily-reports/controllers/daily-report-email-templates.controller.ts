import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DailyReportEmailTemplateKey } from '@prisma/client';
import { CurrentUser } from 'src/users/users.decorator';
import { JwtPayload } from 'src/auth/jwt-payload';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { PermissionCode } from 'src/common/enums/permission.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import {
  PublishDailyReportEmailTemplateDto,
  TestDailyReportEmailTemplateDto,
  UpdateDailyReportEmailTemplateDto,
} from '../dto/daily-report-email-template.dto';
import { DailyReportEmailTemplateService } from '../services/daily-report-email-template.service';

@Controller('daily-report-email-templates')
@UseGuards(JwtAuthGuard)
@Permissions(PermissionCode.SETTINGS_MANAGE_EMAILS)
export class DailyReportEmailTemplatesController {
  constructor(private readonly templates: DailyReportEmailTemplateService) {}

  @Get()
  list() {
    return this.templates.list();
  }

  @Patch(':key')
  updateDraft(
    @CurrentUser() user: JwtPayload,
    @Param('key', new ParseEnumPipe(DailyReportEmailTemplateKey))
    key: DailyReportEmailTemplateKey,
    @Body() dto: UpdateDailyReportEmailTemplateDto,
  ) {
    return this.templates.updateDraft(key, dto, user.id);
  }

  @Post(':key/validate')
  validate(
    @Param('key', new ParseEnumPipe(DailyReportEmailTemplateKey))
    key: DailyReportEmailTemplateKey,
  ) {
    return this.templates.validateDraft(key);
  }

  @Post(':key/preview')
  preview(
    @Param('key', new ParseEnumPipe(DailyReportEmailTemplateKey))
    key: DailyReportEmailTemplateKey,
    @Body() dto: TestDailyReportEmailTemplateDto,
  ) {
    return this.templates.preview(key, dto.variables);
  }

  @Post(':key/test-send')
  testSend(
    @CurrentUser() user: JwtPayload,
    @Param('key', new ParseEnumPipe(DailyReportEmailTemplateKey))
    key: DailyReportEmailTemplateKey,
    @Body() dto: TestDailyReportEmailTemplateDto,
  ) {
    return this.templates.testSend(key, user.id, dto.variables);
  }

  @Post(':key/publish')
  publish(
    @CurrentUser() user: JwtPayload,
    @Param('key', new ParseEnumPipe(DailyReportEmailTemplateKey))
    key: DailyReportEmailTemplateKey,
    @Body() dto: PublishDailyReportEmailTemplateDto,
  ) {
    return this.templates.publish(key, dto, user.id);
  }

  @Get(':key/versions')
  versions(
    @Param('key', new ParseEnumPipe(DailyReportEmailTemplateKey))
    key: DailyReportEmailTemplateKey,
  ) {
    return this.templates.versions(key);
  }

  @Get(':key/audits')
  audits(
    @Param('key', new ParseEnumPipe(DailyReportEmailTemplateKey))
    key: DailyReportEmailTemplateKey,
  ) {
    return this.templates.audits(key);
  }

  @Post(':key/inactivate')
  inactivate(
    @CurrentUser() user: JwtPayload,
    @Param('key', new ParseEnumPipe(DailyReportEmailTemplateKey))
    key: DailyReportEmailTemplateKey,
  ) {
    return this.templates.setInactive(key, user.id);
  }
}
