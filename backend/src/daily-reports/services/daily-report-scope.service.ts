import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  DailyReportScope,
  DailyReportScopeType,
  DailyReportStatus,
  Prisma,
  Role,
  TeamMemberRole,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from 'src/common/services/prisma.service';
import {
  assertValidWeekdays,
  assertValidSchedule,
  CreateReportScopeDto,
  UpdateReportScopeDto,
} from '../dto/daily-report.dto';
import {
  DAILY_REPORT_GENERATE_LABEL,
  DAILY_REPORT_HARD_STOP_MINUTE,
  DAILY_REPORT_LEADER_SUMMARY_MINUTE,
  dailyReportMinuteLabel,
  DAILY_REPORT_REMINDER_MINUTE,
} from '../constants/daily-report.constants';

/** Thông tin thành viên hiển thị trên bảng theo dõi. */
export interface ScopeMemberInfo {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  /**
   * Tài khoản đang hoạt động (`status = active`, chưa xoá).
   *
   * Có mặt ở đây vì giao diện chia bộ phận CẦN biết trước: chỉ tài khoản đang
   * hoạt động nhận được vai người duyệt (xem `assertAssignable` trong
   * `daily-report-review-groups.service.ts`). Không có cờ này thì form mời
   * trưởng nhóm chọn một người mà server chắc chắn từ chối, và họ chỉ biết sau
   * khi bấm Lưu - đúng lỗi người dùng báo ngày 16/09/2026: nhóm "Hồ Chí Minh"
   * có 4 thành viên và cả 4 là tài khoản khách (`status = marketing`), nên
   * không thêm được người duyệt nào.
   */
  isActive: boolean;
}

/** Contract public của scope, bao gồm quyền cấu hình và quyền xem theo nhóm. */
export interface PublicDailyReportScope {
  id: string;
  scopeType: DailyReportScopeType;
  assignGroupId: string | null;
  teamId: string | null;
  templateId: string;
  currentTemplateVersionId: string | null;
  isEnabled: boolean;
  weekdays: number[];
  timezone: string;
  notifyLeaderOnMissing: boolean;
  targetIdSnapshot: string | null;
  targetNameSnapshot: string | null;
  archivedAt: Date | null;
  purgedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  isManager: boolean;
  canViewGroupData: boolean;
  /**
   * Người này là NGƯỜI DUYỆT PHỤ của phạm vi: được phân công phụ trách một số
   * thành viên cụ thể. Cờ riêng chứ không nhét vào `canViewGroupData`, vì hàm
   * `canViewGroupData` phía server KHÔNG cho họ - nó đang gác cả KPI.
   */
  isReviewer: boolean;
  /**
   * Người này THUỘC phạm vi (có tên trong nhóm/đội), tức có bản phải nộp ở đây.
   * Tách khỏi `isReviewer`: vai duyệt không miễn cho ai việc nộp bản của mình.
   * Người duyệt phụ trong nhóm vừa nộp vừa duyệt; người duyệt phụ đứng ngoài
   * nhóm chỉ duyệt, bản của họ nằm ở nhóm của chính họ.
   */
  isMember: boolean;
  reviewWindowDays: number;
  cutoffMinute: number;
  reminderBeforeMinutes: number;
  leaderSummaryMinute: number;
  generationLabel: string;
  reminderLabel: string;
  leaderSummaryLabel: string;
  hardStopMinute: number;
  hardStopLabel: string;
}

const MEMBER_SELECT = {
  id: true,
  fullName: true,
  avatar: { select: { fileUrl: true } },
  status: true,
  deletedAt: true,
} as const;

type UserRow = Prisma.UserGetPayload<{ select: typeof MEMBER_SELECT }>;

const toMemberInfo = (u: UserRow): ScopeMemberInfo => ({
  id: u.id,
  fullName: u.fullName,
  avatarUrl: u.avatar?.fileUrl ?? null,
  isActive: u.status === UserStatus.active && u.deletedAt === null,
});

/**
 * Phạm vi báo cáo (DailyReportScope) — cấu hình bật/tắt, phân giải thành viên
 * và trưởng nhóm cho cả hai loại nhóm (TaskAssignGroup / Team).
 */
@Injectable()
export class DailyReportScopeService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Phân giải thành viên / trưởng nhóm ───────────────────────────────────

  /** Id mọi người phải báo cáo trong phạm vi (nhóm giao việc: gồm cả chủ nhóm). */
  async getMemberIds(scope: DailyReportScope): Promise<string[]> {
    if (scope.archivedAt) {
      const reports = await this.prisma.dailyReport.findMany({
        where: { scopeId: scope.id },
        distinct: ['userId'],
        select: { userId: true },
      });
      return reports.map((report) => report.userId);
    }
    if (scope.scopeType === DailyReportScopeType.assign_group) {
      if (!scope.assignGroupId) return [];
      const group = await this.prisma.taskAssignGroup.findUnique({
        where: { id: scope.assignGroupId },
        select: { ownerId: true, members: { select: { userId: true } } },
      });
      if (!group) return [];
      return Array.from(
        new Set([group.ownerId, ...group.members.map((m) => m.userId)]),
      );
    }
    if (!scope.teamId) return [];
    const members = await this.prisma.teamMember.findMany({
      where: { teamId: scope.teamId, leftAt: null },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  /** Membership tại một instant; dùng cho snapshot 07:30 và catch-up. */
  async getMemberIdsAt(
    scope: DailyReportScope,
    instant: Date,
  ): Promise<string[]> {
    if (scope.scopeType === DailyReportScopeType.assign_group) {
      const groupId = scope.assignGroupId ?? scope.targetIdSnapshot;
      if (!groupId) return [];
      const [group, periods] = await Promise.all([
        this.prisma.taskAssignGroup.findUnique({
          where: { id: groupId },
          select: { ownerId: true, createdAt: true },
        }),
        this.prisma.dailyReportAssignGroupMembershipPeriod.findMany({
          where: {
            groupId,
            joinedAt: { lte: instant },
            OR: [{ leftAt: null }, { leftAt: { gt: instant } }],
          },
          select: { userId: true },
        }),
      ]);
      return Array.from(
        new Set([
          ...(group && group.createdAt <= instant ? [group.ownerId] : []),
          ...periods.map((period) => period.userId),
        ]),
      );
    }
    const teamId = scope.teamId ?? scope.targetIdSnapshot;
    if (!teamId) return [];
    const members = await this.prisma.teamMember.findMany({
      where: {
        teamId,
        joinedAt: { lte: instant },
        OR: [{ leftAt: null }, { leftAt: { gt: instant } }],
      },
      select: { userId: true },
    });
    return members.map((member) => member.userId);
  }

  /** Thông tin hiển thị của toàn bộ thành viên (bảng theo dõi nhóm). */
  async getMemberInfos(scope: DailyReportScope): Promise<ScopeMemberInfo[]> {
    const ids = await this.getMemberIds(scope);
    return this.getMemberInfosByIds(ids);
  }

  /** Thông tin thành viên tại đúng một mốc snapshot. */
  async getMemberInfosAt(
    scope: DailyReportScope,
    instant: Date,
  ): Promise<ScopeMemberInfo[]> {
    const ids = await this.getMemberIdsAt(scope, instant);
    return this.getMemberInfosByIds(ids);
  }

  /** Nạp thông tin người dùng theo danh sách id đã được phân giải. */
  async getMemberInfosByIds(ids: string[]): Promise<ScopeMemberInfo[]> {
    if (ids.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: MEMBER_SELECT,
      orderBy: { fullName: 'asc' },
    });
    return users.map(toMemberInfo);
  }

  /** Id trưởng nhóm (nhận thông báo nộp/thiếu): owner hoặc leader+chief. */
  async getLeaderIds(scope: DailyReportScope): Promise<string[]> {
    if (scope.archivedAt) {
      const viewers = await this.prisma.dailyReportScopeArchiveViewer.findMany({
        where: { scopeId: scope.id },
        select: { userId: true },
      });
      return viewers.map((viewer) => viewer.userId);
    }
    if (scope.scopeType === DailyReportScopeType.assign_group) {
      if (!scope.assignGroupId) return [];
      const group = await this.prisma.taskAssignGroup.findUnique({
        where: { id: scope.assignGroupId },
        select: { ownerId: true },
      });
      return group ? [group.ownerId] : [];
    }
    if (!scope.teamId) return [];
    const leaders = await this.prisma.teamMember.findMany({
      where: {
        teamId: scope.teamId,
        leftAt: null,
        role: { in: [TeamMemberRole.leader, TeamMemberRole.chief] },
      },
      select: { userId: true },
    });
    return leaders.map((l) => l.userId);
  }

  /** Người này có quyền quản lý phạm vi (bật/tắt, mở lại bản đã nộp)? */
  async isManager(scope: DailyReportScope, userId: string): Promise<boolean> {
    const leaderIds = await this.getLeaderIds(scope);
    return leaderIds.includes(userId);
  }

  /** Super admin được xem bảng/tổng hợp của mọi scope đang bật. */
  async canViewGroupData(
    scope: DailyReportScope,
    userId: string,
  ): Promise<boolean> {
    if (await this.isPlatformAdmin(userId)) {
      return !scope.deletedAt && !scope.archivedAt && scope.isEnabled;
    }
    return this.isManager(scope, userId);
  }

  /** Người này là archive viewer của một phạm vi ĐÃ lưu trữ? */
  private async isArchiveViewer(
    scope: DailyReportScope,
    userId: string,
  ): Promise<boolean> {
    if (!scope.archivedAt) return false;
    const viewer = await this.prisma.dailyReportScopeArchiveViewer.findFirst({
      where: { scopeId: scope.id, userId },
      select: { userId: true },
    });
    return Boolean(viewer);
  }

  /**
   * Người này duyệt thành viên đó?
   *
   * HAI điều kiện, không phải một:
   *
   * 1. tồn tại một nhóm duyệt của phạm vi có cả hai — người kia là người duyệt,
   *    thành viên kia là người được phụ trách;
   * 2. người duyệt ĐANG là thành viên của phạm vi.
   *
   * Điều kiện 2 là luật chốt ngày 12/09/2026: người duyệt bắt buộc thuộc chính
   * nhóm đang cấu hình, nên rời nhóm giao việc là mất quyền duyệt NGAY, không
   * chờ trưởng nhóm gỡ tên khỏi nhóm duyệt. Kiểm ở đây chứ không chỉ lúc ghi:
   * người rời nhóm không tự gỡ mình khỏi nhóm duyệt, và nếu chỉ gác lúc ghi thì
   * họ còn đọc được báo cáo cho tới khi có ai đó nhớ ra.
   *
   * Quan hệ (người duyệt × thành viên) là thứ SUY RA từ hai bảng nối, không lưu
   * sẵn ở đâu — nên chia lại nhóm là quyền đổi ngay ở lượt đọc kế tiếp, không có
   * bảng dẫn xuất nào phải dựng lại. Đó chính là "áp dụng ngay trong ngày".
   */
  private async hasReviewerAssignment(
    scope: DailyReportScope,
    reviewerId: string,
    memberId: string,
  ): Promise<boolean> {
    const row = await this.prisma.dailyReportReviewGroup.findFirst({
      where: {
        scopeId: scope.id,
        reviewers: { some: { reviewerId } },
        members: { some: { memberId } },
      },
      select: { id: true },
    });
    // Hỏi thành viên SAU: đa số lượt gọi tới đây là người không duyệt ai cả,
    // và khi đó truy vấn trên đã trả `null` nên không tốn thêm lượt nào.
    if (!row) return false;
    return this.isMember(scope, reviewerId);
  }

  /**
   * Đọc MỘT báo cáo cụ thể của một thành viên.
   *
   * KHÔNG dùng `canViewGroupData` cho đường này: người duyệt phụ không bắt buộc
   * là thành viên của phạm vi, nên hàm đó trả false cho họ và một phân công hợp
   * lệ vẫn nhận 403. Thiết kế mục 8.3.
   */
  async canViewReport(
    scope: DailyReportScope,
    actorId: string,
    memberId: string,
  ): Promise<boolean> {
    if (actorId === memberId) return true;
    if (await this.isPlatformAdmin(actorId)) return true;
    if (await this.isArchiveViewer(scope, actorId)) return true;
    if (!scope.archivedAt && (await this.isManager(scope, actorId)))
      return true;
    return this.hasReviewerAssignment(scope, actorId, memberId);
  }

  /**
   * Ra quyết định duyệt trên báo cáo của một thành viên.
   *
   * Ba tham số, không phải hai: quyền duyệt gắn với CẶP (người duyệt, chủ báo
   * cáo). Bỏ `memberId` là mọi người duyệt phụ duyệt được mọi người, mà API vẫn
   * trả 200 nên không test nào tự bắt. Thiết kế nguyên tắc 7.
   */
  async canReviewReport(
    scope: DailyReportScope,
    actorId: string,
    memberId: string,
  ): Promise<boolean> {
    // Phạm vi đã lưu trữ thì không ai duyệt được. Không đi qua getLeaderIds ở
    // đây: nhánh archived của hàm đó trả archive viewer, tức quyền XEM lịch sử
    // sẽ tự động thành quyền DUYỆT. Thiết kế mục 8.4.
    if (scope.archivedAt) return false;
    if (actorId === memberId) return false;
    if (await this.isManager(scope, actorId)) return true;
    return this.hasReviewerAssignment(scope, actorId, memberId);
  }

  /**
   * Cổng VÀ bộ lọc cho mọi danh sách nhiều người: board, summary, outcome,
   * lịch sử, và fan-out của cron.
   *
   * Trả `'all'` hoặc mảng memberId. Quên lọc một chỗ là rò rỉ dữ liệu, không
   * phải lỗi hiển thị. Thiết kế nguyên tắc 8.
   */
  async resolveVisibleMemberIds(
    scope: DailyReportScope,
    actorId: string,
  ): Promise<'all' | string[]> {
    if (await this.isPlatformAdmin(actorId)) return 'all';
    if (await this.isArchiveViewer(scope, actorId)) return 'all';
    if (!scope.archivedAt && (await this.isManager(scope, actorId))) {
      return 'all';
    }
    const [rows, memberIds] = await Promise.all([
      this.prisma.dailyReportReviewGroupMember.findMany({
        where: {
          group: {
            scopeId: scope.id,
            reviewers: { some: { reviewerId: actorId } },
          },
        },
        select: { memberId: true },
        // Một thành viên thuộc được NHIỀU nhóm duyệt: thiếu `distinct` là danh
        // sách lọc có id lặp, và mọi bộ đếm dựng từ nó đếm hai lần một người.
        distinct: ['memberId'],
      }),
      this.getMemberIds(scope),
    ]);
    /*
     * Người duyệt phải ĐANG thuộc phạm vi (luật 12/09/2026). Rời nhóm giao việc
     * là mất quyền ngay, nên bảng và tổng hợp cũng đóng lại cùng lúc với
     * `canViewReport` - hai đường mở cùng một tập dữ liệu thì không được nói
     * hai điều khác nhau.
     */
    if (rows.length === 0 || !memberIds.includes(actorId)) {
      throw new ForbiddenException('Bạn không có quyền xem dữ liệu nhóm này.');
    }
    return rows.map((row) => row.memberId);
  }

  async isPlatformAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        userAdminRoles: {
          where: {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            role: { code: 'super_admin', isActive: true },
          },
          select: { id: true },
        },
      },
    });
    return user?.role === Role.admin || (user?.userAdminRoles.length ?? 0) > 0;
  }

  /** Người này có thuộc phạm vi (được xem bảng nhóm — QT-13)? */
  async isMember(scope: DailyReportScope, userId: string): Promise<boolean> {
    const ids = await this.getMemberIds(scope);
    return ids.includes(userId);
  }

  /** Tên nhóm để hiển thị. */
  async getScopeName(scope: DailyReportScope): Promise<string> {
    if (scope.scopeType === DailyReportScopeType.assign_group) {
      const group = scope.assignGroupId
        ? await this.prisma.taskAssignGroup.findUnique({
            where: { id: scope.assignGroupId },
            select: { name: true },
          })
        : null;
      return group?.name ?? scope.targetNameSnapshot ?? 'Nhóm đã xóa';
    }
    const team = scope.teamId
      ? await this.prisma.team.findUnique({
          where: { id: scope.teamId },
          select: { name: true },
        })
      : null;
    return team?.name ?? scope.targetNameSnapshot ?? 'Đội đã xóa';
  }

  // ── Tra cứu ──────────────────────────────────────────────────────────────

  async getScopeOrThrow(
    scopeId: string,
    options: { includeArchived?: boolean } = {},
  ): Promise<DailyReportScope> {
    const scope = await this.prisma.dailyReportScope.findFirst({
      where: {
        id: scopeId,
        ...(options.includeArchived
          ? {}
          : { deletedAt: null, archivedAt: null }),
      },
    });
    if (!scope) {
      throw new NotFoundException('Không tìm thấy cấu hình báo cáo của nhóm');
    }
    return scope;
  }

  async canViewScope(
    scope: DailyReportScope,
    userId: string,
  ): Promise<boolean> {
    if (!scope.archivedAt) return this.isMember(scope, userId);
    const [ownReport, archiveViewer] = await Promise.all([
      this.prisma.dailyReport.findFirst({
        where: { scopeId: scope.id, userId },
        select: { id: true },
      }),
      this.prisma.dailyReportScopeArchiveViewer.findUnique({
        where: { scopeId_userId: { scopeId: scope.id, userId } },
        select: { userId: true },
      }),
    ]);
    return Boolean(ownReport || archiveViewer);
  }

  /** Mọi phạm vi đang bật mà user là thành viên. */
  /**
   * Scope mà user thuộc về.
   *
   * `includeDisabled` CHỈ dành cho màn cấu hình (`GET /daily-report-scopes/my`).
   * Mặc định vẫn lọc `isEnabled: true`, và đường sinh báo cáo
   * (`ensureReportsForUser`) PHẢI giữ mặc định — bỏ lọc ở đó sẽ sinh báo cáo cho
   * nhóm đang tạm dừng.
   *
   * Vì sao cần: scope tắt mà vô hình thì giao diện tưởng nhóm chưa bật, nên khi
   * bật lại nó gọi POST thay vì PATCH, và POST đụng chốt chặn trùng (`create`
   * dò `findFirst` KHÔNG lọc `isEnabled`) → 409, công tắc chết một chiều.
   */
  async getScopesOfUser(
    userId: string,
    options: { includeDisabled?: boolean } = {},
  ): Promise<DailyReportScope[]> {
    const [groupIds, teamIds] = await Promise.all([
      this.prisma.taskAssignGroup
        .findMany({
          where: {
            OR: [{ ownerId: userId }, { members: { some: { userId } } }],
          },
          select: { id: true },
        })
        .then((rows) => rows.map((r) => r.id)),
      this.prisma.teamMember
        .findMany({
          where: { userId, leftAt: null },
          select: { teamId: true },
        })
        .then((rows) => rows.map((r) => r.teamId)),
    ]);
    if (groupIds.length === 0 && teamIds.length === 0) return [];
    return this.prisma.dailyReportScope.findMany({
      where: {
        deletedAt: null,
        archivedAt: null,
        ...(options.includeDisabled ? {} : { isEnabled: true }),
        OR: [
          ...(groupIds.length > 0 ? [{ assignGroupId: { in: groupIds } }] : []),
          ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
        ],
      },
    });
  }

  /**
   * `GET /daily-report-scopes/my` — scope kèm `name` + quyền xem, GỘP LÔ.
   *
   * Bản cũ map từng scope rồi gọi `getScopeName` + `isManager` cho mỗi cái, mà
   * `isManager` lại gọi tiếp `getLeaderIds` — 3 lượt round-trip mỗi scope. Người
   * có 11 nhóm là 33 truy vấn nối tiếp, đo được khoảng 3 giây, và suốt thời gian
   * đó giao diện cấu hình không hiện gì. Ở đây gom thành đúng hai truy vấn.
   *
   * Trả về CẢ scope đang tạm dừng (`isEnabled: false`) — đây là màn cấu hình,
   * giấu đi thì không bật lại được (xem `getScopesOfUser`).
   *
   * Danh sách này là "nhóm của tôi" cho MỌI vai trò. Từng có một nhánh riêng
   * trả toàn bộ scope của hệ thống cho admin nền tảng; nó rò nhóm riêng của
   * người khác sang màn Báo cáo và đồng thời giấu mất scope đang tạm dừng của
   * chính admin — lý do đầy đủ nằm ở `getMy` trong controller.
   *
   * `isPlatformAdmin` vẫn phải hỏi, và hỏi cho mọi người gọi: nó quyết định
   * `canViewGroupData` của TỪNG dòng trả về. Admin nền tảng chỉ là THÀNH VIÊN
   * thường của một nhóm vẫn được `canViewGroupData()` cho đọc board/summary của
   * nhóm đó, nên nếu danh sách báo `false` thì giao diện tự chặn họ trong khi
   * server vẫn phục vụ — một cái cổng đóng nhầm, khó lần ra vì hai tầng nói hai
   * điều khác nhau. Endpoint có `@CacheScope('user')` nên truy vấn thêm này
   * không lặp lại mỗi lần vẽ.
   */
  async listMyScopes(userId: string): Promise<PublicDailyReportScope[]> {
    const [scopes, isPlatformAdmin, reviewerScopeIds] = await Promise.all([
      this.getScopesOfUser(userId, { includeDisabled: true }),
      this.isPlatformAdmin(userId),
      this.getReviewerScopeIds(userId),
    ]);

    /*
     * KHÔNG cộng thêm phạm vi nào từ vai duyệt nữa (bỏ ngày 12/09/2026).
     *
     * Bản cũ gộp thêm những phạm vi mà người này chỉ ĐỨNG NGOÀI duyệt, vì luật
     * cũ cho phép người duyệt không thuộc nhóm. Luật mới bắt người duyệt phải
     * là thành viên của chính nhóm đó, nên mọi phạm vi họ duyệt đã nằm trong
     * `getScopesOfUser`; cộng thêm chỉ có thể thêm được một phạm vi mà chính
     * `resolveVisibleMemberIds` sẽ trả 403 - tức rail mời người dùng vào một
     * màn từ chối họ.
     */
    return this.toPublicScopes(
      scopes,
      userId,
      isPlatformAdmin,
      reviewerScopeIds,
    );
  }

  /**
   * Phạm vi mà người này có vai NGƯỜI DUYỆT. Dùng index [reviewerId].
   *
   * Chỉ để bật cờ `isReviewer` trên từng dòng rail - KHÔNG dùng để thêm phạm vi
   * vào danh sách (xem chú thích trong `listMyScopes`). Vì vậy hàm trả id thay
   * vì trả bản ghi phạm vi: người gọi giao nhau với danh sách phạm vi họ thuộc.
   *
   * `members: { some: {} }` là điều kiện có thật, không phải cho chắc: một nhóm
   * duyệt rỗng thành viên (vừa tạo, hoặc người cuối đã rời nhóm giao việc) thì
   * người duyệt của nó không có bản nào để đọc, mà `resolveVisibleMemberIds`
   * lại ném 403 khi danh sách rỗng. Thiếu điều kiện này thì dải "Nhóm" hiện ra
   * rồi màn bên trong từ chối họ.
   */
  private async getReviewerScopeIds(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.dailyReportReviewGroupReviewer.findMany({
      where: { reviewerId: userId, group: { members: { some: {} } } },
      select: { group: { select: { scopeId: true } } },
    });
    return new Set(rows.map((row) => row.group.scopeId));
  }

  /**
   * Những ai người này phải duyệt, theo từng phạm vi đang chạy: trưởng nhóm là
   * `'all'`, người duyệt phụ là đúng danh sách được giao. Cùng luật với
   * `canReviewReport`, nhưng gom lô thay vì hỏi từng scope - nuôi bộ đếm
   * "chờ tôi duyệt" trên thanh chuyển màn.
   */
  async getReviewTargets(
    userId: string,
  ): Promise<Array<{ scopeId: string; memberIds: 'all' | string[] }>> {
    const [ownScopes, assignedRows] = await Promise.all([
      this.getScopesOfUser(userId),
      this.prisma.dailyReportReviewGroupMember.findMany({
        where: { group: { reviewers: { some: { reviewerId: userId } } } },
        select: { memberId: true, group: { select: { scopeId: true } } },
      }),
    ]);
    // Một cặp (phạm vi, thành viên) đến từ nhiều nhóm duyệt thì vẫn là MỘT
    // người phải duyệt; `targets` bên dưới gom bằng Set nên không đếm hai lần.
    const assignments = assignedRows.map((row) => ({
      scopeId: row.group.scopeId,
      memberId: row.memberId,
    }));

    type IdRow = { id: string };
    type TeamRow = { teamId: string };
    const groupIds = ownScopes
      .map((s) => s.assignGroupId)
      .filter((id): id is string => !!id);
    const teamIds = ownScopes
      .map((s) => s.teamId)
      .filter((id): id is string => !!id);
    const assignedScopeIds = [...new Set(assignments.map((a) => a.scopeId))];
    const [ownedGroups, ledTeams, liveAssignedScopes] = await Promise.all([
      groupIds.length > 0
        ? this.prisma.taskAssignGroup.findMany({
            where: { id: { in: groupIds }, ownerId: userId },
            select: { id: true },
          })
        : Promise.resolve<IdRow[]>([]),
      teamIds.length > 0
        ? this.prisma.teamMember.findMany({
            where: {
              teamId: { in: teamIds },
              userId,
              leftAt: null,
              role: { in: [TeamMemberRole.leader, TeamMemberRole.chief] },
            },
            select: { teamId: true },
          })
        : Promise.resolve<TeamRow[]>([]),
      assignedScopeIds.length > 0
        ? this.prisma.dailyReportScope.findMany({
            where: {
              id: { in: assignedScopeIds },
              deletedAt: null,
              archivedAt: null,
              isEnabled: true,
            },
            select: { id: true },
          })
        : Promise.resolve<IdRow[]>([]),
    ]);

    const ownedGroupIds = new Set(ownedGroups.map((g) => g.id));
    const ledTeamIds = new Set(ledTeams.map((t) => t.teamId));
    const targets = new Map<string, 'all' | Set<string>>();
    for (const scope of ownScopes) {
      const manages =
        scope.scopeType === DailyReportScopeType.assign_group
          ? !!scope.assignGroupId && ownedGroupIds.has(scope.assignGroupId)
          : !!scope.teamId && ledTeamIds.has(scope.teamId);
      if (manages) targets.set(scope.id, 'all');
    }
    const live = new Set(liveAssignedScopes.map((s) => s.id));
    /*
     * Chỉ tính vai duyệt ở phạm vi người này CÒN thuộc về (luật 12/09/2026:
     * người duyệt bắt buộc là thành viên). Thiếu điều kiện này thì chip "chờ
     * tôi duyệt" đếm cả những bản mà `canReviewReport` đã đóng lại, và người
     * dùng bấm vào một con số không mở ra được gì.
     */
    const thuocVe = new Set(ownScopes.map((s) => s.id));
    for (const row of assignments) {
      if (!live.has(row.scopeId) || !thuocVe.has(row.scopeId)) continue;
      const current = targets.get(row.scopeId);
      if (current === 'all') continue;
      const members = current ?? new Set<string>();
      members.add(row.memberId);
      targets.set(row.scopeId, members);
    }
    return [...targets.entries()].map(([scopeId, members]) => ({
      scopeId,
      memberIds: members === 'all' ? 'all' : [...members],
    }));
  }

  private async toPublicScopes(
    scopes: DailyReportScope[],
    userId: string,
    canViewAllGroupData = false,
    reviewerScopeIds: ReadonlySet<string> = new Set<string>(),
    /** Vắng mặt = mọi scope truyền vào đều là scope người này thuộc về. */
    memberScopeIds?: ReadonlySet<string>,
  ): Promise<PublicDailyReportScope[]> {
    const isMemberOf = (scopeId: string) =>
      memberScopeIds ? memberScopeIds.has(scopeId) : true;
    if (scopes.length === 0) return [];

    const groupIds = scopes
      .map((s) => s.assignGroupId)
      .filter((id): id is string => !!id);
    const teamIds = scopes
      .map((s) => s.teamId)
      .filter((id): id is string => !!id);

    /**
     * Nhánh rỗng phải mang ĐÚNG kiểu của nhánh truy vấn. Viết
     * `Promise.resolve([])` trơn thì union nở thành `any[]`, `.map` trả `any[][]`
     * và `new Map(...)` mất suy luận tuple — TS2769.
     */
    type GroupRow = { id: string; name: string; ownerId: string };
    type TeamRow = { id: string; name: string };
    type LeaderRow = { teamId: string };

    const [groups, teams, leaderRows] = await Promise.all([
      groupIds.length
        ? this.prisma.taskAssignGroup.findMany({
            where: { id: { in: groupIds } },
            select: { id: true, name: true, ownerId: true },
          })
        : Promise.resolve<GroupRow[]>([]),
      teamIds.length
        ? this.prisma.team.findMany({
            where: { id: { in: teamIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve<TeamRow[]>([]),
      teamIds.length
        ? this.prisma.teamMember.findMany({
            where: {
              teamId: { in: teamIds },
              userId,
              leftAt: null,
              role: { in: [TeamMemberRole.leader, TeamMemberRole.chief] },
            },
            select: { teamId: true },
          })
        : Promise.resolve<LeaderRow[]>([]),
    ]);

    const groupById = new Map<string, GroupRow>(
      groups.map((g) => [g.id, g] as const),
    );
    const teamNameById = new Map<string, string>(
      teams.map((t) => [t.id, t.name] as const),
    );
    const leadTeamIds = new Set<string>(leaderRows.map((r) => r.teamId));

    return scopes.map((scope) => {
      if (scope.scopeType === DailyReportScopeType.assign_group) {
        const group = scope.assignGroupId
          ? groupById.get(scope.assignGroupId)
          : undefined;
        const isManager = group?.ownerId === userId;
        return this.toPublicScope(
          scope,
          group?.name ?? scope.targetNameSnapshot ?? 'Nhóm đã xóa',
          isManager,
          canViewAllGroupData || isManager,
          reviewerScopeIds.has(scope.id),
          isMemberOf(scope.id),
        );
      }
      const name = scope.teamId ? teamNameById.get(scope.teamId) : undefined;
      const isManager = !!scope.teamId && leadTeamIds.has(scope.teamId);
      return this.toPublicScope(
        scope,
        name ?? scope.targetNameSnapshot ?? 'Đội đã xóa',
        isManager,
        canViewAllGroupData || isManager,
        reviewerScopeIds.has(scope.id),
        isMemberOf(scope.id),
      );
    });
  }

  toPublicScope(
    scope: DailyReportScope,
    name: string,
    isManager: boolean,
    canViewGroupData = isManager,
    isReviewer = false,
    isMember = true,
  ): PublicDailyReportScope {
    return {
      id: scope.id,
      scopeType: scope.scopeType,
      assignGroupId: scope.assignGroupId,
      teamId: scope.teamId,
      templateId: scope.templateId,
      currentTemplateVersionId: scope.currentTemplateVersionId,
      isEnabled: scope.isEnabled,
      weekdays: scope.weekdays,
      timezone: scope.timezone,
      notifyLeaderOnMissing: scope.notifyLeaderOnMissing,
      targetIdSnapshot: scope.targetIdSnapshot,
      targetNameSnapshot: scope.targetNameSnapshot,
      archivedAt: scope.archivedAt,
      purgedAt: scope.purgedAt,
      createdAt: scope.createdAt,
      updatedAt: scope.updatedAt,
      name,
      isManager,
      canViewGroupData,
      isReviewer,
      isMember,
      reviewWindowDays: scope.reviewWindowDays,
      cutoffMinute: scope.cutoffMinute,
      reminderBeforeMinutes: scope.reminderBeforeMinutes,
      leaderSummaryMinute: scope.leaderSummaryMinute,
      generationLabel: DAILY_REPORT_GENERATE_LABEL,
      reminderLabel: dailyReportMinuteLabel(
        scope.cutoffMinute - scope.reminderBeforeMinutes,
      ),
      leaderSummaryLabel: dailyReportMinuteLabel(scope.leaderSummaryMinute),
      hardStopMinute: scope.cutoffMinute,
      hardStopLabel: dailyReportMinuteLabel(scope.cutoffMinute),
    };
  }

  /**
   * Người duyệt phụ được phân công phụ trách CHÍNH thành viên này.
   *
   * Dùng cho fan-out thông báo: gửi cho mọi người duyệt phụ của phạm vi là
   * phân công theo thành viên mất hết ý nghĩa ngay ở lớp thông báo, và người
   * duyệt phụ nhận tin về người họ không được xem.
   */
  async getReviewerIdsForMember(
    scope: DailyReportScope,
    memberId: string,
  ): Promise<string[]> {
    const [rows, memberIds] = await Promise.all([
      this.prisma.dailyReportReviewGroupReviewer.findMany({
        where: {
          group: { scopeId: scope.id, members: { some: { memberId } } },
        },
        select: { reviewerId: true },
        // Cùng một người duyệt ở hai nhóm cùng chứa thành viên này thì chỉ nhận
        // MỘT thông báo, không phải hai.
        distinct: ['reviewerId'],
      }),
      this.getMemberIds(scope),
    ]);
    // Người đã rời nhóm mất quyền duyệt, nên cũng không nhận tin nộp bài nữa:
    // một thông báo về việc mình không mở được là tin rác.
    const conThuoc = new Set(memberIds);
    return rows
      .map((row) => row.reviewerId)
      .filter((reviewerId) => conThuoc.has(reviewerId));
  }

  /**
   * (người duyệt → tập thành viên họ duyệt) của cả một phạm vi, trong MỘT lượt.
   *
   * Cron nhắc gom cần đúng bảng này để dựng một tin riêng cho từng người nhận.
   * Để ở đây chứ không cho cron tự truy vấn ba bảng nhóm duyệt: luật "ai duyệt
   * ai" chỉ nên có một chỗ định nghĩa, và cron là nơi dễ trôi lệch nhất vì nó
   * không đi qua đường kiểm quyền nào.
   */
  async getReviewerMemberMap(
    scope: DailyReportScope,
  ): Promise<Map<string, Set<string>>> {
    const [groups, memberIds] = await Promise.all([
      this.prisma.dailyReportReviewGroup.findMany({
        where: { scopeId: scope.id },
        select: {
          reviewers: { select: { reviewerId: true } },
          members: { select: { memberId: true } },
        },
      }),
      this.getMemberIds(scope),
    ]);
    const conThuoc = new Set(memberIds);
    const map = new Map<string, Set<string>>();
    for (const group of groups) {
      for (const { reviewerId } of group.reviewers) {
        // Bỏ người đã rời nhóm: họ không duyệt được nữa nên cũng không có gì
        // để nhắc (cùng luật với `getReviewerIdsForMember`).
        if (!conThuoc.has(reviewerId)) continue;
        const set = map.get(reviewerId) ?? new Set<string>();
        for (const { memberId } of group.members) set.add(memberId);
        map.set(reviewerId, set);
      }
    }
    return map;
  }

  // ── CRUD cấu hình ────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateReportScopeDto) {
    assertValidWeekdays(dto.weekdays);
    assertValidSchedule(dto);

    // scopeType phải khớp id gửi lên (docs 04 mục 3.1 — lỗi 422).
    const targetGroupId =
      dto.scopeType === DailyReportScopeType.assign_group
        ? dto.assignGroupId
        : undefined;
    const targetTeamId =
      dto.scopeType === DailyReportScopeType.team ? dto.teamId : undefined;
    if (
      (dto.scopeType === DailyReportScopeType.assign_group &&
        (!targetGroupId || dto.teamId)) ||
      (dto.scopeType === DailyReportScopeType.team &&
        (!targetTeamId || dto.assignGroupId))
    ) {
      throw new UnprocessableEntityException(
        'scopeType không khớp với nhóm/đội được gửi lên',
      );
    }

    // Quyền: chủ nhóm giao việc, hoặc leader/chief của đội.
    if (targetGroupId) {
      const group = await this.prisma.taskAssignGroup.findUnique({
        where: { id: targetGroupId },
        select: { ownerId: true },
      });
      if (!group) throw new NotFoundException('Không tìm thấy nhóm');
      if (group.ownerId !== userId) {
        throw new ForbiddenException('Chỉ chủ nhóm mới bật được báo cáo');
      }
    }
    if (targetTeamId) {
      const membership = await this.prisma.teamMember.findFirst({
        where: {
          teamId: targetTeamId,
          userId,
          leftAt: null,
          role: { in: [TeamMemberRole.leader, TeamMemberRole.chief] },
        },
        select: { id: true },
      });
      if (!membership) {
        throw new ForbiddenException(
          'Chỉ trưởng nhóm/phó nhóm mới bật được báo cáo cho đội',
        );
      }
    }

    let targetName: string;
    if (targetGroupId) {
      const group = await this.prisma.taskAssignGroup.findUnique({
        where: { id: targetGroupId },
        select: { name: true },
      });
      targetName = group?.name ?? 'Nhóm đã xóa';
    } else {
      const team = await this.prisma.team.findUnique({
        where: { id: targetTeamId! },
        select: { name: true },
      });
      targetName = team?.name ?? 'Đội đã xóa';
    }

    const template = await this.resolveTemplate(userId, dto.templateId);
    const cutoffMinute = dto.cutoffMinute ?? DAILY_REPORT_HARD_STOP_MINUTE;
    const reminderBeforeMinutes =
      dto.reminderBeforeMinutes ??
      DAILY_REPORT_HARD_STOP_MINUTE - DAILY_REPORT_REMINDER_MINUTE;
    const leaderSummaryMinute =
      dto.leaderSummaryMinute ?? DAILY_REPORT_LEADER_SUMMARY_MINUTE;

    // Archive là bất biến; cùng target có thể tạo scope active mới.
    const existing = await this.prisma.dailyReportScope.findFirst({
      where: {
        archivedAt: null,
        ...(targetGroupId
          ? { assignGroupId: targetGroupId }
          : { teamId: targetTeamId }),
      },
    });
    if (existing) {
      throw new ConflictException('Nhóm này đã bật báo cáo hằng ngày');
    }

    const data = {
      scopeType: dto.scopeType,
      assignGroupId: targetGroupId ?? null,
      teamId: targetTeamId ?? null,
      templateId: template.templateId,
      currentTemplateVersionId: template.templateVersionId,
      isEnabled: true,
      cutoffMinute,
      remindMinutes: [reminderBeforeMinutes],
      reminderBeforeMinutes,
      leaderSummaryMinute,
      weekdays: dto.weekdays ?? [1, 2, 3, 4, 5, 6],
      notifyLeaderOnMissing: dto.notifyLeaderOnMissing ?? true,
      createdById: userId,
      targetIdSnapshot: targetGroupId ?? targetTeamId!,
      targetNameSnapshot: targetName,
      deletedAt: null,
      archivedAt: null,
    };
    return this.prisma.dailyReportScope.create({ data });
  }

  async update(userId: string, scopeId: string, dto: UpdateReportScopeDto) {
    assertValidWeekdays(dto.weekdays);
    const scope = await this.getScopeOrThrow(scopeId);
    if (!(await this.isManager(scope, userId))) {
      throw new ForbiddenException('Bạn không có quyền sửa cấu hình này');
    }
    assertValidSchedule({
      cutoffMinute: dto.cutoffMinute ?? scope.cutoffMinute,
      reminderBeforeMinutes:
        dto.reminderBeforeMinutes ?? scope.reminderBeforeMinutes,
      leaderSummaryMinute: dto.leaderSummaryMinute ?? scope.leaderSummaryMinute,
    });
    const template = dto.templateId
      ? await this.resolveTemplate(userId, dto.templateId)
      : undefined;
    return this.prisma.dailyReportScope.update({
      where: { id: scopeId },
      data: {
        isEnabled: dto.isEnabled,
        templateId: template?.templateId,
        currentTemplateVersionId: template?.templateVersionId,
        weekdays: dto.weekdays,
        notifyLeaderOnMissing: dto.notifyLeaderOnMissing,
        cutoffMinute: dto.cutoffMinute,
        remindMinutes:
          dto.reminderBeforeMinutes === undefined
            ? undefined
            : [dto.reminderBeforeMinutes],
        reminderBeforeMinutes: dto.reminderBeforeMinutes,
        leaderSummaryMinute: dto.leaderSummaryMinute,
        // Chỉ áp cho lần nộp sau: hạn của các lần nộp cũ đã chốt cứng vào
        // DailyReportRevision.reviewDeadlineAt.
        reviewWindowDays: dto.reviewWindowDays,
      },
    });
  }

  /** Archive scope; lịch sử read-only trong 12 tháng rồi purge bằng worker. */
  async remove(userId: string, scopeId: string) {
    const scope = await this.getScopeOrThrow(scopeId);
    if (!(await this.isManager(scope, userId))) {
      throw new ForbiddenException(
        'Bạn không có quyền tắt báo cáo của nhóm này',
      );
    }
    const [leaderIds, scopeName] = await Promise.all([
      this.getLeaderIds(scope),
      this.getScopeName(scope),
    ]);
    const archivedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      if (leaderIds.length > 0) {
        await tx.dailyReportScopeArchiveViewer.createMany({
          data: leaderIds.map((leaderId) => ({
            scopeId,
            userId: leaderId,
            role: 'manager',
          })),
          skipDuplicates: true,
        });
      }
      await tx.dailyReport.updateMany({
        where: { scopeId },
        data: { status: DailyReportStatus.ARCHIVED },
      });
      await tx.dailyReportScope.update({
        where: { id: scopeId },
        data: {
          deletedAt: archivedAt,
          archivedAt,
          archivedById: userId,
          targetNameSnapshot: scopeName,
          targetIdSnapshot:
            scope.targetIdSnapshot ?? scope.assignGroupId ?? scope.teamId,
          isEnabled: false,
        },
      });
    });
    return { success: true, archivedAt };
  }

  /** Template visible với user và version mới nhất đã publish. */
  private async resolveTemplate(
    userId: string,
    templateId?: string,
  ): Promise<{ templateId: string; templateVersionId: string }> {
    if (templateId) {
      const template = await this.prisma.dailyReportTemplate.findFirst({
        where: {
          id: templateId,
          deletedAt: null,
          OR: [{ isSystemDefault: true }, { ownerId: userId }],
        },
        select: {
          id: true,
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
            select: { id: true },
          },
        },
      });
      if (!template) throw new NotFoundException('Không tìm thấy bộ câu hỏi');
      const version = template.versions[0];
      if (!version) throw new NotFoundException('Bộ câu hỏi chưa có phiên bản');
      return { templateId: template.id, templateVersionId: version.id };
    }
    const systemDefault = await this.prisma.dailyReportTemplate.findFirst({
      where: { isSystemDefault: true, deletedAt: null },
      select: {
        id: true,
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          select: { id: true },
        },
      },
    });
    if (!systemDefault) {
      throw new NotFoundException(
        'Chưa có bộ câu hỏi mặc định — kiểm tra dữ liệu seed migration',
      );
    }
    const version = systemDefault.versions[0];
    if (!version)
      throw new NotFoundException('Bộ câu hỏi mặc định chưa có phiên bản');
    return { templateId: systemDefault.id, templateVersionId: version.id };
  }
}
