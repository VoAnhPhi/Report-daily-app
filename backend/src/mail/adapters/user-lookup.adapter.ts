import { Injectable } from '@nestjs/common';
import { UsersLookupPort } from '../interfaces/users-lookup.port';
import { PrismaService } from '../../common/services/prisma.service';
import { UserRole } from '../dto/send-email.dto';

/**
 * Adapter that connects the EmailService to Prisma for user lookups
 * Implements the UsersLookupPort interface
 */
@Injectable()
export class UserLookupAdapter implements UsersLookupPort {
  constructor(private readonly prisma: PrismaService) {}

  async findUsersByIds(
    userIds: string[],
  ): Promise<Array<{ id: string; email: string }>> {
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        isActive: true,
      },
      select: {
        id: true,
        email: true,
      },
    });

    return users;
  }

  async findUsersByRoles(
    roles: UserRole[],
    includeInactive: boolean = false,
  ): Promise<Array<{ id: string; email: string }>> {
    const whereCondition: { role: { in: UserRole[] }; isActive?: boolean } = {
      role: { in: roles },
    };

    // Only filter by isActive if includeInactive is false
    if (!includeInactive) {
      whereCondition.isActive = true;
    }

    const users = await this.prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        email: true,
      },
    });

    return users;
  }
}
