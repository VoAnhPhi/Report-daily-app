'use client';

import { useAuthContext } from '@/contexts/auth-context';

/**
 * Hook to access current user's permissions and admin roles.
 * Data is auto-fetched by AuthProvider on login.
 *
 * @example
 * const { hasPermission, hasRole } = useAuthPermissions();
 * const canManageUsers = hasPermission('USERS_MANAGE');
 * const isAdmin = hasRole('SUPER_ADMIN');
 */
export const useAuthPermissions = () => {
  const { permissions, adminRoles, isLoadingPermissions, hasPermission, hasRole } =
    useAuthContext();

  return {
    /** List of permission codes granted to user */
    permissions,
    /** List of admin roles assigned to user */
    adminRoles,
    /** True while permissions are loading */
    isLoadingPermissions,
    /** Check if user has a specific permission */
    hasPermission,
    /** Check if user has a specific admin role */
    hasRole,
    /** Check if user can access admin panel */
    canAccessAdminPanel: (roleCode?: string) => {
      // If user has SUPER_ADMIN role code, they always have access
      if (
        roleCode === 'SUPER_ADMIN' ||
        adminRoles.some((r) => r.role.code === 'SUPER_ADMIN')
      ) {
        return true;
      }
      // Otherwise, check if user has any permissions or admin roles
      return permissions.length > 0 || adminRoles.length > 0;
    },
  };
};
