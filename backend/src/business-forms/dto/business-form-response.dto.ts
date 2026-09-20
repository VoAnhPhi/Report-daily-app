import {
  BusinessFormAttachmentSource,
  BusinessFormAttachmentVerificationStatus,
  BusinessFormPriority,
  BusinessFormRiskFlagCode,
  BusinessFormStatus,
  BusinessFormTaskActivityType,
  BusinessFormTaskAssignmentStatus,
  BusinessFormTaskStatus,
  BusinessFormTaskType,
  CooperationCategory,
  Prisma,
} from '@prisma/client';

import { BusinessFormFieldFlagResponseDto } from './business-form-field-flag.dto';
import { LegalDocFileDto } from './create-business-form.dto';
import {
  BusinessFormProgressNoteAdminResponseDto,
  BusinessFormProgressNotePublicResponseDto,
  toAdminProgressNote,
  toPublicProgressNotes,
} from './business-form-progress-note.dto';

export class BusinessFormProductResponseDto {
  id!: string;
  name!: string;
  price!: number;
  imageUrl?: string | null;
}

export class BusinessFormAttachmentResponseDto {
  id!: string;
  label!: string;
  fileUrl!: string;
  note?: string | null;
  source!: BusinessFormAttachmentSource;
  uploadedById?: string | null;
  uploadedBy?: { id: string; fullName: string } | null;
  documentType?: string | null;
  verificationStatus!: BusinessFormAttachmentVerificationStatus;
  verifiedById?: string | null;
  verifiedBy?: { id: string; fullName: string } | null;
  verifiedAt?: Date | null;
  verificationNote?: string | null;
  replacesAttachmentId?: string | null;
  replacedAt?: Date | null;
  createdAt!: Date;
}

export class BusinessFormUserSummaryDto {
  id!: string;
  fullName!: string;
  referenceId?: string | null;
  avatarUrl?: string | null;
  // Trạng thái tham gia của người hỗ trợ.
  status?: BusinessFormTaskAssignmentStatus | null;
}

export class BusinessFormRiskFlagResponseDto {
  id!: string;
  code!: BusinessFormRiskFlagCode;
  note?: string | null;
  createdById!: string;
  createdBy?: BusinessFormUserSummaryDto | null;
  createdAt!: Date;
}

export class BusinessFormTaskItemEventDto {
  action!: string;
  byId!: string;
  byName!: string;
  at!: string;
  from?: string;
  to?: string;
}

export class BusinessFormTaskItemResponseDto {
  id!: string;
  label!: string;
  done!: boolean;
  deleted?: boolean;
  history?: BusinessFormTaskItemEventDto[];
  reportDueAt?: string | null;
  completionDueAt?: string | null;
}

export class BusinessFormTaskAttachmentResponseDto {
  id!: string;
  name!: string;
  url!: string;
}

export class BusinessFormTaskActivityReactionUserDto {
  id!: string;
  fullName!: string;
}

export class BusinessFormTaskActivityReactionSummaryDto {
  emoji!: string;
  count!: number;
  isReactedByMe!: boolean;
  users!: BusinessFormTaskActivityReactionUserDto[];
}

export class BusinessFormTaskActivityResponseDto {
  id!: string;
  type!: BusinessFormTaskActivityType;

  message?: string | null;
  /** Làm thay: tên người được chăm mà hoạt động thực hiện hộ (hiển thị cạnh tên). */
  onBehalfName?: string | null;
  attachments?: BusinessFormTaskAttachmentResponseDto[];

  oldStatus?: BusinessFormTaskStatus | null;
  newStatus?: BusinessFormTaskStatus | null;

  parentId?: string | null;
  mentionedUserIds?: string[];
  replyCount?: number;
  reactionSummary?: BusinessFormTaskActivityReactionSummaryDto[];

  createdById!: string;
  createdBy?: BusinessFormUserSummaryDto | null;

  createdAt!: Date;
}

interface BusinessFormTaskRow {
  id: string;
  code?: string | null;
  title: string;
  description: string | null;
  status: BusinessFormTaskStatus;
  type: BusinessFormTaskType;
  category: CooperationCategory;
  priority: BusinessFormPriority;
  createdByAdmin: boolean;
  onBehalfOf?: { fullName: string } | null;
  businessFormId: string | null;
  mainAssigneeId?: string | null;
  mainAssignee?: {
    id: string;
    fullName: string;
    referenceId?: string | null;
    avatar?: { fileUrl: string | null } | null;
  } | null;
  assignments?: Array<{
    userId: string;
    status?: BusinessFormTaskAssignmentStatus;
    user: {
      id: string;
      fullName: string;
      referenceId?: string | null;
      avatar?: { fileUrl: string | null } | null;
    };
  }>;
  createdById: string;
  createdBy?: {
    id: string;
    fullName: string;
    avatar?: { fileUrl: string | null } | null;
  } | null;
  completedById: string | null;
  completedBy?: { id: string; fullName: string } | null;
  completedAt: Date | null;
  startDate: Date | null;
  dueDate: Date | null;
  // Cột JSONB trên task -> Prisma trả JsonValue, cast khi map.
  attachments?: unknown;
  items?: unknown;
  businessForm?: {
    id: string;
    companyName: string;
    status: BusinessFormStatus;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  // Ghim riêng theo người đang xem. Có thể set trực tiếp (pin/unpin) hoặc suy từ `pins`.
  pins?: Array<{ userId: string }>;
  isPinnedByMe?: boolean;
}

/** Một thành viên của công việc + số việc chung với người đang xem. */
export class BusinessFormTaskMemberDto {
  user!: BusinessFormUserSummaryDto;
  isMainAssignee!: boolean;
  /** Số việc mà cả người xem lẫn thành viên này đều tham gia (tính cả việc đang mở). */
  sharedCount!: number;
}

export class BusinessFormTaskResponseDto {
  id!: string;
  /** Mã công việc CV+YYMMDD+NNN. Null cho dữ liệu cũ chưa backfill. */
  code?: string | null;
  title!: string;
  description?: string | null;
  status!: BusinessFormTaskStatus;
  type!: BusinessFormTaskType;
  category!: CooperationCategory;
  priority!: BusinessFormPriority;
  createdByAdmin!: boolean;
  /** Làm thay: tên người được chăm mà việc được tạo hộ (badge "thay cho"). */
  onBehalfName?: string | null;
  businessFormId?: string | null;
  mainAssigneeId?: string | null;
  mainAssignee?: BusinessFormUserSummaryDto | null;
  relatedUsers?: BusinessFormUserSummaryDto[];
  // Trạng thái tham gia của người đang xem.
  myAssignmentStatus?: BusinessFormTaskAssignmentStatus | null;
  createdById!: string;
  createdBy?: BusinessFormUserSummaryDto | null;
  completedById?: string | null;
  completedBy?: BusinessFormUserSummaryDto | null;
  completedAt?: Date | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  attachments?: BusinessFormTaskAttachmentResponseDto[];
  items?: BusinessFormTaskItemResponseDto[];
  companyName?: string | null;
  businessForm?: {
    id: string;
    companyName: string;
    status: BusinessFormStatus;
  } | null;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date | null;
  // Người đang xem đã ghim việc này chưa (riêng tư — chỉ đúng cho chính họ).
  isPinnedByMe?: boolean;

  static fromEntity(
    entity: BusinessFormTaskRow,
    currentUserId?: string,
  ): BusinessFormTaskResponseDto {
    return {
      id: entity.id,
      code: entity.code ?? null,
      title: entity.title,
      description: entity.description ?? null,
      status: entity.status,
      type: entity.type,
      category: entity.category,
      priority: entity.priority,
      createdByAdmin: entity.createdByAdmin ?? false,
      onBehalfName: entity.onBehalfOf?.fullName ?? null,
      businessFormId: entity.businessFormId ?? null,
      mainAssigneeId: entity.mainAssigneeId ?? null,
      mainAssignee: entity.mainAssignee
        ? {
            id: entity.mainAssignee.id,
            fullName: entity.mainAssignee.fullName,
            referenceId: entity.mainAssignee.referenceId ?? null,
            avatarUrl: entity.mainAssignee.avatar?.fileUrl ?? null,
          }
        : null,
      relatedUsers:
        entity.assignments?.map((a) => ({
          id: a.user.id,
          fullName: a.user.fullName,
          referenceId: a.user.referenceId ?? null,
          avatarUrl: a.user.avatar?.fileUrl ?? null,
          status: a.status ?? null,
        })) ?? [],
      myAssignmentStatus: currentUserId
        ? (entity.assignments?.find((a) => a.userId === currentUserId)?.status ??
          null)
        : null,
      createdById: entity.createdBy?.id ?? entity.createdById,
      createdBy: entity.createdBy
        ? {
            id: entity.createdBy.id,
            fullName: entity.createdBy.fullName,
            avatarUrl: entity.createdBy.avatar?.fileUrl ?? null,
          }
        : null,
      completedById: entity.completedBy?.id ?? entity.completedById ?? null,
      completedBy: entity.completedBy ?? null,
      completedAt: entity.completedAt ?? null,
      startDate: entity.startDate ?? null,
      dueDate: entity.dueDate ?? null,
      // items/attachments là cột JSONB (đã có sẵn id/name/url | id/label/done).
      attachments:
        (entity.attachments as BusinessFormTaskAttachmentResponseDto[] | null) ??
        [],
      items:
        (entity.items as BusinessFormTaskItemResponseDto[] | null) ?? [],
      companyName: entity.businessForm?.companyName ?? null,
      businessForm: entity.businessForm
        ? {
            id: entity.businessForm.id,
            companyName: entity.businessForm.companyName,
            status: entity.businessForm.status,
          }
        : null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt ?? null,
      isPinnedByMe:
        entity.isPinnedByMe ??
        (currentUserId
          ? (entity.pins?.some((p) => p.userId === currentUserId) ?? false)
          : false),
    };
  }
}

/** Envelope phân trang cho danh sách công việc (board/list infinite scroll). */
export interface PaginatedTasksResponse {
  data: BusinessFormTaskResponseDto[];
  total: number;
  page: number;
  currentPage: number;
  limit: number;
  totalPages: number;
}

type ProductRow = {
  id: string;
  name: string;
  price: unknown;
  imageUrl: string | null;
};

type AttachmentRow = {
  id: string;
  label: string;
  fileUrl: string;
  note: string | null;
  source: BusinessFormAttachmentSource;
  uploadedById: string | null;
  documentType: string | null;
  verificationStatus: BusinessFormAttachmentVerificationStatus;
  verifiedById: string | null;
  verifiedAt: Date | null;
  verificationNote: string | null;
  replacesAttachmentId: string | null;
  replacedAt: Date | null;
  createdAt: Date;
  uploadedBy?: { id: string; fullName: string } | null;
  verifiedBy?: { id: string; fullName: string } | null;
};

type FieldFlagRow = {
  id: string;
  fieldKey: string;
  reason: string;
  createdAt: Date;
};

type ProgressNoteRow = {
  id: string;
  status: import('@prisma/client').BusinessFormProgressStatus;
  note: string | null;
  imageUrls: string[];
  isVisibleToUser: boolean;
  hideSupplierIdentity: boolean;
  supplierName: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { id: string; fullName: string } | null;
};

interface BusinessFormRow {
  id: string;
  userId: string;
  companyName: string;
  taxCode: string;
  isIndividual: boolean;
  address: string;
  contactName: string;
  contactPhone: string;
  description: string | null;
  productInfo: string | null;
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
  status: BusinessFormStatus;
  adminNote: string | null;
  reviewedAt: Date | null;
  reviewedById: string | null;
  createdByAdminId: string | null;
  assignedToAdminId: string | null;
  assignedById: string | null;
  assignedAt: Date | null;
  assignmentNote: string | null;
  priority: BusinessFormPriority;
  slaDueAt: Date | null;
  priorityReason: string | null;
  potentialScore: number | null;
  estimatedRevenue: unknown; // Prisma.Decimal | null
  cooperationFit: string | null;
  potentialNote: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  reviewedBy?: { id: string; fullName: string } | null;
  user?: { id: string; fullName: string } | null;
  createdByAdmin?: { id: string; fullName: string } | null;
  assignedTo?: { id: string; fullName: string } | null;
  assignedBy?: { id: string; fullName: string } | null;
  products?: ProductRow[];
  attachments?: AttachmentRow[];
  fieldFlags?: FieldFlagRow[];
  progressNotes?: ProgressNoteRow[];
  riskFlags?: RiskFlagRow[];
  tasks?: TaskRow[];
}

type TaskItemRow = {
  id: string;
  label: string;
  done: boolean;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: BusinessFormTaskStatus;
  type: BusinessFormTaskType;
  category: CooperationCategory;
  priority: BusinessFormPriority;
  createdByAdmin: boolean;
  createdById: string;
  mainAssigneeId: string | null;
  mainAssignee?: {
    id: string;
    fullName: string;
    avatar?: { fileUrl: string | null } | null;
  } | null;
  completedById: string | null;
  completedAt: Date | null;
  startDate: Date | null;
  dueDate: Date | null;
  // Cột JSONB trên task -> Prisma trả JsonValue.
  attachments?: unknown;
  createdAt: Date;
  updatedAt: Date;
  assignments?: Array<{
    userId: string;
    user: { id: string; fullName: string; avatar?: { fileUrl: string | null } | null };
  }>;
  createdBy?: { id: string; fullName: string } | null;
  completedBy?: { id: string; fullName: string } | null;
  items?: unknown;
};

type RiskFlagRow = {
  id: string;
  code: BusinessFormRiskFlagCode;
  note: string | null;
  createdById: string;
  createdAt: Date;
  createdBy?: { id: string; fullName: string } | null;
};

function priceToNumber(price: unknown): number {
  if (typeof price === 'object' && price !== null && 'toNumber' in price) {
    return (price as { toNumber: () => number }).toNumber();
  }
  return Number(price);
}

export class BusinessFormResponseDto {
  id!: string;
  userId!: string;

  companyName!: string;
  taxCode!: string;
  isIndividual?: boolean;
  address!: string;
  contactName!: string;
  contactPhone!: string;

  description?: string | null;
  productInfo?: string | null;

  gpkdFileUrl!: LegalDocFileDto[];
  congBoSpFileUrl!: LegalDocFileDto[];
  kiemNghiemFileUrl!: LegalDocFileDto[];
  nhanSpFileUrl!: LegalDocFileDto[];
  maVachFileUrl!: LegalDocFileDto[];
  tccsFileUrl!: LegalDocFileDto[];
  coFileUrl!: LegalDocFileDto[];
  dangKyNhFileUrl!: LegalDocFileDto[];
  gmpFileUrl!: LegalDocFileDto[];
  otherDocFileUrl!: LegalDocFileDto[];

  status!: BusinessFormStatus;
  adminNote?: string | null;
  reviewedAt?: Date | null;
  reviewedById?: string | null;
  createdByAdminId?: string | null;
  assignedToAdminId?: string | null;
  assignedById?: string | null;
  assignedAt?: Date | null;
  assignmentNote?: string | null;
  reviewedBy?: BusinessFormUserSummaryDto | null;
  user?: BusinessFormUserSummaryDto | null;
  createdByAdmin?: BusinessFormUserSummaryDto | null;
  assignedTo?: BusinessFormUserSummaryDto | null;
  assignedBy?: BusinessFormUserSummaryDto | null;
  priority!: BusinessFormPriority;
  slaDueAt?: Date | null;
  priorityReason?: string | null;
  potentialScore?: number | null;
  estimatedRevenue?: number | null;
  cooperationFit?: string | null;
  potentialNote?: string | null;
  riskFlags?: BusinessFormRiskFlagResponseDto[];
  tasks?: BusinessFormTaskResponseDto[];

  deletedAt?: Date | null;

  createdAt!: Date;
  updatedAt!: Date;

  products?: BusinessFormProductResponseDto[];

  attachments?: BusinessFormAttachmentResponseDto[];

  // Field-level flags — visible to both admin and user. User UI uses these
  // to highlight which fields need to be revised; admin UI uses them to show
  // the existing flag set when re-opening a `needs_more_info` form.
  fieldFlags?: BusinessFormFieldFlagResponseDto[];

  // Progress timeline. Shape differs between admin (full) and user (filtered
  // + redacted). Static factory methods below pick the correct shape.
  progressNotes?:
    | BusinessFormProgressNoteAdminResponseDto[]
    | BusinessFormProgressNotePublicResponseDto[];

  /** Admin view: includes every flag and every progress note (full fields). */
  static fromAdmin(form: BusinessFormRow): BusinessFormResponseDto {
    return BusinessFormResponseDto.assemble(form, 'admin');
  }

  /**
   * Public/user view: user-visible progress notes only, supplier identity
   * redacted when admin chose to hide it. `adminNote` is preserved (it's the
   * "summary reason" admin entered when transitioning to `needs_more_info`).
   */
  static fromForUser(form: BusinessFormRow): BusinessFormResponseDto {
    return BusinessFormResponseDto.assemble(form, 'user');
  }

  /**
   * Backwards-compat alias for callers that haven't migrated yet. Defaults to
   * the admin shape so list/detail keep returning the full payload.
   * @deprecated Use `fromAdmin` or `fromForUser` instead.
   */
  static from(form: BusinessFormRow): BusinessFormResponseDto {
    return BusinessFormResponseDto.fromAdmin(form);
  }

  private static assemble(
    form: BusinessFormRow,
    viewer: 'admin' | 'user',
  ): BusinessFormResponseDto {
    const progressRows = form.progressNotes ?? [];
    const progressNotes:
      | BusinessFormProgressNoteAdminResponseDto[]
      | BusinessFormProgressNotePublicResponseDto[] =
      viewer === 'admin'
        ? progressRows.map(toAdminProgressNote)
        : toPublicProgressNotes(progressRows);

    return {
      id: form.id,
      userId: form.userId,
      companyName: form.companyName,
      taxCode: form.taxCode,
      isIndividual: form.isIndividual,
      address: form.address,
      contactName: form.contactName,
      contactPhone: form.contactPhone,
      description: form.description,
      productInfo: form.productInfo,
      gpkdFileUrl: (form.gpkdFileUrl ?? []) as unknown as LegalDocFileDto[],
      congBoSpFileUrl: (form.congBoSpFileUrl ?? []) as unknown as LegalDocFileDto[],
      kiemNghiemFileUrl: (form.kiemNghiemFileUrl ?? []) as unknown as LegalDocFileDto[],
      nhanSpFileUrl: (form.nhanSpFileUrl ?? []) as unknown as LegalDocFileDto[],
      maVachFileUrl: (form.maVachFileUrl ?? []) as unknown as LegalDocFileDto[],
      tccsFileUrl: (form.tccsFileUrl ?? []) as unknown as LegalDocFileDto[],
      coFileUrl: (form.coFileUrl ?? []) as unknown as LegalDocFileDto[],
      dangKyNhFileUrl: (form.dangKyNhFileUrl ?? []) as unknown as LegalDocFileDto[],
      gmpFileUrl: (form.gmpFileUrl ?? []) as unknown as LegalDocFileDto[],
      otherDocFileUrl: (form.otherDocFileUrl ?? []) as unknown as LegalDocFileDto[],
      status: form.status,
      adminNote: form.adminNote,
      reviewedAt: form.reviewedAt,
      reviewedById: form.reviewedById,
      createdByAdminId: form.createdByAdminId,
      assignedToAdminId: form.assignedToAdminId,
      assignedById: form.assignedById,
      assignedAt: form.assignedAt,
      assignmentNote: form.assignmentNote,
      reviewedBy: form.reviewedBy ?? null,
      user: form.user ?? null,
      createdByAdmin: form.createdByAdmin ?? null,
      assignedTo: form.assignedTo ?? null,
      assignedBy: form.assignedBy ?? null,
      priority: form.priority,
      slaDueAt: form.slaDueAt,
      priorityReason: form.priorityReason,
      potentialScore: form.potentialScore,
      estimatedRevenue:
        form.estimatedRevenue == null
          ? null
          : priceToNumber(form.estimatedRevenue),
      cooperationFit: form.cooperationFit,
      potentialNote: form.potentialNote,
      tasks: form.tasks?.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        type: t.type,
        category: t.category,
        priority: t.priority,
        createdByAdmin: t.createdByAdmin,
        mainAssigneeId: t.mainAssigneeId ?? null,
        mainAssignee: t.mainAssignee
          ? {
              id: t.mainAssignee.id,
              fullName: t.mainAssignee.fullName,
              avatarUrl: t.mainAssignee.avatar?.fileUrl ?? null,
            }
          : null,
        relatedUsers:
          t.assignments?.map((a) => ({
            id: a.user.id,
            fullName: a.user.fullName,
            avatarUrl: a.user.avatar?.fileUrl ?? null,
          })) ?? [],
        createdById: t.createdById,
        createdBy: t.createdBy ?? null,
        completedById: t.completedById,
        completedBy: t.completedBy ?? null,
        completedAt: t.completedAt,
        startDate: t.startDate,
        dueDate: t.dueDate,
        // items/attachments là cột JSONB (đã có sẵn id/name/url | id/label/done).
        attachments:
          (t.attachments as BusinessFormTaskAttachmentResponseDto[] | null) ??
          [],
        items: (t.items as TaskItemRow[] | null) ?? [],
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      riskFlags: form.riskFlags?.map((r) => ({
        id: r.id,
        code: r.code,
        note: r.note,
        createdById: r.createdById,
        createdBy: r.createdBy ?? null,
        createdAt: r.createdAt,
      })),
      deletedAt: form.deletedAt,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
      products: form.products?.map((p) => ({
        id: p.id,
        name: p.name,
        price: priceToNumber(p.price),
        imageUrl: p.imageUrl,
      })),
      attachments: form.attachments?.map((a) => ({
        id: a.id,
        label: a.label,
        fileUrl: a.fileUrl,
        note: a.note,
        source: a.source,
        uploadedById: a.uploadedById,
        uploadedBy: a.uploadedBy ?? null,
        documentType: a.documentType,
        verificationStatus: a.verificationStatus,
        verifiedById: a.verifiedById,
        verifiedBy: a.verifiedBy ?? null,
        verifiedAt: a.verifiedAt,
        verificationNote: a.verificationNote,
        replacesAttachmentId: a.replacesAttachmentId,
        replacedAt: a.replacedAt,
        createdAt: a.createdAt,
      })),
      fieldFlags: form.fieldFlags?.map((f) => ({
        id: f.id,
        fieldKey: f.fieldKey,
        reason: f.reason,
        createdAt: f.createdAt,
      })),
      progressNotes,
    };
  }
}

export class CheckMstResponseDto {
  taken!: boolean;

  existing?: {
    id: string;
    companyName: string;
    status: BusinessFormStatus;
    createdAt: Date;
    user: { id: string; fullName: string };
  };
}
