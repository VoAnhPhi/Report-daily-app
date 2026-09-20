import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, BusinessFormStatus, BabyAdoptionStatus } from '@prisma/client';
import axios, { AxiosResponse } from 'axios';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateBusinessFormDto } from '../dto/create-business-form.dto';
import { UpdateBusinessFormDto } from '../dto/update-business-form.dto';
import {
  BusinessFormResponseDto,
  CheckMstResponseDto,
} from '../dto/business-form-response.dto';
import { ListBusinessFormsQueryDto } from '../dto/list-business-forms-query.dto';
import { BUSINESS_FORM_ACTIVE_TAXCODE_INDEX } from '../business-forms.constants';
import { BusinessFormRemindersService } from './business-form-reminders.service';
import { ReviewGatingConfigService } from '../../admin/review-gating-config/review-gating-config.service';
import {
  COOPERATION_CATEGORIES,
} from '../constants/cooperation-category-labels';

interface VietQrBusinessResponse {
  code?: string;
  desc?: string;
  data?: {
    id?: string;
    name?: string;
    internationalName?: string;
    address?: string;
  } | null;
}

export type MstLookupReason = 'not_found' | 'unavailable';

export type MstLookupResult =
  | {
      found: true;
      data: {
        id: string;
        name: string;
        internationalName: string;
        address: string;
      };
    }
  | {
      found: false;
      reason: MstLookupReason;
    };

const FORM_INCLUDE = {
  reviewedBy: { select: { id: true, fullName: true } },
  user: { select: { id: true, fullName: true } },
  products: true,
  attachments: { orderBy: { createdAt: 'asc' } },
  fieldFlags: { orderBy: { createdAt: 'asc' } },
  progressNotes: { orderBy: { createdAt: 'desc' } },
} satisfies Prisma.BusinessFormInclude;

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

@Injectable()
export class BusinessFormsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly remindersService: BusinessFormRemindersService,
    private readonly reviewGating: ReviewGatingConfigService,
  ) {}

  async create(
    dto: CreateBusinessFormDto,
    userId: string,
    onBehalfOfUserId?: string,
  ): Promise<BusinessFormResponseDto> {
    // Làm thay: đối tác thuộc về người được chăm (verify quan hệ Baby).
    userId = await this.resolveOwnerUserId(userId, onBehalfOfUserId);
    const requireApproval = await this.reviewGating.isGateEnabled(
      'businessForm',
      false,
    );
    try {
      const form = await this.prisma.businessForm.create({
        data: {
          userId,
          status: requireApproval
            ? BusinessFormStatus.pending
            : BusinessFormStatus.approved,
          reviewedAt: requireApproval ? null : new Date(),
          reviewedById: null,
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
                  source: 'user',
                  uploadedById: userId,
                })),
              }
            : undefined,
        },
        include: FORM_INCLUDE,
      });
      return BusinessFormResponseDto.fromForUser(form);
    } catch (err) {
      if (isMstUniqueViolation(err)) {
        const existing = await this.prisma.businessForm.findFirst({
          where: {
            taxCode: dto.taxCode,
            deletedAt: null,
            status: { not: BusinessFormStatus.rejected },
          },
          select: {
            id: true,
            companyName: true,
            status: true,
            createdAt: true,
            user: { select: { id: true, fullName: true } },
          },
        });
        throw new ConflictException({
          message: 'MST đã được đăng ký',
          existing: existing
            ? {
                id: existing.id,
                companyName: existing.companyName,
                status: existing.status,
                createdAt: existing.createdAt,
                user: existing.user,
              }
            : null,
        });
      }
      throw err;
    }
  }

  listCooperationCategories(): { value: string; label: string }[] {
    return COOPERATION_CATEGORIES;
  }

  /**
   * Làm thay: trả id chủ sở hữu hiệu lực. Nếu có `onBehalfOfUserId`, chỉ chấp
   * nhận khi tồn tại quan hệ Baby đang hoạt động (approved + chưa drop) giữa
   * người gọi và người được chăm — ngược lại Forbidden. KHÔNG tin client.
   * (Mirror `resolveActingContext` bên business-form-tasks.service.)
   */
  private async resolveOwnerUserId(
    actorId: string,
    onBehalfOfUserId?: string,
  ): Promise<string> {
    if (!onBehalfOfUserId || onBehalfOfUserId === actorId) return actorId;
    const baby = await this.prisma.baby.findFirst({
      where: {
        babysitterId: actorId,
        userId: onBehalfOfUserId,
        status: BabyAdoptionStatus.approved,
        droppedAt: null,
      },
      select: { id: true },
    });
    if (!baby) {
      throw new ForbiddenException(
        'Bạn không phải người chăm sóc đang hoạt động của người này',
      );
    }
    return onBehalfOfUserId;
  }

  async findByOwner(
    userId: string,
    query: ListBusinessFormsQueryDto,
    onBehalfOfUserId?: string,
  ): Promise<{
    data: BusinessFormResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    userId = await this.resolveOwnerUserId(userId, onBehalfOfUserId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const includeDeleted = query.includeDeleted ?? false;

    const where: Prisma.BusinessFormWhereInput = {
      userId,
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { taxCode: { contains: query.search, mode: 'insensitive' } },
              { companyName: { contains: query.search, mode: 'insensitive' } },
              { contactPhone: { contains: query.search, mode: 'insensitive' } },
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
      data: rows.map(BusinessFormResponseDto.fromForUser),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByOwnerOne(
    userId: string,
    id: string,
    onBehalfOfUserId?: string,
  ): Promise<BusinessFormResponseDto> {
    userId = await this.resolveOwnerUserId(userId, onBehalfOfUserId);
    const form = await this.prisma.businessForm.findUnique({
      where: { id },
      include: FORM_INCLUDE,
    });
    if (!form || form.userId !== userId) {
      throw new NotFoundException('Form không tồn tại');
    }
    return BusinessFormResponseDto.fromForUser(form);
  }

  async checkMst(
    taxCode: string,
    _requesterId: string,
  ): Promise<CheckMstResponseDto> {
    const existing = await this.prisma.businessForm.findFirst({
      where: {
        taxCode,
        deletedAt: null,
        status: { not: BusinessFormStatus.rejected },
      },
      select: {
        id: true,
        companyName: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, fullName: true } },
      },
    });

    if (!existing) {
      return { taken: false };
    }

    return {
      taken: true,
      existing: {
        id: existing.id,
        companyName: existing.companyName,
        status: existing.status,
        createdAt: existing.createdAt,
        user: existing.user,
      },
    };
  }

  /**
   * Proxy to Vietnam General Department of Taxation lookup via vietqr.io.
   *
   * NEVER throws — returns a discriminated union so the FE can fall back to
   * manual input on rate-limit / unavailable / not-found.
   *
   *   { found: true,  data: { id, name, internationalName, address } }   // vietqr 200 + code=00
   *   { found: false, reason: 'not_found' }                              // vietqr 200 + code=51 / no data / invalid length
   *   { found: false, reason: 'unavailable' }                            // vietqr non-2xx (rate limit, 5xx, timeout, network)
   */
  async lookupMst(taxCode: string): Promise<MstLookupResult> {
    const normalized = taxCode.trim().replace(/\D/g, '');

    if (normalized.length !== 10 && normalized.length !== 13) {
      return { found: false, reason: 'not_found' };
    }

    const url = `https://api.vietqr.io/v2/business/${normalized}`;
    let res: AxiosResponse<VietQrBusinessResponse>;
    try {
      res = await axios.get<VietQrBusinessResponse>(url, {
        timeout: 8000,
        validateStatus: () => true,
      });
    } catch {
      return { found: false, reason: 'unavailable' };
    }

    if (res.status < 200 || res.status >= 300) {
      return { found: false, reason: 'unavailable' };
    }

    const body = res.data;
    const isHit =
      body?.code === '00' &&
      !!body.data &&
      !!body.data.id &&
      !!body.data.name &&
      !!body.data.address;

    if (isHit && body.data) {
      return {
        found: true,
        data: {
          id: body.data.id!,
          name: body.data.name!,
          internationalName: body.data.internationalName ?? '',
          address: body.data.address!,
        },
      };
    }

    return { found: false, reason: 'not_found' };
  }

  async updateOwn(
    id: string,
    dto: UpdateBusinessFormDto,
    userId: string,
  ): Promise<BusinessFormResponseDto> {
    const form = await this.prisma.businessForm.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        deletedAt: true,
        reviewedAt: true,
      },
    });

    if (!form || form.userId !== userId) {
      throw new NotFoundException('Form không tồn tại');
    }
    if (form.deletedAt) {
      throw new ForbiddenException('Form đã bị xóa');
    }
    if (
      form.status !== BusinessFormStatus.pending &&
      form.status !== BusinessFormStatus.needs_more_info
    ) {
      throw new ForbiddenException(
        'Chỉ có thể chỉnh sửa form khi đang chờ duyệt hoặc cần bổ sung thông tin',
      );
    }

    const priorReviewedAtMs = form.reviewedAt?.getTime();

    const data: Prisma.BusinessFormUpdateInput = {
      status: BusinessFormStatus.pending,
      reviewedAt: null,
      reviewedBy: { disconnect: true },
      adminNote: null,
    };

    if (dto.companyName !== undefined) data.companyName = dto.companyName;
    if (dto.taxCode !== undefined) data.taxCode = dto.taxCode;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.contactName !== undefined) data.contactName = dto.contactName;
    if (dto.contactPhone !== undefined) data.contactPhone = dto.contactPhone;
    if (dto.description !== undefined) data.description = dto.description ?? null;
    if (dto.productInfo !== undefined) data.productInfo = dto.productInfo ?? null;
    if (dto.gpkdFileUrl !== undefined) data.gpkdFileUrl = (dto.gpkdFileUrl ?? []) as unknown as Prisma.InputJsonValue;
    if (dto.congBoSpFileUrl !== undefined)
      data.congBoSpFileUrl = (dto.congBoSpFileUrl ?? []) as unknown as Prisma.InputJsonValue;
    if (dto.kiemNghiemFileUrl !== undefined)
      data.kiemNghiemFileUrl = (dto.kiemNghiemFileUrl ?? []) as unknown as Prisma.InputJsonValue;
    if (dto.nhanSpFileUrl !== undefined)
      data.nhanSpFileUrl = (dto.nhanSpFileUrl ?? []) as unknown as Prisma.InputJsonValue;
    if (dto.maVachFileUrl !== undefined)
      data.maVachFileUrl = (dto.maVachFileUrl ?? []) as unknown as Prisma.InputJsonValue;
    if (dto.tccsFileUrl !== undefined) data.tccsFileUrl = (dto.tccsFileUrl ?? []) as unknown as Prisma.InputJsonValue;
    if (dto.coFileUrl !== undefined) data.coFileUrl = (dto.coFileUrl ?? []) as unknown as Prisma.InputJsonValue;
    if (dto.dangKyNhFileUrl !== undefined)
      data.dangKyNhFileUrl = (dto.dangKyNhFileUrl ?? []) as unknown as Prisma.InputJsonValue;
    if (dto.gmpFileUrl !== undefined) data.gmpFileUrl = (dto.gmpFileUrl ?? []) as unknown as Prisma.InputJsonValue;
    if (dto.otherDocFileUrl !== undefined) data.otherDocFileUrl = (dto.otherDocFileUrl ?? []) as unknown as Prisma.InputJsonValue;

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
                source: 'user',
                uploadedById: userId,
              })),
            });
          }
        }
        // User just edited the form — clear all field flags. Admin reviews
        // the resubmission fresh; if anything still needs fixing they can
        // re-apply flags via setNeedsMoreInfo.
        await tx.businessFormFieldFlag.deleteMany({
          where: { businessFormId: id },
        });
        return tx.businessForm.update({
          where: { id },
          data,
          include: FORM_INCLUDE,
        });
      });

      // Cancel pending reminder; transition away from needs_more_info.
      if (priorReviewedAtMs !== undefined) {
        await this.remindersService.removePending(id, priorReviewedAtMs);
      }

      return BusinessFormResponseDto.fromForUser(updated);
    } catch (err) {
      if (isMstUniqueViolation(err)) {
        throw new ConflictException({
          message: 'MST đã được đăng ký bởi form khác',
        });
      }
      throw err;
    }
  }

  async softDeleteOwn(id: string, userId: string): Promise<{ success: true }> {
    const form = await this.prisma.businessForm.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        deletedAt: true,
        reviewedAt: true,
      },
    });

    if (!form || form.userId !== userId) {
      throw new NotFoundException('Form không tồn tại');
    }
    if (form.deletedAt) {
      throw new ForbiddenException('Form đã bị xóa');
    }
    if (form.status !== BusinessFormStatus.pending) {
      throw new ForbiddenException(
        'Chỉ có thể xóa form khi trạng thái là chờ duyệt',
      );
    }

    await this.prisma.businessForm.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    if (form.reviewedAt) {
      await this.remindersService.removePending(id, form.reviewedAt.getTime());
    }

    return { success: true };
  }
}
