import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import {
  USER_QUERY_KEYS,
  QUERY_OPTIONS,
  INVALIDATION_PATTERNS,
} from '@/constants/query-keys';
import { ReferralUser } from '@/types/user.type';
import { UserReferenceResponse } from '@/types/user.type';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';

// Types for the queries
interface PaginationOptions {
  page: number;
  limit: number;
}

interface ReferralUsersResponse {
  data: ReferralUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface UserProfile {
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

interface UserStatistics {
  createdAt: string;
  referralsCount: number;
  postsCount: number;
  likesCount: number;
}

// KYC Types
interface KYCData {
  personalInfo: {
    fullName: string;
    dateOfBirth: string;
    nationality: string;
    idNumber: string;
    address: string;
  };
  documents: {
    frontIdUrl: string | null;
  };
}

interface KYCSubmissionData {
  userId: string;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  address: string;
  kycNumber: string;
  kycFileUrl?: string;
}

interface KYCResponse {
  success: boolean;
  message: string;
  kycId?: string;
  status?: string;
}

// Admin Users Types
interface AdminUserQuery {
  status?: string;
  page?: number;
  limit?: number;
  searchTerm?: string;
}

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  referenceId: string;
  status: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  verificationDate?: string;
  rejectedReason?: string;
  referrer?: {
    id: string;
    fullName: string;
    referenceId: string;
  };
}

interface AdminUsersResponse {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface UserActionRequest {
  userId: string;
  requestAction: string;
  reason?: string;
}

interface UserActionResponse {
  success: boolean;
  message: string;
}

// API functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Helper function to get authentication headers with token
const getAuthHeaders = (accessToken?: string) => {
  return {
    'Content-Type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
  };
};

// KYC API functions
const submitKYC = async (
  data: KYCSubmissionData,
  accessToken?: string,
): Promise<KYCResponse> => {
  const response = await fetch(`${API_BASE_URL}/users/kyc/current`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth,
      nationality: data.nationality,
      address: data.address,
      kycNumber: data.kycNumber,
      kycFileUrl: data.kycFileUrl || null,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to submit KYC');
  }

  return response.json();
};

const updateKYC = async (
  data: KYCSubmissionData,
  accessToken?: string,
): Promise<KYCResponse> => {
  const response = await fetch(`${API_BASE_URL}/users/kyc/current`, {
    method: 'PUT',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth,
      nationality: data.nationality,
      address: data.address,
      kycNumber: data.kycNumber,
      kycFileUrl: data.kycFileUrl || null,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update KYC');
  }

  return response.json();
};

// Note: KYC actions are now handled via WebSocket in use-admin-users.ts
// This function is kept for backward compatibility but should not be used for admin actions
const performKYCAction = async (
  action: 'draft' | 'submit' | 'approve' | 'reject',
  message?: string,
  accessToken?: string,
): Promise<KYCResponse> => {
  const response = await fetch(`${API_BASE_URL}/users/kyc/action`, {
    method: 'PUT',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ action, message }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to perform KYC action: ${action}`,
    );
  }

  return response.json();
};

const fetchKYC = async (
  accessToken?: string,
): Promise<{
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  address: string;
  kycNumber: string;
  kycFileUrl?: string;
  message?: string;
} | null> => {
  const response = await fetch(`${API_BASE_URL}/users/kyc/current`, {
    headers: getAuthHeaders(accessToken),
  });

  if (response.status === 404) {
    // No KYC data exists yet
    return null;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch KYC data');
  }

  return response.json();
};

const fetchReferralUsers = async (
  userId: string,
  pagination: PaginationOptions,
  accessToken?: string,
  type: 'all' | 'direct' | 'indirect' = 'all',
  searchTerm?: string,
  statusFilter?: string,
): Promise<ReferralUsersResponse> => {
  const params = new URLSearchParams({
    page: String(pagination.page),
    limit: String(pagination.limit),
    type,
  });
  if (searchTerm && searchTerm.trim()) {
    params.append('searchTerm', searchTerm.trim());
  }
  if (statusFilter && statusFilter !== 'all') {
    params.append('status', statusFilter);
  }
  const response = await fetch(
    `${API_BASE_URL}/users/referral-users/${userId}?${params.toString()}`,
    {
      headers: getAuthHeaders(accessToken),
    },
  );
  if (!response.ok) {
    throw new Error('Failed to fetch referral users');
  }
  return response.json();
};

const fetchDirectReferrals = async (
  userId: string,
  pagination: PaginationOptions,
  accessToken?: string,
  searchTerm?: string,
  statusFilter?: string,
): Promise<ReferralUsersResponse> => {
  const params = new URLSearchParams({
    page: String(pagination.page),
    limit: String(pagination.limit),
  });
  if (searchTerm && searchTerm.trim()) {
    params.append('searchTerm', searchTerm.trim());
  }
  if (statusFilter && statusFilter !== 'all') {
    params.append('status', statusFilter);
  }
  const response = await fetch(
    `${API_BASE_URL}/users/direct-referrals/${userId}?${params.toString()}`,
    {
      headers: getAuthHeaders(accessToken),
    },
  );
  if (!response.ok) {
    throw new Error('Failed to fetch direct referrals');
  }
  return response.json();
};

const fetchIndirectReferrals = async (
  userId: string,
  pagination: PaginationOptions,
  accessToken?: string,
  searchTerm?: string,
  statusFilter?: string,
): Promise<ReferralUsersResponse> => {
  const params = new URLSearchParams({
    page: String(pagination.page),
    limit: String(pagination.limit),
  });
  if (searchTerm && searchTerm.trim()) {
    params.append('searchTerm', searchTerm.trim());
  }
  if (statusFilter && statusFilter !== 'all') {
    params.append('status', statusFilter);
  }
  const response = await fetch(
    `${API_BASE_URL}/users/indirect-referrals/${userId}?${params.toString()}`,
    {
      headers: getAuthHeaders(accessToken),
    },
  );
  if (!response.ok) {
    throw new Error('Failed to fetch indirect referrals');
  }
  return response.json();
};

const fetchUserProfile = async (
  userId: string,
  accessToken?: string,
): Promise<UserProfile> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/profile/${userId}`, {
      headers: getAuthHeaders(accessToken),
    });

    return response.json();
  } catch (error) {
    throw error;
  }
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

const fetchUserAvatar = async (
  accessToken?: string,
): Promise<{ avatarUrl: string | null }> => {
  const response = await fetch(`${API_BASE_URL}/users/avatar`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch user avatar');
  }
  return response.json();
};

const fetchUserCover = async (
  accessToken?: string,
): Promise<{ coverUrl: string | null }> => {
  const response = await fetch(`${API_BASE_URL}/users/cover`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch user cover');
  }
  return response.json();
};

const fetchSuggestedUsers = async (
  accessToken?: string,
): Promise<ReferralUser[]> => {
  const response = await fetch(`${API_BASE_URL}/users/suggest`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch suggested users');
  }
  return response.json();
};

const fetchNewUsers = async (accessToken?: string): Promise<ReferralUser[]> => {
  const response = await fetch(`${API_BASE_URL}/users/new-users`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch new users');
  }
  return response.json();
};

// Admin Users API functions
const fetchAdminUsers = async (
  query: AdminUserQuery,
  accessToken?: string,
): Promise<AdminUsersResponse> => {
  const params = new URLSearchParams();

  if (query.status) params.append('status', query.status);
  if (query.page) params.append('page', query.page.toString());
  if (query.limit) params.append('limit', query.limit.toString());
  if (query.searchTerm) params.append('searchTerm', query.searchTerm);

  const response = await fetch(
    `${API_BASE_URL}/users/admin/all?${params.toString()}`,
    {
      headers: getAuthHeaders(accessToken),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch admin users');
  }

  return response.json();
};

const requestUserAction = async (
  data: UserActionRequest,
  accessToken?: string,
): Promise<UserActionResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/users/admin/${data.userId}/${data.requestAction}`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(accessToken),
      body: JSON.stringify({ reason: data.reason }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to request user action');
  }

  return response.json();
};

// KYC Mutation Hooks
export const useSubmitKYC = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: (data: KYCSubmissionData) =>
      submitKYC(data, session?.accessToken),
    onSuccess: (data, variables) => {
      // Invalidate user-related queries to reflect KYC status changes
      queryClient.invalidateQueries({
        queryKey: ['user', 'profile'],
      });
      queryClient.invalidateQueries({
        queryKey: ['user', 'statistics'],
      });
    },
  });
};

export const useUpdateKYC = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: (data: KYCSubmissionData) =>
      updateKYC(data, session?.accessToken),
    onSuccess: (data, variables) => {
      // Invalidate user-related queries to reflect KYC status changes
      queryClient.invalidateQueries({
        queryKey: ['user', 'profile'],
      });
      queryClient.invalidateQueries({
        queryKey: ['user', 'statistics'],
      });
    },
  });
};

export const useKYCAction = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: (action: 'draft' | 'submit' | 'approve' | 'reject') =>
      performKYCAction(action, session?.accessToken),
    onSuccess: (data, action) => {
      // Invalidate user-related queries to reflect KYC status changes
      queryClient.invalidateQueries({
        queryKey: ['user', 'profile'],
      });
      queryClient.invalidateQueries({
        queryKey: ['user', 'statistics'],
      });
    },
  });
};

export const useKYC = (options?: {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}) => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['user', 'kyc'],
    queryFn: () => fetchKYC(session?.accessToken),
    enabled: options?.enabled !== false && !!session?.accessToken,
    staleTime: options?.staleTime || 5 * 60 * 1000, // 5 minutes - longer stale time
    gcTime: options?.cacheTime || 1 * 60 * 1000, // 1 minutes - longer cache time
    retry: 1, // Only retry once
    retryDelay: 1000, // 1 second delay
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount if data exists
  });
};

// Admin Users Hooks
export const useAdminUsers = (
  query: AdminUserQuery,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
  },
) => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['admin', 'users', query],
    queryFn: () => fetchAdminUsers(query, session?.accessToken),
    enabled: options?.enabled !== false && !!session?.accessToken,
    staleTime: options?.staleTime || QUERY_OPTIONS.SHORT_STALE_TIME,
    gcTime: options?.cacheTime || QUERY_OPTIONS.DEFAULT_CACHE_TIME,
    retry: QUERY_OPTIONS.DEFAULT_RETRY,
    retryDelay: QUERY_OPTIONS.RETRY_DELAY,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
};

export const useRequestUserAction = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: (data: UserActionRequest) =>
      requestUserAction(data, session?.accessToken),
    onSuccess: (data, variables) => {
      // Invalidate admin users queries to reflect changes
      queryClient.invalidateQueries({
        queryKey: ['admin', 'users'],
      });
    },
  });
};

// Hook for fetching referral users with pagination
export const useReferralUsers = (
  userId: string,
  pagination: PaginationOptions,
  type: 'all' | 'direct' | 'indirect' = 'all',
  searchTerm?: string,
  statusFilter?: string,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
  },
) => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: [
      USER_QUERY_KEYS.referrals(userId, pagination),
      type,
      searchTerm || '',
      statusFilter || 'all',
    ],
    queryFn: () =>
      fetchReferralUsers(
        userId,
        pagination,
        session?.accessToken,
        type,
        searchTerm,
        statusFilter,
      ),
    enabled: options?.enabled !== false && !!userId && !!session?.accessToken,
    staleTime: options?.staleTime || QUERY_OPTIONS.LONG_STALE_TIME, // 30 minutes for better caching
    gcTime: options?.cacheTime || QUERY_OPTIONS.LONG_CACHE_TIME, // 1 hour for better caching
    retry: QUERY_OPTIONS.DEFAULT_RETRY,
    retryDelay: QUERY_OPTIONS.RETRY_DELAY,
    // Keep previous data when pagination changes for smoother UX
    placeholderData: keepPreviousData,
    // Don't refetch on window focus to preserve cache
    refetchOnWindowFocus: false,
    // Don't refetch on reconnect to avoid unnecessary calls
    refetchOnReconnect: false,
    // Don't refetch on mount if data exists and is not stale
    refetchOnMount: false,
    // Add refetch interval to keep data fresh in background
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchIntervalInBackground: true,
  });
};

// Hook for fetching direct referrals with pagination
export const useDirectReferrals = (
  userId: string,
  pagination: PaginationOptions,
  searchTerm?: string,
  statusFilter?: string,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
  },
) => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: [
      USER_QUERY_KEYS.referrals(userId, pagination),
      'direct',
      searchTerm || '',
      statusFilter || 'all',
    ],
    queryFn: () =>
      fetchDirectReferrals(
        userId,
        pagination,
        session?.accessToken,
        searchTerm,
        statusFilter,
      ),
    enabled: options?.enabled !== false && !!userId && !!session?.accessToken,
    staleTime: options?.staleTime || QUERY_OPTIONS.LONG_STALE_TIME,
    gcTime: options?.cacheTime || QUERY_OPTIONS.LONG_CACHE_TIME,
    retry: QUERY_OPTIONS.DEFAULT_RETRY,
    retryDelay: QUERY_OPTIONS.RETRY_DELAY,
    // Keep previous data when pagination changes for smoother UX
    placeholderData: keepPreviousData,
    // Don't refetch on window focus to preserve cache
    refetchOnWindowFocus: false,
    // Don't refetch on reconnect to avoid unnecessary calls
    refetchOnReconnect: false,
    // Don't refetch on mount if data exists and is not stale
    refetchOnMount: false,
    // Add refetch interval to keep data fresh in background
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchIntervalInBackground: true,
  });
};

// Hook for fetching indirect referrals with pagination
export const useIndirectReferrals = (
  userId: string,
  pagination: PaginationOptions,
  searchTerm?: string,
  statusFilter?: string,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
  },
) => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: [
      USER_QUERY_KEYS.referrals(userId, pagination),
      'indirect',
      searchTerm || '',
      statusFilter || 'all',
    ],
    queryFn: () =>
      fetchIndirectReferrals(
        userId,
        pagination,
        session?.accessToken,
        searchTerm,
        statusFilter,
      ),
    enabled: options?.enabled !== false && !!userId && !!session?.accessToken,
    staleTime: options?.staleTime || QUERY_OPTIONS.LONG_STALE_TIME,
    gcTime: options?.cacheTime || QUERY_OPTIONS.LONG_CACHE_TIME,
    retry: QUERY_OPTIONS.DEFAULT_RETRY,
    retryDelay: QUERY_OPTIONS.RETRY_DELAY,
    // Keep previous data when pagination changes for smoother UX
    placeholderData: keepPreviousData,
    // Don't refetch on window focus to preserve cache
    refetchOnWindowFocus: false,
    // Don't refetch on reconnect to avoid unnecessary calls
    refetchOnReconnect: false,
    // Don't refetch on mount if data exists and is not stale
    refetchOnMount: false,
    // Add refetch interval to keep data fresh in background
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchIntervalInBackground: true,
  });
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
    queryKey: USER_QUERY_KEYS.profile(userId),
    queryFn: () => fetchUserProfile(userId, session?.accessToken),
    enabled: options?.enabled !== false && !!userId && !!session?.accessToken,
    staleTime: options?.staleTime || QUERY_OPTIONS.LONG_STALE_TIME,
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
    queryKey: USER_QUERY_KEYS.statistics('current'),
    queryFn: () => fetchUserStatistics(session?.accessToken),
    enabled: options?.enabled !== false && !!session?.accessToken,
    staleTime: options?.staleTime || QUERY_OPTIONS.SHORT_STALE_TIME,
    gcTime: options?.cacheTime || QUERY_OPTIONS.DEFAULT_CACHE_TIME,
    retry: QUERY_OPTIONS.DEFAULT_RETRY,
    retryDelay: QUERY_OPTIONS.RETRY_DELAY,
  });
};

// Hook for fetching user avatar (current user only)
export const useUserAvatar = (options?: {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}) => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: USER_QUERY_KEYS.avatar('current'),
    queryFn: () => fetchUserAvatar(session?.accessToken),
    enabled: options?.enabled !== false && !!session?.accessToken,
    staleTime: options?.staleTime || QUERY_OPTIONS.LONG_STALE_TIME,
    gcTime: options?.cacheTime || QUERY_OPTIONS.LONG_CACHE_TIME,
    retry: QUERY_OPTIONS.DEFAULT_RETRY,
    retryDelay: QUERY_OPTIONS.RETRY_DELAY,
  });
};

// Hook for fetching user cover (current user only)
export const useUserCover = (options?: {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}) => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: USER_QUERY_KEYS.cover('current'),
    queryFn: () => fetchUserCover(session?.accessToken),
    enabled: options?.enabled !== false && !!session?.accessToken,
    staleTime: options?.staleTime || QUERY_OPTIONS.LONG_STALE_TIME,
    gcTime: options?.cacheTime || QUERY_OPTIONS.LONG_CACHE_TIME,
    retry: QUERY_OPTIONS.DEFAULT_RETRY,
    retryDelay: QUERY_OPTIONS.RETRY_DELAY,
  });
};

// Hook for fetching suggested users (current user only)
export const useSuggestedUsers = (options?: {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}) => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: USER_QUERY_KEYS.suggested('current'),
    queryFn: () => fetchSuggestedUsers(session?.accessToken),
    enabled: options?.enabled !== false && !!session?.accessToken,
    staleTime: options?.staleTime || QUERY_OPTIONS.DEFAULT_STALE_TIME,
    gcTime: options?.cacheTime || QUERY_OPTIONS.DEFAULT_CACHE_TIME,
    retry: QUERY_OPTIONS.DEFAULT_RETRY,
    retryDelay: QUERY_OPTIONS.RETRY_DELAY,
  });
};

// Hook for fetching new users
export const useNewUsers = (options?: {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}) => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: USER_QUERY_KEYS.new(),
    queryFn: () => fetchNewUsers(session?.accessToken),
    enabled: options?.enabled !== false && !!session?.accessToken,
    staleTime: options?.staleTime || QUERY_OPTIONS.SHORT_STALE_TIME,
    gcTime: options?.cacheTime || QUERY_OPTIONS.DEFAULT_CACHE_TIME,
    retry: QUERY_OPTIONS.DEFAULT_RETRY,
    retryDelay: QUERY_OPTIONS.RETRY_DELAY,
  });
};

// Mutation hooks for updating user data
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
      // Invalidate and refetch user-related queries
      INVALIDATION_PATTERNS.allUser(variables.userId).forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });

      // Update the cache with new data
      queryClient.setQueryData(USER_QUERY_KEYS.profile(variables.userId), data);
    },
  });
};

export const useUpdateUserAvatar = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async (data: {
      avatarUrl: string;
      originalFileName?: string;
    }) => {
      const response = await fetch(`${API_BASE_URL}/users/update-avatar`, {
        method: 'PATCH',
        headers: getAuthHeaders(session?.accessToken),
        body: JSON.stringify({
          avatarUrl: data.avatarUrl,
          originalFileName: data.originalFileName,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to update user avatar');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate avatar and profile queries for current user
      queryClient.invalidateQueries({
        queryKey: USER_QUERY_KEYS.avatar('current'),
      });
      queryClient.invalidateQueries({
        queryKey: ['user', 'profile'], // Invalidate all profile queries
      });
    },
  });
};

export const useUpdateUserCover = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async (data: {
      coverUrl: string;
      originalFileName?: string;
    }) => {
      const response = await fetch(`${API_BASE_URL}/users/update-cover`, {
        method: 'PATCH',
        headers: getAuthHeaders(session?.accessToken),
        body: JSON.stringify({
          coverUrl: data.coverUrl,
          originalFileName: data.originalFileName,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to update user cover');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate cover and profile queries for current user
      queryClient.invalidateQueries({
        queryKey: USER_QUERY_KEYS.cover('current'),
      });
      queryClient.invalidateQueries({
        queryKey: ['user', 'profile'], // Invalidate all profile queries
      });
    },
  });
};

// Enhanced cache management hook with pagination awareness
export const useReferralUsersCache = () => {
  const queryClient = useQueryClient();

  return {
    // Check if data exists in cache for any pagination
    hasAnyReferralData: (userId: string): boolean => {
      const queries = queryClient.getQueriesData({
        queryKey: USER_QUERY_KEYS.referralsList(userId),
      });
      return queries.length > 0 && queries.some(([, data]) => data != null);
    },

    // Get cached data for specific pagination
    getCachedReferralData: (userId: string, pagination: PaginationOptions) => {
      return queryClient.getQueryData(
        USER_QUERY_KEYS.referrals(userId, pagination),
      );
    },

    // Set data in cache for specific pagination
    setCachedReferralData: (
      userId: string,
      pagination: PaginationOptions,
      data: ReferralUsersResponse,
    ) => {
      queryClient.setQueryData(
        USER_QUERY_KEYS.referrals(userId, pagination),
        data,
      );
    },

    // Prefetch adjacent pages for better UX
    prefetchAdjacentPages: async (
      userId: string,
      currentPagination: PaginationOptions,
      accessToken?: string,
    ) => {
      const { page, limit } = currentPagination;

      // Prefetch previous page if not on first page
      if (page > 1) {
        queryClient.prefetchQuery({
          queryKey: USER_QUERY_KEYS.referrals(userId, {
            page: page - 1,
            limit,
          }),
          queryFn: () =>
            fetchReferralUsers(userId, { page: page - 1, limit }, accessToken),
          staleTime: QUERY_OPTIONS.LONG_STALE_TIME,
        });
      }

      // Prefetch next page (optimistically)
      queryClient.prefetchQuery({
        queryKey: USER_QUERY_KEYS.referrals(userId, { page: page + 1, limit }),
        queryFn: () =>
          fetchReferralUsers(userId, { page: page + 1, limit }, accessToken),
        staleTime: QUERY_OPTIONS.LONG_STALE_TIME,
      });
    },

    // Invalidate all referral queries for a user
    invalidateAllReferrals: (userId: string) => {
      queryClient.invalidateQueries({
        queryKey: USER_QUERY_KEYS.referralsList(userId),
      });
    },
  };
};

// Utility hooks for cache management
export const useInvalidateUserQueries = () => {
  const queryClient = useQueryClient();

  return {
    invalidateUser: (userId: string) => {
      INVALIDATION_PATTERNS.allUser(userId).forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });
    },
    invalidateReferrals: (userId: string) => {
      INVALIDATION_PATTERNS.allReferrals(userId).forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });
    },
    invalidateAllReferrals: (userId: string) => {
      // Invalidate all referral queries for a user (all pages)
      queryClient.invalidateQueries({
        queryKey: USER_QUERY_KEYS.referralsList(userId),
      });
    },
  };
};

// Prefetch hooks for better UX
export const usePrefetchUserData = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return {
    prefetchUserProfile: (userId: string) => {
      queryClient.prefetchQuery({
        queryKey: USER_QUERY_KEYS.profile(userId),
        queryFn: () => fetchUserProfile(userId, session?.accessToken),
        staleTime: QUERY_OPTIONS.LONG_STALE_TIME,
      });
    },
    prefetchReferralUsers: (userId: string, pagination: PaginationOptions) => {
      queryClient.prefetchQuery({
        queryKey: USER_QUERY_KEYS.referrals(userId, pagination),
        queryFn: () =>
          fetchReferralUsers(userId, pagination, session?.accessToken),
        staleTime: QUERY_OPTIONS.LONG_STALE_TIME, // Increased for better caching
      });
    },
  };
};

// Friend Picker Users Hook (limited to verified users)
export function useFriendPickerUsers(isOpen: boolean) {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<UserReferenceResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Đóng picker thì dọn sạch state. Đây là "đặt lại state khi prop đổi", không
  // phải đồng bộ với hệ thống ngoài, nên chỉnh thẳng trong render theo khuôn
  // giữ-giá-trị-lượt-trước của React; effect bên dưới chỉ còn việc gọi API.
  // Chỉ chạy đúng lượt `isOpen` chuyển true → false, tức đúng lượt mà trước đây
  // effect chạy lại và rơi vào nhánh dọn dẹp.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setResults([]);
      setSearchQuery('');
      setIsLoading(false);
      setError(null);
    }
  }

  // Fetch users (debounced for search, immediate for open)
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let active = true;
    let timeout: NodeJS.Timeout | null = null;

    const fetchUsers = async (query: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`,
          {
            headers: getAuthHeaders(session?.accessToken),
          },
        );
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        if (active) setResults(data);
      } catch (err: any) {
        if (active) setError(err.message || 'Error fetching users');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    if (searchQuery.trim()) {
      timeout = setTimeout(() => fetchUsers(searchQuery.trim()), 1000);
    } else {
      // Fetch default list immediately when opened or cleared
      fetchUsers('');
    }

    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
    };
  }, [isOpen, searchQuery, session?.accessToken]);

  // Expose setter for search query
  const updateSearchQuery = useCallback((q: string) => setSearchQuery(q), []);

  return {
    results,
    isLoading,
    error,
    searchQuery,
    setSearchQuery: updateSearchQuery,
  };
}

// Admin User Picker Hook (searches all users in system)
export function useAdminUserPickerUsers(isOpen: boolean) {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Đóng picker thì dọn sạch state — chỉnh trong render theo khuôn
  // giữ-giá-trị-lượt-trước của React, giống hệt `useFriendPickerUsers` ở trên.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setResults([]);
      setSearchQuery('');
      setIsLoading(false);
      setError(null);
    }
  }

  // Fetch users (debounced for search, immediate for open)
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let active = true;
    let timeout: NodeJS.Timeout | null = null;

    const fetchUsers = async (query: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: '1',
          limit: '50', // Increased limit for better search results
        });

        if (query.trim()) {
          params.append('searchTerm', query.trim());
        }

        const res = await fetch(
          `${API_BASE_URL}/users/admin/all?${params.toString()}`,
          {
            headers: getAuthHeaders(session?.accessToken),
          },
        );
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        if (active) setResults(data.data || []);
      } catch (err: any) {
        if (active) setError(err.message || 'Error fetching users');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    if (searchQuery.trim()) {
      timeout = setTimeout(() => fetchUsers(searchQuery.trim()), 1000);
    } else {
      // Fetch default list immediately when opened or cleared
      fetchUsers('');
    }

    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
    };
  }, [isOpen, searchQuery, session?.accessToken]);

  // Expose setter for search query
  const updateSearchQuery = useCallback((q: string) => setSearchQuery(q), []);

  return {
    results,
    isLoading,
    error,
    searchQuery,
    setSearchQuery: updateSearchQuery,
  };
}

// Export types
export type {
  PaginationOptions,
  ReferralUsersResponse,
  UserProfile,
  UserStatistics,
  KYCData,
  KYCSubmissionData,
  KYCResponse,
  AdminUserQuery,
  AdminUser,
  AdminUsersResponse,
  UserActionRequest,
  UserActionResponse,
};
