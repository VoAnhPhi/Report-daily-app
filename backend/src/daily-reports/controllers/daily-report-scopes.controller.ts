import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../users/users.decorator';
import { JwtPayload } from '../../auth/jwt-payload';
import {
  CacheScope,
  CacheTags,
  InvalidateTags,
} from '../../common/cache/cache.decorators';
import {
  CACHE_TAG_BOARD,
  CACHE_TAG_MY,
  CACHE_TAG_SCOPE,
  DAILY_REPORT_GENERATE_MINUTE,
} from '../constants/daily-report.constants';
import {
  CreateReportScopeDto,
  CreateDailyReportKpiDto,
  SaveDailyReportReviewGroupDto,
  UpdateDailyReportKpiDto,
  UpdateReportScopeDto,
} from '../dto/daily-report.dto';
import { DailyReportGeneratorService } from '../services/daily-report-generator.service';
import { DailyReportReviewGroupsService } from '../services/daily-report-review-groups.service';
import { DailyReportScopeService } from '../services/daily-report-scope.service';
import { dayStrInTz, minutesOfDayInTz } from '../helpers/report-date.helper';
import { DailyReportKpisService } from '../services/daily-report-kpis.service';

/** Cấu hình phạm vi báo cáo (docs 04 mục 3.1). Route chữ trước :id (§15). */
@Controller('daily-report-scopes')
export class DailyReportScopesController {
  constructor(
    private readonly scopeService: DailyReportScopeService,
    private readonly generator: DailyReportGeneratorService,
    private readonly kpisService: DailyReportKpisService,
    private readonly reviewGroups: DailyReportReviewGroupsService,
  ) {}

  /**
   * Thẻ PHẢI có, nếu không thì ba lệnh ghi KPI ngay bên dưới trở thành vô nghĩa.
   *
   * `SmartCacheInterceptor` là interceptor toàn cục và nó cache MỌI GET, kể cả
   * route không khai `@CacheTags` — khi đó key được lưu với `tags = []`, tức
   * không thẻ nào trỏ tới nó và `@InvalidateTags` không bao giờ dọn được. Route
   * này rơi đúng vào đó, nên danh mục KPI đứng im 15 giây sau mỗi lần thêm/xoá.
   *
   * Đo được trên trình duyệt ngày 26/08/2026: `POST /kpis` trả `201` kèm KPI vừa
   * tạo, DB có đủ, nhưng `GET /kpis` ngay sau đó vẫn trả danh sách CŨ — và F5
   * cũng không cứu, vì cái cũ nằm ở cache server chứ không phải cache trình
   * duyệt. Đây là gốc thật của "thêm/xoá KPI không cập nhật giao diện".
   *
   * `CACHE_TAG_SCOPE` chứ không phải thẻ khác: đúng ba thẻ mà `createKpi`,
   * `updateKpi`, `archiveKpi` đang dọn đều có `CACHE_TAG_SCOPE`.
   */
  @Get(':id/kpis')
  @CacheTags(CACHE_TAG_SCOPE)
  @CacheScope('user')
  async listKpis(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.kpisService.list(id, user.id, includeInactive === 'true');
  }

  @Post(':id/kpis')
  @InvalidateTags(CACHE_TAG_SCOPE, CACHE_TAG_MY, CACHE_TAG_BOARD)
  async createKpi(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateDailyReportKpiDto,
  ) {
    return this.kpisService.create(id, user.id, dto);
  }

  @Patch(':id/kpis/:kpiId')
  @InvalidateTags(CACHE_TAG_SCOPE, CACHE_TAG_MY, CACHE_TAG_BOARD)
  async updateKpi(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('kpiId') kpiId: string,
    @Body() dto: UpdateDailyReportKpiDto,
  ) {
    return this.kpisService.update(id, kpiId, user.id, dto);
  }

  @Delete(':id/kpis/:kpiId')
  @InvalidateTags(CACHE_TAG_SCOPE, CACHE_TAG_MY, CACHE_TAG_BOARD)
  async archiveKpi(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('kpiId') kpiId: string,
  ) {
    return this.kpisService.archive(id, kpiId, user.id);
  }

  /**
   * "Nhóm của tôi" đúng nghĩa, cho MỌI vai trò kể cả admin nền tảng.
   *
   * Trước đây admin đi nhánh riêng `listEnabledScopesForAdmin` — mọi scope đang
   * bật của toàn hệ thống. Nhánh đó hỏng theo hai hướng cùng lúc:
   *
   *  1. Admin nhận về nhóm giao việc RIÊNG của admin khác, thứ họ không được
   *     mời vào. Cột nhóm ở `acta-social` không có cách nào biết mình có phải
   *     thành viên hay không (contract không có `isMember`) nên xếp chúng vào
   *     cụm "Đang tham gia" — nhãn nói sai với chính người đang nhìn màn hình.
   *  2. Nhánh đó lọc cứng `isEnabled: true`, còn `listMyScopes` CỐ Ý trả cả
   *     scope đang tạm dừng. Nên nhóm riêng của chính admin, sau khi tạm dừng
   *     báo cáo, biến mất khỏi màn cấu hình; giao diện tưởng nhóm chưa bật nên
   *     gọi `POST` thay vì `PATCH`, và `create` dò trùng KHÔNG lọc `isEnabled`
   *     nên trả `409` — công tắc chết một chiều. Đúng cái bẫy mà chú thích của
   *     `getScopesOfUser` dựng `includeDisabled` để phòng, và nhánh admin đã vô
   *     hiệu hoá nó.
   *
   * Quyền xem KHÔNG bị siết theo: `canViewGroupData()` vẫn cấp cho admin nền
   * tảng, nên `scope/:id/board` và `scope/:id/summary` vẫn phục vụ họ khi đã có
   * `scopeId`. Thay đổi ở đây thuần tuý là điều hướng. Muốn chặn thật thì phải
   * sửa `canViewGroupData`, và đó là một quyết định phân quyền khác.
   */
  @Get('my')
  @CacheTags(CACHE_TAG_SCOPE)
  @CacheScope('user')
  async getMy(@CurrentUser() user: JwtPayload) {
    return this.scopeService.listMyScopes(user.id);
  }

  @Get(':id/generate-today/preview')
  @CacheTags(CACHE_TAG_SCOPE, CACHE_TAG_BOARD)
  @CacheScope('user')
  async previewToday(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const scope = await this.scopeService.getScopeOrThrow(id);
    const isManager = await this.scopeService.isManager(scope, user.id);
    if (!isManager) {
      throw new ForbiddenException('Chỉ trưởng nhóm được tạo báo cáo hôm nay');
    }
    return this.generator.previewTodayForScope(scope);
  }

  @Post(':id/generate-today')
  @InvalidateTags(CACHE_TAG_SCOPE, CACHE_TAG_MY, CACHE_TAG_BOARD)
  async generateToday(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    const scope = await this.scopeService.getScopeOrThrow(id);
    const isManager = await this.scopeService.isManager(scope, user.id);
    if (!isManager) {
      throw new ForbiddenException('Chỉ trưởng nhóm được tạo báo cáo hôm nay');
    }
    return this.generator.generateTodayForScope(scope);
  }

  // ── Nhóm duyệt ───────────────────────────────────────────────────────────
  //
  // Cả bốn route gác bằng `isManager` ngay trong service. Người duyệt phụ KHÔNG
  // tự tạo nhóm duyệt, không tự nhận thêm thành viên, và không đọc được cách
  // chia nhóm.
  //
  // Ba thẻ dọn cache ở mỗi lệnh ghi, thiếu thẻ nào cũng là một màn nói sai:
  //   · SCOPE — chính danh sách nhóm duyệt và danh sách thành viên;
  //   · BOARD — bảng của người duyệt lọc theo phân công, đổi ngay khi chia lại;
  //   · MY    — rail phạm vi mang vai `isReviewer` của người vừa được giao.
  // Đây là nửa còn lại của "áp dụng ngay trong ngày": quyền ở DB đã đổi tức
  // thì, nhưng nếu cache còn giữ bản cũ thì người dùng vẫn nhìn thấy cái cũ.

  @Get(':id/review-groups')
  @CacheTags(CACHE_TAG_SCOPE)
  @CacheScope('user')
  async listReviewGroups(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    const scope = await this.scopeService.getScopeOrThrow(id, {
      includeArchived: true,
    });
    return this.reviewGroups.list(scope, user.id);
  }

  @Post(':id/review-groups')
  @InvalidateTags(CACHE_TAG_SCOPE, CACHE_TAG_BOARD, CACHE_TAG_MY)
  async createReviewGroup(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SaveDailyReportReviewGroupDto,
  ) {
    const scope = await this.scopeService.getScopeOrThrow(id);
    return this.reviewGroups.create(scope, user.id, dto);
  }

  @Put(':id/review-groups/:groupId')
  @InvalidateTags(CACHE_TAG_SCOPE, CACHE_TAG_BOARD, CACHE_TAG_MY)
  async updateReviewGroup(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Body() dto: SaveDailyReportReviewGroupDto,
  ) {
    const scope = await this.scopeService.getScopeOrThrow(id);
    return this.reviewGroups.update(scope, user.id, groupId, dto);
  }

  @Delete(':id/review-groups/:groupId')
  @InvalidateTags(CACHE_TAG_SCOPE, CACHE_TAG_BOARD, CACHE_TAG_MY)
  async removeReviewGroup(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('groupId') groupId: string,
  ) {
    const scope = await this.scopeService.getScopeOrThrow(id);
    return this.reviewGroups.remove(scope, user.id, groupId);
  }

  @Get(':id')
  @CacheTags(CACHE_TAG_SCOPE)
  @CacheScope('user')
  async getById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const scope = await this.scopeService.getScopeOrThrow(id, {
      includeArchived: true,
    });
    const isManager = await this.scopeService.isManager(scope, user.id);
    if (!isManager) {
      throw new ForbiddenException(
        'Chỉ trưởng nhóm được xem cấu hình và danh sách thành viên',
      );
    }
    return {
      ...this.scopeService.toPublicScope(
        scope,
        await this.scopeService.getScopeName(scope),
        true,
      ),
      members: await this.scopeService.getMemberInfos(scope),
    };
  }

  @Post()
  @InvalidateTags(CACHE_TAG_SCOPE, CACHE_TAG_MY, CACHE_TAG_BOARD)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateReportScopeDto,
  ) {
    const scope = await this.scopeService.create(user.id, dto);
    // US-09: bật giữa ngày → sinh ngay bản cho hôm nay nếu là ngày báo cáo.
    if (
      this.generator.isReportingDay(scope) &&
      minutesOfDayInTz(new Date(), scope.timezone) >=
        DAILY_REPORT_GENERATE_MINUTE
    ) {
      await this.generator.ensureReportsForScope(
        scope,
        dayStrInTz(new Date(), scope.timezone),
      );
    }
    return this.scopeService.toPublicScope(
      scope,
      await this.scopeService.getScopeName(scope),
      true,
    );
  }

  @Patch(':id')
  @InvalidateTags(CACHE_TAG_SCOPE, CACHE_TAG_MY, CACHE_TAG_BOARD)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateReportScopeDto,
  ) {
    await this.scopeService.getScopeOrThrow(id);
    const updated = await this.scopeService.update(user.id, id, dto);
    // Bật lại hoặc thêm hôm nay vào weekdays sau 07:30 thì materialize ngay.
    // `ensureReportsForScope` idempotent nên gọi thừa không tạo bản trùng.
    if (
      updated.isEnabled &&
      this.generator.isReportingDay(updated) &&
      minutesOfDayInTz(new Date(), updated.timezone) >=
        DAILY_REPORT_GENERATE_MINUTE
    ) {
      await this.generator.ensureReportsForScope(
        updated,
        dayStrInTz(new Date(), updated.timezone),
      );
    }
    return this.scopeService.toPublicScope(
      updated,
      await this.scopeService.getScopeName(updated),
      true,
    );
  }

  @Delete(':id')
  @InvalidateTags(CACHE_TAG_SCOPE, CACHE_TAG_MY, CACHE_TAG_BOARD)
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.scopeService.remove(user.id, id);
  }
}
