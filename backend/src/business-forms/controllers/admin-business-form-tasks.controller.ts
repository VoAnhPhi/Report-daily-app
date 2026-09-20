import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { AnyPermission } from 'src/common/decorators/permissions.decorator';
import { PermissionCode } from 'src/common/enums/permission.enum';
import { CurrentUser } from 'src/users/users.decorator';
import { JwtPayload } from 'src/auth/jwt-payload';
import { BusinessFormTasksService } from '../services/business-form-tasks.service';
import {
  AdminCreateTaskDto,
  AdminUpdateTaskDto,
  AdminQueryTasksDto,
  ExportTasksDto,
  AdminTaskAssignmentDto,
} from '../dto/admin-task.dto';
import {
  CreateTaskActivityDto,
  UpdateTaskActivityDto,
  UpdateTaskStatusDto,
  QueryTaskActivitiesDto,
  ReactTaskActivityDto,
} from '../dto/user-task.dto';
import {
  CacheScope,
  CacheTags,
  InvalidateTags,
  NoCache,
} from 'src/common/cache/cache.decorators';

@Controller('admin/tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminBusinessFormTasksController {
  constructor(private readonly tasksService: BusinessFormTasksService) {}

  @Get('user/:userId/overview')
  @CacheTags('task:my-tasks')
  @CacheScope('global')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_VIEW,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async getUserOverview(@Param('userId') userId: string) {
    return this.tasksService.getUserTaskOverview(userId);
  }

  @Get('analytics')
  @CacheTags('task:my-tasks')
  @CacheScope('global')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_VIEW,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async getGlobalAnalytics() {
    return this.tasksService.getGlobalAnalytics();
  }

  @Get(':id/activities')
  @CacheTags('task:my-tasks')
  @CacheScope('user')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_VIEW,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async getActivities(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query() query: QueryTaskActivitiesDto,
  ) {
    return this.tasksService.getTaskActivities(user.id, id, query, true);
  }

  @Get('activities/:activityId/replies')
  @CacheTags('task:my-tasks')
  @CacheScope('user')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_VIEW,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async getReplies(
    @CurrentUser() user: JwtPayload,
    @Param('activityId') activityId: string,
    @Query() query: QueryTaskActivitiesDto,
  ) {
    return this.tasksService.getTaskActivityReplies(
      user.id,
      activityId,
      query,
      true,
    );
  }

  @Get()
  @CacheTags('task:my-tasks')
  @CacheScope('global')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_VIEW,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async findAll(@Query() query: AdminQueryTasksDto) {
    return this.tasksService.adminFindAll(query);
  }

  @Get('export')
  @NoCache()
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_VIEW,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async exportTasks(
    @Query() query: ExportTasksDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.tasksService.exportTasksXlsx(query);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Access-Control-Expose-Headers': 'Authorization, Content-Disposition',
    });
    return new StreamableFile(buffer);
  }

  @Get(':id')
  @CacheTags('task:my-tasks')
  @CacheScope('global')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_VIEW,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async findOne(@Param('id') id: string) {
    return this.tasksService.adminFindOne(id);
  }

  @Post()
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_CREATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  @InvalidateTags('task:my-tasks')
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AdminCreateTaskDto,
  ) {
    return this.tasksService.adminCreateTask(dto, user);
  }

  @Patch(':id')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  @InvalidateTags('task:my-tasks')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AdminUpdateTaskDto,
  ) {
    return this.tasksService.adminUpdateTask(id, dto, user);
  }

  @Patch(':id/status')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  @InvalidateTags('task:my-tasks')
  async updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.adminUpdateStatus(id, dto, user);
  }

  @Patch(':id/assignment')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  @InvalidateTags('task:my-tasks')
  async setAssignment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AdminTaskAssignmentDto,
  ) {
    return this.tasksService.adminSetAssignment(id, dto, user);
  }

  @Post(':id/activities')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  @InvalidateTags('task:my-tasks')
  async addActivity(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateTaskActivityDto,
  ) {
    return this.tasksService.adminAddActivity(id, dto, user);
  }

  @Patch('activities/:activityId')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  @InvalidateTags('task:my-tasks')
  async updateActivity(
    @CurrentUser() user: JwtPayload,
    @Param('activityId') activityId: string,
    @Body() dto: UpdateTaskActivityDto,
  ) {
    return this.tasksService.updateTaskActivity(user.id, activityId, dto);
  }

  @Delete('activities/:activityId')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  @InvalidateTags('task:my-tasks')
  async deleteActivity(
    @CurrentUser() user: JwtPayload,
    @Param('activityId') activityId: string,
  ) {
    return this.tasksService.deleteTaskActivity(user.id, activityId);
  }

  @Post('activities/:activityId/react')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  @InvalidateTags('task:my-tasks')
  async toggleReaction(
    @CurrentUser() user: JwtPayload,
    @Param('activityId') activityId: string,
    @Body() dto: ReactTaskActivityDto,
  ) {
    return this.tasksService.toggleActivityReaction(user.id, activityId, dto);
  }

  @Delete(':id')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_DELETE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  @InvalidateTags('task:my-tasks')
  async delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tasksService.adminDeleteTask(id, user);
  }

  @Post(':id/restore')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_DELETE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  @InvalidateTags('task:my-tasks')
  async restore(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tasksService.adminRestoreTask(id, user);
  }
}
