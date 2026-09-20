import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Role } from '@/types/user.type';
import { canAccessAdminPanel as checkCanAccessAdminPanel, getAdminPanelPath } from '@/lib/permission-rbac';
import { useAuthPermissions } from '@/hooks/auth/use-auth-permissions';

interface UseNavigationLoadingOptions {
  resetDelay?: number; // Delay để reset loading state (ms)
  preventDuplicate?: boolean; // Có ngăn duplicate navigation không
}

export function useNavigationLoading(
  options: UseNavigationLoadingOptions = {},
) {
  const { resetDelay = 1000, preventDuplicate = true } = options;

  const [isNavigating, setIsNavigating] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>('');
  const router = useRouter();
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset loading state when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      setIsNavigating(false);
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    };

    // Listen for route changes
    window.addEventListener('popstate', handleRouteChange);

    // Cleanup function
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // Navigate with loading state
  const navigate = useCallback(
    async (
      path: string,
      options?: {
        replace?: boolean;
        scroll?: boolean;
      },
    ) => {
      // Prevent duplicate navigation
      if (preventDuplicate && isNavigating) {
        return false;
      }

      // Prevent navigation to same path
      if (path === currentPath) {
        return false;
      }

      setIsNavigating(true);
      setCurrentPath(path);

      try {
        if (options?.replace) {
          await router.replace(path);
        } else {
          await router.push(path);
        }

        // Reset loading state after delay
        navigationTimeoutRef.current = setTimeout(() => {
          setIsNavigating(false);
          navigationTimeoutRef.current = null;
        }, resetDelay);

        return true;
      } catch (error) {
        console.error('❌ [Navigation] Navigation failed:', error);
        setIsNavigating(false);
        if (navigationTimeoutRef.current) {
          clearTimeout(navigationTimeoutRef.current);
          navigationTimeoutRef.current = null;
        }
        return false;
      }
    },
    [isNavigating, currentPath, router, preventDuplicate, resetDelay],
  );

  // Navigate and replace current path
  const navigateReplace = useCallback(
    async (path: string) => {
      return navigate(path, { replace: true });
    },
    [navigate],
  );

  // Reset loading state manually
  const resetNavigation = useCallback(() => {
    setIsNavigating(false);
    setCurrentPath('');
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
  }, []);

  return {
    isNavigating,
    currentPath,
    navigate,
    navigateReplace,
    resetNavigation,
  };
}

// Hook đặc biệt cho admin navigation
// Chuyển người dùng sang subdomain admin.acta.vn thay vì route nội bộ /admin
export function useAdminNavigation() {
  const { data: session } = useSession();
  const { permissions, adminRoles } = useAuthPermissions();
  const [isNavigating, setIsNavigating] = useState(false);

  const navigateToAdmin = useCallback(async () => {
    if (isNavigating) return false;

    setIsNavigating(true);

    try {
      const rawBase =
        process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.acta.vn';
      const baseUrl = rawBase.replace(/\/+$/, '');
      const userRole = session?.user?.role;

      // Check if user can access admin panel
      // User can access if they have:
      // 1. Any permissions, OR
      // 2. Any admin roles, OR
      // 3. Role-based access (ADMIN, SUPER_ADMIN, etc.)
      const hasPermissions = permissions && permissions.length > 0;
      const hasAdminRoles = adminRoles && adminRoles.length > 0;
      const hasRoleBasedAccess = checkCanAccessAdminPanel(permissions, userRole);

      if (!hasPermissions && !hasAdminRoles && !hasRoleBasedAccess) {
        console.error('❌ [Navigation] User does not have admin permissions');
        setIsNavigating(false);
        return false;
      }

      // Get the most relevant admin path based on user's permissions
      const path = getAdminPanelPath(permissions, userRole);

      if (typeof window !== 'undefined') {
        window.location.href = `${baseUrl}${path}`;
      }

      return true;
    } catch (error) {
      console.error('❌ [Navigation] Failed to navigate to admin:', error);
      setIsNavigating(false);
      return false;
    }
    // Phụ thuộc là `session` chứ không phải `session?.user`, dù thân hàm chỉ
    // đọc `session?.user?.role`. React Compiler suy ra `session` và từ chối giữ
    // memo thủ công khi mảng ghi hẹp hơn thứ nó suy được — hệ quả là nó bỏ tối
    // ưu CẢ hook này. Ghi rộng ra chỉ khiến callback dựng lại nhiều hơn, không
    // bao giờ ít hơn, nên không có ca nào đọc phải giá trị cũ.
  }, [isNavigating, session, permissions, adminRoles]);

  return {
    isNavigating,
    navigateToAdmin,
  };
}
