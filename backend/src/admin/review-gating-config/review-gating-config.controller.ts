import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtPayload } from '../../auth/jwt-payload';
import { CurrentUser } from '../../users/users.decorator';
import { BulkUpdateReviewGatingConfigDto } from './dto/bulk-update-review-gating-config.dto';
import { UpdateReviewGatingConfigDto } from './dto/update-review-gating-config.dto';
import { ReviewGatingHistoryQueryDto } from './dto/review-gating-history-query.dto';
import { ReviewGatingConfigService } from './review-gating-config.service';

@Roles(Role.ADMIN)
@Controller('admin/review-gating-config')
export class ReviewGatingConfigController {
  private readonly logger = new Logger(ReviewGatingConfigController.name);

  constructor(private readonly service: ReviewGatingConfigService) {}

  @Get()
  async findAll() {
    try {
      return await this.service.findAll();
    } catch (error) {
      this.logger.error(
        'Failed to list review-gating configs',
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Failed to list review-gating configs',
      );
    }
  }

  @Get('history')
  async findHistory(@Query() query: ReviewGatingHistoryQueryDto) {
    try {
      return await this.service.findHistory(query);
    } catch (error) {
      this.logger.error(
        'Failed to list review-gating history',
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Failed to list review-gating history',
      );
    }
  }

  @Patch('bulk')
  async bulkUpdate(
    @Body() dto: BulkUpdateReviewGatingConfigDto,
    @CurrentUser() user: JwtPayload,
  ) {
    try {
      return await this.service.bulkUpsert(dto.updates, user.id);
    } catch (error) {
      this.logger.error(
        'Failed to bulk update review-gating configs',
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Failed to bulk update review-gating configs',
      );
    }
  }

  @Patch(':featureKey')
  async update(
    @Param('featureKey') featureKey: string,
    @Body() dto: UpdateReviewGatingConfigDto,
    @CurrentUser() user: JwtPayload,
  ) {
    try {
      return await this.service.upsert(featureKey, dto.isEnabled, user.id);
    } catch (error) {
      this.logger.error(
        `Failed to update review-gating config for ${featureKey}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Failed to update review-gating config',
      );
    }
  }
}
