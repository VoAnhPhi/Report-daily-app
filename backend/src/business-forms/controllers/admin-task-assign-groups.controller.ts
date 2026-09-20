import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { AnyPermission } from 'src/common/decorators/permissions.decorator';
import { PermissionCode } from 'src/common/enums/permission.enum';
import { CurrentUser } from 'src/users/users.decorator';
import { JwtPayload } from 'src/auth/jwt-payload';
import { TaskAssignGroupService } from '../services/task-assign-group.service';
import {
  CreateTaskAssignGroupDto,
  UpdateTaskAssignGroupDto,
} from '../dto/task-assign-group.dto';
import {
  CacheScope,
  CacheTags,
  InvalidateTags,
} from 'src/common/cache/cache.decorators';

@Controller('admin/task-groups')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminTaskAssignGroupsController {
  constructor(private readonly service: TaskAssignGroupService) {}

  @Get()
  @CacheTags('task-group:')
  @CacheScope('user')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async list(@CurrentUser() user: JwtPayload) {
    return this.service.listAll(user.id);
  }

  @Post()
  @InvalidateTags('task-group:')
  @AnyPermission(PermissionCode.DAILY_TASK_GROUPS_CREATE)
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTaskAssignGroupDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  @InvalidateTags('task-group:')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_VIEW,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTaskAssignGroupDto,
  ) {
    return this.service.updateAsAdmin(user.id, id, dto);
  }

  @Delete(':id')
  @InvalidateTags('task-group:')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.removeAsAdmin(id);
  }
}
