import { UserRole } from '../dto/send-email.dto';

/**
 * Port interface for user lookup operations
 * This allows the email service to work with different user data sources
 */
export interface UsersLookupPort {
  /**
   * Find users by their IDs
   */
  findUsersByIds(
    userIds: string[],
  ): Promise<Array<{ id: string; email: string }>>;

  /**
   * Find users by their roles
   */
  findUsersByRoles(
    roles: UserRole[],
    includeInactive?: boolean,
  ): Promise<Array<{ id: string; email: string }>>;
}
