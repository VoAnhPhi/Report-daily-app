import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../users/users.decorator';
import { JwtPayload } from '../../auth/jwt-payload';
import { BusinessFormTasksService } from '../services/business-form-tasks.service';
import {
  CreateUserTaskDto,
  UpdateUserTaskDto,
  CreateTaskActivityDto,
  UpdateTaskStatusDto,
  UpdateTaskActivityDto,
  QueryTaskActivitiesDto,
  QuerySharedTasksDto,
  ReactTaskActivityDto,
  LeaveTaskDto,
} from '../dto/user-task.dto';
import {
  QueryUserTasksDto,
  SharedAssigneesQueryDto,
} from '../dto/query-user-tasks.dto';
import {
  CacheScope,
  CacheTags,
  InvalidateTags,
} from '../../common/cache/cache.decorators';

@Controller('tasks')
export class BusinessFormTasksController {
  constructor(private readonly tasksService: BusinessFormTasksService) {}

  // `onBehalfOfUserId` (nếu có): người chăm sóc thao tác hộ người được chăm.
  // Service xác thực quan hệ Baby đang hoạt động; client KHÔNG được tin.

  @Get('my-tasks')
  @CacheTags('task:my-tasks')
  @CacheScope('user')
  async getMyTasks(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryUserTasksDto,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.getMyTasks(user.id, query, onBehalfOfUserId);
  }

  @Get('my-tasks/counts')
  @CacheTags('task:my-tasks')
  @CacheScope('user')
  async getMyTaskCounts(
    @CurrentUser() user: JwtPayload,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.getMyTaskCounts(user.id, onBehalfOfUserId);
  }

  @Get('shared-assignees')
  @CacheTags('task:my-tasks')
  @CacheScope('user')
  async getMySharedAssignees(
    @CurrentUser() user: JwtPayload,
    @Query() query: SharedAssigneesQueryDto,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.getMySharedAssignees(
      user.id,
      query.status,
      onBehalfOfUserId,
    );
  }

  @Get('shared-with/:userId')
  @CacheTags('task:my-tasks')
  @CacheScope('user')
  async getSharedTasks(
    @CurrentUser() user: JwtPayload,
    @Param('userId') otherUserId: string,
    @Query() query: QuerySharedTasksDto,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.getSharedTasksWith(
      user.id,
      otherUserId,
      query,
      onBehalfOfUserId,
    );
  }

  @Get(':id')
  @CacheTags('task:my-tasks')
  @CacheScope('user')
  async getOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.getTaskById(user.id, id, onBehalfOfUserId);
  }

  @Get(':id/members')
  @CacheTags('task:my-tasks')
  @CacheScope('user')
  async getMembers(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.getTaskMembers(user.id, id, onBehalfOfUserId);
  }

  @Get(':id/activities')
  @CacheTags('task:my-tasks')
  @CacheScope('user')
  async getActivities(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query() query: QueryTaskActivitiesDto,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.getTaskActivities(
      user.id,
      id,
      query,
      false,
      onBehalfOfUserId,
    );
  }

  @Get('activities/:activityId/replies')
  @CacheTags('task:my-tasks')
  @CacheScope('user')
  async getReplies(
    @CurrentUser() user: JwtPayload,
    @Param('activityId') activityId: string,
    @Query() query: QueryTaskActivitiesDto,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.getTaskActivityReplies(
      user.id,
      activityId,
      query,
      false,
      onBehalfOfUserId,
    );
  }

  @Post()
  @InvalidateTags('task:my-tasks')
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateUserTaskDto,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.createTask(user.id, dto, onBehalfOfUserId);
  }

  @Patch(':id')
  @InvalidateTags('task:my-tasks')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserTaskDto,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.updateTask(user.id, id, dto, onBehalfOfUserId);
  }

  @Patch(':id/status')
  @InvalidateTags('task:my-tasks')
  async updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.updateTaskStatus(
      user.id,
      id,
      dto,
      onBehalfOfUserId,
    );
  }

  @Post(':id/accept')
  @InvalidateTags('task:my-tasks')
  async acceptTask(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.acceptTask(user.id, id, onBehalfOfUserId);
  }

  @Post(':id/leave')
  @InvalidateTags('task:my-tasks')
  async leaveTask(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: LeaveTaskDto,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.leaveTask(user.id, id, dto, onBehalfOfUserId);
  }

  @Post(':id/pin')
  @InvalidateTags('task:my-tasks')
  async pin(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.pinTask(user.id, id, onBehalfOfUserId);
  }

  @Delete(':id/pin')
  @InvalidateTags('task:my-tasks')
  async unpin(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.unpinTask(user.id, id, onBehalfOfUserId);
  }

  @Post(':id/activities')
  @InvalidateTags('task:my-tasks')
  async addActivity(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateTaskActivityDto,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.addTaskActivity(user.id, id, dto, onBehalfOfUserId);
  }

  @Post('activities/:activityId/react')
  @InvalidateTags('task:my-tasks')
  async toggleReaction(
    @CurrentUser() user: JwtPayload,
    @Param('activityId') activityId: string,
    @Body() dto: ReactTaskActivityDto,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.toggleActivityReaction(
      user.id,
      activityId,
      dto,
      onBehalfOfUserId,
    );
  }

  @Patch('activities/:activityId')
  @InvalidateTags('task:my-tasks')
  async updateActivity(
    @CurrentUser() user: JwtPayload,
    @Param('activityId') activityId: string,
    @Body() dto: UpdateTaskActivityDto,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.updateTaskActivity(
      user.id,
      activityId,
      dto,
      onBehalfOfUserId,
    );
  }

  @Delete('activities/:activityId')
  @InvalidateTags('task:my-tasks')
  async deleteActivity(
    @CurrentUser() user: JwtPayload,
    @Param('activityId') activityId: string,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.deleteTaskActivity(
      user.id,
      activityId,
      onBehalfOfUserId,
    );
  }

  @Delete(':id')
  @InvalidateTags('task:my-tasks')
  async delete(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.deleteTask(user.id, id, onBehalfOfUserId);
  }

  @Post(':id/restore')
  @InvalidateTags('task:my-tasks')
  async restore(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('onBehalfOfUserId') onBehalfOfUserId?: string,
  ) {
    return this.tasksService.restoreTask(user.id, id, onBehalfOfUserId);
  }
}
