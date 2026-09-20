import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../users/users.decorator';
import { JwtPayload } from '../../auth/jwt-payload';
import { TaskAssignGroupService } from '../services/task-assign-group.service';
import { AnyPermission } from '../../common/decorators/permissions.decorator';
import { PermissionCode } from '../../common/enums/permission.enum';
import {
  CreateTaskAssignGroupDto,
  UpdateTaskAssignGroupDto,
} from '../dto/task-assign-group.dto';
import {
  CacheScope,
  CacheTags,
  InvalidateTags,
} from '../../common/cache/cache.decorators';
import {
  CACHE_TAG_BOARD,
  CACHE_TAG_MY,
  CACHE_TAG_SCOPE,
} from '../../daily-reports/constants/daily-report.constants';

@Controller('task-groups')
export class TaskAssignGroupsController {
  constructor(private readonly service: TaskAssignGroupService) {}

  @Get()
  @CacheTags('task-group:')
  @CacheScope('user')
  async list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user.id);
  }

  @Post()
  @AnyPermission(PermissionCode.DAILY_TASK_GROUPS_CREATE)
  @InvalidateTags('task-group:')
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTaskAssignGroupDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Post(':id/leave')
  @InvalidateTags('task-group:', CACHE_TAG_SCOPE, CACHE_TAG_MY, CACHE_TAG_BOARD)
  async leave(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.leave(user.id, id);
  }

  @Patch(':id')
  @InvalidateTags('task-group:')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTaskAssignGroupDto,
  ) {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @InvalidateTags('task-group:')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}
