import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../users/users.decorator';
import { JwtPayload } from '../../auth/jwt-payload';
import {
  CacheScope,
  CacheTags,
  InvalidateTags,
  NoCache,
} from '../../common/cache/cache.decorators';
import {
  CACHE_TAG_BOARD,
  CACHE_TAG_MY,
} from '../constants/daily-report.constants';
import {
  QueryBoardDto,
  QueryMyReportsDto,
  QueryPendingReviewDto,
  QuerySummaryDto,
  QueryScopeMemberHistoryDto,
  QueryTodayDto,
  ReopenDailyReportDto,
  ReviewDailyReportDto,
  SaveDailyReportDto,
  SubmitDailyReportDto,
} from '../dto/daily-report.dto';
import { DailyReportsService } from '../services/daily-reports.service';

/**
 * Báo cáo hằng ngày — endpoint người dùng (docs 04 mục 2).
 *
 * QUY TẮC ROUTE (§15): mọi đường dẫn chữ (my, scope) khai báo TRƯỚC `:id`.
 * Mọi route nhận `?onBehalfOfUserId=` (làm thay) — service LUÔN xác thực lại
 * quan hệ chăm sóc, không tin giá trị client gửi lên.
 */
@Controller('daily-reports')
export class DailyReportsController {
  constructor(private readonly service: DailyReportsService) {}

  // ── Route chữ (trước :id) ────────────────────────────────────────────────

  /**
   * `@NoCache()` là decorator DUY NHẤT bỏ được cache; `@InvalidateTags` một mình
   * KHÔNG làm việc đó.
   *
   * Chú thích cũ ghi "không cache GET này" nhưng mã lại làm ngược. Đọc
   * `SmartCacheInterceptor` (interceptor TOÀN CỤC): nhánh bỏ qua là
   * `if (method !== 'GET' || noCache)`. Với một GET không có `@NoCache` thì cả
   * hai vế đều sai, nên nó rơi thẳng xuống nhánh ĐỌC và bị cache
   * `DEFAULT_CACHE_TTL_MS` = 15 giây. Tệ hơn: route này không có `@CacheTags`
   * nên key được lưu với `tags = []` — KHÔNG `@InvalidateTags` nào dọn nổi.
   *
   * Hậu quả đo được trên trình duyệt ngày 26/08/2026: nộp báo cáo xong, client
   * gọi lại `my/today` và nhận đúng bản CŨ trong 15 giây, nên giao diện không
   * đổi và người dùng phải tự F5. Đây là gốc thật của lỗi "nộp xong không cập
   * nhật", không phải lỗi dọn cache phía client.
   *
   * Thêm `@NoCache()` còn kích hoạt luôn `@InvalidateTags` bên dưới: nhánh bỏ
   * qua mới là chỗ interceptor đọc `mutateTags`. Route này cần nó vì nó có tác
   * dụng phụ lazy-upsert (sinh bù bản báo cáo còn thiếu).
   */
  @Get('my/today')
  @NoCache()
  @InvalidateTags(CACHE_TAG_MY)
  async getMyToday(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryTodayDto,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.service.getMyToday(user.id, query.date, onBehalfOfUserId);
  }

  @Get('my/pending-count')
  @CacheTags(CACHE_TAG_MY)
  @CacheScope('user')
  async getPendingCount(
    @CurrentUser() user: JwtPayload,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.service.getPendingCount(user.id, onBehalfOfUserId);
  }

  @Get('my')
  @CacheTags(CACHE_TAG_MY)
  @CacheScope('user')
  async getMyHistory(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryMyReportsDto,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.service.getMyHistory(user.id, query, onBehalfOfUserId);
  }

  @Get('scope/:scopeId/board')
  @CacheTags(CACHE_TAG_BOARD)
  @CacheScope('user')
  async getBoard(
    @CurrentUser() user: JwtPayload,
    @Param('scopeId') scopeId: string,
    @Query() query: QueryBoardDto,
  ) {
    return this.service.getBoard(scopeId, user.id, query);
  }

  /**
   * Danh sách bản chờ kết luận XUYÊN NGÀY của một nhóm. Tách khỏi `board` vì
   * board là ảnh của MỘT ngày; badge "Nhóm (n)" và chip "Chờ duyệt" đọc
   * endpoint này. Cùng thẻ cache với board nên `submit`, `review` và `reopen`
   * đã dọn hộ.
   */
  @Get('scope/:scopeId/pending-review')
  @CacheTags(CACHE_TAG_BOARD)
  @CacheScope('user')
  async getPendingReview(
    @CurrentUser() user: JwtPayload,
    @Param('scopeId') scopeId: string,
    @Query() query: QueryPendingReviewDto,
  ) {
    return this.service.getPendingReview(scopeId, user.id, query);
  }

  @Get('scope/:scopeId/outcome')
  @CacheTags(CACHE_TAG_BOARD)
  @CacheScope('user')
  async getGroupOutcome(
    @CurrentUser() user: JwtPayload,
    @Param('scopeId') scopeId: string,
    @Query() query: QueryBoardDto,
  ) {
    return this.service.getGroupOutcome(scopeId, user.id, query);
  }

  @Get('scope/:scopeId/summary')
  @CacheTags(CACHE_TAG_BOARD)
  @CacheScope('user')
  async getSummary(
    @CurrentUser() user: JwtPayload,
    @Param('scopeId') scopeId: string,
    @Query() query: QuerySummaryDto,
  ) {
    return this.service.getSummary(scopeId, user.id, query);
  }

  @Get('scope/:scopeId/history')
  @CacheTags(CACHE_TAG_BOARD)
  @CacheScope('user')
  async getScopeMemberHistory(
    @CurrentUser() user: JwtPayload,
    @Param('scopeId') scopeId: string,
    @Query() query: QueryScopeMemberHistoryDto,
  ) {
    return this.service.getScopeMemberHistory(scopeId, user.id, query);
  }

  /**
   * Huỷ một việc đã chuyển tiếp. Route chữ nên phải đứng TRƯỚC nhóm `:id` (§15),
   * nếu không `carry-overs` bị nuốt thành một `:id`.
   */
  @Delete('carry-overs/:carryOverId')
  @InvalidateTags(CACHE_TAG_MY, CACHE_TAG_BOARD)
  async cancelCarryOver(
    @CurrentUser() user: JwtPayload,
    @Param('carryOverId') carryOverId: string,
  ) {
    return this.service.cancelCarryOver(carryOverId, user.id);
  }

  // ── Route :id (sau cùng — §15) ───────────────────────────────────────────

  /* Ba route `:id` dưới đây trước đây KHÔNG khai thẻ nào. Interceptor toàn cục
     vẫn cache chúng 15 giây, và key không thẻ thì `@InvalidateTags` của
     `saveAnswers` / `submit` / `reopen` ngay bên dưới không dọn được — sửa xong
     mở lại chi tiết vẫn thấy bản cũ. Gắn `CACHE_TAG_MY` để chúng đi cùng đúng
     ba lệnh ghi ấy. `CacheScope('user')` vì nội dung phụ thuộc người xem
     (`onBehalfOfUserId`, quyền đọc). */
  @Get(':id/revisions')
  @CacheTags(CACHE_TAG_MY)
  @CacheScope('user')
  async getRevisions(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.service.getRevisions(id, user.id, onBehalfOfUserId);
  }

  @Get(':id/draft')
  @CacheTags(CACHE_TAG_MY)
  @CacheScope('user')
  async getDraft(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.service.getDraft(id, user.id, onBehalfOfUserId);
  }

  @Get(':id')
  @CacheTags(CACHE_TAG_MY)
  @CacheScope('user')
  async getById(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.service.getById(id, user.id, onBehalfOfUserId);
  }

  @Patch(':id')
  @InvalidateTags(CACHE_TAG_MY, CACHE_TAG_BOARD)
  async saveAnswers(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SaveDailyReportDto,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.service.saveAnswers(id, user.id, dto, onBehalfOfUserId);
  }

  @Post(':id/submit')
  @InvalidateTags(CACHE_TAG_MY, CACHE_TAG_BOARD)
  async submit(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SubmitDailyReportDto,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.service.submit(id, user.id, dto, onBehalfOfUserId);
  }

  @Post(':id/reopen')
  @InvalidateTags(CACHE_TAG_MY, CACHE_TAG_BOARD)
  async reopen(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ReopenDailyReportDto,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.service.reopen(id, user.id, dto, onBehalfOfUserId);
  }

  /**
   * Kết luận của người duyệt trên một lần nộp: Đạt / Tiếp tục thực hiện /
   * Trả lại.
   *
   * Nổ cả `CACHE_TAG_BOARD` lẫn `CACHE_TAG_MY`: người duyệt bấm xong mà board
   * còn trạng thái cũ thì họ bấm lại và nhận 409 (§37).
   */
  @Post(':id/review')
  @InvalidateTags(CACHE_TAG_MY, CACHE_TAG_BOARD)
  async review(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ReviewDailyReportDto,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.service.review(id, user.id, dto, onBehalfOfUserId);
  }
}
