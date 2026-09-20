import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { JwtPayload } from 'src/auth/jwt-payload';
import {
  CacheScope,
  CacheTags,
  InvalidateTags,
} from 'src/common/cache/cache.decorators';
import { CurrentUser } from 'src/users/users.decorator';
import { CACHE_TAG_SCOPE } from '../constants/daily-report.constants';
import {
  CloneDailyReportTemplateDto,
  CreateDailyReportTemplateDto,
  UpdateDailyReportTemplateDto,
} from '../dto/daily-report.dto';
import { DailyReportTemplatesService } from '../services/daily-report-templates.service';

@Controller('daily-report-templates')
export class DailyReportTemplatesController {
  constructor(private readonly templates: DailyReportTemplatesService) {}

  @Get()
  @CacheTags(CACHE_TAG_SCOPE)
  @CacheScope('user')
  list(@CurrentUser() user: JwtPayload) {
    return this.templates.list(user.id);
  }

  @Get(':id')
  @CacheTags(CACHE_TAG_SCOPE)
  @CacheScope('user')
  getById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.templates.getById(user.id, id);
  }

  @Post()
  @InvalidateTags(CACHE_TAG_SCOPE)
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDailyReportTemplateDto,
  ) {
    return this.templates.create(user.id, dto);
  }

  @Patch(':id')
  @InvalidateTags(CACHE_TAG_SCOPE)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDailyReportTemplateDto,
  ) {
    return this.templates.update(user.id, id, dto);
  }

  @Post(':id/clone')
  @InvalidateTags(CACHE_TAG_SCOPE)
  clone(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CloneDailyReportTemplateDto,
  ) {
    return this.templates.clone(user.id, id, dto);
  }
}
