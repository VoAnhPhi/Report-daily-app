import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityTargetType,
  ActivityType,
  BusinessFormRiskFlagCode,
  BusinessFormStatus,
  BusinessFormTaskType,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/services/prisma.service';
import { ActivityLogService } from '../../activity-logs/activity-log.service';
import { JwtPayload } from '../../auth/jwt-payload';
import { PermissionCode } from '../../common/enums/permission.enum';
import { AdminCreateBusinessFormDto } from '../dto/admin-create-business-form.dto';
import { AdminUpdateBusinessFormDto } from '../dto/admin-update-business-form.dto';
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
import {
  BusinessFormAttachmentResponseDto,
  BusinessFormResponseDto,
} from '../dto/business-form-response.dto';
import { ActivityLogQueryDto } from '../../activity-logs/dto/activity-log-query.dto';
import { PaginatedActivityLogResponseDto } from '../../activity-logs/dto/activity-log-response.dto';
import {
  BusinessFormProfileDetailDto,
  BusinessFormProfileSummaryDto,
  ListBusinessFormProfilesQueryDto,
  PaginatedBusinessFormProfilesDto,
} from '../dto/business-form-profile.dto';
import { ListBusinessFormsQueryDto } from '../dto/list-business-forms-query.dto';
import {
  BusinessFormProgressNoteAdminResponseDto,
  CreateBusinessFormProgressNoteDto,
  UpdateBusinessFormProgressNoteDto,
  toAdminProgressNote,
} from '../dto/business-form-progress-note.dto';
import { CreateBusinessFormFieldFlagDto } from '../dto/business-form-field-flag.dto';
import { BUSINESS_FORM_ACTIVE_TAXCODE_INDEX } from '../business-forms.constants';
import { BusinessFormRemindersService } from './business-form-reminders.service';
import { BusinessFormNotificationsService } from './business-form-notifications.service';
import { ReviewGatingConfigService } from '../../admin/review-gating-config/review-gating-config.service';
import { ReviewGatingConfigResponseDto } from '../../admin/review-gating-config/dto/review-gating-config-response.dto';

const FORM_INCLUDE = {
  reviewedBy: { select: { id: true, fullName: true } },
  user: { select: { id: true, fullName: true } },
  createdByAdmin: { select: { id: true, fullName: true } },
  assignedTo: { select: { id: true, fullName: true } },
  assignedBy: { select: { id: true, fullName: true } },
  products: true,
  attachments: {
    orderBy: { createdAt: 'asc' },
    include: {
      uploadedBy: { select: { id: true, fullName: true } },
      verifiedBy: { select: { id: true, fullName: true } },
    },
  },
  fieldFlags: { orderBy: { createdAt: 'asc' } },
  progressNotes: {
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { id: true, fullName: true } } },
  },
  riskFlags: {
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { id: true, fullName: true } } },
  },
  tasks: {
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      mainAssignee: {
        select: {
          id: true,
          fullName: true,
          avatar: { select: { fileUrl: true } },
        },
      },
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatar: { select: { fileUrl: true } },
            },
          },
        },
      },
      createdBy: { select: { id: true, fullName: true } },
      completedBy: { select: { id: true, fullName: true } },
    },
  },
} satisfies Prisma.BusinessFormInclude;

type AdminTransition = 'approve' | 'reject' | 'in_review' | 'needs_more_info';

// Mã số thuế: 8–13 ký tự, gồm chữ và/hoặc số — áp dụng cho cả doanh nghiệp lẫn cá nhân.
const TAX_CODE_RE = /^[A-Za-z0-9]{8,13}$/;
const PHONE_RE = /^(\+84|0)\d{9,10}$/;

const CORE_REQUIRED_FIELDS: Array<
  'companyName' | 'taxCode' | 'address' | 'contactName' | 'contactPhone'
> = ['companyName', 'taxCode', 'address', 'contactName', 'contactPhone'];

const ALLOWED_FROM_STATES: Record<AdminTransition, BusinessFormStatus[]> = {
  approve: [
    BusinessFormStatus.pending,
    BusinessFormStatus.in_review,
    BusinessFormStatus.needs_more_info,
  ],
  reject: [
    BusinessFormStatus.pending,
    BusinessFormStatus.in_review,
    BusinessFormStatus.needs_more_info,
  ],
  in_review: [
    BusinessFormStatus.pending,
    BusinessFormStatus.needs_more_info,
  ],
  needs_more_info: [
    BusinessFormStatus.pending,
    BusinessFormStatus.in_review,
  ],
};

const TARGET_STATUS_FOR_TRANSITION: Record<AdminTransition, BusinessFormStatus> = {
  approve: BusinessFormStatus.approved,
  reject: BusinessFormStatus.rejected,
  in_review: BusinessFormStatus.in_review,
  needs_more_info: BusinessFormStatus.needs_more_info,
};

function isMstUniqueViolation(
  err: unknown,
): err is Prisma.PrismaClientKnownRequestError {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code !== 'P2002') return false;
  const target = err.meta?.target;
  if (Array.isArray(target)) {
    return (target as string[]).some(
      (t) => t === BUSINESS_FORM_ACTIVE_TAXCODE_INDEX || t === 'taxCode',
    );
  }
  if (typeof target === 'string') {
    return (
      target === BUSINESS_FORM_ACTIVE_TAXCODE_INDEX || target === 'taxCode'
    );
  }
  return false;
}

// Checklist + đính kèm của Công việc lưu inline JSON: gắn id ổn định cho React key ở FE.
const toTaskItemsJson = (items?: { label: string; done?: boolean }[]) =>
  (items ?? []).map((i) => ({
    id: randomUUID(),
    label: i.label,
    done: i.done ?? false,
  }));
const toTaskAttachmentsJson = (atts?: { name: string; url: string }[]) =>
  (atts ?? []).map((a) => ({ id: randomUUID(), name: a.name, url: a.url }));

@Injectable()
export class BusinessFormsAdminService {
  private readonly logger = new Logger(BusinessFormsAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
    private readonly remindersService: BusinessFormRemindersService,
    private readonly notificationsService: BusinessFormNotificationsService,
    private readonly reviewGating: ReviewGatingConfigService,
  ) {}

  /**
   * Bật/tắt gate duyệt đăng ký doanh nghiệp đối tác ('businessForm').
   * Khi tắt: duyệt luôn mọi form đang chờ để không còn form nào kẹt trong hàng đợi.
   */
  async setApprovalGate(
    isEnabled: boolean,
    actor: JwtPayload,
  ): Promise<ReviewGatingConfigResponseDto> {
    const config = await this.reviewGating.upsert(
      'businessForm',
      isEnabled,
      actor.id,
    );
    if (!isEnabled) {
      await this.autoApproveAllPending(actor);
    }
    return config;
  }

  /**
   * Duyệt hàng loạt mọi form chưa chốt (pending / in_review / needs_more_info).
   * Im lặng: chỉ đổi trạng thái + dọn field flags, không gửi thông báo.
   */
  private async autoApproveAllPending(actor: JwtPayload): Promise<number> {
    const PENDING_STATES: BusinessFormStatus[] = [
      BusinessFormStatus.pending,
      BusinessFormStatus.in_review,
      BusinessFormStatus.needs_more_info,
    ];
    const targets = await this.prisma.businessForm.findMany({
      where: { deletedAt: null, status: { in: PENDING_STATES } },
      select: { id: true },
    });
    if (targets.length === 0) return 0;

    const ids = targets.map((t) => t.id);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.businessFormFieldFlag.deleteMany({
        where: { businessFormId: { in: ids } },
      }),
      this.prisma.businessForm.updateMany({
        where: { id: { in: ids } },
        data: {
          status: BusinessFormStatus.approved,
          reviewedAt: now,
          reviewedById: actor.id,
        },
      }),
    ]);
    this.logger.log(`Auto-approved ${ids.length} pending business form(s)`);
    return ids.length;
  }

  async findAll(query: ListBusinessFormsQueryDto): Promise<{
    data: BusinessFormResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const includeDeleted = query.includeDeleted ?? false;

    const where: Prisma.BusinessFormWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { taxCode: { contains: query.search.trim() } },
              {
                companyName: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              { contactPhone: { contains: query.search.trim() } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.businessForm.count({ where }),
      this.prisma.businessForm.findMany({
        where,
        include: FORM_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rows.map(BusinessFormResponseDto.fromAdmin),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<BusinessFormResponseDto> {
    const form = await this.prisma.businessForm.findUnique({
      where: { id },
      include: FORM_INCLUDE,
    });
    if (!form) throw new NotFoundException('Form không tồn tại');
    return BusinessFormResponseDto.fromAdmin(form);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Business profile mode — groups forms by (userId, taxCode). One business
  // (= one MST owned by one user) can have multiple cooperation requests
  // (= multiple forms). Profile mode lets admin
  // browse a flat list of distinct businesses; clicking one shows every
  // request that business has submitted.
  // ──────────────────────────────────────────────────────────────────────

  async findProfiles(
    query: ListBusinessFormProfilesQueryDto,
  ): Promise<PaginatedBusinessFormProfilesDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const includeDeleted = query.includeDeleted ?? false;
    const search = query.search?.trim();

    const where: Prisma.BusinessFormWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { taxCode: { contains: search } },
              {
                companyName: { contains: search, mode: 'insensitive' },
              },
              { contactPhone: { contains: search } },
              {
                user: {
                  fullName: { contains: search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    // Pull every matching form. Profile mode groups in memory because
    // Prisma `groupBy` doesn't support nested aggregations needed here
    // (per-status counts + distinct categories + latest-form snapshot in
    // one round-trip). The admin volume is small enough that a single
    // findMany over filtered rows stays cheap.
    const rows = await this.prisma.businessForm.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });

    type Bucket = {
      key: string;
      userId: string;
      taxCode: string;
      forms: typeof rows;
    };
    const buckets = new Map<string, Bucket>();
    for (const r of rows) {
      const key = `${r.userId}::${r.taxCode}`;
      let b = buckets.get(key);
      if (!b) {
        b = { key, userId: r.userId, taxCode: r.taxCode, forms: [] };
        buckets.set(key, b);
      }
      b.forms.push(r);
    }

    const allProfiles: BusinessFormProfileSummaryDto[] = Array.from(
      buckets.values(),
    ).map((b) => {
      // forms are already sorted desc by createdAt because the source
      // findMany was; the first one is the latest.
      const latest = b.forms[0];
      const statusCounts: Record<BusinessFormStatus, number> = {
        [BusinessFormStatus.pending]: 0,
        [BusinessFormStatus.in_review]: 0,
        [BusinessFormStatus.needs_more_info]: 0,
        [BusinessFormStatus.approved]: 0,
        [BusinessFormStatus.rejected]: 0,
      };
      let hasActive = false;
      let preferredName: string | null = null;
      for (const f of b.forms) {
        statusCounts[f.status] = (statusCounts[f.status] ?? 0) + 1;
        if (!f.deletedAt) {
          hasActive = true;
          if (preferredName === null) preferredName = f.companyName;
        }
      }
      return {
        userId: b.userId,
        taxCode: b.taxCode,
        companyName: preferredName ?? latest.companyName,
        owner: latest.user ?? null,
        requestCount: b.forms.length,
        statusCounts,
        hasActiveForms: hasActive,
        latestCreatedAt: latest.createdAt,
        latestForm: {
          id: latest.id,
          status: latest.status,
          createdAt: latest.createdAt,
          updatedAt: latest.updatedAt,
          contactName: latest.contactName,
          contactPhone: latest.contactPhone,
        },
      };
    });

    // Sort profiles by latest form's createdAt desc, then paginate.
    allProfiles.sort(
      (a, b) => b.latestCreatedAt.getTime() - a.latestCreatedAt.getTime(),
    );
    const total = allProfiles.length;
    const data = allProfiles.slice((page - 1) * limit, page * limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findProfileByKey(
    userId: string,
    taxCode: string,
    includeDeleted = true,
  ): Promise<BusinessFormProfileDetailDto> {
    const where: Prisma.BusinessFormWhereInput = {
      userId,
      taxCode,
      ...(includeDeleted ? {} : { deletedAt: null }),
    };
    const rows = await this.prisma.businessForm.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: FORM_INCLUDE,
    });
    if (rows.length === 0) {
      throw new NotFoundException('Không tìm thấy hồ sơ doanh nghiệp');
    }
    const latest = rows[0];

    const statusCounts: Record<BusinessFormStatus, number> = {
      [BusinessFormStatus.pending]: 0,
      [BusinessFormStatus.in_review]: 0,
      [BusinessFormStatus.needs_more_info]: 0,
      [BusinessFormStatus.approved]: 0,
      [BusinessFormStatus.rejected]: 0,
    };
    let hasActive = false;
    let preferredName: string | null = null;
    for (const f of rows) {
      statusCounts[f.status] = (statusCounts[f.status] ?? 0) + 1;
      if (!f.deletedAt) {
        hasActive = true;
        if (preferredName === null) preferredName = f.companyName;
      }
    }

    const profile: BusinessFormProfileSummaryDto = {
      userId,
      taxCode,
      companyName: preferredName ?? latest.companyName,
      owner: latest.user ?? null,
      requestCount: rows.length,
      statusCounts,
      hasActiveForms: hasActive,
      latestCreatedAt: latest.createdAt,
      latestForm: {
        id: latest.id,
        status: latest.status,
        createdAt: latest.createdAt,
        updatedAt: latest.updatedAt,
        contactName: latest.contactName,
        contactPhone: latest.contactPhone,
      },
    };

    return {
      profile,
      forms: rows.map(BusinessFormResponseDto.fromAdmin),
    };
  }

  async adminCreate(
    dto: AdminCreateBusinessFormDto,
    actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    // Submitter must NOT be the admin creating the form. The form represents
    // a partner/supplier — the admin is keying it in on their behalf.
    if (dto.userId === actor.id) {
      throw new BadRequestException(
        'Không thể chọn chính tài khoản đang đăng nhập làm người gửi',
      );
    }

    const target = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Người dùng không tồn tại');

    const requireApproval = await this.reviewGating.isGateEnabled(
      'businessForm',
      false,
    );

    try {
      const form = await this.prisma.businessForm.create({
        data: {
          userId: dto.userId,
          companyName: dto.companyName,
          taxCode: dto.taxCode,
          isIndividual: dto.isIndividual ?? false,
          address: dto.address,
          contactName: dto.contactName,
          contactPhone: dto.contactPhone,
          description: dto.description ?? null,
          productInfo: dto.productInfo ?? null,
          gpkdFileUrl: (dto.gpkdFileUrl ?? []) as unknown as Prisma.InputJsonValue,
          congBoSpFileUrl: (dto.congBoSpFileUrl ?? []) as unknown as Prisma.InputJsonValue,
          kiemNghiemFileUrl: (dto.kiemNghiemFileUrl ?? []) as unknown as Prisma.InputJsonValue,
          nhanSpFileUrl: (dto.nhanSpFileUrl ?? []) as unknown as Prisma.InputJsonValue,
          maVachFileUrl: (dto.maVachFileUrl ?? []) as unknown as Prisma.InputJsonValue,
          tccsFileUrl: (dto.tccsFileUrl ?? []) as unknown as Prisma.InputJsonValue,
          coFileUrl: (dto.coFileUrl ?? []) as unknown as Prisma.InputJsonValue,
          dangKyNhFileUrl: (dto.dangKyNhFileUrl ?? []) as unknown as Prisma.InputJsonValue,
          gmpFileUrl: (dto.gmpFileUrl ?? []) as unknown as Prisma.InputJsonValue,
          otherDocFileUrl: (dto.otherDocFileUrl ?? []) as unknown as Prisma.InputJsonValue,
          // Admin-keyed forms enter the normal review queue unless approval
          // gating is OFF, in which case they're auto-approved on create.
          status: requireApproval
            ? BusinessFormStatus.pending
            : BusinessFormStatus.approved,
          reviewedAt: requireApproval ? null : new Date(),
          reviewedById: requireApproval ? null : actor.id,
          createdByAdminId: actor.id,
          products: dto.products?.length
            ? {
                create: dto.products.map((p) => ({
                  name: p.name,
                  price: new Prisma.Decimal(p.price),
                  imageUrl: p.imageUrl ?? null,
                })),
              }
            : undefined,
          attachments: dto.attachments?.length
            ? {
                create: dto.attachments.map((a) => ({
                  label: a.label,
                  fileUrl: a.fileUrl,
                  note: a.note ?? null,
                  source: 'admin_supplement',
                  uploadedById: actor.id,
                })),
              }
            : undefined,
        },
        include: FORM_INCLUDE,
      });

      this.activityLogService
        .createActivityLog(
          form.id,
          ActivityTargetType.BUSINESS_FORM,
          ActivityType.BUSINESS_FORM_STATUS_CHANGED,
          actor,
          `Tạo form đăng ký doanh nghiệp ${form.companyName} (${form.taxCode}) thay người dùng → pending`,
          {
            fromStatus: null,
            toStatus: BusinessFormStatus.pending,
            transition: 'admin-create',
          },
        )
        .catch((err: unknown) =>
          this.logger.warn(
            `ActivityLog failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );

      await this.notificationsService.enqueueDispatch({
        formId: form.id,
        fromStatus: null,
        toStatus: BusinessFormStatus.pending,
        transition: 'admin-create',
        actorId: actor.id,
      });

      return BusinessFormResponseDto.fromAdmin(form);
    } catch (err) {
      if (isMstUniqueViolation(err)) {
        throw new ConflictException({ message: 'MST đã được đăng ký' });
      }
      throw err;
    }
  }

  async adminUpdate(
    id: string,
    dto: AdminUpdateBusinessFormDto,
    actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    // Snapshot every scalar field BEFORE we touch the row so the audit log
    // can record before/after diffs.
    const before = await this.prisma.businessForm.findUnique({
      where: { id },
      select: {
        id: true,
        deletedAt: true,
        companyName: true,
        taxCode: true,
        isIndividual: true,
        address: true,
        contactName: true,
        contactPhone: true,
        description: true,
        productInfo: true,
        gpkdFileUrl: true,
        congBoSpFileUrl: true,
        kiemNghiemFileUrl: true,
        nhanSpFileUrl: true,
        maVachFileUrl: true,
        tccsFileUrl: true,
        coFileUrl: true,
        dangKyNhFileUrl: true,
        gmpFileUrl: true,
        otherDocFileUrl: true,
        adminNote: true,
      },
    });
    if (!before) throw new NotFoundException('Form không tồn tại');
    if (before.deletedAt) {
      throw new ForbiddenException('Form đã bị xóa');
    }

    const data: Prisma.BusinessFormUpdateInput = {};
    const diff: Record<string, { before: unknown; after: unknown }> = {};
    const setField = <K extends keyof typeof before>(
      key: K,
      next: (typeof before)[K] | null,
    ) => {
      if (before[key] !== next) {
        diff[key as string] = { before: before[key], after: next };
      }
    };

    if (dto.companyName !== undefined) {
      data.companyName = dto.companyName;
      setField('companyName', dto.companyName);
    }
    if (dto.taxCode !== undefined) {
      data.taxCode = dto.taxCode;
      setField('taxCode', dto.taxCode);
    }
    if (dto.isIndividual !== undefined) {
      data.isIndividual = dto.isIndividual;
      setField('isIndividual', dto.isIndividual);
    }
    if (dto.address !== undefined) {
      data.address = dto.address;
      setField('address', dto.address);
    }
    if (dto.contactName !== undefined) {
      data.contactName = dto.contactName;
      setField('contactName', dto.contactName);
    }
    if (dto.contactPhone !== undefined) {
      data.contactPhone = dto.contactPhone;
      setField('contactPhone', dto.contactPhone);
    }
    if (dto.description !== undefined) {
      data.description = dto.description ?? null;
      setField('description', dto.description ?? null);
    }
    if (dto.productInfo !== undefined) {
      data.productInfo = dto.productInfo ?? null;
      setField('productInfo', dto.productInfo ?? null);
    }
    if (dto.gpkdFileUrl !== undefined) {
      data.gpkdFileUrl = (dto.gpkdFileUrl ?? []) as unknown as Prisma.InputJsonValue;
      setField('gpkdFileUrl', dto.gpkdFileUrl as unknown as Prisma.JsonValue ?? null);
    }
    if (dto.congBoSpFileUrl !== undefined) {
      data.congBoSpFileUrl = (dto.congBoSpFileUrl ?? []) as unknown as Prisma.InputJsonValue;
      setField('congBoSpFileUrl', dto.congBoSpFileUrl as unknown as Prisma.JsonValue ?? null);
    }
    if (dto.kiemNghiemFileUrl !== undefined) {
      data.kiemNghiemFileUrl = (dto.kiemNghiemFileUrl ?? []) as unknown as Prisma.InputJsonValue;
      setField('kiemNghiemFileUrl', dto.kiemNghiemFileUrl as unknown as Prisma.JsonValue ?? null);
    }
    if (dto.nhanSpFileUrl !== undefined) {
      data.nhanSpFileUrl = (dto.nhanSpFileUrl ?? []) as unknown as Prisma.InputJsonValue;
      setField('nhanSpFileUrl', dto.nhanSpFileUrl as unknown as Prisma.JsonValue ?? null);
    }
    if (dto.maVachFileUrl !== undefined) {
      data.maVachFileUrl = (dto.maVachFileUrl ?? []) as unknown as Prisma.InputJsonValue;
      setField('maVachFileUrl', dto.maVachFileUrl as unknown as Prisma.JsonValue ?? null);
    }
    if (dto.tccsFileUrl !== undefined) {
      data.tccsFileUrl = (dto.tccsFileUrl ?? []) as unknown as Prisma.InputJsonValue;
      setField('tccsFileUrl', dto.tccsFileUrl as unknown as Prisma.JsonValue ?? null);
    }
    if (dto.coFileUrl !== undefined) {
      data.coFileUrl = (dto.coFileUrl ?? []) as unknown as Prisma.InputJsonValue;
      setField('coFileUrl', dto.coFileUrl as unknown as Prisma.JsonValue ?? null);
    }
    if (dto.dangKyNhFileUrl !== undefined) {
      data.dangKyNhFileUrl = (dto.dangKyNhFileUrl ?? []) as unknown as Prisma.InputJsonValue;
      setField('dangKyNhFileUrl', dto.dangKyNhFileUrl as unknown as Prisma.JsonValue ?? null);
    }
    if (dto.gmpFileUrl !== undefined) {
      data.gmpFileUrl = (dto.gmpFileUrl ?? []) as unknown as Prisma.InputJsonValue;
      setField('gmpFileUrl', dto.gmpFileUrl as unknown as Prisma.JsonValue ?? null);
    }
    if (dto.otherDocFileUrl !== undefined) {
      data.otherDocFileUrl = (dto.otherDocFileUrl ?? []) as unknown as Prisma.InputJsonValue;
      setField('otherDocFileUrl', dto.otherDocFileUrl as unknown as Prisma.JsonValue ?? null);
    }
    if (dto.adminNote !== undefined) {
      data.adminNote = dto.adminNote ?? null;
      setField('adminNote', dto.adminNote ?? null);
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (dto.products !== undefined) {
          await tx.businessFormProduct.deleteMany({
            where: { businessFormId: id },
          });
          if (dto.products.length > 0) {
            await tx.businessFormProduct.createMany({
              data: dto.products.map((p) => ({
                businessFormId: id,
                name: p.name,
                price: new Prisma.Decimal(p.price),
                imageUrl: p.imageUrl ?? null,
              })),
            });
          }
        }
        if (dto.attachments !== undefined) {
          await tx.businessFormAttachment.deleteMany({
            where: { businessFormId: id },
          });
          if (dto.attachments.length > 0) {
            await tx.businessFormAttachment.createMany({
              data: dto.attachments.map((a) => ({
                businessFormId: id,
                label: a.label,
                fileUrl: a.fileUrl,
                note: a.note ?? null,
                source: 'admin_supplement',
                uploadedById: actor.id,
              })),
            });
          }
        }
        return tx.businessForm.update({
          where: { id },
          data,
          include: FORM_INCLUDE,
        });
      });

      // Persist a per-edit audit entry (best-effort). Attachments/products
      // diffs are flagged as a boolean so the timeline shows that they
      // changed without dumping every row into the log.
      const changedKeys = Object.keys(diff);
      if (
        changedKeys.length > 0 ||
        dto.products !== undefined ||
        dto.attachments !== undefined
      ) {
        this.activityLogService
          .createActivityLog(
            id,
            ActivityTargetType.BUSINESS_FORM,
            ActivityType.BUSINESS_FORM_STATUS_CHANGED,
            actor,
            `Admin chỉnh sửa form ${updated.companyName} (${updated.taxCode}) — ${
              changedKeys.length
            } trường${
              dto.products !== undefined ? ' + sản phẩm' : ''
            }${dto.attachments !== undefined ? ' + tài liệu' : ''}`,
            {
              transition: 'admin-edit',
              changedFields: changedKeys,
              fieldDiff: diff,
              productsReplaced: dto.products !== undefined,
              attachmentsReplaced: dto.attachments !== undefined,
            },
          )
          .catch((err: unknown) =>
            this.logger.warn(
              `ActivityLog failed: ${err instanceof Error ? err.message : String(err)}`,
            ),
          );
      }

      return BusinessFormResponseDto.fromAdmin(updated);
    } catch (err) {
      if (isMstUniqueViolation(err)) {
        throw new ConflictException({
          message: 'MST đã được đăng ký bởi form khác',
        });
      }
      throw err;
    }
  }

  /**
   * Authoritative approval readiness check. Returns the list of failing
   * criterion codes; empty array means "all clear". Mirrors the frontend
   * `computeCompleteness` heuristic so the UI and the API agree on what
   * "ready to approve" means.
   *
   * Codes returned (used in the 422 response payload):
   *   - missing_field:<key>
   *   - tax_code_invalid
   *   - contact_phone_invalid
   *   - missing_doc:<slot>
   *   - open_field_flag (any flagged field still pending)
   */
  private computeApprovalReadinessFailures(form: {
    companyName: string;
    taxCode: string;
    address: string;
    contactName: string;
    contactPhone: string;
    gpkdFileUrl: Prisma.JsonValue;
    congBoSpFileUrl: Prisma.JsonValue;
    kiemNghiemFileUrl: Prisma.JsonValue;
    nhanSpFileUrl: Prisma.JsonValue;
    maVachFileUrl: Prisma.JsonValue;
    tccsFileUrl: Prisma.JsonValue;
    coFileUrl: Prisma.JsonValue;
    dangKyNhFileUrl: Prisma.JsonValue;
    gmpFileUrl: Prisma.JsonValue;
    otherDocFileUrl: Prisma.JsonValue;
    fieldFlags?: { id: string }[];
    attachments?: { documentType: string | null; replacedAt?: Date | null }[];
  }): string[] {
    const failures: string[] = [];

    for (const key of CORE_REQUIRED_FIELDS) {
      const v = form[key];
      if (!v || v.trim().length === 0) {
        failures.push(`missing_field:${key}`);
      }
    }

    if (!TAX_CODE_RE.test((form.taxCode ?? '').trim())) {
      failures.push('tax_code_invalid');
    }
    if (!PHONE_RE.test((form.contactPhone ?? '').trim())) {
      failures.push('contact_phone_invalid');
    }

    if ((form.fieldFlags?.length ?? 0) > 0) {
      failures.push('open_field_flag');
    }

    return failures;
  }

  async transitionStatus(
    id: string,
    transition: AdminTransition,
    actor: JwtPayload,
    adminNote?: string,
    flags?: CreateBusinessFormFieldFlagDto[],
    /** Approval-only: admin opts to bypass the readiness check. */
    override?: boolean,
    /** Effective permissions of the actor — populated by the controller from
     * `request.userPermissions` (set by PermissionsGuard). Used to authorise
     * `override=true` against `BUSINESS_FORMS_APPROVE_OVERRIDE`. */
    permissions?: Set<string>,
  ): Promise<BusinessFormResponseDto> {
    const form = await this.prisma.businessForm.findUnique({
      where: { id },
      include: FORM_INCLUDE,
    });
    if (!form) throw new NotFoundException('Form không tồn tại');
    if (form.deletedAt) throw new ForbiddenException('Form đã bị xóa');

    const targetStatus = TARGET_STATUS_FOR_TRANSITION[transition];
    if (form.status === targetStatus) {
      throw new BadRequestException(
        `Form đã ở trạng thái ${targetStatus}`,
      );
    }
    if (!ALLOWED_FROM_STATES[transition].includes(form.status)) {
      throw new BadRequestException(
        `Không thể chuyển từ trạng thái ${form.status} sang ${targetStatus}`,
      );
    }

    if (transition === 'needs_more_info') {
      if (!adminNote || adminNote.trim().length === 0) {
        throw new BadRequestException(
          'Yêu cầu bổ sung thông tin phải kèm ghi chú admin',
        );
      }
    } else if (flags && flags.length > 0) {
      throw new BadRequestException(
        'Field flags chỉ áp dụng cho transition needs_more_info',
      );
    }

    // Approval-readiness gate. The form must satisfy every required
    // criterion (mirrors the frontend `computeCompleteness` heuristic but
    // computed authoritatively here). Failing items can be force-approved
    // only by admins holding `BUSINESS_FORMS_APPROVE_OVERRIDE`. The
    // override path is logged with the failing criteria.
    let readinessFailures: string[] = [];
    if (transition === 'approve') {
      readinessFailures = this.computeApprovalReadinessFailures(form);
      if (readinessFailures.length > 0) {
        if (!override) {
          throw new BadRequestException({
            message:
              'Form chưa đủ điều kiện phê duyệt. Vui lòng bổ sung trước khi duyệt, hoặc bật override (cần quyền business_forms.approve_override).',
            readinessFailures,
          });
        }
        const allowed =
          permissions?.has(PermissionCode.BUSINESS_FORMS_APPROVE_OVERRIDE) ||
          permissions?.has(PermissionCode.BUSINESS_FORMS_MANAGE);
        if (!allowed) {
          throw new ForbiddenException(
            'Bạn không có quyền phê duyệt khi form chưa đủ điều kiện. Yêu cầu quyền business_forms.approve_override.',
          );
        }
      }
    }

    const fromStatus = form.status;
    const priorReviewedAtMs = form.reviewedAt?.getTime();
    const now = new Date();

    // Wrap status update + flag replacement in a single transaction so the
    // form never lives in an inconsistent state (e.g. status flipped but old
    // flags still attached).
    const updated = await this.prisma.$transaction(async (tx) => {
      // Replace flag set when admin provided a flags array. Empty array means
      // "clear all flags". `flags === undefined` means "leave existing flags".
      if (transition === 'needs_more_info' && flags !== undefined) {
        await tx.businessFormFieldFlag.deleteMany({
          where: { businessFormId: id },
        });
        if (flags.length > 0) {
          await tx.businessFormFieldFlag.createMany({
            data: flags.map((f) => ({
              businessFormId: id,
              fieldKey: f.fieldKey,
              reason: f.reason,
            })),
          });
        }
      }

      // Approve / reject / in_review clear flags — they're no longer relevant
      // once we've moved past `needs_more_info`.
      if (transition !== 'needs_more_info') {
        await tx.businessFormFieldFlag.deleteMany({
          where: { businessFormId: id },
        });
      }

      return tx.businessForm.update({
        where: { id },
        data: {
          status: targetStatus,
          reviewedAt: now,
          reviewedById: actor.id,
          adminNote: adminNote ?? form.adminNote,
        },
        include: FORM_INCLUDE,
      });
    });

    const usedOverride =
      transition === 'approve' && override === true && readinessFailures.length > 0;
    const overrideSuffix = usedOverride
      ? ` (override: ${readinessFailures.length} tiêu chí thiếu)`
      : '';

    this.activityLogService
      .createActivityLog(
        id,
        ActivityTargetType.BUSINESS_FORM,
        ActivityType.BUSINESS_FORM_STATUS_CHANGED,
        actor,
        `Form ${form.companyName} (${form.taxCode}): ${fromStatus} → ${targetStatus}${overrideSuffix}`,
        {
          fromStatus,
          toStatus: targetStatus,
          adminNote: adminNote ?? null,
          transition,
          flagCount: flags?.length ?? 0,
          override: usedOverride || undefined,
          readinessFailures: usedOverride ? readinessFailures : undefined,
        },
      )
      .catch((err: unknown) =>
        this.logger.warn(
          `ActivityLog failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    await this.notificationsService.enqueueDispatch({
      formId: id,
      fromStatus,
      toStatus: targetStatus,
      transition: transition === 'approve'
          ? 'approved'
          : transition === 'reject'
            ? 'rejected'
            : transition,
      actorId: actor.id,
    });

    if (transition === 'needs_more_info') {
      await this.remindersService.schedule(id, now.getTime());
    } else if (
      fromStatus === BusinessFormStatus.needs_more_info &&
      priorReviewedAtMs !== undefined
    ) {
      await this.remindersService.removePending(id, priorReviewedAtMs);
    }

    return BusinessFormResponseDto.fromAdmin(updated);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Progress notes (admin-authored timeline entries)
  // ──────────────────────────────────────────────────────────────────────

  private async assertFormExists(id: string): Promise<void> {
    const form = await this.prisma.businessForm.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });
    if (!form) throw new NotFoundException('Form không tồn tại');
    if (form.deletedAt) throw new ForbiddenException('Form đã bị xóa');
  }

  async listProgressNotes(
    formId: string,
  ): Promise<BusinessFormProgressNoteAdminResponseDto[]> {
    await this.assertFormExists(formId);
    const rows = await this.prisma.businessFormProgressNote.findMany({
      where: { businessFormId: formId },
      include: { createdBy: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toAdminProgressNote);
  }

  async addProgressNote(
    formId: string,
    dto: CreateBusinessFormProgressNoteDto,
    actor: JwtPayload,
  ): Promise<BusinessFormProgressNoteAdminResponseDto> {
    await this.assertFormExists(formId);
    const created = await this.prisma.businessFormProgressNote.create({
      data: {
        businessFormId: formId,
        status: dto.status,
        note: dto.note ?? null,
        imageUrls: dto.imageUrls ?? [],
        isVisibleToUser: dto.isVisibleToUser ?? false,
        hideSupplierIdentity: dto.hideSupplierIdentity ?? true,
        supplierName: dto.supplierName ?? null,
        createdById: actor.id,
      },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });

    this.activityLogService
      .createActivityLog(
        formId,
        ActivityTargetType.BUSINESS_FORM,
        ActivityType.BUSINESS_FORM_STATUS_CHANGED,
        actor,
        `Thêm tiến độ ${dto.status} cho form ${formId}`,
        { progressNoteId: created.id, status: dto.status },
      )
      .catch((err: unknown) =>
        this.logger.warn(
          `ActivityLog failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    return toAdminProgressNote(created);
  }

  async updateProgressNote(
    formId: string,
    noteId: string,
    dto: UpdateBusinessFormProgressNoteDto,
  ): Promise<BusinessFormProgressNoteAdminResponseDto> {
    const existing = await this.prisma.businessFormProgressNote.findUnique({
      where: { id: noteId },
      select: { id: true, businessFormId: true },
    });
    if (!existing || existing.businessFormId !== formId) {
      throw new NotFoundException('Tiến độ không tồn tại');
    }

    const data: Prisma.BusinessFormProgressNoteUpdateInput = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.note !== undefined) data.note = dto.note ?? null;
    if (dto.imageUrls !== undefined) data.imageUrls = dto.imageUrls;
    if (dto.isVisibleToUser !== undefined)
      data.isVisibleToUser = dto.isVisibleToUser;
    if (dto.hideSupplierIdentity !== undefined)
      data.hideSupplierIdentity = dto.hideSupplierIdentity;
    if (dto.supplierName !== undefined)
      data.supplierName = dto.supplierName ?? null;

    const updated = await this.prisma.businessFormProgressNote.update({
      where: { id: noteId },
      data,
      include: { createdBy: { select: { id: true, fullName: true } } },
    });
    return toAdminProgressNote(updated);
  }

  async deleteProgressNote(
    formId: string,
    noteId: string,
  ): Promise<{ success: true }> {
    const existing = await this.prisma.businessFormProgressNote.findUnique({
      where: { id: noteId },
      select: { id: true, businessFormId: true },
    });
    if (!existing || existing.businessFormId !== formId) {
      throw new NotFoundException('Tiến độ không tồn tại');
    }
    await this.prisma.businessFormProgressNote.delete({
      where: { id: noteId },
    });
    return { success: true };
  }

  async adminSoftDelete(
    id: string,
    actor: JwtPayload,
  ): Promise<{ success: true }> {
    const form = await this.prisma.businessForm.findUnique({
      where: { id },
      select: {
        id: true,
        deletedAt: true,
        reviewedAt: true,
        status: true,
        companyName: true,
        taxCode: true,
      },
    });
    if (!form) throw new NotFoundException('Form không tồn tại');
    if (form.deletedAt) {
      throw new ForbiddenException('Form đã bị xóa');
    }

    await this.prisma.businessForm.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.activityLogService
      .createActivityLog(
        id,
        ActivityTargetType.BUSINESS_FORM,
        ActivityType.BUSINESS_FORM_STATUS_CHANGED,
        actor,
        `Admin xóa form ${form.companyName} (${form.taxCode})`,
        { fromStatus: form.status, toStatus: 'deleted', transition: 'admin-delete' },
      )
      .catch((err: unknown) =>
        this.logger.warn(
          `ActivityLog failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    if (form.reviewedAt) {
      await this.remindersService.removePending(id, form.reviewedAt.getTime());
    }

    return { success: true };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Admin supplement attachments — admin uploads / removes a file on behalf
  // of the submitter. Distinct from `adminUpdate` which atomically replaces
  // every attachment; this is a per-row append/remove and always logged.
  // ──────────────────────────────────────────────────────────────────────

  async adminSupplementAttachment(
    formId: string,
    dto: AdminSupplementAttachmentDto,
    actor: JwtPayload,
  ): Promise<BusinessFormAttachmentResponseDto> {
    const form = await this.prisma.businessForm.findUnique({
      where: { id: formId },
      select: { id: true, deletedAt: true, companyName: true },
    });
    if (!form) throw new NotFoundException('Form không tồn tại');
    if (form.deletedAt) throw new ForbiddenException('Form đã bị xóa');

    const created = await this.prisma.businessFormAttachment.create({
      data: {
        businessFormId: formId,
        label: dto.label,
        fileUrl: dto.fileUrl,
        note: dto.note ?? null,
        documentType: dto.documentType ?? null,
        source: 'admin_supplement',
        uploadedById: actor.id,
      },
      include: { uploadedBy: { select: { id: true, fullName: true } } },
    });

    this.activityLogService
      .createActivityLog(
        formId,
        ActivityTargetType.BUSINESS_FORM,
        ActivityType.BUSINESS_FORM_STATUS_CHANGED,
        actor,
        `Admin bổ sung tài liệu "${dto.label}"${
          dto.documentType ? ` (slot ${dto.documentType})` : ''
        } cho form ${form.companyName}`,
        {
          transition: 'admin-supplement-attachment',
          attachmentId: created.id,
          documentType: dto.documentType ?? null,
          fileUrl: dto.fileUrl,
          note: dto.note ?? null,
        },
      )
      .catch((err: unknown) =>
        this.logger.warn(
          `ActivityLog failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    return {
      id: created.id,
      label: created.label,
      fileUrl: created.fileUrl,
      note: created.note,
      source: created.source,
      uploadedById: created.uploadedById,
      uploadedBy: created.uploadedBy ?? null,
      documentType: created.documentType,
      verificationStatus: created.verificationStatus,
      verifiedById: created.verifiedById,
      verifiedBy: null,
      verifiedAt: created.verifiedAt,
      verificationNote: created.verificationNote,
      replacesAttachmentId: created.replacesAttachmentId,
      replacedAt: created.replacedAt,
      createdAt: created.createdAt,
    };
  }

  /**
   * Replace an existing attachment with a new uploaded file. The previous
   * row stays in the DB (stamped with `replacedAt`) so the version chain
   * is preserved for audit. The new row inherits the previous row's
   * `documentType` (slot pin) so callers don't have to re-specify it,
   * and is marked source=admin_supplement (only admins replace).
   */
  async replaceAttachment(
    formId: string,
    oldAttachmentId: string,
    dto: AdminSupplementAttachmentDto,
    actor: JwtPayload,
  ): Promise<BusinessFormAttachmentResponseDto> {
    const form = await this.prisma.businessForm.findUnique({
      where: { id: formId },
      select: { id: true, deletedAt: true, companyName: true },
    });
    if (!form) throw new NotFoundException('Form không tồn tại');
    if (form.deletedAt) throw new ForbiddenException('Form đã bị xóa');

    const old = await this.prisma.businessFormAttachment.findUnique({
      where: { id: oldAttachmentId },
      select: {
        id: true,
        businessFormId: true,
        label: true,
        documentType: true,
        replacedAt: true,
        source: true,
      },
    });
    if (!old || old.businessFormId !== formId) {
      throw new NotFoundException('Tài liệu không tồn tại');
    }
    if (old.replacedAt) {
      throw new BadRequestException('Tài liệu này đã được thay thế trước đó');
    }

    // Inherit slot pin from the previous row unless caller passes a new
    // explicit documentType (eg. admin reclassifies a free-form attachment
    // into a typed slot at the same time).
    const documentType =
      dto.documentType !== undefined ? dto.documentType : old.documentType;

    const created = await this.prisma.$transaction(async (tx) => {
      const newRow = await tx.businessFormAttachment.create({
        data: {
          businessFormId: formId,
          label: dto.label,
          fileUrl: dto.fileUrl,
          note: dto.note ?? null,
          documentType: documentType ?? null,
          source: 'admin_supplement',
          uploadedById: actor.id,
          replacesAttachmentId: oldAttachmentId,
        },
        include: { uploadedBy: { select: { id: true, fullName: true } } },
      });
      await tx.businessFormAttachment.update({
        where: { id: oldAttachmentId },
        data: { replacedAt: new Date() },
      });
      return newRow;
    });

    this.activityLogService
      .createActivityLog(
        formId,
        ActivityTargetType.BUSINESS_FORM,
        ActivityType.BUSINESS_FORM_STATUS_CHANGED,
        actor,
        `Admin thay thế tài liệu "${old.label}"${
          old.documentType ? ` (slot ${old.documentType})` : ''
        } cho form ${form.companyName}`,
        {
          transition: 'admin-replace-attachment',
          oldAttachmentId,
          newAttachmentId: created.id,
          documentType: documentType ?? null,
          previousSource: old.source,
          fileUrl: dto.fileUrl,
          note: dto.note ?? null,
        },
      )
      .catch((err: unknown) =>
        this.logger.warn(
          `ActivityLog failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    return {
      id: created.id,
      label: created.label,
      fileUrl: created.fileUrl,
      note: created.note,
      source: created.source,
      uploadedById: created.uploadedById,
      uploadedBy: created.uploadedBy ?? null,
      documentType: created.documentType,
      verificationStatus: created.verificationStatus,
      verifiedById: created.verifiedById,
      verifiedBy: null,
      verifiedAt: created.verifiedAt,
      verificationNote: created.verificationNote,
      replacesAttachmentId: created.replacesAttachmentId,
      replacedAt: created.replacedAt,
      createdAt: created.createdAt,
    };
  }

  async adminDeleteAttachment(
    formId: string,
    attachmentId: string,
    actor: JwtPayload,
  ): Promise<{ success: true }> {
    const attachment = await this.prisma.businessFormAttachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        businessFormId: true,
        label: true,
        documentType: true,
        source: true,
      },
    });
    if (!attachment || attachment.businessFormId !== formId) {
      throw new NotFoundException('Tài liệu không tồn tại');
    }

    await this.prisma.businessFormAttachment.delete({
      where: { id: attachmentId },
    });

    this.activityLogService
      .createActivityLog(
        formId,
        ActivityTargetType.BUSINESS_FORM,
        ActivityType.BUSINESS_FORM_STATUS_CHANGED,
        actor,
        `Admin xóa tài liệu "${attachment.label}"${
          attachment.documentType ? ` (slot ${attachment.documentType})` : ''
        }`,
        {
          transition: 'admin-remove-attachment',
          attachmentId,
          documentType: attachment.documentType,
          previousSource: attachment.source,
        },
      )
      .catch((err: unknown) =>
        this.logger.warn(
          `ActivityLog failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    return { success: true };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Related / duplicate forms — three buckets that admin uses on the
  // detail page to spot duplicates and understand the broader business
  // relationship: same submitter, same MST, same contact phone.
  // ──────────────────────────────────────────────────────────────────────

  async findRelated(formId: string): Promise<{
    sameSubmitter: BusinessFormResponseDto[];
    sameMst: BusinessFormResponseDto[];
    samePhone: BusinessFormResponseDto[];
  }> {
    const form = await this.prisma.businessForm.findUnique({
      where: { id: formId },
      select: {
        id: true,
        userId: true,
        taxCode: true,
        contactPhone: true,
      },
    });
    if (!form) throw new NotFoundException('Form không tồn tại');

    const baseWhere = (extra: Prisma.BusinessFormWhereInput) =>
      ({
        ...extra,
        id: { not: formId },
        deletedAt: null,
      }) satisfies Prisma.BusinessFormWhereInput;

    const SUMMARY_INCLUDE = {
      user: { select: { id: true, fullName: true } },
      reviewedBy: { select: { id: true, fullName: true } },
    } satisfies Prisma.BusinessFormInclude;

    const [sameSubmitterRows, sameMstRows, samePhoneRows] = await Promise.all([
      this.prisma.businessForm.findMany({
        where: baseWhere({ userId: form.userId }),
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: SUMMARY_INCLUDE,
      }),
      this.prisma.businessForm.findMany({
        where: baseWhere({ taxCode: form.taxCode }),
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: SUMMARY_INCLUDE,
      }),
      // Skip the same-phone bucket entirely if contactPhone is empty —
      // otherwise findMany would return every form with empty phone.
      form.contactPhone
        ? this.prisma.businessForm.findMany({
            where: baseWhere({ contactPhone: form.contactPhone }),
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: SUMMARY_INCLUDE,
          })
        : Promise.resolve([] as never[]),
    ]);

    return {
      sameSubmitter: sameSubmitterRows.map(BusinessFormResponseDto.fromAdmin),
      sameMst: sameMstRows.map(BusinessFormResponseDto.fromAdmin),
      samePhone: samePhoneRows.map(BusinessFormResponseDto.fromAdmin),
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Audit history — proxies the global ActivityLogService scoped to this
  // form. Used by the detail page timeline.
  // ──────────────────────────────────────────────────────────────────────

  async getAuditHistory(
    formId: string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedActivityLogResponseDto> {
    const exists = await this.prisma.businessForm.findUnique({
      where: { id: formId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Form không tồn tại');

    const query: ActivityLogQueryDto = {
      targetType: ActivityTargetType.BUSINESS_FORM,
      targetId: formId,
      page,
      limit,
    };
    return this.activityLogService.findAll(query);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Internal assignment — set/clear which admin owns processing the form.
  // Independent from `reviewedById` so a manager can route a case to an
  // analyst without that analyst auto-becoming the eventual approver.
  // ──────────────────────────────────────────────────────────────────────

  async setAssignment(
    formId: string,
    dto: AdminAssignmentDto,
    actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    const form = await this.prisma.businessForm.findUnique({
      where: { id: formId },
      select: {
        id: true,
        deletedAt: true,
        companyName: true,
        assignedToAdminId: true,
        assignedTo: { select: { id: true, fullName: true } },
      },
    });
    if (!form) throw new NotFoundException('Form không tồn tại');
    if (form.deletedAt) throw new ForbiddenException('Form đã bị xóa');

    const targetId =
      dto.assignedToAdminId === undefined ? null : dto.assignedToAdminId;

    if (targetId) {
      const target = await this.prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true, fullName: true },
      });
      if (!target) {
        throw new BadRequestException('Người được gán không tồn tại');
      }
      const updated = await this.prisma.businessForm.update({
        where: { id: formId },
        data: {
          assignedToAdminId: target.id,
          assignedById: actor.id,
          assignedAt: new Date(),
          assignmentNote: dto.note ?? null,
        },
        include: FORM_INCLUDE,
      });

      this.activityLogService
        .createActivityLog(
          formId,
          ActivityTargetType.BUSINESS_FORM,
          ActivityType.BUSINESS_FORM_STATUS_CHANGED,
          actor,
          form.assignedToAdminId
            ? `Chuyển phụ trách form ${form.companyName}: ${
                form.assignedTo?.fullName ?? form.assignedToAdminId
              } → ${target.fullName}`
            : `Gán phụ trách form ${form.companyName} cho ${target.fullName}`,
          {
            transition: 'admin-assign',
            previousAssigneeId: form.assignedToAdminId,
            newAssigneeId: target.id,
            note: dto.note ?? null,
          },
        )
        .catch((err: unknown) =>
          this.logger.warn(
            `ActivityLog failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );

      return BusinessFormResponseDto.fromAdmin(updated);
    }

    // Un-assign path. No-op if already unassigned.
    if (!form.assignedToAdminId) {
      throw new BadRequestException('Form chưa được gán phụ trách');
    }
    const updated = await this.prisma.businessForm.update({
      where: { id: formId },
      data: {
        assignedToAdminId: null,
        assignedById: actor.id,
        assignedAt: new Date(),
        assignmentNote: dto.note ?? null,
      },
      include: FORM_INCLUDE,
    });

    this.activityLogService
      .createActivityLog(
        formId,
        ActivityTargetType.BUSINESS_FORM,
        ActivityType.BUSINESS_FORM_STATUS_CHANGED,
        actor,
        `Bỏ gán phụ trách form ${form.companyName} (trước: ${
          form.assignedTo?.fullName ?? form.assignedToAdminId
        })`,
        {
          transition: 'admin-unassign',
          previousAssigneeId: form.assignedToAdminId,
          newAssigneeId: null,
          note: dto.note ?? null,
        },
      )
      .catch((err: unknown) =>
        this.logger.warn(
          `ActivityLog failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    return BusinessFormResponseDto.fromAdmin(updated);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Risk flags — structured triage tags. Each (form, code) pair is unique;
  // repeating a code with a new note is upserted (replaces note, refreshes
  // author/timestamp). Removing emits a separate audit entry.
  // ──────────────────────────────────────────────────────────────────────

  async addRiskFlag(
    formId: string,
    dto: AdminAddRiskFlagDto,
    actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    const form = await this.prisma.businessForm.findUnique({
      where: { id: formId },
      select: { id: true, deletedAt: true, companyName: true },
    });
    if (!form) throw new NotFoundException('Form không tồn tại');
    if (form.deletedAt) throw new ForbiddenException('Form đã bị xóa');

    const existing = await this.prisma.businessFormRiskFlag.findUnique({
      where: {
        businessFormId_code: { businessFormId: formId, code: dto.code },
      },
      select: { id: true },
    });

    const isUpdate = !!existing;
    await this.prisma.businessFormRiskFlag.upsert({
      where: {
        businessFormId_code: { businessFormId: formId, code: dto.code },
      },
      create: {
        businessFormId: formId,
        code: dto.code,
        note: dto.note ?? null,
        createdById: actor.id,
      },
      update: {
        note: dto.note ?? null,
        createdById: actor.id,
        createdAt: new Date(),
      },
    });

    this.activityLogService
      .createActivityLog(
        formId,
        ActivityTargetType.BUSINESS_FORM,
        ActivityType.BUSINESS_FORM_STATUS_CHANGED,
        actor,
        isUpdate
          ? `Cập nhật cờ ${dto.code} cho form ${form.companyName}`
          : `Thêm cờ ${dto.code} cho form ${form.companyName}`,
        {
          transition: isUpdate ? 'admin-risk-flag-update' : 'admin-risk-flag-add',
          riskFlagCode: dto.code,
          note: dto.note ?? null,
        },
      )
      .catch((err: unknown) =>
        this.logger.warn(
          `ActivityLog failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    return this.findOne(formId);
  }

  async removeRiskFlag(
    formId: string,
    code: BusinessFormRiskFlagCode,
    actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    const form = await this.prisma.businessForm.findUnique({
      where: { id: formId },
      select: { id: true, deletedAt: true, companyName: true },
    });
    if (!form) throw new NotFoundException('Form không tồn tại');
    if (form.deletedAt) throw new ForbiddenException('Form đã bị xóa');

    const existing = await this.prisma.businessFormRiskFlag.findUnique({
      where: { businessFormId_code: { businessFormId: formId, code } },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy cờ rủi ro');
    }

    await this.prisma.businessFormRiskFlag.delete({
      where: { businessFormId_code: { businessFormId: formId, code } },
    });

    this.activityLogService
      .createActivityLog(
        formId,
        ActivityTargetType.BUSINESS_FORM,
        ActivityType.BUSINESS_FORM_STATUS_CHANGED,
        actor,
        `Gỡ cờ ${code} khỏi form ${form.companyName}`,
        {
          transition: 'admin-risk-flag-remove',
          riskFlagCode: code,
        },
      )
      .catch((err: unknown) =>
        this.logger.warn(
          `ActivityLog failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    return this.findOne(formId);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Per-document verification — admin reviews each attachment and stamps
  // it with one of the canonical states. Sets verifier + timestamp on
  // every transition so the timeline shows last review trail.
  // ──────────────────────────────────────────────────────────────────────

  async setAttachmentVerification(
    formId: string,
    attachmentId: string,
    dto: AdminVerifyAttachmentDto,
    actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    const attachment = await this.prisma.businessFormAttachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        businessFormId: true,
        label: true,
        documentType: true,
        verificationStatus: true,
      },
    });
    if (!attachment || attachment.businessFormId !== formId) {
      throw new NotFoundException('Tài liệu không tồn tại');
    }
    const form = await this.prisma.businessForm.findUnique({
      where: { id: formId },
      select: { id: true, deletedAt: true, companyName: true },
    });
    if (!form) throw new NotFoundException('Form không tồn tại');
    if (form.deletedAt) throw new ForbiddenException('Form đã bị xóa');

    const previousStatus = attachment.verificationStatus;

    await this.prisma.businessFormAttachment.update({
      where: { id: attachmentId },
      data: {
        verificationStatus: dto.status,
        verifiedById: actor.id,
        verifiedAt: new Date(),
        verificationNote: dto.note ?? null,
      },
    });

    this.activityLogService
      .createActivityLog(
        formId,
        ActivityTargetType.BUSINESS_FORM,
        ActivityType.BUSINESS_FORM_STATUS_CHANGED,
        actor,
        `Kiểm duyệt tài liệu "${attachment.label}"${
          attachment.documentType ? ` (slot ${attachment.documentType})` : ''
        }: ${previousStatus} → ${dto.status}`,
        {
          transition: 'admin-verify-attachment',
          attachmentId,
          documentType: attachment.documentType,
          previousStatus,
          newStatus: dto.status,
          note: dto.note ?? null,
        },
      )
      .catch((err: unknown) =>
        this.logger.warn(
          `ActivityLog failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    return this.findOne(formId);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Priority + SLA — admin escalates a case and optionally pins a hard
  // deadline. Resetting to `normal` + slaDueAt=null clears the escalation;
  // we record the prev/new pair in the audit log either way.
  // ──────────────────────────────────────────────────────────────────────

  async setPriority(
    formId: string,
    dto: AdminPriorityDto,
    actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    const form = await this.prisma.businessForm.findUnique({
      where: { id: formId },
      select: {
        id: true,
        deletedAt: true,
        companyName: true,
        priority: true,
        slaDueAt: true,
        priorityReason: true,
      },
    });
    if (!form) throw new NotFoundException('Form không tồn tại');
    if (form.deletedAt) throw new ForbiddenException('Form đã bị xóa');

    // Normalize null intent — DTO uses `slaDueAt: undefined` to mean
    // "leave alone" and `slaDueAt: null` to mean "clear". To avoid
    // surprising callers, we always write an explicit value when the key
    // appears in the payload.
    const slaDueAt =
      dto.slaDueAt === undefined ? form.slaDueAt : dto.slaDueAt;

    const updated = await this.prisma.businessForm.update({
      where: { id: formId },
      data: {
        priority: dto.priority,
        slaDueAt,
        priorityReason: dto.reason ?? null,
      },
      include: FORM_INCLUDE,
    });

    const noChange =
      form.priority === dto.priority &&
      (form.slaDueAt?.getTime() ?? null) === (slaDueAt?.getTime() ?? null) &&
      (form.priorityReason ?? null) === (dto.reason ?? null);

    if (!noChange) {
      this.activityLogService
        .createActivityLog(
          formId,
          ActivityTargetType.BUSINESS_FORM,
          ActivityType.BUSINESS_FORM_STATUS_CHANGED,
          actor,
          `Cập nhật ưu tiên ${form.companyName}: ${form.priority} → ${dto.priority}`,
          {
            transition: 'admin-priority',
            previousPriority: form.priority,
            newPriority: dto.priority,
            previousSlaDueAt: form.slaDueAt,
            newSlaDueAt: slaDueAt,
            reason: dto.reason ?? null,
          },
        )
        .catch((err: unknown) =>
          this.logger.warn(
            `ActivityLog failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
    }

    return BusinessFormResponseDto.fromAdmin(updated);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Internal admin task checklist — free-form to-do items the team
  // commits to do (call user, verify GPKD, etc.). Each mutation writes
  // ActivityLog so the timeline shows the work-tracking trail.
  // ──────────────────────────────────────────────────────────────────────

  private async assertActiveForm(formId: string) {
    const form = await this.prisma.businessForm.findUnique({
      where: { id: formId },
      select: { id: true, deletedAt: true, companyName: true },
    });
    if (!form) throw new NotFoundException('Form không tồn tại');
    if (form.deletedAt) throw new ForbiddenException('Form đã bị xóa');
    return form;
  }

  async addTask(
    formId: string,
    dto: AdminCreateTaskDto,
    actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    const form = await this.assertActiveForm(formId);

    // Task của 1 hồ sơ đối tác: mặc định phụ trách chính là chủ hồ sơ.
    const formOwner = await this.prisma.businessForm.findUnique({
      where: { id: formId },
      select: { userId: true },
    });
    const mainAssigneeId = dto.mainAssigneeId ?? formOwner?.userId ?? null;
    const relatedUserIds = (dto.relatedUserIds ?? []).filter(
      (id) => id !== mainAssigneeId,
    );

    const created = await this.prisma.businessFormTask.create({
      data: {
        businessFormId: formId,
        title: dto.title,
        description: dto.description ?? null,
        type: dto.type ?? BusinessFormTaskType.partner_task,
        category: dto.category,
        createdById: actor.id,
        createdByAdmin: true,
        mainAssigneeId,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assignments:
          relatedUserIds.length > 0
            ? {
                create: relatedUserIds.map((id) => ({
                  userId: id,
                  assignedById: actor.id,
                })),
              }
            : undefined,
        attachments: toTaskAttachmentsJson(dto.attachments),
        items: toTaskItemsJson(dto.items),
      },
    });

    this.activityLogService
      .createActivityLog(
        formId,
        ActivityTargetType.BUSINESS_FORM,
        ActivityType.BUSINESS_FORM_STATUS_CHANGED,
        actor,
        `Thêm task "${dto.title}" cho form ${form.companyName}`,
        {
          transition: 'admin-task-add',
          taskId: created.id,
          mainAssigneeId,
          relatedUserIds,
          itemCount: dto.items?.length ?? 0,
        },
      )
      .catch((err: unknown) =>
        this.logger.warn(
          `ActivityLog failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    return this.findOne(formId);
  }

  async updateTask(
    formId: string,
    taskId: string,
    dto: AdminUpdateTaskDto,
    actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    const form = await this.assertActiveForm(formId);
    const before = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        businessFormId: true,
        title: true,
        status: true,
        mainAssigneeId: true,
        assignments: { select: { userId: true } },
      },
    });
    if (!before || before.businessFormId !== formId) {
      throw new NotFoundException('Task không tồn tại');
    }

    const data: Prisma.BusinessFormTaskUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined)
      data.description = dto.description ?? null;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.startDate !== undefined)
      data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.dueDate !== undefined) {
      data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }
    if (dto.mainAssigneeId !== undefined) {
      data.mainAssignee = dto.mainAssigneeId
        ? { connect: { id: dto.mainAssigneeId } }
        : { disconnect: true };
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
      // Stamp completion metadata on done; clear when moving away from
      // a terminal state.
      if (dto.status === 'done' && before.status !== 'done') {
        data.completedBy = { connect: { id: actor.id } };
        data.completedAt = new Date();
      } else if (dto.status !== 'done' && before.status === 'done') {
        data.completedBy = { disconnect: true };
        data.completedAt = null;
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.relatedUserIds !== undefined) {
        const mainId =
          dto.mainAssigneeId !== undefined
            ? dto.mainAssigneeId
            : before.mainAssigneeId;
        const relatedUserIds = dto.relatedUserIds.filter((id) => id !== mainId);
        await tx.businessFormTaskAssignment.deleteMany({ where: { taskId } });
        if (relatedUserIds.length > 0) {
          await tx.businessFormTaskAssignment.createMany({
            data: relatedUserIds.map((id) => ({
              taskId,
              userId: id,
              assignedById: actor.id,
            })),
          });
        }
      }

      // Checklist + đính kèm là cột JSON: ghi đè cả mảng (gắn id mới) khi client gửi.
      if (dto.items !== undefined) data.items = toTaskItemsJson(dto.items);
      if (dto.attachments !== undefined)
        data.attachments = toTaskAttachmentsJson(dto.attachments);

      await tx.businessFormTask.update({
        where: { id: taskId },
        data,
      });
    });

    this.activityLogService
      .createActivityLog(
        formId,
        ActivityTargetType.BUSINESS_FORM,
        ActivityType.BUSINESS_FORM_STATUS_CHANGED,
        actor,
        `Cập nhật task "${before.title}" cho form ${form.companyName}`,
        {
          transition: 'admin-task-update',
          taskId,
          previousStatus: before.status,
          newStatus: dto.status ?? before.status,
          assigneesChanged: dto.relatedUserIds !== undefined,
        },
      )
      .catch((err: unknown) =>
        this.logger.warn(
          `ActivityLog failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    return this.findOne(formId);
  }

  async deleteTask(
    formId: string,
    taskId: string,
    actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    const form = await this.assertActiveForm(formId);
    const existing = await this.prisma.businessFormTask.findUnique({
      where: { id: taskId },
      select: { id: true, businessFormId: true, title: true },
    });
    if (!existing || existing.businessFormId !== formId) {
      throw new NotFoundException('Task không tồn tại');
    }

    await this.prisma.businessFormTask.delete({ where: { id: taskId } });

    this.activityLogService
      .createActivityLog(
        formId,
        ActivityTargetType.BUSINESS_FORM,
        ActivityType.BUSINESS_FORM_STATUS_CHANGED,
        actor,
        `Xóa task "${existing.title}" khỏi form ${form.companyName}`,
        { transition: 'admin-task-remove', taskId },
      )
      .catch((err: unknown) =>
        this.logger.warn(
          `ActivityLog failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );

    return this.findOne(formId);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Potential / business evaluation — sales-pipeline metadata. Optional
  // and additive; unset fields stay unset.
  // ──────────────────────────────────────────────────────────────────────

  async setPotential(
    formId: string,
    dto: AdminPotentialDto,
    actor: JwtPayload,
  ): Promise<BusinessFormResponseDto> {
    const form = await this.assertActiveForm(formId);

    const data: Prisma.BusinessFormUpdateInput = {};
    const changes: Record<string, { before: unknown; after: unknown }> = {};
    const before = await this.prisma.businessForm.findUnique({
      where: { id: formId },
      select: {
        potentialScore: true,
        estimatedRevenue: true,
        cooperationFit: true,
        potentialNote: true,
      },
    });
    if (!before) throw new NotFoundException('Form không tồn tại');

    if (dto.potentialScore !== undefined) {
      data.potentialScore = dto.potentialScore;
      if (before.potentialScore !== dto.potentialScore) {
        changes.potentialScore = {
          before: before.potentialScore,
          after: dto.potentialScore,
        };
      }
    }
    if (dto.estimatedRevenue !== undefined) {
      data.estimatedRevenue =
        dto.estimatedRevenue === null
          ? null
          : new Prisma.Decimal(dto.estimatedRevenue);
      const beforeNum =
        before.estimatedRevenue == null
          ? null
          : Number(before.estimatedRevenue);
      if (beforeNum !== dto.estimatedRevenue) {
        changes.estimatedRevenue = {
          before: beforeNum,
          after: dto.estimatedRevenue,
        };
      }
    }
    if (dto.cooperationFit !== undefined) {
      data.cooperationFit = dto.cooperationFit;
      if ((before.cooperationFit ?? null) !== (dto.cooperationFit ?? null)) {
        changes.cooperationFit = {
          before: before.cooperationFit,
          after: dto.cooperationFit,
        };
      }
    }
    if (dto.potentialNote !== undefined) {
      data.potentialNote = dto.potentialNote;
      if ((before.potentialNote ?? null) !== (dto.potentialNote ?? null)) {
        changes.potentialNote = {
          before: before.potentialNote,
          after: dto.potentialNote,
        };
      }
    }

    await this.prisma.businessForm.update({
      where: { id: formId },
      data,
    });

    if (Object.keys(changes).length > 0) {
      this.activityLogService
        .createActivityLog(
          formId,
          ActivityTargetType.BUSINESS_FORM,
          ActivityType.BUSINESS_FORM_STATUS_CHANGED,
          actor,
          `Cập nhật đánh giá tiềm năng form ${form.companyName}`,
          {
            transition: 'admin-potential',
            changedFields: Object.keys(changes),
            fieldDiff: changes,
          },
        )
        .catch((err: unknown) =>
          this.logger.warn(
            `ActivityLog failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
    }

    return this.findOne(formId);
  }
}
