import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import {
  CloneDailyReportTemplateDto,
  CreateDailyReportTemplateDto,
  DailyReportTemplateQuestionDto,
  UpdateDailyReportTemplateDto,
} from '../dto/daily-report.dto';

@Injectable()
export class DailyReportTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.dailyReportTemplate.findMany({
      where: {
        deletedAt: null,
        OR: [{ isSystemDefault: true }, { ownerId: userId }],
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: { questions: { orderBy: { sortOrder: 'asc' } } },
        },
      },
      orderBy: [{ isSystemDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async getById(userId: string, id: string) {
    const template = await this.prisma.dailyReportTemplate.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ isSystemDefault: true }, { ownerId: userId }],
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          include: { questions: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (!template) throw new NotFoundException('Không tìm thấy bộ câu hỏi');
    return template;
  }

  async create(userId: string, dto: CreateDailyReportTemplateDto) {
    this.assertQuestions(dto.questions);
    return this.prisma.$transaction(async (tx) => {
      const template = await tx.dailyReportTemplate.create({
        data: {
          name: dto.name,
          description: dto.description,
          ownerId: userId,
          isSystemDefault: false,
        },
      });
      const version = await tx.dailyReportTemplateVersion.create({
        data: {
          templateId: template.id,
          version: 1,
          nameSnapshot: template.name,
          descriptionSnapshot: template.description,
          createdById: userId,
        },
      });
      await tx.dailyReportQuestion.createMany({
        data: dto.questions.map((question) => ({
          ...question,
          templateId: template.id,
          templateVersionId: version.id,
          isCore: false,
        })),
      });
      return tx.dailyReportTemplate.findUnique({
        where: { id: template.id },
        include: {
          versions: {
            include: { questions: { orderBy: { sortOrder: 'asc' } } },
          },
        },
      });
    });
  }

  async update(userId: string, id: string, dto: UpdateDailyReportTemplateDto) {
    if (!dto.name && dto.description === undefined && !dto.questions) {
      throw new UnprocessableEntityException('Không có nội dung thay đổi');
    }
    if (dto.questions) this.assertQuestions(dto.questions);
    const template = await this.prisma.dailyReportTemplate.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: { questions: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (!template || template.deletedAt) {
      throw new NotFoundException('Không tìm thấy bộ câu hỏi');
    }
    if (template.isSystemDefault || template.ownerId !== userId) {
      throw new ForbiddenException(
        'Hãy nhân bản template hệ thống trước khi chỉnh sửa',
      );
    }
    const current = template.versions[0];
    if (!current) throw new NotFoundException('Template chưa có phiên bản');
    const questions = dto.questions ?? current.questions;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.dailyReportTemplate.update({
        where: { id },
        data: { name: dto.name, description: dto.description },
      });
      const version = await tx.dailyReportTemplateVersion.create({
        data: {
          templateId: id,
          version: current.version + 1,
          nameSnapshot: updated.name,
          descriptionSnapshot: updated.description,
          createdById: userId,
        },
      });
      await tx.dailyReportQuestion.createMany({
        data: questions.map((question) => ({
          templateId: id,
          templateVersionId: version.id,
          kind: question.kind,
          label: question.label,
          hint: question.hint,
          isRequired: question.isRequired,
          allowTaskLink: question.allowTaskLink,
          sortOrder: question.sortOrder,
          isCore: false,
        })),
      });
      await tx.dailyReportScope.updateMany({
        where: { templateId: id, archivedAt: null },
        data: { currentTemplateVersionId: version.id },
      });
      return tx.dailyReportTemplateVersion.findUnique({
        where: { id: version.id },
        include: { questions: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  }

  async clone(userId: string, id: string, dto: CloneDailyReportTemplateDto) {
    const source = await this.getById(userId, id);
    const latest = source.versions[0];
    if (!latest) throw new NotFoundException('Template chưa có phiên bản');
    return this.create(userId, {
      name: dto.name ?? `${source.name} — bản sao`,
      description: source.description ?? undefined,
      questions: latest.questions.map((question) => ({
        kind: question.kind,
        label: question.label,
        hint: question.hint ?? undefined,
        isRequired: question.isRequired,
        allowTaskLink: question.allowTaskLink,
        sortOrder: question.sortOrder,
      })),
    });
  }

  private assertQuestions(questions: DailyReportTemplateQuestionDto[]): void {
    const orders = questions.map((question) => question.sortOrder);
    if (new Set(orders).size !== orders.length) {
      throw new UnprocessableEntityException('sortOrder không được trùng');
    }
  }
}
