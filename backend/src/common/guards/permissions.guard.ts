import { PermissionCode } from '../enums/permission.enum';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma, Role } from '@prisma/client';
import { Request } from 'express';
import { JwtPayload } from '../../auth/jwt-payload';
import { PrismaService } from '../services/prisma.service';
import {
  PERMISSIONS_KEY,
  ANY_PERMISSIONS_KEY,
  REQUIRE_ANY_PERMISSION_KEY,
  REQUIRE_WAREHOUSE_PERMISSION_KEY,
  REQUIRE_WAREHOUSE_ACCESS_KEY,
  COMBINED_PERMISSIONS_KEY,
  CombinedPermissionsConfig,
} from '../decorators/permissions.decorator';

/**
 * Cửa sổ gom log cảnh báo 403 (ms). Cùng MỘT người + cùng MỘT bộ quyền thiếu chỉ
 * ghi một dòng trong cửa sổ này; dòng kế tiếp kèm số lần đã nén. Trang admin bắn
 * hàng chục request song song nên nếu không gom, một lần mở trang đẻ ra vài chục
 * dòng WARN giống hệt nhau và log không còn đọc được.
 */
const PERMISSION_WARN_WINDOW_MS = 60_000;

/** Chặn trên số khoá theo dõi để Map không phình vô hạn trong tiến trình chạy dài. */
const PERMISSION_WARN_MAX_KEYS = 500;

type UserWithPermissions = Prisma.UserGetPayload<{
  select: {
    id: true;
    role: true;
    fullName: true;
    referenceId: true;
    userPermissions: {
      select: {
        granted: true;
        permission: { select: { code: true; isActive: true } };
      };
    };
    userAdminRoles: {
      select: {
        role: {
          select: {
            code: true;
            isActive: true;
            level: true;
            rolePermissions: {
              select: {
                permission: { select: { code: true; isActive: true } };
              };
            };
          };
        };
      };
    };
  };
}>;

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  userPermissions?: Set<string>;
}

/**
 * Guard to check if user has required permissions
 * Supports both AND logic (all permissions required) and OR logic (any permission)
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  /** khoá `${userId}|${quyền thiếu}` → số lần đã nén + mốc ghi log gần nhất */
  private readonly warnTracker = new Map<
    string,
    { suppressed: number; lastLoggedAt: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Nhãn người dùng cho log 403 — tên + mã tham chiếu để người trực đọc log biết
   * ngay đang chặn ai mà không phải tra DB bằng UUID.
   */
  private describeActor(user: UserWithPermissions): string {
    const name = user.fullName?.trim() || '(chưa đặt tên)';
    const ref = user.referenceId?.trim() || '—';
    return `${name} · mã ${ref} · role=${user.role} · id=${user.id}`;
  }

  /**
   * Ghi WARN có gom nhóm: lần đầu ghi ngay, các lần trùng trong
   * PERMISSION_WARN_WINDOW_MS bị nén và được cộng dồn vào dòng kế tiếp.
   */
  private warnThrottled(
    key: string,
    build: (suppressedNote: string) => string,
  ): void {
    const now = Date.now();
    const entry = this.warnTracker.get(key);

    if (entry && now - entry.lastLoggedAt < PERMISSION_WARN_WINDOW_MS) {
      entry.suppressed++;
      return;
    }

    const note =
      entry && entry.suppressed > 0
        ? ` (đã nén ${entry.suppressed} lần trùng trong ${Math.round(PERMISSION_WARN_WINDOW_MS / 1000)}s trước)`
        : '';
    this.logger.warn(build(note));

    // Xả toàn bộ khi chạm trần thay vì đuổi theo LRU — bộ khoá này chỉ phục vụ
    // việc gom log, mất dấu vết cũ không ảnh hưởng đúng/sai của cổng quyền.
    if (!entry && this.warnTracker.size >= PERMISSION_WARN_MAX_KEYS) {
      this.warnTracker.clear();
    }
    this.warnTracker.set(key, { suppressed: 0, lastLoggedAt: now });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<
      string[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    const anyPermissions = this.reflector.getAllAndOverride<string[]>(
      ANY_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requireAnyPermission = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_ANY_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const warehousePermissions = this.reflector.getAllAndOverride<
      string[]
    >(REQUIRE_WAREHOUSE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // `true` = cổng kho thuần (dạng cũ, ~40 route). Mảng = cổng kho KÈM danh
    // sách mã quyền được đi vòng (xem khối chú thích trên `RequireWarehouseAccess`).
    // `undefined` = route không khai cổng này.
    const requireWarehouseAccess = this.reflector.getAllAndOverride<
      boolean | string[]
    >(REQUIRE_WAREHOUSE_ACCESS_KEY, [context.getHandler(), context.getClass()]);

    const combinedPermissions =
      this.reflector.getAllAndOverride<CombinedPermissionsConfig>(
        COMBINED_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      );

    // If no permissions are defined and not requiring any permission, allow access
    if (
      !requiredPermissions?.length &&
      !anyPermissions?.length &&
      !requireAnyPermission &&
      !warehousePermissions?.length &&
      !requireWarehouseAccess &&
      !combinedPermissions
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Get user with role and permissions
    const userWithPermissions = await this.getUserPermissions(user.id);

    if (!userWithPermissions) {
      throw new UnauthorizedException('User not found');
    }

    // Super admin bypasses all permission checks
    if (userWithPermissions.role === Role.admin) {
      return true;
    }

    // Collect all user's effective permissions
    const effectivePermissions =
      this.calculateEffectivePermissions(userWithPermissions);

    // Check AND permissions (all required)
    if (requiredPermissions?.length) {
      const hasAllPermissions = requiredPermissions.every((permission) =>
        effectivePermissions.has(permission),
      );

      if (!hasAllPermissions) {
        const missingPermissions = requiredPermissions.filter(
          (p) => !effectivePermissions.has(p),
        );
        const missingLabel = missingPermissions.join(', ');
        this.warnThrottled(
          `${user.id}|all|${missingLabel}`,
          (note) =>
            `403 ${request.method} ${request.route?.path ?? request.url} — ${this.describeActor(userWithPermissions)} thiếu quyền (cần ĐỦ): ${missingLabel}${note}`,
        );
        throw new ForbiddenException(
          `Bạn không có quyền thực hiện hành động này. Thiếu quyền: ${missingLabel}`,
        );
      }
    }

    // Check OR permissions (any one is enough)
    if (anyPermissions?.length) {
      const hasAnyPermission = anyPermissions.some((permission) =>
        effectivePermissions.has(permission),
      );

      if (!hasAnyPermission) {
        const anyLabel = anyPermissions.join(' | ');
        this.warnThrottled(
          `${user.id}|any|${anyLabel}`,
          (note) =>
            `403 ${request.method} ${request.route?.path ?? request.url} — ${this.describeActor(userWithPermissions)} không có quyền nào trong: ${anyLabel}${note}`,
        );
        throw new ForbiddenException(
          'Bạn không có quyền thực hiện hành động này',
        );
      }
    }

    // Check if user has at least one permission (for @RequireAnyPermission())
    if (requireAnyPermission && effectivePermissions.size === 0) {
      this.warnThrottled(
        `${user.id}|none`,
        (note) =>
          `403 ${request.method} ${request.route?.path ?? request.url} — ${this.describeActor(userWithPermissions)} chưa được cấp bất kỳ quyền nào${note}`,
      );
      throw new ForbiddenException(
        'Bạn cần được cấp ít nhất một quyền để truy cập tài nguyên này',
      );
    }

    // Check combined permissions (anyOf OR allOf logic)
    if (combinedPermissions) {
      this.checkCombinedPermissions(
        user.id,
        combinedPermissions,
        effectivePermissions,
      );
    }

    // Check warehouse-specific permissions (requires BOTH order permission AND warehouse permission)
    if (warehousePermissions?.length) {
      await this.checkWarehousePermissions(
        user.id,
        warehousePermissions,
        effectivePermissions,
        request,
      );
    }

    // Check warehouse access only (warehouses.manage OR warehouses.manage.{warehouseId})
    //
    // ⚠ Khối này chạy ĐỘC LẬP với khối `anyPermissions` ở trên — hai cổng nối
    // nhau bằng VÀ. Đó là lý do đường vòng phải khai bên trong chính cổng kho
    // chứ không thêm được từ ngoài bằng `@AnyPermission`.
    if (requireWarehouseAccess) {
      // Dạng cũ (`true`) ⇒ mảng rỗng ⇒ `.some` luôn false ⇒ `checkWarehouseAccess`
      // chạy y như trước. Không route cũ nào đổi hành vi.
      const maDiVong = Array.isArray(requireWarehouseAccess)
        ? requireWarehouseAccess
        : [];
      const duocDiVong = maDiVong.some((code) =>
        effectivePermissions.has(code),
      );

      if (!duocDiVong) {
        await this.checkWarehouseAccess(user.id, effectivePermissions, request);
      }
    }

    // Attach permissions to request for use in controllers
    request.userPermissions = effectivePermissions;

    return true;
  }

  /**
   * Check warehouse access for a warehouse-scoped route
   * User needs warehouses.manage OR warehouses.manage.{warehouseId}
   */
  private async checkWarehouseAccess(
    userId: string,
    effectivePermissions: Set<string>,
    request: AuthenticatedRequest,
  ): Promise<void> {
    let warehouseId: string | null = null;

    if (request.body?.warehouseId) {
      warehouseId = request.body.warehouseId;
    } else if (request.params?.warehouseId) {
      warehouseId = request.params.warehouseId;
    } else if (request.query?.warehouseId) {
      warehouseId = typeof request.query.warehouseId === 'string'
        ? request.query.warehouseId
        : null;
    } else if (request.params?.id) {
      warehouseId = request.params.id;
    }

    // If no warehouseId found directly, try to resolve from order
    if (!warehouseId && request.params?.id) {
      try {
        const order = await this.prisma.order.findUnique({
          where: { id: request.params.id },
          select: { warehouseId: true },
        });
        if (order?.warehouseId) {
          warehouseId = order.warehouseId;
        }
      } catch {
        // Not an order ID, continue with existing logic
      }
    }

    const hasAllWarehousesPermission = effectivePermissions.has(
      PermissionCode.WAREHOUSES_MANAGE,
    );

    if (!warehouseId) {
      // For endpoints without a specific warehouseId (e.g., list/statistics),
      // allow if user can manage all warehouses OR can manage at least one warehouse.
      if (hasAllWarehousesPermission) {
        return;
      }

      const hasAnyScopedWarehousePermission = Array.from(
        effectivePermissions,
      ).some((code) => code.startsWith(`${PermissionCode.WAREHOUSES_MANAGE}.`));

      if (hasAnyScopedWarehousePermission) {
        return;
      }

      this.warnThrottled(
        `${userId}|wh-list`,
        (note) =>
          `403 — người dùng ${userId} không có quyền quản lý kho nào cho danh sách theo kho${note}`,
      );
      throw new ForbiddenException(
        'Bạn không có quyền truy cập kho hàng. Vui lòng liên hệ quản trị viên để được cấp quyền.',
      );
    }

    const warehousePermissionCode = `${PermissionCode.WAREHOUSES_MANAGE}.${warehouseId}`;
    const hasSpecificWarehousePermission = effectivePermissions.has(
      warehousePermissionCode,
    );

    if (hasAllWarehousesPermission || hasSpecificWarehousePermission) {
      return;
    }

    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { name: true },
    });
    const warehouseName = warehouse?.name || 'kho hàng này';

    this.warnThrottled(
      `${userId}|wh-access|${warehousePermissionCode}`,
      (note) =>
        `403 — người dùng ${userId} thiếu quyền truy cập kho: ${warehousePermissionCode}${note}`,
    );
    throw new ForbiddenException(
      `Bạn không có quyền truy cập "${warehouseName}". Vui lòng liên hệ quản trị viên để được cấp quyền.`,
    );
  }

  /**
   * Get user with all permission-related data
   */
  private async getUserPermissions(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        // Nhãn người dùng cho log 403: chỉ có UUID thì người trực vận hành phải tra
        // DB mới biết đang chặn ai (§ log gom nhóm bên dưới).
        fullName: true,
        referenceId: true,
        // User's direct permissions
        userPermissions: {
          where: {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          select: {
            granted: true,
            permission: {
              select: {
                code: true,
                isActive: true,
              },
            },
          },
        },
        // User's roles and their permissions
        userAdminRoles: {
          where: {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          select: {
            role: {
              select: {
                code: true,
                isActive: true,
                level: true,
                rolePermissions: {
                  select: {
                    permission: {
                      select: {
                        code: true,
                        isActive: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Calculate effective permissions from roles and direct assignments
   * Direct denials override role grants
   */
  private calculateEffectivePermissions(
    userWithPermissions: UserWithPermissions,
  ): Set<string> {
    const grantedPermissions = new Set<string>();
    const deniedPermissions = new Set<string>();

    // 1. Collect permissions from roles
    for (const userRole of userWithPermissions.userAdminRoles || []) {
      if (!userRole.role?.isActive) continue;

      for (const rolePermission of userRole.role.rolePermissions || []) {
        const permission = rolePermission.permission;
        if (permission?.isActive) {
          grantedPermissions.add(permission.code);
        }
      }
    }

    // 2. Apply direct user permissions (can grant or deny)
    for (const userPermission of userWithPermissions.userPermissions || []) {
      const permission = userPermission.permission;
      if (!permission?.isActive) continue;

      if (userPermission.granted) {
        grantedPermissions.add(permission.code);
      } else {
        // Explicit denial overrides role grants
        deniedPermissions.add(permission.code);
      }
    }

    // 3. Remove denied permissions from granted set
    for (const denied of deniedPermissions) {
      grantedPermissions.delete(denied);
    }

    return grantedPermissions;
  }

  /**
   * Check warehouse-specific permissions
   * User needs BOTH order permission AND warehouse.manage.{warehouseId}
   */
  private async checkWarehousePermissions(
    userId: string,
    orderPermissions: string[],
    effectivePermissions: Set<string>,
    request: AuthenticatedRequest,
  ): Promise<void> {
    // 1. Check if user has the required order permission
    const hasOrderPermission = orderPermissions.some((permission) =>
      effectivePermissions.has(permission),
    );

    if (!hasOrderPermission) {
      this.warnThrottled(
        `${userId}|order|${orderPermissions.join(',')}`,
        (note) =>
          `403 — người dùng ${userId} thiếu quyền đơn hàng: ${orderPermissions.join(', ')}${note}`,
      );
      const permissionNames = orderPermissions
        .map((p) => {
          if (p === 'orders.view') return 'Xem đơn hàng';
          if (p === 'orders.manage') return 'Quản lý đơn hàng';
          if (p === 'orders.update') return 'Cập nhật đơn hàng';
          return p;
        })
        .join(', ');
      throw new ForbiddenException(
        `Bạn không có quyền thực hiện thao tác này. Yêu cầu một trong các quyền: ${permissionNames}`,
      );
    }

    // 2. Get warehouseId from request
    let warehouseId: string | null = null;

    // Check if warehouseId is directly in body (for invoices)
    if (request.body?.warehouseId) {
      warehouseId = request.body.warehouseId;
    }
    // Check common param names for warehouse-scoped routes
    else if (request.params?.warehouseId) {
      warehouseId = request.params.warehouseId;
    } else if (request.params?.id) {
      warehouseId = request.params.id;
    }
    // Check if we have orderId to lookup warehouse
    else {
      const orderId = request.params?.orderId || request.body?.orderId;

      if (!orderId) {
        // If no orderId in request, skip warehouse check (for list endpoints)
        return;
      }

      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { warehouseId: true },
      });

      if (!order?.warehouseId) {
        // Order has no warehouse, allow access
        return;
      }

      warehouseId = order.warehouseId;
    }

    if (!warehouseId) {
      // No warehouse to check, allow access
      return;
    }

    // 3. Check if user has warehouse permission for this specific warehouse
    const warehousePermissionCode = `${PermissionCode.WAREHOUSES_MANAGE}.${warehouseId}`;
    const hasAllWarehousesPermission = effectivePermissions.has(
      PermissionCode.WAREHOUSES_MANAGE,
    );
    const hasSpecificWarehousePermission = effectivePermissions.has(
      warehousePermissionCode,
    );

    if (!hasAllWarehousesPermission && !hasSpecificWarehousePermission) {
      // Get warehouse name for better error message
      const warehouse = await this.prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: { name: true },
      });
      const warehouseName = warehouse?.name || 'kho hàng này';

      this.warnThrottled(
        `${userId}|wh-order|${warehousePermissionCode}`,
        (note) =>
          `403 — người dùng ${userId} thiếu quyền kho cho đơn hàng: ${warehousePermissionCode}${note}`,
      );
      throw new ForbiddenException(
        `Bạn không có quyền quản lý đơn hàng từ "${warehouseName}". Vui lòng liên hệ quản trị viên để được cấp quyền.`,
      );
    }
  }

  /**
   * Check combined permissions: (anyOf) AND (allOf) OR (anyOfGroups)
   * - anyOf: User needs at least one from this array
   * - allOf: User needs all from this array
   * - anyOfGroups: User needs at least one from EACH group (AND of ORs)
   */
  private checkCombinedPermissions(
    userId: string,
    config: CombinedPermissionsConfig,
    effectivePermissions: Set<string>,
  ): void {
    const { anyOf, allOf, anyOfGroups } = config;

    // Check anyOfGroups (AND of ORs) - user needs at least one from EACH group
    if (anyOfGroups?.length) {
      for (let i = 0; i < anyOfGroups.length; i++) {
        const group = anyOfGroups[i];
        const hasAnyFromGroup = group.some((permission) =>
          effectivePermissions.has(permission),
        );

        if (!hasAnyFromGroup) {
          const permissionNames = group
            .map((p) => this.getPermissionDisplayName(p))
            .join(' hoặc ');

          this.warnThrottled(
            `${userId}|group${i + 1}|${group.join(',')}`,
            (note) =>
              `403 — người dùng ${userId} thiếu quyền ở nhóm ${i + 1}: ${group.join(', ')}${note}`,
          );
          throw new ForbiddenException(
            `Bạn không có quyền thực hiện thao tác này. Yêu cầu một trong các quyền: ${permissionNames}`,
          );
        }
      }
      return;
    }

    // Check anyOf (OR logic) - user needs at least one
    if (anyOf?.length) {
      const hasAnyOf = anyOf.some((permission) =>
        effectivePermissions.has(permission),
      );

      if (!hasAnyOf) {
        const permissionNames = anyOf
          .map((p) => this.getPermissionDisplayName(p))
          .join(' hoặc ');

        this.warnThrottled(
          `${userId}|anyOf|${anyOf.join(',')}`,
          (note) =>
            `403 — người dùng ${userId} không có quyền nào trong: ${anyOf.join(', ')}${note}`,
        );
        throw new ForbiddenException(
          `Bạn không có quyền thực hiện thao tác này. Yêu cầu một trong các quyền: ${permissionNames}`,
        );
      }
    }

    // Check allOf (AND logic) - user needs all
    if (allOf?.length) {
      const missingPermissions = allOf.filter(
        (permission) => !effectivePermissions.has(permission),
      );

      if (missingPermissions.length > 0) {
        const permissionNames = missingPermissions
          .map((p) => this.getPermissionDisplayName(p))
          .join(', ');

        this.warnThrottled(
          `${userId}|allOf|${missingPermissions.join(',')}`,
          (note) =>
            `403 — người dùng ${userId} thiếu quyền (cần ĐỦ): ${missingPermissions.join(', ')}${note}`,
        );
        throw new ForbiddenException(
          `Bạn không có quyền thực hiện thao tác này. Thiếu quyền: ${permissionNames}`,
        );
      }
    }
  }

  /**
   * Get display name for permission code
   */
  private getPermissionDisplayName(permission: string): string {
    const names: Record<string, string> = {
      ['orders.view']: 'Xem đơn hàng',
      ['orders.manage']: 'Quản lý đơn hàng',
      ['invoices.view']: 'Xem hóa đơn',
      ['invoices.manage']: 'Quản lý hóa đơn',
    };
    return names[permission] || permission;
  }
}
