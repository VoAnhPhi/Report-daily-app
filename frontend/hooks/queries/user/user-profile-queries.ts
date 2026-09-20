import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

// Types
export interface UserProfile {
  id: string;
  referenceId: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  dob?: string;
  gender?: string;
  country?: string;
  bio?: string;
  website?: string;
  avatarUrl?: string;
  coverUrl?: string;
  verificationDate?: string;
  isActive: boolean;
  status: string;
  role: string;
  isRecognizeUser?: boolean;
  referralsCount: number;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  referrer?: {
    id: string;
    fullName: string;
    referenceId: string;
    avatarUrl?: string;
  };
}

export interface UserStatistics {
  createdAt: string;
  referralsCount: number;
  postsCount: number;
  likesCount: number;
}

// API functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const getAuthHeaders = (accessToken?: string) => {
  return {
    'Content-Type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
  };
};

const fetchUserProfile = async (
  userId: string,
  accessToken?: string,
): Promise<UserProfile> => {
  const response = await fetch(`${API_BASE_URL}/users/profile/${userId}`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }
  return response.json();
};

const fetchUserStatistics = async (
  accessToken?: string,
): Promise<UserStatistics> => {
  const response = await fetch(`${API_BASE_URL}/users/statistics`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch user statistics');
  }
  return response.json();
};

// Query keys
export const USER_PROFILE_QUERY_KEYS = {
  all: ['user', 'profile'] as const,
  profile: (userId: string) =>
    [...USER_PROFILE_QUERY_KEYS.all, userId] as const,
  statistics: (userId: string) => ['user', 'statistics', userId] as const,
};

// Query options
const QUERY_OPTIONS = {
  DEFAULT_STALE_TIME: 5 * 60 * 1000, // 5 minutes
  LONG_STALE_TIME: 30 * 60 * 1000, // 30 minutes
  DEFAULT_CACHE_TIME: 10 * 60 * 1000, // 10 minutes
  LONG_CACHE_TIME: 60 * 60 * 1000, // 1 hour
  DEFAULT_RETRY: 2,
  RETRY_DELAY: 1000,
};

// Hook for fetching user profile
export const useUserProfile = (
  userId: string,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
  },
) => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: USER_PROFILE_QUERY_KEYS.profile(userId),
    queryFn: () => fetchUserProfile(userId, session?.accessToken),
    enabled: options?.enabled !== false && !!userId && !!session?.accessToken,
    staleTime: options?.staleTime ?? 2 * 60 * 1000, // 2 minutes — badges/recognition can change via admin
    gcTime: options?.cacheTime || QUERY_OPTIONS.LONG_CACHE_TIME,
    retry: QUERY_OPTIONS.DEFAULT_RETRY,
    retryDelay: QUERY_OPTIONS.RETRY_DELAY,
  });
};

// Hook for fetching user statistics (current user only)
export const useUserStatistics = (options?: {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}) => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: USER_PROFILE_QUERY_KEYS.statistics('current'),
    queryFn: () => fetchUserStatistics(session?.accessToken),
    enabled: options?.enabled !== false && !!session?.accessToken,
    staleTime: options?.staleTime || QUERY_OPTIONS.DEFAULT_STALE_TIME,
    gcTime: options?.cacheTime || QUERY_OPTIONS.DEFAULT_CACHE_TIME,
    retry: QUERY_OPTIONS.DEFAULT_RETRY,
    retryDelay: QUERY_OPTIONS.RETRY_DELAY,
  });
};

// Hook for updating user profile
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async (data: {
      userId: string;
      updateData: Partial<UserProfile>;
    }) => {
      const response = await fetch(`${API_BASE_URL}/users/${data.userId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(session?.accessToken),
        body: JSON.stringify(data.updateData),
      });
      if (!response.ok) {
        throw new Error('Failed to update user profile');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Update the cache with new data
      queryClient.setQueryData(
        USER_PROFILE_QUERY_KEYS.profile(variables.userId),
        data,
      );

      // Invalidate statistics if they might have changed
      queryClient.invalidateQueries({
        queryKey: USER_PROFILE_QUERY_KEYS.statistics('current'),
      });

      // Invalidate all profile queries to be safe
      queryClient.invalidateQueries({
        queryKey: USER_PROFILE_QUERY_KEYS.all,
      });
    },
  });
};

// Utility hook for cache management
export const useUserProfileCache = () => {
  const queryClient = useQueryClient();

  return {
    // Get cached profile data
    getCachedProfile: (userId: string) => {
      return queryClient.getQueryData(USER_PROFILE_QUERY_KEYS.profile(userId));
    },

    // Set profile data in cache
    setCachedProfile: (userId: string, data: UserProfile) => {
      queryClient.setQueryData(USER_PROFILE_QUERY_KEYS.profile(userId), data);
    },

    // Invalidate profile queries
    invalidateProfile: (userId: string) => {
      queryClient.invalidateQueries({
        queryKey: USER_PROFILE_QUERY_KEYS.profile(userId),
      });
    },

    // Invalidate all profile queries
    invalidateAllProfiles: () => {
      queryClient.invalidateQueries({
        queryKey: USER_PROFILE_QUERY_KEYS.all,
      });
    },
  };
};

// Prefetch hook for better UX
export const usePrefetchUserProfile = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return {
    prefetchUserProfile: (userId: string) => {
      queryClient.prefetchQuery({
        queryKey: USER_PROFILE_QUERY_KEYS.profile(userId),
        queryFn: () => fetchUserProfile(userId, session?.accessToken),
        staleTime: QUERY_OPTIONS.LONG_STALE_TIME,
      });
    },
  };
};
