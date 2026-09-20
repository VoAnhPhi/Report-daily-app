import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { NotificationAction } from '@prisma/client';
import { PrismaService } from 'src/common/services/prisma.service';
import { NotificationHelperService } from 'src/notifications/notification-helper.service';
import {
  CreateTaskAssignGroupDto,
  UpdateTaskAssignGroupDto,
  GroupWithMembers,
} from '../dto/task-assign-group.dto';

const MEMBER_USER_SELECT = {
  id: true,
  fullName: true,
  referenceId: true,
  avatar: { select: { fileUrl: true } },
} as const;

const GROUP_INCLUDE = {
  owner: { select: MEMBER_USER_SELECT },
  members: {
    include: { user: { select: MEMBER_USER_SELECT } },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

@Injectable()
export class TaskAssignGroupService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notificationHelper?: NotificationHelperService,
  ) {}

  private serialize(group: GroupWithMembers) {
    const isOwner = group.ownerId === group.viewerId;
    const isMember =
      isOwner || group.members.some((m) => m.user.id === group.viewerId);
    const memberUsers = [
      ...(group.owner ? [group.owner] : []),
      ...group.members.map((m) => m.user),
    ].filter(
      (user, index, users) =>
        users.findIndex((candidate) => candidate.id === user.id) === index,
    );
    return {
      id: group.id,
      name: group.name,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      isOwner,
      isMember,
      viewerRole: isOwner ? 'owner' : 'member',
      members: memberUsers.map((user) => ({
        id: user.id,
        fullName: user.fullName,
        referenceId: user.referenceId,
        avatarUrl: user.avatar?.fileUrl ?? null,
        isOwner: user.id === group.ownerId,
      })),
    };
  }

  /** Keep only ids that map to a real user, de-duplicated, preserving order. */
  private async resolveMemberIds(memberIds?: string[]): Promise<string[]> {
    if (!memberIds || memberIds.length === 0) return [];
    const unique = Array.from(new Set(memberIds));
    const found = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true },
    });
    const valid = new Set(found.map((u) => u.id));
    return unique.filter((id) => valid.has(id));
  }

  async list(ownerId: string) {
    const groups = await this.prisma.taskAssignGroup.findMany({
      where: {
        OR: [{ ownerId }, { members: { some: { userId: ownerId } } }],
      },
      include: GROUP_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return groups.map((g) =>
      this.serialize({ ...(g as GroupWithMembers), viewerId: ownerId }),
    );
  }

  /**
   * Danh sách đầy đủ cho màn Admin xuất báo cáo công việc.
   *
   * Admin cần chọn được bất kỳ nhóm nào để lấy danh sách người thực hiện,
   * nhưng không vì thế mà được suy ra là chủ nhóm trong dữ liệu vai trò. Các
   * endpoint admin vẫn được phép quản trị mọi nhóm.
   */
  async listAll(viewerId: string) {
    const groups = await this.prisma.taskAssignGroup.findMany({
      include: GROUP_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return groups.map((g) =>
      this.serialize({ ...(g as GroupWithMembers), viewerId }),
    );
  }

  async create(ownerId: string, dto: CreateTaskAssignGroupDto) {
    const memberIds = await this.resolveMemberIds(dto.memberIds);
    const group = await this.prisma.taskAssignGroup.create({
      data: {
        name: dto.name,
        ownerId,
        members: { create: memberIds.map((userId) => ({ userId })) },
      },
      include: GROUP_INCLUDE,
    });
    return this.serialize({
      ...(group as GroupWithMembers),
      viewerId: ownerId,
    });
  }

  async update(
    ownerId: string,
    groupId: string,
    dto: UpdateTaskAssignGroupDto,
  ) {
    const existing = await this.prisma.taskAssignGroup.findFirst({
      where: { id: groupId, ownerId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy nhóm');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.memberIds !== undefined) {
        const memberIds = await this.resolveMemberIds(dto.memberIds);
        await tx.taskAssignGroupMember.deleteMany({ where: { groupId } });
        if (memberIds.length > 0) {
          await tx.taskAssignGroupMember.createMany({
            data: memberIds.map((userId) => ({ groupId, userId })),
          });
        }
      }
      return tx.taskAssignGroup.update({
        where: { id: groupId },
        data: { name: dto.name },
        include: GROUP_INCLUDE,
      });
    });

    return this.serialize({
      ...(updated as GroupWithMembers),
      viewerId: ownerId,
    });
  }

  /** Admin quản trị nhóm bất kể ownerId; màn người dùng vẫn dùng update(). */
  async updateAsAdmin(
    viewerId: string,
    groupId: string,
    dto: UpdateTaskAssignGroupDto,
  ) {
    const existing = await this.prisma.taskAssignGroup.findFirst({
      where: { id: groupId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy nhóm');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.memberIds !== undefined) {
        const memberIds = await this.resolveMemberIds(dto.memberIds);
        await tx.taskAssignGroupMember.deleteMany({ where: { groupId } });
        if (memberIds.length > 0) {
          await tx.taskAssignGroupMember.createMany({
            data: memberIds.map((userId) => ({ groupId, userId })),
          });
        }
      }
      return tx.taskAssignGroup.update({
        where: { id: groupId },
        data: { name: dto.name },
        include: GROUP_INCLUDE,
      });
    });

    return this.serialize({
      ...(updated as GroupWithMembers),
      viewerId,
    });
  }

  async remove(ownerId: string, groupId: string) {
    const existing = await this.prisma.taskAssignGroup.findFirst({
      where: { id: groupId, ownerId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy nhóm');
    }
    await this.prisma.taskAssignGroup.delete({ where: { id: groupId } });
    return { success: true };
  }

  /** Admin xóa nhóm bất kể ownerId; màn người dùng vẫn dùng remove(). */
  async removeAsAdmin(groupId: string) {
    const existing = await this.prisma.taskAssignGroup.findFirst({
      where: { id: groupId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy nhóm');
    }
    await this.prisma.taskAssignGroup.delete({ where: { id: groupId } });
    return { success: true };
  }

  async leave(userId: string, groupId: string) {
    const group = await this.prisma.taskAssignGroup.findUnique({
      where: { id: groupId },
      select: { ownerId: true, name: true },
    });
    if (!group) {
      throw new NotFoundException('Không tìm thấy nhóm');
    }
    if (group.ownerId === userId) {
      throw new ForbiddenException(
        'Chủ nhóm không thể rời nhóm; hãy xóa nhóm hoặc chuyển chủ nhóm trước',
      );
    }

    const membership = await this.prisma.taskAssignGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { groupId: true },
    });
    if (!membership) {
      throw new NotFoundException('Bạn không phải là thành viên của nhóm này');
    }

    await this.prisma.taskAssignGroupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });
    try {
      await this.notificationHelper?.createSystemNotification(
        group.ownerId,
        NotificationAction.system_alert,
        `Một thành viên đã rời nhóm "${group.name}".`,
        userId,
      );
    } catch {
      // Leaving the group has already succeeded; a notification outage must
      // not turn it into a misleading failed response.
    }
    return { success: true };
  }
}
