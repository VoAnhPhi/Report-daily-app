import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../../auth/jwt-payload';
import { CurrentUser } from '../../users/users.decorator';
import { AnyPermission } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PermissionCode } from '../../common/enums/permission.enum';
import { Role } from '../../common/enums/role.enum';
import { BusinessFormsAdminService } from '../services/business-forms-admin.service';
import { AdminCreateBusinessFormDto } from '../dto/admin-create-business-form.dto';
import { AdminUpdateBusinessFormDto } from '../dto/admin-update-business-form.dto';
import {
  AdminNeedsMoreInfoDto,
  AdminOptionalNoteDto,
} from '../dto/admin-set-status.dto';
import { ListBusinessFormsQueryDto } from '../dto/list-business-forms-query.dto';
import {
  BusinessFormAttachmentResponseDto,
  BusinessFormResponseDto,
} from '../dto/business-form-response.dto';
import {
  CreateBusinessFormProgressNoteDto,
  UpdateBusinessFormProgressNoteDto,
} from '../dto/business-form-progress-note.dto';
import {
  BusinessFormProfileDetailDto,
  ListBusinessFormProfilesQueryDto,
  PaginatedBusinessFormProfilesDto,
} from '../dto/business-form-profile.dto';
import { AdminSupplementAttachmentDto } from '../dto/admin-supplement-attachment.dto';
import { AdminAssignmentDto } from '../dto/admin-assignment.dto';
import { AdminAddRiskFlagDto } from '../dto/admin-risk-flag.dto';
import { AdminVerifyAttachmentDto } from '../dto/admin-verify-attachment.dto';
import { AdminPriorityDto } from '../dto/admin-priority.dto';
import {
  AdminCreateTaskDto,
  AdminUpdateTaskDto,
} from '../dto/admin-task.dto';
import { AdminPotentialDto } from '../dto/admin-potential.dto';
import { AdminApprovalGateDto } from '../dto/admin-approval-gate.dto';
import { ReviewGatingConfigResponseDto } from '../../admin/review-gating-config/dto/review-gating-config-response.dto';
import { BusinessFormRiskFlagCode } from '@prisma/client';

@Controller('admin/business-forms')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminBusinessFormsController {
  constructor(private readonly service: BusinessFormsAdminService) {}

  @Get()
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_VIEW,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async findAll(@Query() query: ListBusinessFormsQueryDto) {
    return this.service.findAll(query);
  }

  // Static `/profiles*` routes MUST be declared before the `:id` parameter
  // route below — Nest matches in declaration order and `:id` would otherwise
  // catch "profiles" as a form id.

  @Get('profiles')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_VIEW,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async findProfiles(
    @Query() query: ListBusinessFormProfilesQueryDto,
  ): Promise<PaginatedBusinessFormProfilesDto> {
    return this.service.findProfiles(query);
  }

  @Get('profiles/by-key')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_VIEW,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async findProfileByKey(
    @Query('userId') userId: string,
    @Query('taxCode') taxCode: string,
  ): Promise<BusinessFormProfileDetailDto> {
    return this.service.findProfileByKey(userId, taxCode);
  }

  @Get(':id')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_VIEW,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async findOne(@Param('id') id: string): Promise<BusinessFormResponseDto> {
    return this.service.findOne(id);
  }

  @Post()
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_CREATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async adminCreate(
    @Body() dto: AdminCreateBusinessFormDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    return this.service.adminCreate(dto, actor);
  }

  /**
   * Bật/tắt cổng phê duyệt hồ sơ đăng ký doanh nghiệp.
   *
   * TẮT cổng sẽ kéo theo `autoApproveAllPending` — duyệt hàng loạt MỌI hồ sơ
   * đang ở pending / in_review / needs_more_info. Đó là thao tác cấp hệ thống,
   * không phải thao tác duyệt từng hồ sơ, nên chỉ cấp `business_forms.approve`
   * (mức nhân viên duyệt) là quá lỏng.
   *
   * 15 cổng duyệt còn lại đi qua `review-gating-config.controller.ts`, vốn gắn
   * `@Roles(Role.ADMIN)` ở cấp lớp; màn hình `/settings/review-gating` của
   * acta-admin cũng tự chặn bằng `isSuperAdmin`. Thêm `@Roles` ở đây để cổng thứ
   * 16 về đúng một mức với 15 cổng kia và khớp cổng giao diện.
   *
   * Giữ nguyên `@AnyPermission` bên dưới: người có vai trò admin vốn đã bỏ qua
   * PermissionsGuard, nên dòng đó không đổi hành vi — nó ở lại làm lớp phòng thủ
   * thứ hai nếu về sau ai đó gỡ mất `@Roles`.
   */
  @Patch('approval-gate')
  @Roles(Role.ADMIN)
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_APPROVE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async setApprovalGate(
    @Body() dto: AdminApprovalGateDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<ReviewGatingConfigResponseDto> {
    return this.service.setApprovalGate(dto.isEnabled, actor);
  }

  @Patch(':id')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async adminUpdate(
    @Param('id') id: string,
    @Body() dto: AdminUpdateBusinessFormDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    return this.service.adminUpdate(id, dto, actor);
  }

  @Post(':id/approve')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_APPROVE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async approve(
    @Param('id') id: string,
    @Body() dto: AdminOptionalNoteDto,
    @CurrentUser() actor: JwtPayload,
    @Req() req: Request,
  ): Promise<BusinessFormResponseDto> {
    // PermissionsGuard attaches the actor's effective permissions to the
    // request after a successful guard pass. Pass them through so the
    // service can authorise the optional `override` flag.
    const permissions = (req as Request & { userPermissions?: Set<string> })
      .userPermissions;
    return this.service.transitionStatus(
      id,
      'approve',
      actor,
      dto.adminNote,
      undefined,
      dto.override === true,
      permissions,
    );
  }

  @Post(':id/reject')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_REJECT,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async reject(
    @Param('id') id: string,
    @Body() dto: AdminOptionalNoteDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    return this.service.transitionStatus(id, 'reject', actor, dto.adminNote);
  }

  @Post(':id/in-review')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async setInReview(
    @Param('id') id: string,
    @Body() dto: AdminOptionalNoteDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    return this.service.transitionStatus(id, 'in_review', actor, dto.adminNote);
  }

  @Post(':id/needs-more-info')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async setNeedsMoreInfo(
    @Param('id') id: string,
    @Body() dto: AdminNeedsMoreInfoDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    return this.service.transitionStatus(
      id,
      'needs_more_info',
      actor,
      dto.adminNote,
      dto.flags,
    );
  }

  @Delete(':id')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_DELETE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async adminDelete(
    @Param('id') id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<{ success: true }> {
    return this.service.adminSoftDelete(id, actor);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Admin supplement attachments — admin uploads a file on behalf of the
  // submitter and records it as `admin_supplement` with full audit trail.
  // ──────────────────────────────────────────────────────────────────────

  @Post(':id/attachments')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async adminSupplementAttachment(
    @Param('id') id: string,
    @Body() dto: AdminSupplementAttachmentDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<BusinessFormAttachmentResponseDto> {
    return this.service.adminSupplementAttachment(id, dto, actor);
  }

  @Delete(':id/attachments/:attachmentId')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async adminDeleteAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<{ success: true }> {
    return this.service.adminDeleteAttachment(id, attachmentId, actor);
  }

  @Post(':id/attachments/:attachmentId/replace')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async replaceAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Body() dto: AdminSupplementAttachmentDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<BusinessFormAttachmentResponseDto> {
    return this.service.replaceAttachment(id, attachmentId, dto, actor);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Audit history — full timeline of admin/user actions on this form.
  // ──────────────────────────────────────────────────────────────────────

  @Get(':id/related')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_VIEW,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async getRelated(@Param('id') id: string) {
    return this.service.findRelated(id);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Assignment + risk flags — operational triage signals.
  // ──────────────────────────────────────────────────────────────────────

  @Patch(':id/assignment')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async setAssignment(
    @Param('id') id: string,
    @Body() dto: AdminAssignmentDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    return this.service.setAssignment(id, dto, actor);
  }

  @Post(':id/risk-flags')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async addRiskFlag(
    @Param('id') id: string,
    @Body() dto: AdminAddRiskFlagDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    return this.service.addRiskFlag(id, dto, actor);
  }

  @Delete(':id/risk-flags/:code')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async removeRiskFlag(
    @Param('id') id: string,
    @Param('code') code: BusinessFormRiskFlagCode,
    @CurrentUser() actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    return this.service.removeRiskFlag(id, code, actor);
  }

  @Patch(':id/attachments/:attachmentId/verification')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async setAttachmentVerification(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Body() dto: AdminVerifyAttachmentDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    return this.service.setAttachmentVerification(
      id,
      attachmentId,
      dto,
      actor,
    );
  }

  @Patch(':id/priority')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async setPriority(
    @Param('id') id: string,
    @Body() dto: AdminPriorityDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    return this.service.setPriority(id, dto, actor);
  }

  @Post(':id/tasks')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async addTask(
    @Param('id') id: string,
    @Body() dto: AdminCreateTaskDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    return this.service.addTask(id, dto, actor);
  }

  @Patch(':id/tasks/:taskId')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async updateTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() dto: AdminUpdateTaskDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    return this.service.updateTask(id, taskId, dto, actor);
  }

  @Delete(':id/tasks/:taskId')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async deleteTask(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    return this.service.deleteTask(id, taskId, actor);
  }

  @Patch(':id/potential')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async setPotential(
    @Param('id') id: string,
    @Body() dto: AdminPotentialDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    return this.service.setPotential(id, dto, actor);
  }

  @Get(':id/audit-history')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_VIEW,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async getAuditHistory(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageN = page ? Math.max(1, Number.parseInt(page, 10) || 1) : 1;
    const limitN = limit
      ? Math.min(200, Math.max(1, Number.parseInt(limit, 10) || 50))
      : 50;
    return this.service.getAuditHistory(id, pageN, limitN);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Progress notes — admin-authored timeline entries with optional images,
  // visibility toggle, and supplier-identity anonymization.
  // ──────────────────────────────────────────────────────────────────────

  @Get(':id/progress-notes')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_VIEW,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async listProgressNotes(@Param('id') id: string) {
    return this.service.listProgressNotes(id);
  }

  @Post(':id/progress-notes')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async addProgressNote(
    @Param('id') id: string,
    @Body() dto: CreateBusinessFormProgressNoteDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.service.addProgressNote(id, dto, actor);
  }

  @Patch(':id/progress-notes/:noteId')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async updateProgressNote(
    @Param('id') id: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateBusinessFormProgressNoteDto,
  ) {
    return this.service.updateProgressNote(id, noteId, dto);
  }

  @Delete(':id/progress-notes/:noteId')
  @AnyPermission(
    PermissionCode.BUSINESS_FORMS_UPDATE,
    PermissionCode.BUSINESS_FORMS_MANAGE,
  )
  async deleteProgressNote(
    @Param('id') id: string,
    @Param('noteId') noteId: string,
  ): Promise<{ success: true }> {
    return this.service.deleteProgressNote(id, noteId);
  }
}
