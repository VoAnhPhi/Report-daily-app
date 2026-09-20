import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

import { createBabysitterApis } from '@/app/api/babysitter';
import {
  PaginatedTeamCareOrders,
  TeamCareSummary,
  TeamCareTotals,
} from '@/types/team-care.type';
import { MyBabiesResponse } from '@/types/babysitter.type';

export const careKeys = {
  all: ['babysitter', 'team-care'] as const,
  total: (teamId: string) => [...careKeys.all, 'total', teamId] as const,
  summary: (teamId: string, page: number) =>
    [...careKeys.all, 'summary', teamId, page] as const,
  orders: (teamId: string, page: number) =>
    [...careKeys.all, 'orders', teamId, page] as const,
  myBabies: (search: string) =>
    ['babysitter', 'my-babies', search] as const,
};

/**
 * Người tôi đang chăm sóc — cuộn tới đâu tải tới đó, cho dropdown "làm thay".
 * Backend trả cả approved-active lẫn pending; UI tự lọc `status === 'approved'`
 * (chỉ những người này mới thao tác hộ được).
 */
export function useMyBabies(search = '', enabled = true, pageSize = 20) {
  const { data: session } = useSession();

  return useInfiniteQuery<MyBabiesResponse>({
    queryKey: careKeys.myBabies(search),
    queryFn: async ({ pageParam = 1 }) => {
      if (!session?.accessToken) {
        throw new Error('No access token available');
      }
      const apis = createBabysitterApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });
      return apis.get.getMyBabies(pageParam as number, pageSize, search);
    },
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: enabled && !!session?.accessToken,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

/**
 * Tổng "thù lao chăm sóc" (đã hoàn tất VAT) của đội — MỞ cho mọi user đăng
 * nhập (kể cả không phải thành viên). Dùng cho ô tổng trên card.
 */
export function useGetTeamCareTotal(teamId: string, enabled = true) {
  const { data: session } = useSession();

  return useQuery<TeamCareTotals>({
    queryKey: careKeys.total(teamId),
    queryFn: async () => {
      if (!session?.accessToken) {
        throw new Error('No access token available');
      }
      const apis = createBabysitterApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });
      return apis.get.getTeamCareTotal(teamId);
    },
    enabled: !!session?.accessToken && !!teamId && enabled,
    staleTime: 60 * 1000,
    retry: false,
  });
}

/**
 * Team-level "thù lao chăm sóc" — tổng đội (luôn đúng, tính trên toàn bộ) +
 * danh sách thành viên THEO TRANG. Card chỉ cần `summary` (gọi trang 1);
 * Sheet phân trang `members`.
 */
export function useGetTeamCareSummary(
  teamId: string,
  page = 1,
  enabled = true,
) {
  const { data: session } = useSession();

  return useQuery<TeamCareSummary>({
    queryKey: careKeys.summary(teamId, page),
    queryFn: async () => {
      if (!session?.accessToken) {
        throw new Error('No access token available');
      }
      const apis = createBabysitterApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });
      return apis.get.getTeamCareSummary(teamId, page);
    },
    enabled: !!session?.accessToken && !!teamId && enabled,
    staleTime: 60 * 1000,
    // 403 (non-member) / 404 are deterministic — don't hammer the endpoint.
    retry: false,
  });
}

/** Paginated orders contributing F3 care-commission to the team. */
export function useGetTeamCareOrders(
  teamId: string,
  page = 1,
  enabled = true,
) {
  const { data: session } = useSession();

  return useQuery<PaginatedTeamCareOrders>({
    queryKey: careKeys.orders(teamId, page),
    queryFn: async () => {
      if (!session?.accessToken) {
        throw new Error('No access token available');
      }
      const apis = createBabysitterApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });
      return apis.get.getTeamCareOrders(teamId, page);
    },
    enabled: !!session?.accessToken && !!teamId && enabled,
    staleTime: 60 * 1000,
    retry: false,
  });
}
