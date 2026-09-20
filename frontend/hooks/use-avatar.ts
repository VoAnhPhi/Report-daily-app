import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { createUserApis } from '@/app/api/user';
import {
  USER_QUERY_KEYS,
  QUERY_OPTIONS,
  INVALIDATION_PATTERNS,
} from '@/constants/query-keys';
import { Attachment } from '@/types/attachment.type';
import { useStores } from '@/hooks/useStores';
import { useSessionUpdate } from '@/hooks/use-session-update';
import { useCacheInvalidation } from '@/hooks/use-cache-invalidation';

// Types
interface AvatarData {
  avatarUrl: string | null;
}

interface UpdateAvatarData {
  avatarUrl: string;
  originalFileName?: string;
}

interface UseAvatarOptions {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

interface UseAvatarReturn {
  // Query state
  avatarUrl: string | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;

  // Mutation state
  isUpdating: boolean;
  updateError: Error | null;

  // Actions
  updateAvatar: (data: UpdateAvatarData) => Promise<Attachment>;
  refetch: () => Promise<any>;

  // Utilities
  hasAvatar: boolean;
}

/**
 * Custom hook for managing user avatar with TanStack Query
 *
 * Features:
 * - Uses session.user.avatarUrl as initial data (no unnecessary fetch)
 * - Fetches from API only when explicitly needed (refetch, after update)
 * - Optimistic updates
 * - Automatic cache invalidation
 * - Error handling
 * - Loading states
 *
 * @param options - Query options for customization
 * @returns Avatar data and update functions
 */
export const useAvatar = (options: UseAvatarOptions = {}): UseAvatarReturn => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { userStore } = useStores();
  const { triggerSessionUpdate } = useSessionUpdate();
  const { invalidateAllUserQueries } = useCacheInvalidation();

  // Create API client. Memoised: `createUserApis` builds a fresh axios instance
  // (interceptors and all) and this hook mounts in five places — including once
  // per post in the feed — so an unmemoised call meant a new client on every
  // render of every post.
  const apiClient = useMemo(
    () =>
      createUserApis({
        accessToken: session?.accessToken || '',
        refreshToken: session?.refreshToken || '',
        user: session?.user || null,
      }),
    [session?.accessToken, session?.refreshToken, session?.user],
  );

  // Query for fetching avatar from API endpoint
  // NOTE: Always fetch from API to get the latest avatar URL
  // This ensures avatar updates are reflected immediately across the app
  const {
    data: avatarData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: USER_QUERY_KEYS.avatar('current'),
    queryFn: async (): Promise<AvatarData> => {
      const response = await apiClient.get.getAvatar();
      return response;
    },
    // Always enabled when we have access token
    enabled: !!session?.accessToken,
    // Use SHORT stale time to ensure fresh data
    staleTime: options.staleTime || QUERY_OPTIONS.SHORT_STALE_TIME,
    gcTime: options.cacheTime || QUERY_OPTIONS.LONG_CACHE_TIME,
    retry: QUERY_OPTIONS.DEFAULT_RETRY,
    retryDelay: QUERY_OPTIONS.RETRY_DELAY,
    refetchOnMount: true, // Always refetch on mount to get latest avatar
    refetchOnWindowFocus: false,
  });

  // Mutation for updating avatar
  const {
    mutateAsync: updateAvatarMutation,
    isPending: isUpdating,
    error: updateError,
  } = useMutation({
    mutationFn: async (data: UpdateAvatarData): Promise<Attachment> => {
      const response = await apiClient.patch.updateAvatar(
        data.avatarUrl,
        data.originalFileName || 'avatar.jpg',
      );
      return response;
    },
    onSuccess: async (data) => {
      // Optimistically update the cache
      queryClient.setQueryData(USER_QUERY_KEYS.avatar('current'), {
        avatarUrl: data.fileUrl,
      });

      // Also update the MobX store to keep both systems in sync
      userStore.setAvatarUrl(data.fileUrl);

      // Invalidate related queries
      INVALIDATION_PATTERNS.media().forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });

      // Also invalidate profile queries since avatar is part of profile
      queryClient.invalidateQueries({
        queryKey: ['user', 'profile'],
      });

      // No need to trigger session update - the avatar query will refetch
      // and components using useAvatar will get the updated avatarUrl

      // Invalidate all user-related caches to ensure fresh data
      try {
        await invalidateAllUserQueries();
      } catch (error) {
        console.error(
          'Error invalidating user caches after avatar change:',
          error,
        );
      }
    },
    onError: (error) => {
      console.error('Error updating avatar:', error);
    },
  });

  // Helper function to update avatar
  const updateAvatar = async (data: UpdateAvatarData): Promise<Attachment> => {
    return updateAvatarMutation(data);
  };

  // Computed values
  const avatarUrl = avatarData?.avatarUrl || null;
  const hasAvatar = !!avatarUrl;

  return {
    // Query state
    avatarUrl,
    isLoading,
    isError,
    error: error as Error | null,

    // Mutation state
    isUpdating,
    updateError: updateError as Error | null,

    // Actions
    updateAvatar,
    refetch,

    // Utilities
    hasAvatar,
  };
};

/**
 * Hook for updating avatar only (without fetching)
 * Useful when you only need to update avatar without fetching current state
 */
export const useUpdateAvatar = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { userStore } = useStores();
  const { triggerSessionUpdate } = useSessionUpdate();
  const { invalidateAllUserQueries } = useCacheInvalidation();

  const apiClient = createUserApis({
    accessToken: session?.accessToken || '',
    refreshToken: session?.refreshToken || '',
    user: session?.user || null,
  });

  return useMutation({
    mutationFn: async (data: UpdateAvatarData): Promise<Attachment> => {
      const response = await apiClient.patch.updateAvatar(
        data.avatarUrl,
        data.originalFileName || 'avatar.jpg',
      );
      return response;
    },
    onSuccess: async (data) => {
      // Update avatar cache
      queryClient.setQueryData(USER_QUERY_KEYS.avatar('current'), {
        avatarUrl: data.fileUrl,
      });

      // Also update the MobX store to keep both systems in sync
      userStore.setAvatarUrl(data.fileUrl);

      // Invalidate related queries
      INVALIDATION_PATTERNS.media().forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });

      // Invalidate profile queries
      queryClient.invalidateQueries({
        queryKey: ['user', 'profile'],
      });

      // No need to trigger session update - the avatar query will refetch
      // and components using useAvatar will get the updated avatarUrl

      // Invalidate all user-related caches to ensure fresh data
      try {
        await invalidateAllUserQueries();
      } catch (error) {
        console.error(
          'Error invalidating user caches after avatar change:',
          error,
        );
      }
    },
  });
};

/**
 * Hook for fetching avatar only (without update functionality)
 * Useful when you only need to display avatar without update capabilities
 */
export const useAvatarQuery = (options: UseAvatarOptions = {}) => {
  const { data: session } = useSession();

  const apiClient = createUserApis({
    accessToken: session?.accessToken || '',
    refreshToken: session?.refreshToken || '',
    user: session?.user || null,
  });

  return useQuery({
    queryKey: USER_QUERY_KEYS.avatar('current'),
    queryFn: async (): Promise<AvatarData> => {
      const response = await apiClient.get.getAvatar();
      return response;
    },
    enabled: options.enabled !== false && !!session?.accessToken,
    staleTime: options.staleTime || QUERY_OPTIONS.SHORT_STALE_TIME, // Use SHORT_STALE_TIME for real-time avatar updates
    gcTime: options.cacheTime || QUERY_OPTIONS.LONG_CACHE_TIME,
    retry: QUERY_OPTIONS.DEFAULT_RETRY,
    retryDelay: QUERY_OPTIONS.RETRY_DELAY,
  });
};

export default useAvatar;
