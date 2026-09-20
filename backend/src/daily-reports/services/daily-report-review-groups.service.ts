import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  DailyReportOutboxKind,
  DailyReportScope,
  DailyReportStatus,
  NotificationAction,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from 'src/common/services/prisma.service';
import { dayStrInTz } from '../helpers/report-date.helper';
import { SaveDailyReportReviewGroupDto } from '../dto/daily-report.dto';
import {
  DailyReportScopeService,
  ScopeMemberInfo,
} from './daily-report-scope.service';

/** Thông báo phân công in tối đa ngần này tên, phần còn lại gộp thành "N người khác". */
const MAX_NAMES_IN_ASSIGNMENT_NOTICE = 5;

/**
 * Trần số nhóm duyệt của một phạm vi.
 *
 * Không phải luật nghiệp vụ, là chốt chặn: trang nhóm duyệt vẽ mọi nhóm trong
 * một lưới thẻ và tải cả danh sách thành viên của từng nhóm, nên vài trăm nhóm
 * là một màn không dùng được chứ không phải một màn chậm.
 */
const MAX_REVIEW_GROUPS_PER_SCOPE = 30;

/** Tên nhóm duyệt dài nhất, khớp `@db.VarChar(60)` của schema. */
export const MAX_REVIEW_GROUP_NAME_LENGTH = 60;

/** Một người trong thẻ nhóm duyệt. */
export interface ReviewGroupPerson extends ScopeMemberInfo {
  /**
   * Người này còn tên trong nhóm/đội của phạm vi?
   *
   * Từ 12/09/2026, `false` mang đúng MỘT nghĩa cho cả hai vai: người này đã rời
   * nhóm giao việc, nên dòng đó là dòng chết — người duyệt đã mất quyền
   * (`hasReviewerAssignment` kiểm thành viên), thành viên thì không còn nộp bản
   * nào ở đây. Giao diện phải nói ra chứ không im lặng vẽ một cái tên vô nghĩa,
   * và lần lưu nhóm kế tiếp sẽ buộc trưởng nhóm dọn nó.
   */
  isScopeMember: boolean;
}

/** Một nhóm duyệt: tên + những người duyệt + những thành viên được phụ trách. */
export interface ReviewGroupView {
  id: string;
  name: string;
  reviewers: ReviewGroupPerson[];
  members: ReviewGroupPerson[];
  createdAt: Date;
  /** Mốc chống ghi đè: client gửi lại đúng giá trị này khi lưu (xem `update`). */
  updatedAt: Date;
}

/** `GET /daily-report-scopes/:id/review-groups` — cả trang trong một lượt gọi. */
export interface ReviewGroupsResponse {
  groups: ReviewGroupView[];
  /**
   * Thành viên hiện tại của phạm vi — nguồn duy nhất cho ô chọn của form. Trả
   * kèm ở đây thay vì để client gọi thêm `GET /daily-report-scopes/:id`: hai
   * lượt gọi cho một màn thì danh sách thành viên và các nhóm có thể lệch nhau
   * đúng vào lúc có người vừa vào hoặc vừa rời nhóm.
   */
  scopeMembers: ScopeMemberInfo[];
  /** Chưa thuộc nhóm duyệt nào: chỉ quản lý phạm vi duyệt bản của họ. */
  unassignedMembers: ScopeMemberInfo[];
  /**
   * Quản lý phạm vi. Họ duyệt được TOÀN BỘ thành viên theo định nghĩa, nên form
   * không mời họ làm người duyệt của một nhóm con — thêm vào chỉ là một dòng dữ
   * liệu không cấp thêm quyền nào.
   */
  managerIds: string[];
}

/** Một nhóm duyệt ở dạng thô: chỉ id, dùng để suy quan hệ và so trước/sau. */
interface RawGroup {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  reviewerIds: string[];
  memberIds: string[];
}

const GROUP_SELECT = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  reviewers: { select: { reviewerId: true } },
  members: { select: { memberId: true } },
} as const;

const collator = new Intl.Collator('vi');

/**
 * Nhóm duyệt CÓ TÊN của một phạm vi báo cáo (thiết kế 20 mục 19).
 *
 * Vì sao là service riêng chứ không nằm trong `DailyReportScopeService`: file
 * đó đang gánh phân giải thành viên, phân quyền và CRUD cấu hình. Ở đây là một
 * mặt nghiệp vụ khác — quản lý cách chia nhóm — và nó chỉ VIẾT, trong khi phần
 * ĐỌC phục vụ phân quyền (`hasReviewerAssignment`, `resolveVisibleMemberIds`,
 * `getReviewerIdsForMember`) phải ở cạnh các hàm quyền khác vì mọi đường đọc
 * báo cáo đều gọi tới.
 *
 * Cả bốn lệnh đều gác `isManager`: người duyệt phụ KHÔNG tự thêm nhóm, không
 * tự nhận thêm thành viên, và không đọc được cách chia của nhóm khác.
 */
@Injectable()
export class DailyReportReviewGroupsService {
  private readonly logger = new Logger(DailyReportReviewGroupsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: DailyReportScopeService,
  ) {}

  // ── Đọc ──────────────────────────────────────────────────────────────────

  /** `GET /daily-report-scopes/:id/review-groups` */
  async list(
    scope: DailyReportScope,
    actorId: string,
  ): Promise<ReviewGroupsResponse> {
    await this.assertManager(scope, actorId, 'xem bộ phận');

    const [groups, scopeMembers, managerIds] = await Promise.all([
      this.loadGroups(this.prisma, scope.id),
      this.scopeService.getMemberInfos(scope),
      this.scopeService.getLeaderIds(scope),
    ]);

    const infoById = new Map(scopeMembers.map((m) => [m.id, m] as const));
    /*
     * Dòng cũ trỏ tới người đã rời nhóm KHÔNG có trong `scopeMembers`, nên phải
     * nạp riêng. Thiếu bước này thì thẻ nhóm in một dòng trống ở chỗ tên họ —
     * đúng cái mà bản phân công cũ đã làm với `fullName: ''`.
     */
    const outsiderIds = [
      ...new Set(groups.flatMap((g) => [...g.reviewerIds, ...g.memberIds])),
    ].filter((id) => !infoById.has(id));
    for (const info of await this.scopeService.getMemberInfosByIds(
      outsiderIds,
    )) {
      infoById.set(info.id, info);
    }

    const person = (id: string): ReviewGroupPerson => ({
      ...(infoById.get(id) ?? {
        id,
        fullName: '',
        avatarUrl: null,
        isActive: false,
      }),
      // Tài khoản đã xoá không còn dòng nào trong `users`; giữ id để giao diện
      // vẫn gỡ được, và `isScopeMember: false` để nó hiện dưới nhãn đã rời.
      isScopeMember: scopeMembers.some((m) => m.id === id),
    });
    const byName = (a: ReviewGroupPerson, b: ReviewGroupPerson) =>
      collator.compare(a.fullName, b.fullName);

    const assigned = new Set(groups.flatMap((g) => g.memberIds));
    return {
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        reviewers: g.reviewerIds.map(person).sort(byName),
        members: g.memberIds.map(person).sort(byName),
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      })),
      scopeMembers,
      unassignedMembers: scopeMembers.filter((m) => !assigned.has(m.id)),
      managerIds,
    };
  }

  // ── Ghi ──────────────────────────────────────────────────────────────────

  /** `POST /daily-report-scopes/:id/review-groups` */
  async create(
    scope: DailyReportScope,
    actorId: string,
    dto: SaveDailyReportReviewGroupDto,
  ): Promise<ReviewGroupsResponse> {
    return this.save(scope, actorId, null, dto);
  }

  /**
   * `PUT /daily-report-scopes/:id/review-groups/:groupId`
   *
   * Thay TOÀN BỘ tên, người duyệt và thành viên trong một transaction. Không
   * cộng dồn: người dùng bỏ tích một thành viên rồi lưu thì nhóm phải khớp đúng
   * cái họ đang thấy trên màn.
   *
   * `expectedUpdatedAt` là chốt chặn ghi đè: một đội có nhiều trưởng nhóm, và
   * người mở form trước không được âm thầm xoá thay đổi của người lưu sau.
   */
  async update(
    scope: DailyReportScope,
    actorId: string,
    groupId: string,
    dto: SaveDailyReportReviewGroupDto,
  ): Promise<ReviewGroupsResponse> {
    return this.save(scope, actorId, groupId, dto);
  }

  /** `DELETE /daily-report-scopes/:id/review-groups/:groupId` */
  async remove(
    scope: DailyReportScope,
    actorId: string,
    groupId: string,
  ): Promise<ReviewGroupsResponse> {
    await this.assertManager(scope, actorId, 'xoá bộ phận');
    /*
     * `deleteMany` kèm `scopeId` chứ không `delete({ where: { id } })`: id nhóm
     * đi qua URL, và một id thuộc phạm vi KHÁC không được xoá được từ đây chỉ
     * vì người gọi là quản lý của phạm vi này.
     */
    const { count } = await this.prisma.dailyReportReviewGroup.deleteMany({
      where: { id: groupId, scopeId: scope.id },
    });
    if (count === 0) {
      throw new NotFoundException('Không tìm thấy bộ phận này');
    }
    // Không gửi thông báo cho người duyệt bị gỡ: bản phân công cũ cũng không,
    // và mất quyền là chuyện trưởng nhóm nói với nhau, không phải tin hệ thống.
    return this.list(scope, actorId);
  }

  /**
   * Thân chung của tạo và sửa.
   *
   * Một hàm vì hai lệnh chỉ khác nhau ở chỗ có `groupId` hay không; tách đôi là
   * nhân bản cả luật kiểm, khoá và phần so trước/sau để dựng thông báo.
   */
  private async save(
    scope: DailyReportScope,
    actorId: string,
    groupId: string | null,
    dto: SaveDailyReportReviewGroupDto,
  ): Promise<ReviewGroupsResponse> {
    await this.assertManager(scope, actorId, 'chia bộ phận');

    const name = this.normalizeName(dto.name);
    const reviewerIds = [...new Set(dto.reviewerIds)];
    const memberIds = [...new Set(dto.memberIds)];

    /*
     * Luật kiểm chạy TRƯỚC transaction. Nó chỉ đọc (user, thành viên phạm vi)
     * và có thể gọi ra ngoài nhiều lượt, nên giữ trong khoá advisory là kéo dài
     * đúng cái mà khoá đó đang chặn.
     */
    const known = groupId
      ? await this.prisma.dailyReportReviewGroup.findFirst({
          where: { id: groupId, scopeId: scope.id },
          select: { reviewers: { select: { reviewerId: true } } },
        })
      : null;
    if (groupId && !known) {
      throw new NotFoundException('Không tìm thấy bộ phận này');
    }
    const keptReviewerIds = new Set(
      (known?.reviewers ?? []).map((r) => r.reviewerId),
    );
    await this.assertAssignable(scope, {
      reviewerIds,
      memberIds,
      // Người duyệt ĐÃ có trong nhóm không bị kiểm lại: họ có thể đã nghỉ việc
      // hoặc rời doanh nghiệp, và khi đó trưởng nhóm phải đổi được TÊN nhóm hay
      // danh sách thành viên mà không bị chặn bởi một dòng họ chưa định sửa.
      newReviewerIds: reviewerIds.filter((id) => !keptReviewerIds.has(id)),
    });

    const written = await this.prisma.$transaction(async (tx) => {
      /*
       * Khoá advisory theo PHẠM VI, không theo nhóm: cả tên trùng, trần số nhóm
       * lẫn phép so trước/sau đều nhìn mọi nhóm của phạm vi, nên hai trưởng
       * nhóm lưu cùng lúc mà không có khoá thì cả hai đều đọc thấy "tên chưa ai
       * dùng" và cả hai đều ghi. Khoá cấp transaction tự nhả khi commit hoặc
       * rollback, nên một 409 ném ra ở giữa không làm rò khoá.
       */
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${
        'daily-report-review-group:' + scope.id
      }))`;

      const before = await this.loadGroups(tx, scope.id);
      const target = groupId ? before.find((g) => g.id === groupId) : undefined;
      if (groupId && !target) {
        throw new NotFoundException('Không tìm thấy bộ phận này');
      }
      /*
       * Sửa thì BẮT BUỘC gửi mốc của bản đang xem. Để tuỳ chọn là mọi client
       * quên gửi đều âm thầm ghi đè, mà đường ghi đè đó chỉ lộ ra khi đã mất
       * thay đổi của người khác. Client nào cũng có mốc này: nó nằm trong chính
       * danh sách nhóm mà form được mở ra từ đó.
       */
      if (target && !dto.expectedUpdatedAt) {
        throw new UnprocessableEntityException(
          'Thiếu mốc cập nhật của bộ phận đang sửa (expectedUpdatedAt)',
        );
      }
      if (target && target.updatedAt.toISOString() !== dto.expectedUpdatedAt) {
        throw new ConflictException(
          'Bộ phận này vừa được sửa ở nơi khác. Tải lại để xem bản mới rồi sửa tiếp.',
        );
      }
      const trung = before.find(
        (g) =>
          g.id !== groupId &&
          g.name.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'),
      );
      if (trung) {
        throw new ConflictException(
          `Bộ phận "${trung.name}" đã có trong nhóm này. Đặt một tên khác để khỏi lẫn.`,
        );
      }
      if (!groupId && before.length >= MAX_REVIEW_GROUPS_PER_SCOPE) {
        throw new UnprocessableEntityException(
          `Một nhóm chỉ chia được tối đa ${MAX_REVIEW_GROUPS_PER_SCOPE} bộ phận`,
        );
      }

      const saved = groupId
        ? await tx.dailyReportReviewGroup.update({
            where: { id: groupId },
            data: {
              name,
              updatedById: actorId,
              reviewers: { deleteMany: {} },
              members: { deleteMany: {} },
            },
            select: { id: true, name: true },
          })
        : await tx.dailyReportReviewGroup.create({
            data: {
              scopeId: scope.id,
              name,
              createdById: actorId,
              updatedById: actorId,
            },
            select: { id: true, name: true },
          });
      await tx.dailyReportReviewGroupReviewer.createMany({
        data: reviewerIds.map((reviewerId) => ({
          groupId: saved.id,
          reviewerId,
          addedById: actorId,
        })),
      });
      await tx.dailyReportReviewGroupMember.createMany({
        data: memberIds.map((memberId) => ({
          groupId: saved.id,
          memberId,
          addedById: actorId,
        })),
      });

      const after = before
        .filter((g) => g.id !== saved.id)
        .concat({
          id: saved.id,
          name,
          createdAt: target?.createdAt ?? new Date(),
          updatedAt: new Date(),
          reviewerIds,
          memberIds,
        });
      return { group: saved, added: this.newlyVisible(before, after) };
    });

    await this.notifyAssigned(
      scope,
      actorId,
      written.group.name,
      written.added,
    );
    return this.list(scope, actorId);
  }

  // ── Luật ─────────────────────────────────────────────────────────────────

  private async assertManager(
    scope: DailyReportScope,
    actorId: string,
    action: string,
  ): Promise<void> {
    if (!(await this.scopeService.isManager(scope, actorId))) {
      throw new ForbiddenException(`Chỉ trưởng nhóm được ${action}`);
    }
  }

  /**
   * Chuẩn hoá tên nhóm trước khi so trùng và lưu.
   *
   * `NFC` là bắt buộc chứ không phải cho đẹp: bàn phím macOS gõ tiếng Việt ra
   * dạng tách dấu (NFD), nên "Miền Nam" gõ ở hai máy khác nhau cho hai chuỗi
   * byte khác nhau mà mắt đọc y hệt — phép so trùng sẽ nói "chưa ai dùng" và
   * phạm vi có hai nhóm cùng tên.
   */
  private normalizeName(raw: string): string {
    const name = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
    if (name.length === 0) {
      throw new UnprocessableEntityException('Bộ phận phải có tên');
    }
    if (name.length > MAX_REVIEW_GROUP_NAME_LENGTH) {
      throw new UnprocessableEntityException(
        `Tên bộ phận tối đa ${MAX_REVIEW_GROUP_NAME_LENGTH} ký tự`,
      );
    }
    return name;
  }

  /**
   * Kiểm mọi luật của một lần chia nhóm.
   *
   * Luật gốc: CẢ người duyệt và người được duyệt đều phải là thành viên của
   * chính phạm vi đang cấu hình.
   *
   * Bản trước gác bằng `businessId` (cùng doanh nghiệp thật, và người không
   * thuộc doanh nghiệp nào chỉ chọn được người trong nhóm) để mở đường cho
   * "người giám sát đứng ngoài nhóm". Bỏ ngày 12/09/2026: `businessId` là dữ
   * liệu tồn từ thời mọi tài khoản được nối vào một doanh nghiệp và đang chuẩn
   * bị bị xoá, nên gác phân quyền bằng nó là gác bằng một cột sắp biến mất. Đo
   * trên dữ liệu thật cùng ngày: 3.410 tài khoản không thuộc doanh nghiệp nào,
   * 18 doanh nghiệp mỗi cái đúng một tài khoản - tức luật cũ vừa chặn sai vừa
   * không mở được cho ai.
   *
   * Không còn ô tìm người ngoài nhóm: danh sách chọn người duyệt CHÍNH LÀ danh
   * sách thành viên của phạm vi (`scopeMembers` của `list`), nên người ngoài
   * không có đường nào hiện ra để mà chọn.
   */
  private async assertAssignable(
    scope: DailyReportScope,
    ids: {
      reviewerIds: string[];
      memberIds: string[];
      newReviewerIds: string[];
    },
  ): Promise<void> {
    if (ids.reviewerIds.length === 0) {
      throw new UnprocessableEntityException(
        'Bộ phận phải có ít nhất một người duyệt',
      );
    }
    if (ids.memberIds.length === 0) {
      throw new UnprocessableEntityException(
        'Bộ phận phải có ít nhất một thành viên',
      );
    }
    const vuaDuyetVuaBiDuyet = ids.reviewerIds.filter((id) =>
      ids.memberIds.includes(id),
    );
    if (vuaDuyetVuaBiDuyet.length > 0) {
      throw new UnprocessableEntityException(
        'Không thể để một người tự duyệt báo cáo của chính mình',
      );
    }

    const [reviewers, scopeMemberIds] = await Promise.all([
      ids.newReviewerIds.length > 0
        ? this.prisma.user.findMany({
            where: { id: { in: ids.newReviewerIds } },
            select: {
              id: true,
              fullName: true,
              status: true,
              deletedAt: true,
            },
          })
        : Promise.resolve<
            Array<{
              id: string;
              fullName: string;
              status: UserStatus;
              deletedAt: Date | null;
            }>
          >([]),
      this.scopeService.getMemberIds(scope),
    ]);

    const memberSet = new Set(scopeMemberIds);
    // Người ĐƯỢC phụ trách bắt buộc thuộc phạm vi, nếu không dòng đó là dòng
    // chết: họ không có bản nào nộp ở đây để mà duyệt.
    if (ids.memberIds.some((id) => !memberSet.has(id))) {
      throw new UnprocessableEntityException(
        'Có thành viên không thuộc phạm vi báo cáo này',
      );
    }
    /*
     * NGƯỜI DUYỆT cũng vậy - và luật này kiểm cả người duyệt CŨ, không riêng
     * người mới thêm: một người đã rời nhóm giao việc thì `hasReviewerAssignment`
     * đã đóng quyền của họ, giữ tên họ trong nhóm duyệt chỉ là một dòng chết
     * mà giao diện phải giải thích. Lưu lại là lúc dọn.
     */
    const roiNhom = ids.reviewerIds.filter((id) => !memberSet.has(id));
    if (roiNhom.length > 0) {
      throw new UnprocessableEntityException(
        'Người duyệt phải là thành viên của nhóm này. Hãy bỏ người đã rời nhóm ra khỏi danh sách người duyệt.',
      );
    }

    const reviewerById = new Map(reviewers.map((r) => [r.id, r] as const));
    for (const reviewerId of ids.newReviewerIds) {
      const reviewer = reviewerById.get(reviewerId);
      if (!reviewer || reviewer.deletedAt) {
        throw new NotFoundException('Không tìm thấy người duyệt được chọn');
      }
      if (reviewer.status !== UserStatus.active) {
        throw new UnprocessableEntityException(
          `${reviewer.fullName || 'Người duyệt được chọn'} không còn hoạt động`,
        );
      }
    }
  }

  // ── Suy quan hệ và thông báo ─────────────────────────────────────────────

  /** Mọi nhóm duyệt của phạm vi, ở dạng thô. Dùng cho cả đọc và so trước/sau. */
  private async loadGroups(
    client: PrismaService | Prisma.TransactionClient,
    scopeId: string,
  ): Promise<RawGroup[]> {
    const rows = await client.dailyReportReviewGroup.findMany({
      where: { scopeId },
      select: GROUP_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      reviewerIds: row.reviewers.map((r) => r.reviewerId),
      memberIds: row.members.map((m) => m.memberId),
    }));
  }

  /** (người duyệt → tập thành viên họ duyệt) suy từ các nhóm của phạm vi. */
  private membersByReviewer(groups: RawGroup[]): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>();
    for (const group of groups) {
      for (const reviewerId of group.reviewerIds) {
        const set = map.get(reviewerId) ?? new Set<string>();
        for (const memberId of group.memberIds) set.add(memberId);
        map.set(reviewerId, set);
      }
    }
    return map;
  }

  /**
   * Ai VỪA được giao thêm ai, tính trên toàn phạm vi chứ không riêng nhóm vừa
   * lưu: một người duyệt có thể đã phụ trách sẵn người đó ở nhóm khác, và khi
   * đó thêm vào nhóm này không mở thêm quyền nào nên không có gì để báo.
   */
  private newlyVisible(
    before: RawGroup[],
    after: RawGroup[],
  ): Array<{ reviewerId: string; memberIds: string[] }> {
    const truoc = this.membersByReviewer(before);
    const sau = this.membersByReviewer(after);
    const added: Array<{ reviewerId: string; memberIds: string[] }> = [];
    for (const [reviewerId, members] of sau) {
      const cu = truoc.get(reviewerId) ?? new Set<string>();
      const moi = [...members].filter((id) => !cu.has(id));
      if (moi.length > 0) added.push({ reviewerId, memberIds: moi });
    }
    return added;
  }

  /**
   * Báo người duyệt rằng họ vừa được giao thêm người, KÈM số bản đang chờ.
   *
   * Con số đó là lý do thông báo này tồn tại: `REPORT_SUBMITTED` được fan-out
   * tại thời điểm NỘP, nên người vừa được giao không hề biết những bản đã nộp
   * trước đó — mà quyền duyệt thì có hiệu lực ngay lúc lưu nhóm. Không có câu
   * này thì "chia nhóm giữa ngày" đúng về quyền nhưng im lặng về việc.
   *
   * Khoá chống trùng gồm phạm vi + người nhận + ngày + tập người VỪA THÊM: bấm
   * Lưu lại cùng một danh sách trong ngày không gửi lần hai. Không cần tên nhóm
   * trong khoá, vì phép so trước/sau đã tính trên toàn phạm vi: giao lại một
   * người mà người duyệt vốn đã phụ trách ở nhóm khác thì không có ai "mới",
   * nên không có tin nào được dựng ngay từ đầu.
   *
   * Chạy SAU khi đã ghi, và nuốt lỗi có ghi log: một thông báo hỏng không được
   * làm hỏng lần chia nhóm đã thành.
   */
  private async notifyAssigned(
    scope: DailyReportScope,
    actorId: string,
    groupName: string,
    added: Array<{ reviewerId: string; memberIds: string[] }>,
  ): Promise<void> {
    const nhanTin = added.filter((row) => row.reviewerId !== actorId);
    if (nhanTin.length === 0) return;
    try {
      const [actor, scopeName] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: actorId },
          select: { fullName: true },
        }),
        this.scopeService.getScopeName(scope),
      ]);
      const today = dayStrInTz(new Date(), scope.timezone);
      const rows: Prisma.DailyReportNotificationOutboxCreateManyInput[] = [];

      for (const row of nhanTin) {
        const [members, choDuyet] = await Promise.all([
          this.prisma.user.findMany({
            where: { id: { in: row.memberIds } },
            select: { fullName: true },
            orderBy: { fullName: 'asc' },
          }),
          /*
           * "Đang chờ duyệt" đúng bằng định nghĩa của cron nhắc gom: đã nộp,
           * chưa ai quyết, và cửa sổ duyệt chưa bị đánh dấu hết hạn. Không lọc
           * theo ngày: cửa sổ duyệt dài `reviewWindowDays` ngày làm việc nên
           * bản của hôm qua vẫn đang chờ.
           */
          this.prisma.dailyReport.count({
            where: {
              scopeId: scope.id,
              userId: { in: row.memberIds },
              deletedAt: null,
              status: DailyReportStatus.SUBMITTED,
              reviewDecision: null,
              reviewExpiredAt: null,
            },
          }),
        ]);
        const names = members.map((member) => member.fullName);
        const shown =
          names.length > MAX_NAMES_IN_ASSIGNMENT_NOTICE
            ? `${names.slice(0, MAX_NAMES_IN_ASSIGNMENT_NOTICE).join(', ')} và ${
                names.length - MAX_NAMES_IN_ASSIGNMENT_NOTICE
              } người khác`
            : names.join(', ');
        const setKey = createHash('sha1')
          .update([...row.memberIds].sort().join(','))
          .digest('hex')
          .slice(0, 16);
        rows.push({
          idempotencyKey: `daily-report:reviewer-assigned:${scope.id}:${row.reviewerId}:${today}:${setKey}`,
          kind: DailyReportOutboxKind.REVIEWER_ASSIGNED,
          recipientId: row.reviewerId,
          actorId,
          scopeId: scope.id,
          payload: {
            action: NotificationAction.daily_report_reviewer_assigned,
            message:
              `${actor?.fullName ?? 'Trưởng nhóm'} giao bạn duyệt báo cáo ngày của ${shown}` +
              ` thuộc bộ phận "${groupName}" (${scopeName}).` +
              (choDuyet > 0
                ? ` Đang có ${choDuyet} bản chờ duyệt, bạn mở được ngay.`
                : ''),
          },
        });
      }

      await this.prisma.dailyReportNotificationOutbox.createMany({
        data: rows,
        skipDuplicates: true,
      });
    } catch (error) {
      this.logger.warn(
        `Không xếp được thông báo chia nhóm duyệt ở phạm vi ${scope.id}: ${String(error)}`,
      );
    }
  }
}
