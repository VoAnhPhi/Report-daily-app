import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import {
  CreateDailyReportKpiDto,
  UpdateDailyReportKpiDto,
} from '../dto/daily-report.dto';
import { DailyReportScopeService } from './daily-report-scope.service';

@Injectable()
export class DailyReportKpisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: DailyReportScopeService,
  ) {}

  async list(scopeId: string, userId: string, includeInactive = false) {
    const scope = await this.scopeService.getScopeOrThrow(scopeId, {
      includeArchived: true,
    });
    const [memberIds, canManage] = await Promise.all([
      this.scopeService.getMemberIds(scope),
      this.scopeService.canViewGroupData(scope, userId),
    ]);
    if (!canManage && !memberIds.includes(userId)) {
      throw new ForbiddenException('Bạn không thuộc nhóm báo cáo này');
    }
    return this.prisma.dailyReportKpi.findMany({
      where: {
        scopeId,
        archivedAt: null,
        ...(!includeInactive || !canManage ? { isActive: true } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  private async assertManager(scopeId: string, userId: string) {
    const scope = await this.scopeService.getScopeOrThrow(scopeId);
    if (!(await this.scopeService.canViewGroupData(scope, userId))) {
      throw new ForbiddenException(
        'Chỉ trưởng nhóm hoặc admin được quản lý KPI',
      );
    }
  }

  async create(scopeId: string, userId: string, dto: CreateDailyReportKpiDto) {
    await this.assertManager(scopeId, userId);
    return this.prisma.dailyReportKpi.create({
      data: { scopeId, createdById: userId, ...dto },
    });
  }

  async update(
    scopeId: string,
    kpiId: string,
    userId: string,
    dto: UpdateDailyReportKpiDto,
  ) {
    await this.assertManager(scopeId, userId);
    const exists = await this.prisma.dailyReportKpi.findFirst({
      where: { id: kpiId, scopeId, archivedAt: null },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Không tìm thấy KPI');
    return this.prisma.dailyReportKpi.update({
      where: { id: kpiId },
      data: dto,
    });
  }

  async archive(scopeId: string, kpiId: string, userId: string) {
    await this.assertManager(scopeId, userId);
    const result = await this.prisma.dailyReportKpi.updateMany({
      where: { id: kpiId, scopeId, archivedAt: null },
      data: { isActive: false, archivedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('Không tìm thấy KPI');
    return { success: true };
  }
}
