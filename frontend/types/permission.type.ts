/**
 * Permission codes for ACTA system
 * Used for fine-grained access control across the application
 */
export enum PermissionCode {
  // Dashboard
  DASHBOARD_MANAGE = 'dashboard.manage',
  DASHBOARD_VIEW = 'dashboard.view',
  DASHBOARD_ANALYTICS = 'dashboard.analytics',

  // Content Management
  CONTENT_VIEW = 'content.view',
  CONTENT_CREATE = 'content.create',
  CONTENT_MANAGE = 'content.manage',
  CONTENT_APPROVE = 'content.approve',
  CONTENT_UPDATE = 'content.update',
  CONTENT_DELETE = 'content.delete',

  // Products
  PRODUCTS_VIEW = 'products.view',
  PRODUCTS_MANAGE = 'products.manage',

  // Categories
  CATEGORIES_VIEW = 'categories.view',
  CATEGORIES_MANAGE = 'categories.manage',

  // Orders
  ORDERS_VIEW = 'orders.view',
  ORDERS_MANAGE = 'orders.manage',

  // Invoices
  INVOICES_VIEW = 'invoices.view',
  INVOICES_MANAGE = 'invoices.manage',

  // Users
  USERS_VIEW = 'users.view',
  USERS_MANAGE = 'users.manage',
  USERS_UPDATE = 'users.update',

  // Vouchers
  VOUCHERS_VIEW = 'vouchers.view',
  VOUCHERS_MANAGE = 'vouchers.manage',

  // Businesses
  BUSINESSES_VIEW = 'businesses.view',
  BUSINESSES_MANAGE = 'businesses.manage',

  // Inventory
  INVENTORY_VIEW = 'inventory.view',
  INVENTORY_MANAGE = 'inventory.manage',

  // Warehouses
  WAREHOUSES_VIEW = 'warehouses.view',
  WAREHOUSES_MANAGE = 'warehouses.manage',

  // Finance
  FINANCE_VIEW = 'finance.view',
  FINANCE_TRANSACTIONS = 'finance.transactions',

  // Reports
  REPORTS_VIEW = 'reports.view',
  REPORTS_SALES = 'reports.sales',
  REPORTS_FINANCE = 'reports.finance',

  // Gamification
  GAMIFICATION_VIEW = 'gamification.view',
  GAMIFICATION_MANAGE = 'gamification.manage',

  // Affiliate
  AFFILIATE_VIEW = 'affiliate.view',
  AFFILIATE_MANAGE = 'affiliate.manage',

  // Settings
  SETTINGS_VIEW = 'settings.view',
  SETTINGS_MANAGE = 'settings.manage',
  SETTINGS_MANAGE_EMAILS = 'settings.manage_emails',

  // Permissions
  PERMISSIONS_VIEW = 'permissions.view',
  PERMISSIONS_MANAGE = 'permissions.manage',

  // Daily task groups
  DAILY_TASK_GROUPS_CREATE = 'daily_task_groups.create',
}

export interface UserPermission {
  id: string;
  code: PermissionCode;
  name: string;
  description?: string;
}
