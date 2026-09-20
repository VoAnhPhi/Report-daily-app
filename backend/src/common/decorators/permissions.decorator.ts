import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to require specific permissions for a route
 * @param permissions - Array of permission codes required
 * @example
 * @Permissions('users.view', 'users.update')
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Decorator to require ANY of the specified permissions (OR logic)
 * @param permissions - Array of permission codes, user needs at least one
 * @example
 * @AnyPermission('orders.view', 'orders.view_all')
 */
export const ANY_PERMISSIONS_KEY = 'any_permissions';
export const AnyPermission = (...permissions: string[]) =>
  SetMetadata(ANY_PERMISSIONS_KEY, permissions);

/**
 * Decorator to require user has at least one permission (any permission)
 * Used for endpoints that should be accessible to any authenticated admin user
 * @example
 * @RequireAnyPermission()
 */
export const REQUIRE_ANY_PERMISSION_KEY = 'require_any_permission';
export const RequireAnyPermission = () =>
  SetMetadata(REQUIRE_ANY_PERMISSION_KEY, true);

/**
 * Decorator to require warehouse-specific permission
 * This will check if user has permission for the warehouse in the request
 * @param orderPermissions - Order permissions required (e.g., ORDERS_MANAGE)
 * @example
 * @RequireWarehousePermission('orders.manage')
 * // User needs: orders.manage + warehouses.manage.{warehouseId}
 */
export const REQUIRE_WAREHOUSE_PERMISSION_KEY = 'require_warehouse_permission';
export const RequireWarehousePermission = (
  ...orderPermissions: string[]
) => SetMetadata(REQUIRE_WAREHOUSE_PERMISSION_KEY, orderPermissions);

/**
 * Decorator to require warehouse access
 * User needs: warehouses.manage OR warehouses.manage.{warehouseId}
 *
 * ╔══ VÌ SAO CÓ THAM SỐ `bypassPermissions` ═══════════════════════════════╗
 * Đặt `@RequireWarehouseAccess()` CẠNH `@AnyPermission(...)` trên cùng một
 * handler cho ra logic **VÀ**, không phải HOẶC. `PermissionsGuard.canActivate`
 * chạy hai khối kiểm TÁCH BIỆT và TUẦN TỰ — khối `anyPermissions` ném
 * `ForbiddenException` của riêng nó, rồi khối `requireWarehouseAccess` gọi
 * `checkWarehouseAccess` cũng ném của riêng nó. Không có nhánh nào nói "đã qua
 * một cổng thì bỏ cổng kia".
 *
 * Hệ quả: KHÔNG thể mở đường cho một mã quyền NGOÀI họ `warehouses.*` bằng
 * cách thêm `@AnyPermission(MÃ_ĐÓ)` bên cạnh — người chỉ có mã đó vẫn chết ở
 * `checkWarehouseAccess`. Cũng KHÔNG thể thay `@RequireWarehouseAccess()` bằng
 * `@AnyPermission(WAREHOUSES_MANAGE, MÃ_ĐÓ)`: `AnyPermission` so khớp CHÍNH
 * XÁC, nên quản lý kho phạm vi (CTV, chỉ mang mã CÓ HẬU TỐ
 * `warehouses.manage.{id}`) sẽ mất quyền vào — một hồi quy thầm lặng.
 *
 * Vì vậy đường vòng phải khai ngay TRONG chính cổng kho: có bất kỳ mã nào
 * trong `bypassPermissions` thì BỎ QUA `checkWarehouseAccess`, còn tập kho
 * xem được tới đâu thì tầng service tự thu hẹp.
 *
 * ⚠ Gọi KHÔNG tham số vẫn lưu đúng `true` như trước, nên toàn bộ ~40 chỗ dùng
 * cũ giữ nguyên metadata từng bit — đừng đổi thành `[]` cho "gọn".
 * ╚═══════════════════════════════════════════════════════════════════════╝
 *
 * @param bypassPermissions - Mã quyền được đi vòng qua cổng kho (OR với nhau)
 * @example
 * // Chỉ quyền kho mới vào được (hành vi mặc định, không đổi)
 * @RequireWarehouseAccess()
 * // Quyền kho HOẶC `tho-dia.view` đều vào được
 * @RequireWarehouseAccess(PermissionCode.THO_DIA_VIEW)
 */
export const REQUIRE_WAREHOUSE_ACCESS_KEY = 'require_warehouse_access';
export const RequireWarehouseAccess = (...bypassPermissions: string[]) =>
  SetMetadata(
    REQUIRE_WAREHOUSE_ACCESS_KEY,
    bypassPermissions.length > 0 ? bypassPermissions : true,
  );

/**
 * Decorator for combined permission logic with multiple OR groups
 * @param config - Configuration object with 'anyOf', 'allOf', or 'anyOfGroups' arrays
 * @example
 * // Simple: (A OR B) AND C
 * @CombinedPermissions({
 *   anyOf: ['invoices.view', 'invoices.manage'],
 *   allOf: ['orders.view']
 * })
 * // User needs: (INVOICES_VIEW OR INVOICES_MANAGE) AND ORDERS_VIEW
 *
 * @example
 * // Advanced: (A OR B) AND (C OR D)
 * @CombinedPermissions({
 *   anyOfGroups: [
 *     ['orders.view', 'orders.manage'],
 *     ['invoices.view', 'invoices.manage']
 *   ]
 * })
 * // User needs: (ORDERS_VIEW OR ORDERS_MANAGE) AND (INVOICES_VIEW OR INVOICES_MANAGE)
 */
export const COMBINED_PERMISSIONS_KEY = 'combined_permissions';
export interface CombinedPermissionsConfig {
  anyOf?: string[]; // User needs at least one of these
  allOf?: string[]; // User needs all of these
  anyOfGroups?: string[][]; // User needs at least one from EACH group (AND of ORs)
}
export const CombinedPermissions = (config: CombinedPermissionsConfig) =>
  SetMetadata(COMBINED_PERMISSIONS_KEY, config);
