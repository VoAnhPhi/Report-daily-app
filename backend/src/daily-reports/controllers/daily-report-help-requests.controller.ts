import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { JwtPayload } from 'src/auth/jwt-payload';
import { CurrentUser } from 'src/users/users.decorator';
import {
  CacheScope,
  CacheTags,
  InvalidateTags,
} from '../../common/cache/cache.decorators';
import {
  CACHE_TAG_BOARD,
  CACHE_TAG_MY,
} from '../constants/daily-report.constants';
import { QueryHelpRequestsDto } from '../dto/daily-report.dto';
import { DailyReportHelpRequestsService } from '../services/daily-report-help-requests.service';

/**
 * Cả bốn route ở đây trước đây KHÔNG khai một decorator cache nào.
 *
 * Hai hậu quả, và cái thứ hai mới là cái đau:
 *
 * 1. `SmartCacheInterceptor` là interceptor TOÀN CỤC và nó cache mọi GET, kể cả
 *    route không khai `@CacheTags`. Khi đó key được lưu với `tags = []` — không
 *    thẻ nào trỏ tới, nên không `@InvalidateTags` nào dọn nổi. `GET my` vì thế
 *    đứng im 15 giây (`DEFAULT_CACHE_TTL_MS`).
 *
 * 2. Ba route `@Post` không dọn thẻ nào, nên tiếp nhận / xử lý / huỷ một yêu cầu
 *    hỗ trợ KHÔNG làm bảng nhóm và màn tổng quan đọc lại — trong khi cả hai đều
 *    đếm `stats.needHelp`. Trưởng nhóm bấm "Đã xử lý" xong nhìn bảng vẫn thấy
 *    con số cũ.
 *
 * Yêu cầu hỗ trợ do `submit` sinh ra, và nó đọc lại ở cả hai phía — nên gắn CẢ
 * `CACHE_TAG_MY` (danh sách của chính người báo cáo) lẫn `CACHE_TAG_BOARD`
 * (`stats.needHelp` của bảng và tổng quan).
 *
 * Ai được tích / bỏ tích "Đã giải quyết" nằm ở `assertCanResolve` của service.
 */
@Controller('daily-report-help-requests')
export class DailyReportHelpRequestsController {
  constructor(private readonly helpRequests: DailyReportHelpRequestsService) {}

  @Get('my')
  @CacheTags(CACHE_TAG_MY, CACHE_TAG_BOARD)
  @CacheScope('user')
  listMine(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryHelpRequestsDto,
  ) {
    return this.helpRequests.listMine(user.id, query);
  }

  @Post(':id/acknowledge')
  @InvalidateTags(CACHE_TAG_MY, CACHE_TAG_BOARD)
  acknowledge(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.helpRequests.acknowledge(id, user.id);
  }

  @Post(':id/resolve')
  @InvalidateTags(CACHE_TAG_MY, CACHE_TAG_BOARD)
  resolve(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.helpRequests.resolve(id, user.id);
  }

  /** Bỏ tích "Đã giải quyết": yêu cầu về lại chưa giải quyết. */
  @Post(':id/reopen')
  @InvalidateTags(CACHE_TAG_MY, CACHE_TAG_BOARD)
  reopen(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.helpRequests.reopen(id, user.id);
  }

  @Post(':id/cancel')
  @InvalidateTags(CACHE_TAG_MY, CACHE_TAG_BOARD)
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.helpRequests.cancel(id, user.id);
  }
}
