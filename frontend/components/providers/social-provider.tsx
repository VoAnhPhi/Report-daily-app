'use client';

import { createUserApis } from '@/app/api/user';
import { SuggestUser } from '@/types/features/suggest-user.type';
import {
  Post,
  PostQueryState,
  PostFeeling,
  PostActivityCategory,
  PostActivity,
  PostStatus,
} from '@/types/social.type';
import { signOut } from 'next-auth/react';
import { Session } from 'next-auth';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { toast } from 'sonner';
import socket from '@/lib/socket';
import { createPostApis } from '@/app/api/posts';
import { usePosts, usePostFeelings, usePostActivityCategories } from '@/hooks/queries/use-posts';
import { useQueryClient } from '@tanstack/react-query';
import { postsKeys } from '@/hooks/queries/use-posts';
import { tryCountCommentTowardPost } from '@/lib/comment-realtime-dedup';

// State-only interface (separate from actions to prevent unnecessary re-renders)
interface SocialStateContextType {
  // Posts state
  posts: Post[];
  isLoadingPosts: boolean;
  hasMorePosts: boolean;
  totalPosts: number;

  // Suggested users state
  suggestedUsers: SuggestUser[];
  isLoadingSuggestedUsers: boolean;

  // Filters and search
  filters: PostQueryState;

  // New posts notifications
  hasNewPosts: boolean;
  newPostsCount: number;

  // Social meta
  feelings: PostFeeling[];
  activityCategories: PostActivityCategory[];
  activitiesByCategory: Record<string, PostActivity[]>;
  isLoadingFeelings: boolean;
  isLoadingActivityCategories: boolean;
  isLoadingActivities: boolean;
}

// Actions-only interface
interface SocialActionsContextType {
  loadPosts: (
    reset?: boolean,
    overrideFilters?: Partial<PostQueryState>,
  ) => Promise<void>;
  loadMorePosts: () => Promise<void>;
  loadSpecificPost: (postId: string) => Promise<void>;
  updateFilters: (newFilters: Partial<PostQueryState>) => void;
  resetFilters: () => void;
  refreshPosts: () => Promise<void>;
  loadSuggestedUsers: () => Promise<void>;
  clearNewPostsNotification: () => void;

  // Post interactions
  addPost: (post: Post) => void;
  updatePost: (postId: string, updates: Partial<Post>) => void;
  /** Increment/decrement commentCount from current cache value (for realtime + ack). */
  bumpPostCommentCount: (postId: string, delta?: number) => void;
  removePost: (postId: string) => void;

  fetchActivitiesByCategory: (categoryId: string) => Promise<void>;
}

// Combined type for backward compatibility
interface SocialContextType extends SocialStateContextType, SocialActionsContextType {}

const SocialStateContext = createContext<SocialStateContextType | undefined>(undefined);
const SocialActionsContext = createContext<SocialActionsContextType | undefined>(undefined);

// Legacy combined context for backward compatibility
const SocialContext = createContext<SocialContextType | undefined>(undefined);

const DEFAULT_FILTERS: PostQueryState = {
  mode: 'latest',
  page: 1,
  limit: 10, // Increased from 5 to 10 for smoother infinite scroll
  searchQuery: '',
  referenceId: '',
  showAll: false,
  view: 'feed',
  myPosts: false,
  userId: undefined,
  status: undefined, // undefined = fetch all statuses (normal, active, pro)
};

interface SocialProviderProps {
  children: React.ReactNode;
  session: Session;
}

export function SocialProvider({ children, session }: SocialProviderProps) {
  const queryClient = useQueryClient();

  // State
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestUser[]>([]);
  const [isLoadingSuggestedUsers, setIsLoadingSuggestedUsers] = useState(false);
  const [filters, setFilters] = useState<PostQueryState>(DEFAULT_FILTERS);

  // New posts notification state
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0);

  // Published posts batching state (for future use)
  const publishedPostsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Social meta state - managed via React Query
  const [activitiesByCategory, setActivitiesByCategory] = useState<
    Record<string, PostActivity[]>
  >({});
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Refs
  const suggestedUsersLoaded = useRef(false);
  const processedPostIds = useRef(new Set<string>());

  // React Query hooks for posts data (automatic deduplication)
  // Only use the filters that affect the query key
  const postsQuery = usePosts(
    {
      mode: filters.mode,
      limit: filters.limit,
      searchQuery: filters.searchQuery,
      referenceId: filters.referenceId,
      showAll: filters.showAll,
      view: filters.view,
      myPosts: filters.myPosts,
      userId: filters.userId,
      status: filters.status,
      pendingVerification: filters.pendingVerification,
    },
    { enablePrefetch: true, staleTime: 30_000 }, // 30 seconds
  );

  // Create post API instance (needed for Socket.IO listeners and other operations).
  // Memoized so its identity is stable across renders — otherwise `get` changed
  // every render and re-ran the Socket.IO effect (which depends on `get`) on
  // every render, churning listeners and feeding the feed re-render loop.
  const postApi = useMemo(
    () =>
      session?.accessToken
        ? createPostApis({
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            user: session.user,
          })
        : null,
    [session?.accessToken, session?.refreshToken, session?.user],
  );

  const get = postApi?.get ?? null;

  // React Query hooks for meta data
  const feelingsQuery = usePostFeelings();
  const activityCategoriesQuery = usePostActivityCategories();

  // Extract data from React Query hooks for backward compatibility
  const posts = postsQuery.posts;
  const isLoadingPosts = postsQuery.isLoading;
  const hasMorePosts = postsQuery.hasNextPage ?? false;
  const totalPosts = postsQuery.totalPosts;

  // Extract feelings from infinite query (pages[0] contains the feelings array)
  const feelings = feelingsQuery.data?.pages?.[0] ?? [];
  const activityCategories = activityCategoriesQuery.data?.pages?.[0] ?? [];
  const isLoadingFeelings = feelingsQuery.isLoading;
  const isLoadingActivityCategories = activityCategoriesQuery.isLoading;

  // Handle authentication errors
  const handleAuthError = useCallback(async (error: any) => {
    console.error('Authentication error:', error);

    // Check if it's an authentication error
    if (
      error?.message?.includes('No authentication token found') ||
      error?.message?.includes('Invalid token') ||
      error?.message?.includes('Unauthorized') ||
      error?.status === 401
    ) {
      toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

      // Sign out and redirect to login
      await signOut({
        callbackUrl: `${process.env.NEXT_PUBLIC_CLIENT_URL || ''}/login`,
        redirect: true,
      });
    }
  }, []);

  // Create API instances for suggested users (not posts, which use React Query)
  const userApi = session?.accessToken
    ? createUserApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      })
    : null;

  // Load posts function - now uses React Query cache invalidation
  const loadPosts = useCallback(
    async (reset = false, overrideFilters?: Partial<PostQueryState>) => {
      // If override filters are provided, update filters state
      if (overrideFilters) {
        setFilters((prev) => ({ ...prev, ...overrideFilters, page: 1 }));
      }

      // React Query will automatically refetch when filters change
      // If reset is true, invalidate the current query to force a fresh fetch
      if (reset) {
        await queryClient.invalidateQueries({
          queryKey: postsKeys.lists(),
        });
      }
    },
    [queryClient],
  );

  // Load more posts for infinite scroll.
  // Depend only on the stable `fetchNextPage` and the `hasNextPage` boolean —
  // NOT the whole `postsQuery` object (new identity every render), which made
  // this callback (and everything keyed off it) unstable and drove the loop.
  const loadMorePosts = useCallback(async () => {
    if (postsQuery.hasNextPage) {
      await postsQuery.fetchNextPage();
    }
  }, [postsQuery.hasNextPage, postsQuery.fetchNextPage]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<PostQueryState>) => {
    setFilters((prev) => {
      const next = {
        ...prev,
        ...newFilters,
        page: 1, // Reset page when filters change
      };
      // Auto-sync userId when myPosts is explicitly enabled/disabled
      if (newFilters.myPosts === true && !newFilters.userId && session?.user?.id) {
        next.userId = session.user.id;
      } else if (newFilters.myPosts === false && !newFilters.userId) {
        next.userId = undefined;
      }
      return next;
    });
  }, [session?.user?.id]);

  // Load specific post (for highlighting) - adds to React Query cache
  const loadSpecificPost = useCallback(
    async (postId: string) => {
      if (!postId || !get) return;

      try {
        const response = await get.getPosts({
          ...DEFAULT_FILTERS,
          postId,
          limit: 1,
          page: 1,
        });

        if (response.data.length > 0) {
          const specificPost = response.data[0];
          // Update React Query cache with the new post
          queryClient.setQueriesData({ queryKey: postsKeys.lists() }, (oldData: any) => {
            if (!oldData) return oldData;

            // For infinite query, update the pages
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                data: [
                  specificPost,
                  ...page.data.filter((p: Post) => p.id !== specificPost.id),
                ],
              })),
            };
          });
        }
      } catch (error) {
        console.error('Error loading specific post:', error);
      }
    },
    [queryClient, get],
  );

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  // Refresh posts - now uses React Query refetch
  const refreshPosts = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: postsKeys.lists(),
    });
    // Clear new posts notification when refreshing
    setHasNewPosts(false);
    setNewPostsCount(0);
  }, [queryClient]);

  // Clear new posts notification
  const clearNewPostsNotification = useCallback(() => {
    setHasNewPosts(false);
    setNewPostsCount(0);
  }, []);

  // Load suggested users. Called lazily by the only consumer (the social search
  // modal) when it opens — it used to run on mount for every visitor, and the
  // list is not shown anywhere on the feed itself.
  const loadSuggestedUsers = useCallback(async () => {
    if (isLoadingSuggestedUsers || suggestedUsersLoaded.current || !userApi) return;

    // Check if session exists
    if (!session?.accessToken) {
      await handleAuthError({ message: 'No authentication token found' });
      return;
    }

    setIsLoadingSuggestedUsers(true);

    try {
      const users = await userApi.get.getSuggestedUsers();
      setSuggestedUsers(users);
      suggestedUsersLoaded.current = true;
    } catch (error) {
      console.error('Error loading suggested users:', error);
      await handleAuthError(error);
      toast.error('Không thể tải người dùng gợi ý.');
    } finally {
      setIsLoadingSuggestedUsers(false);
    }
  }, [isLoadingSuggestedUsers, handleAuthError, session?.accessToken, userApi]);

  // Post interactions - update React Query cache
  const addPost = useCallback((post: Post) => {
    queryClient.setQueriesData({ queryKey: postsKeys.lists() }, (oldData: any) => {
      if (!oldData) return oldData;

      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => {
          // Check if post already exists
          if (page.data.some((p: Post) => p.id === post.id)) {
            return page;
          }

          return {
            ...page,
            data: [post, ...page.data],
          };
        }),
      };
    });
  }, [queryClient]);

  const updatePost = useCallback((postId: string, updates: Partial<Post>) => {
    queryClient.setQueriesData({ queryKey: postsKeys.lists() }, (oldData: any) => {
      if (!oldData) return oldData;

      const newUpdates = { ...updates };
      // Enforce mutual exclusivity between feeling and activity
      if ('feeling' in updates && updates.feeling !== undefined) {
        newUpdates.activity = undefined;
      } else if ('activity' in updates && updates.activity !== undefined) {
        newUpdates.feeling = undefined;
      }

      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          data: page.data.map((post: Post) => {
            if (post.id !== postId) return post;
            return { ...post, ...newUpdates };
          }),
        })),
      };
    });
  }, [queryClient]);

  const bumpPostCommentCount = useCallback((postId: string, delta: number = 1) => {
    queryClient.setQueriesData({ queryKey: postsKeys.lists() }, (oldData: any) => {
      if (!oldData) return oldData;

      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          data: page.data.map((post: Post) =>
            post.id === postId
              ? {
                  ...post,
                  commentCount: Math.max(0, (post.commentCount ?? 0) + delta),
                }
              : post,
          ),
        })),
      };
    });
  }, [queryClient]);

  const removePost = useCallback((postId: string) => {
    queryClient.setQueriesData({ queryKey: postsKeys.lists() }, (oldData: any) => {
      if (!oldData) return oldData;

      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          data: page.data.filter((post: Post) => post.id !== postId),
        })),
      };
    });
  }, [queryClient]);

  // Fetch activities for a category
  const fetchActivitiesByCategory = useCallback(
    async (categoryId: string) => {
      if (!get) return;

      setIsLoadingActivities(true);
      try {
        const res = await get.getActivitiesByCategory?.(categoryId);
        setActivitiesByCategory((prev) => ({
          ...prev,
          [categoryId]: res || [],
        }));
      } catch (error) {
        console.error('Error fetching activities by category:', error);
        setActivitiesByCategory((prev) => ({ ...prev, [categoryId]: [] }));
      } finally {
        setIsLoadingActivities(false);
      }
    },
    [get],
  );

  // `loadSuggestedUsers()` no longer runs on mount. `GET /users/suggested` was
  // fired on every page load while the only consumer — the social search modal
  // — calls it itself when it opens.

  // Note: Room joining is now handled centrally in SessionSync component
  // to prevent multiple joins

  // Socket.IO event listeners for real-time updates
  // Uses queryClient.setQueryData to update React Query cache
  useEffect(() => {
    if (!session || !session.user) return;

    // Helper function to update posts in all pages of the infinite query cache
    const updatePostsCache = (updater: (posts: Post[]) => Post[]) => {
      queryClient.setQueriesData({ queryKey: postsKeys.lists() }, (oldData: any) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            data: updater(page.data),
          })),
        };
      });
    };

    // Helper function to update a single post in all pages
    const updateSinglePostInCache = (postId: string, updater: (post: Post) => Post) => {
      updatePostsCache((posts) =>
        posts.map((post) =>
          post.id === postId ? updater(post) : post,
        ),
      );
    };

    // Helper function to check if post exists in cache
    const checkPostExistsInCache = (postId: string): boolean => {
      const allCaches = queryClient.getQueriesData({ queryKey: postsKeys.lists() });
      for (const [, cacheData] of allCaches) {
        const data = cacheData as any;
        if (!data?.pages) continue;
        for (const page of data.pages) {
          if (page.data?.some((p: Post) => p.id === postId)) {
            return true;
          }
        }
      }
      return false;
    };

    const handleNewPost = (newPost: Post) => {
      console.debug('Received new post via socket:', newPost);
      // Prevent duplicate processing of the same post
      if (processedPostIds.current.has(newPost.id)) {
        return;
      }

      // Mark this post as processed
      processedPostIds.current.add(newPost.id);

      // Clean up old processed IDs to prevent memory leaks
      if (processedPostIds.current.size > 100) {
        const idsArray = Array.from(processedPostIds.current);
        processedPostIds.current = new Set(idsArray.slice(-50));
      }

      if (newPost.user.id === session.user.id) {
        // Add post to cache for current user
        const completePost = {
          ...newPost,
          feeling: newPost.feeling || undefined,
          activity: newPost.activity || undefined,
          pinnedProducts: newPost.pinnedProducts || [],
        };

        updatePostsCache((posts) => {
          const exists = posts.find((p) => p.id === newPost.id);
          if (exists) return posts;
          return [completePost, ...posts];
        });
      } else {
        // Only show notification if post status matches current filter
        // When filters.status is undefined, show for all statuses
        const postStatus = newPost.status || PostStatus.normal;
        if (!filters.status || postStatus === filters.status) {
          setHasNewPosts(true);
          setNewPostsCount((prev) => prev + 1);
        }
      }
    };

    const handlePostStatusChanged = async (data: { postId: string; status: PostStatus; previousStatus: PostStatus }) => {
      const postExists = checkPostExistsInCache(data.postId);

      // Update post status in the cache if it exists
      updateSinglePostInCache(data.postId, (post) => ({
        ...post,
        status: data.status,
      }));

      // If post doesn't exist in current cache AND the new status matches current filter
      // Fetch and add the post to the list
      // When filters.status is undefined, match all statuses
      if (!postExists && (!filters.status || data.status === filters.status) && get) {
        try {
          const response = await get.getPosts({
            ...DEFAULT_FILTERS,
            postId: data.postId,
            limit: 1,
            page: 1,
          });

          if (response.data.length > 0) {
            const statusChangedPost = response.data[0];
            updatePostsCache((posts) => {
              const exists = posts.find((p) => p.id === statusChangedPost.id);
              if (exists) return posts;
              return [statusChangedPost, ...posts];
            });
          }
        } catch (error) {
          console.error('Error loading post after status change:', error);
        }
      }

      // Trigger new posts notification if the new status matches current filter
      // When filters.status is undefined, notify for all statuses
      if (!filters.status || data.status === filters.status) {
        setHasNewPosts(true);
        setNewPostsCount((prev) => prev + 1);
      }
    };

    const handlePostPublished = (publishedPost: Post) => {
      // Immediately update the post state with published status
      updateSinglePostInCache(publishedPost.id, (post) => ({
        ...post,
        isPublished: true,
        publishedAt: publishedPost.publishedAt || new Date(),
      }));

      // Future: Could add batched notification logic here if needed
    };

    const handlePostUnpublished = (unpublishedPost: Post) => {
      // Remove unpublished posts from the feed
      updatePostsCache((posts) => posts.filter((post) => post.id !== unpublishedPost.id));
    };

    const handlePostDeleted = (deletedPost: Post) => {
      // Remove the deleted post from current posts
      updatePostsCache((posts) => posts.filter((post) => post.id !== deletedPost.id));
    };

    const handlePostRejected = (rejectedPost: Post) => {
      // Remove the rejected post from current posts
      updatePostsCache((posts) => posts.filter((post) => post.id !== rejectedPost.id));
    };

    const handlePostUpdated = (updatedPost: Post) => {
      // Update the post with new content, clear location if not present
      updateSinglePostInCache(updatedPost.id, (post) => {
        const merged = { ...post, ...updatedPost };
        // If updatedPost.location is undefined, explicitly set location to undefined
        if (
          !('location' in updatedPost) ||
          updatedPost.location === undefined
        ) {
          merged.location = undefined;
        }
        // Ensure pinnedProducts is always an array
        if (!merged.pinnedProducts || !Array.isArray(merged.pinnedProducts)) {
          merged.pinnedProducts = [];
        }
        return merged;
      });
    };

    // Comment event handlers (dedupe vs addComment ack — see lib/comment-realtime-dedup)
    const handleCommentAdded = (data: { postId: string; comment: any }) => {
      const commentId = data.comment?.id;
      if (!commentId || !tryCountCommentTowardPost(commentId)) {
        return;
      }
      updateSinglePostInCache(data.postId, (post) => ({
        ...post,
        commentCount: (post.commentCount ?? 0) + 1,
      }));
    };

    const handleCommentDeleted = (data: {
      postId: string;
      commentId: string;
    }) => {
      updateSinglePostInCache(data.postId, (post) => ({
        ...post,
        commentCount: Math.max(0, post.commentCount - 1),
      }));
    };

    const handleCommentUpdated = ({
      postId,
    }: {
      postId: string;
      comment: any;
    }) => {
      // Comment update doesn't change post data, but cache is now updated
      // Future: Could update comment data in cache if comments are stored
    };

    const handleCommentLiked = ({
      postId,
      commentId,
      userId,
    }: {
      postId: string;
      commentId: string;
      userId: string;
    }) => {
      // This is a simplified like handling
      // In a full implementation, you'd update like counts and states
    };

    // Add event listeners
    socket.on('newPost', handleNewPost);
    socket.on('postStatusChanged', handlePostStatusChanged);
    socket.on('postPublished', handlePostPublished);
    socket.on('postUnpublished', handlePostUnpublished);
    socket.on('postDeleted', handlePostDeleted);
    socket.on('postRejected', handlePostRejected);
    socket.on('postUpdated', handlePostUpdated);
    socket.on('commentAdded', handleCommentAdded);
    socket.on('commentDeleted', handleCommentDeleted);
    socket.on('commentUpdated', handleCommentUpdated);
    socket.on('commentLiked', handleCommentLiked);

    // Cleanup function
    return () => {
      socket.off('newPost', handleNewPost);
      socket.off('postStatusChanged', handlePostStatusChanged);
      socket.off('postPublished', handlePostPublished);
      socket.off('postUnpublished', handlePostUnpublished);
      socket.off('postDeleted', handlePostDeleted);
      socket.off('postRejected', handlePostRejected);
      socket.off('postUpdated', handlePostUpdated);
      socket.off('commentAdded', handleCommentAdded);
      socket.off('commentDeleted', handleCommentDeleted);
      socket.off('commentUpdated', handleCommentUpdated);
      socket.off('commentLiked', handleCommentLiked);
    };
  }, [session, filters.status, queryClient, get]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      const timer = publishedPostsTimerRef.current;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  // Memoize state separately - only changes when state values change
  const stateValue = useMemo(
    () => ({
      posts,
      isLoadingPosts,
      hasMorePosts,
      totalPosts,
      suggestedUsers,
      isLoadingSuggestedUsers,
      filters,
      hasNewPosts,
      newPostsCount,
      feelings,
      activityCategories,
      activitiesByCategory,
      isLoadingFeelings,
      isLoadingActivityCategories,
      isLoadingActivities,
    }),
    [
      posts,
      isLoadingPosts,
      hasMorePosts,
      totalPosts,
      suggestedUsers,
      isLoadingSuggestedUsers,
      filters,
      hasNewPosts,
      newPostsCount,
      feelings,
      activityCategories,
      activitiesByCategory,
      isLoadingFeelings,
      isLoadingActivityCategories,
      isLoadingActivities,
    ],
  );

  // Memoize actions separately - stable callbacks
  const actionsValue = useMemo(
    () => ({
      loadPosts,
      loadMorePosts,
      loadSpecificPost,
      updateFilters,
      resetFilters,
      refreshPosts,
      loadSuggestedUsers,
      clearNewPostsNotification,
      addPost,
      updatePost,
      bumpPostCommentCount,
      removePost,
      fetchActivitiesByCategory,
    }),
    [
      loadPosts,
      loadMorePosts,
      loadSpecificPost,
      updateFilters,
      resetFilters,
      refreshPosts,
      loadSuggestedUsers,
      clearNewPostsNotification,
      addPost,
      updatePost,
      bumpPostCommentCount,
      removePost,
      fetchActivitiesByCategory,
    ],
  );

  // Combined context value for backward compatibility
  const contextValue: SocialContextType = useMemo(
    () => ({ ...stateValue, ...actionsValue }),
    [stateValue, actionsValue],
  );

  return (
    <SocialStateContext.Provider value={stateValue}>
      <SocialActionsContext.Provider value={actionsValue}>
        <SocialContext.Provider value={contextValue}>
          {children}
        </SocialContext.Provider>
      </SocialActionsContext.Provider>
    </SocialStateContext.Provider>
  );
}

// Custom hook to use social context (backward compatible)
export function useSocial() {
  const context = useContext(SocialContext);
  if (context === undefined) {
    throw new Error('useSocial must be used within a SocialProvider');
  }
  return context;
}

// Hook to use only state (won't re-render on action changes)
export function useSocialState() {
  const context = useContext(SocialStateContext);
  if (context === undefined) {
    throw new Error('useSocialState must be used within a SocialProvider');
  }
  return context;
}

// Hook to use only actions
export function useSocialActions() {
  const context = useContext(SocialActionsContext);
  if (context === undefined) {
    throw new Error('useSocialActions must be used within a SocialProvider');
  }
  return context;
}
