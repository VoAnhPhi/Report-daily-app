import { PermissionCode } from '@/types/permission.type';
import { Role } from '@/types/user.type';

/**
 * Permission-based RBAC utilities
 * Checks if user has specific permissions instead of role-based access
 * Users with role 'admin' are super admins and bypass all permission checks
 */

/**
 * Check if user is a super admin (role === 'admin')
 * Super admins bypass all permission checks
 */
export function isSuperAdmin(userRole?: string | Role): boolean {
  return userRole === Role.ADMIN || userRole === 'admin';
}

export function hasPermission(
  userPermissions?: string[],
  requiredPermission?: PermissionCode,
  userRole?: string | Role,
): boolean {
  if (isSuperAdmin(userRole)) return true;
  if (!userPermissions || !requiredPermission) return false;
  return userPermissions.includes(requiredPermission);
}

export function hasAnyPermission(
  userPermissions?: string[],
  requiredPermissions?: PermissionCode[],
  userRole?: string | Role,
): boolean {
  if (isSuperAdmin(userRole)) return true;
  if (
    !userPermissions ||
    !requiredPermissions ||
    requiredPermissions.length === 0
  ) {
    return false;
  }
  return requiredPermissions.some((perm) => userPermissions.includes(perm));
}

export function hasAllPermissions(
  userPermissions?: string[],
  requiredPermissions?: PermissionCode[],
  userRole?: string | Role,
): boolean {
  if (isSuperAdmin(userRole)) return true;
  if (
    !userPermissions ||
    !requiredPermissions ||
    requiredPermissions.length === 0
  ) {
    return false;
  }
  return requiredPermissions.every((perm) => userPermissions.includes(perm));
}

/**
 * Check if user can access admin panel
 * Requires at least one admin-related permission
 */
export function canAccessAdminPanel(
  userPermissions?: string[],
  userRole?: string | Role,
): boolean {
  if (isSuperAdmin(userRole)) return true;
  const adminPermissions = [
    PermissionCode.DASHBOARD_MANAGE,
    PermissionCode.DASHBOARD_VIEW,
    PermissionCode.PRODUCTS_MANAGE,
    PermissionCode.ORDERS_MANAGE,
    PermissionCode.USERS_MANAGE,
    PermissionCode.VOUCHERS_MANAGE,
    PermissionCode.BUSINESSES_MANAGE,
    PermissionCode.FINANCE_VIEW,
    PermissionCode.REPORTS_VIEW,
    PermissionCode.GAMIFICATION_MANAGE,
    PermissionCode.AFFILIATE_VIEW,
    PermissionCode.PERMISSIONS_VIEW,
    PermissionCode.CONTENT_MANAGE,
  ];

  return hasAnyPermission(userPermissions, adminPermissions, userRole);
}

/**
 * Check if user can manage products
 */
export function canManageProducts(
  userPermissions?: string[],
  userRole?: string | Role,
): boolean {
  return hasPermission(
    userPermissions,
    PermissionCode.PRODUCTS_MANAGE,
    userRole,
  );
}

/**
 * Check if user can manage orders
 */
export function canManageOrders(
  userPermissions?: string[],
  userRole?: string | Role,
): boolean {
  return hasPermission(userPermissions, PermissionCode.ORDERS_MANAGE, userRole);
}

/**
 * Check if user can manage vouchers
 */
export function canManageVouchers(
  userPermissions?: string[],
  userRole?: string | Role,
): boolean {
  return hasPermission(
    userPermissions,
    PermissionCode.VOUCHERS_MANAGE,
    userRole,
  );
}

/**
 * Check if user can manage users
 */
export function canManageUsers(
  userPermissions?: string[],
  userRole?: string | Role,
): boolean {
  return hasPermission(userPermissions, PermissionCode.USERS_MANAGE, userRole);
}

/**
 * Check if user can view finance
 */
export function canViewFinance(
  userPermissions?: string[],
  userRole?: string | Role,
): boolean {
  return hasAnyPermission(
    userPermissions,
    [PermissionCode.FINANCE_VIEW, PermissionCode.REPORTS_FINANCE],
    userRole,
  );
}

/**
 * Check if user can view reports
 */
export function canViewReports(
  userPermissions?: string[],
  userRole?: string | Role,
): boolean {
  return hasAnyPermission(
    userPermissions,
    [
      PermissionCode.REPORTS_VIEW,
      PermissionCode.REPORTS_SALES,
      PermissionCode.REPORTS_FINANCE,
    ],
    userRole,
  );
}

/**
 * Check if user can manage gamification
 */
export function canManageGamification(
  userPermissions?: string[],
  userRole?: string | Role,
): boolean {
  return hasPermission(
    userPermissions,
    PermissionCode.GAMIFICATION_MANAGE,
    userRole,
  );
}

/**
 * Check if user can manage content
 */
export function canManageContent(
  userPermissions?: string[],
  userRole?: string | Role,
): boolean {
  return hasPermission(
    userPermissions,
    PermissionCode.CONTENT_MANAGE,
    userRole,
  );
}

/**
 * Check if user can manage affiliate
 */
export function canManageAffiliate(
  userPermissions?: string[],
  userRole?: string | Role,
): boolean {
  return hasAnyPermission(
    userPermissions,
    [PermissionCode.AFFILIATE_VIEW, PermissionCode.AFFILIATE_MANAGE],
    userRole,
  );
}

/**
 * Get admin panel path based on user permissions
 * Returns the most relevant admin path for the user's permissions
 */
export function getAdminPanelPath(
  userPermissions?: string[],
  userRole?: string | Role,
): string {
  if (isSuperAdmin(userRole)) {
    return '/';
  }
  if (!userPermissions || userPermissions.length === 0) {
    return '/';
  }

  // Priority order for admin paths
  if (
    hasPermission(userPermissions, PermissionCode.DASHBOARD_MANAGE, userRole)
  ) {
    return '/';
  }
  if (
    hasPermission(userPermissions, PermissionCode.PRODUCTS_MANAGE, userRole)
  ) {
    return '/e-commerce/products';
  }
  if (hasPermission(userPermissions, PermissionCode.ORDERS_MANAGE, userRole)) {
    return '/e-commerce/orders';
  }
  if (
    hasPermission(userPermissions, PermissionCode.VOUCHERS_MANAGE, userRole)
  ) {
    return '/e-commerce/vouchers';
  }
  if (hasPermission(userPermissions, PermissionCode.USERS_MANAGE, userRole)) {
    return '/users';
  }
  if (hasPermission(userPermissions, PermissionCode.REPORTS_VIEW, userRole)) {
    return '/reports';
  }
  if (
    hasPermission(userPermissions, PermissionCode.GAMIFICATION_MANAGE, userRole)
  ) {
    return '/gamification';
  }
  if (hasPermission(userPermissions, PermissionCode.AFFILIATE_VIEW, userRole)) {
    return '/withdrawals';
  }
  if (hasPermission(userPermissions, PermissionCode.CONTENT_MANAGE, userRole)) {
    return '/posts';
  }

  return '/';
}
