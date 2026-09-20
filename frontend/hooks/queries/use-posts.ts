import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createPostApis } from '@/app/api/posts';
import {
  Post,
  PostQueryState,
  PostFeeling,
  PostActivityCategory,
  PostActivity,
  PostAnalytics,
  PaginatedPosts,
} from '@/types/social.type';
import { useEffect, useRef } from 'react';
import { POST_QUERY_KEYS } from '@/constants/query-keys';

// ============================================================================
// Query Keys with Next.js Cache Tags
// ============================================================================

/**
 * Query keys for posts with Next.js cache tags support
 * Cache tags format: posts:list, posts:detail:{id}, posts:comments:{id}
 */
export const postsKeys = {
  all: ['posts'] as const,
  lists: () => [...postsKeys.all, 'list'] as const,
  list: (filters: Omit<PostQueryState, 'page'>) =>
    [...postsKeys.lists(), filters] as const,
  detail: (postId: string) => [...postsKeys.all, 'detail', postId] as const,
  analytics: (postId: string) => [...postsKeys.all, 'analytics', postId] as const,
  comments: (postId: string) => [...postsKeys.all, 'comments', postId] as const,
  feelings: () => [...postsKeys.all, 'feelings'] as const,
  activityCategories: () => [...postsKeys.all, 'activity-categories'] as const,
  activities: (categoryId: string) =>
    [...postsKeys.all, 'activities', categoryId] as const,
} as const;

// ============================================================================
// Posts Infinite Query Hook with Prefetching
// ============================================================================

interface UsePostsOptions {
  /**
   * Number of pages ahead to prefetch
   * @default 1
   */
  prefetchPages?: number;

  /**
   * Enable automatic prefetching
   * @default true
   */
  enablePrefetch?: boolean;

  /**
   * Stale time for posts cache
   * @default 30000 (30 seconds)
   */
  staleTime?: number;

  /**
   * Refetch interval for auto-refreshing
   * @default undefined (no auto-refresh)
   */
  refetchInterval?: number | false;
}

/**
 * Hook for fetching posts with infinite scroll and automatic next page prefetching
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { data, fetchNextPage, hasNextPage } = usePosts();
 *
 * // With filters
 * const { data, fetchNextPage } = usePosts({ mode: 'most-reacted' });
 *
 * // With prefetch disabled
 * const { data } = usePosts({}, { enablePrefetch: false });
 * ```
 */
export function usePosts(
  filters: Omit<PostQueryState, 'page'> = { mode: 'latest' },
  options: UsePostsOptions = {},
) {
  const {
    prefetchPages = 1,
    enablePrefetch = true,
    staleTime = 30_000, // 30 seconds - posts update frequently
    refetchInterval = undefined,
  } = options;

  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  // Track pages we've already prefetched to avoid duplication
  const prefetchedPages = useRef<Set<string>>(new Set());

  const query = useInfiniteQuery<PaginatedPosts, Error>({
    queryKey: postsKeys.list(filters),
    queryFn: async ({ pageParam = 1 }) => {
      if (!session?.accessToken) {
        throw new Error('No access token');
      }

      const apis = createPostApis({
        accessToken: session.accessToken,
        user: session.user,
      });

      if (filters.pendingVerification) {
        return apis.get.getPendingVerificationPosts(pageParam as number, filters.limit ?? 10);
      }

      return apis.get.getPosts({
        ...filters,
        page: pageParam as number,
      });
    },
    enabled: isAuthenticated && !!session?.accessToken,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    staleTime,
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchInterval,
    networkMode: 'online', // Only fetch when online
  });

  // Flatten pages into a single array of posts
  const posts = query.data?.pages.flatMap((page) => page.data) ?? [];

  // Get total count from first page
  const totalPosts = query.data?.pages?.[0]?.total ?? 0;

  // Prefetch next pages automatically
  useEffect(() => {
    if (!enablePrefetch || !isAuthenticated) return;

    const prefetchPagesAhead = async () => {
      const pages = query.data?.pages ?? [];
      if (pages.length === 0) return;

      const lastPage = pages[pages.length - 1];
      const currentPage = lastPage?.page ?? 1;
      const totalPages = lastPage?.totalPages ?? 1;

      // Prefetch up to prefetchPages ahead
      for (let i = 1; i <= prefetchPages; i++) {
        const pageToPrefetch = currentPage + i;
        if (pageToPrefetch > totalPages) continue;

        const cacheKey = [...postsKeys.list(filters), pageToPrefetch] as const;

        // Skip if already prefetched
        const cacheKeyStr = JSON.stringify(cacheKey);
        if (prefetchedPages.current.has(cacheKeyStr)) continue;

        // Mark as prefetched
        prefetchedPages.current.add(cacheKeyStr);

        // Prefetch the page
        queryClient.prefetchQuery({
          queryKey: cacheKey,
          queryFn: async () => {
            if (!session?.accessToken) {
              throw new Error('No access token');
            }

            const apis = createPostApis({
              accessToken: session.accessToken,
              user: session.user,
            });

            if (filters.pendingVerification) {
              return apis.get.getPendingVerificationPosts(pageToPrefetch, filters.limit ?? 10);
            }

            return apis.get.getPosts({
              ...filters,
              page: pageToPrefetch,
            });
          },
          staleTime,
        });
      }
    };

    // Wait for the browser to go idle before prefetching. Firing immediately
    // put `/posts?page=2` into the very burst of requests that the first paint
    // is already competing with, for content nobody has scrolled to yet.
    const win = typeof window === 'undefined' ? undefined : window;
    const requestIdle = win?.requestIdleCallback;

    if (requestIdle) {
      const handle = requestIdle(() => void prefetchPagesAhead(), {
        timeout: 3000,
      });
      return () => win?.cancelIdleCallback?.(handle);
    }

    // Safari (and anything else without requestIdleCallback): plain delay.
    const timer = setTimeout(() => void prefetchPagesAhead(), 1500);
    return () => clearTimeout(timer);
  }, [
    query.data?.pages,
    filters,
    enablePrefetch,
    prefetchPages,
    queryClient,
    session,
    isAuthenticated,
    staleTime,
  ]);

  return {
    ...query,
    posts,
    totalPosts,
    // Convenience helpers
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

// ============================================================================
// Individual Post Query Hooks
// ============================================================================

/**
 * Hook for fetching a single post by ID
 * Includes Next.js cache tag: posts:detail:{postId}
 */
export function usePost(postId: string, includeAnalytics = false) {
  const { data: session } = useSession();

  return useInfiniteQuery({
    queryKey: [postsKeys.detail(postId), includeAnalytics],
    queryFn: async () => {
      if (!session?.accessToken) {
        throw new Error('No access token');
      }

      const apis = createPostApis({
        accessToken: session.accessToken,
        user: session.user,
      });

      return apis.get.getPostById(postId, includeAnalytics);
    },
    enabled: !!postId && !!session?.accessToken,
    staleTime: 60_000, // 1 minute
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    initialPageParam: 1,
    getNextPageParam: () => undefined, // No pagination for single post
  });
}

/**
 * Hook for fetching post analytics
 * Includes Next.js cache tag: posts:analytics:{postId}
 */
export function usePostAnalytics(postId: string) {
  const { data: session } = useSession();

  return useInfiniteQuery<PostAnalytics, Error>({
    queryKey: postsKeys.analytics(postId),
    queryFn: async () => {
      if (!session?.accessToken) {
        throw new Error('No access token');
      }

      const apis = createPostApis({
        accessToken: session.accessToken,
        user: session.user,
      });

      return apis.get.getPostAnalytics(postId);
    },
    enabled: !!postId && !!session?.accessToken,
    staleTime: 2 * 60 * 1000, // 2 minutes - analytics change often
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    initialPageParam: 1,
    getNextPageParam: () => undefined,
  });
}

// ============================================================================
// Meta Data Query Hooks (Feelings, Activities, etc.)
// ============================================================================

/**
 * Hook for fetching post feelings (cached for longer, changes rarely)
 */
export function usePostFeelings() {
  const { data: session } = useSession();

  return useInfiniteQuery<PostFeeling[], Error>({
    queryKey: postsKeys.feelings(),
    queryFn: async () => {
      if (!session?.accessToken) {
        throw new Error('No access token');
      }

      const apis = createPostApis({
        accessToken: session.accessToken,
        user: session.user,
      });

      return apis.get.getFeelings();
    },
    enabled: !!session?.accessToken,
    staleTime: 60 * 60 * 1000, // 1 hour - feelings rarely change
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
    initialPageParam: 1,
    getNextPageParam: () => undefined,
  });
}

/**
 * Hook for fetching post activity categories
 */
export function usePostActivityCategories() {
  const { data: session } = useSession();

  return useInfiniteQuery<PostActivityCategory[], Error>({
    queryKey: postsKeys.activityCategories(),
    queryFn: async () => {
      if (!session?.accessToken) {
        throw new Error('No access token');
      }

      const apis = createPostApis({
        accessToken: session.accessToken,
        user: session.user,
      });

      return apis.get.getActivityCategories();
    },
    enabled: !!session?.accessToken,
    staleTime: 60 * 60 * 1000, // 1 hour - categories rarely change
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    initialPageParam: 1,
    getNextPageParam: () => undefined,
  });
}

/**
 * Hook for fetching activities by category
 */
export function usePostActivities(categoryId: string) {
  const { data: session } = useSession();

  return useInfiniteQuery<PostActivity[], Error>({
    queryKey: postsKeys.activities(categoryId),
    queryFn: async () => {
      if (!session?.accessToken) {
        throw new Error('No access token');
      }

      const apis = createPostApis({
        accessToken: session.accessToken,
        user: session.user,
      });

      return apis.get.getActivitiesByCategory(categoryId);
    },
    enabled: !!categoryId && !!session?.accessToken,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchOnWindowFocus: false,
    initialPageParam: 1,
    getNextPageParam: () => undefined,
  });
}

// ============================================================================
// Cache Invalidation Helpers
// ============================================================================

/**
 * Invalidate all posts-related queries
 * Use this after creating, updating, or deleting posts
 */
export function invalidateAllPosts(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: postsKeys.all });
}

/**
 * Invalidate a specific post query
 */
export function invalidatePost(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
) {
  queryClient.invalidateQueries({ queryKey: postsKeys.detail(postId) });
  queryClient.invalidateQueries({ queryKey: postsKeys.analytics(postId) });
}

/**
 * Invalidate posts list queries
 */
export function invalidatePostsList(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: postsKeys.lists() });
}
