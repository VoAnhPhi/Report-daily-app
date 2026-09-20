import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import socket from '@/lib/socket';
import {
  NotificationV2,
  NotificationResponse,
  NotificationQueryParams,
  NotificationStats,
} from '@/types/notification-v2.type';
import { useSoundNotification } from './use-sound-notification';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeaders = (accessToken?: string) => ({
  'Content-Type': 'application/json',
  ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
});

// Fetch notifications with cursor pagination using new API
const fetchNotifications = async ({
  accessToken,
  params = {},
}: {
  accessToken?: string;
  params?: NotificationQueryParams;
}) => {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.cursor) searchParams.set('cursor', params.cursor);

  const response = await fetch(
    `${API_BASE_URL}/notifications/all-data?${searchParams.toString()}`,
    {
      headers: getAuthHeaders(accessToken),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch notifications');
  }

  const data: NotificationResponse = await response.json();

  // Return the page data with stats attached
  const pageData = data.pages[0] || {
    data: [],
    nextCursor: null,
    pageSize: 10,
    nextPage: false,
  };

  // Attach stats to the page data so it's accessible
  return {
    ...pageData,
    stats: data.stats,
  };
};

// Mark notification as read using new API
const markNotificationAsRead = async (
  notificationId: string,
  accessToken?: string,
) => {
  const response = await fetch(
    `${API_BASE_URL}/notifications/${notificationId}/read`,
    {
      method: 'PUT',
      headers: getAuthHeaders(accessToken),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Mark as read error:', errorData);
    throw new Error(errorData.message || 'Failed to mark notification as read');
  }

  const result = await response.json();
  return result;
};

// Mark multiple notifications as read using new API
const markNotificationsAsRead = async (
  notificationIds: string[],
  accessToken?: string,
) => {
  const response = await fetch(`${API_BASE_URL}/notifications/mark-read`, {
    method: 'PUT',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ ids: notificationIds }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Mark notifications as read error:', errorData);
    throw new Error(
      errorData.message || 'Failed to mark notifications as read',
    );
  }

  const result = await response.json();
  return result;
};

// Mark all notifications as read using new API
const markAllNotificationsAsRead = async (accessToken?: string) => {
  const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
    method: 'PUT',
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Mark all as read error:', errorData);
    throw new Error(
      errorData.message || 'Failed to mark all notifications as read',
    );
  }

  const result = await response.json();
  return result;
};

// Mark notifications as seen using new API
const markNotificationsAsSeen = async (accessToken?: string) => {
  const response = await fetch(`${API_BASE_URL}/notifications/mark-seen`, {
    method: 'PUT',
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Mark as seen error:', errorData);
    throw new Error(
      errorData.message || 'Failed to mark notifications as seen',
    );
  }

  const result = await response.json();
  return result;
};

// Main hook for infinite notifications with cursor pagination
export const useNotificationsV2 = (
  accessToken?: string,
  options?: {
    limit?: number;
    enableToast?: boolean;
  },
) => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const lastStatsInvalidateRef = useRef(0);
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const { playMentionSound } = useSoundNotification();
  // Track previous notification count to detect increases
  const previousNotificationCountRef = useRef<number | null>(null);

  const query = useInfiniteQuery({
    queryKey: ['notifications-v2'],
    queryFn: ({ pageParam }) =>
      fetchNotifications({
        accessToken,
        params: {
          limit: options?.limit || 10,
          cursor: pageParam as string,
        },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: any) => {
      // lastPage is now a single page object, get nextCursor directly
      return lastPage?.nextCursor || undefined;
    },
    enabled: !!accessToken && isVisible,
    staleTime: 30000, // 30 seconds
    refetchInterval: isVisible ? 30000 : false, // Auto-refresh only when visible
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Track visibility to disable auto-refresh when not visible
  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR safety

    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Compare notification count on refetch and show toast if increased
  // This runs whenever query data is updated (including refetchInterval every 30s)
  useEffect(() => {
    // Only check when query is not fetching (to avoid checking during initial load)
    if (query.isFetching || !query.data?.pages?.[0]?.stats) return;

    const currentUnreadCount = query.data.pages[0].stats.unread || 0;
    const previousCount = previousNotificationCountRef.current;

    // Only show toast if:
    // 1. We have a previous count (not first load)
    // 2. Current count is greater than previous count
    // 3. Toast is enabled
    if (
      previousCount !== null &&
      currentUnreadCount > previousCount &&
      options?.enableToast !== false
    ) {
      const increaseCount = currentUnreadCount - previousCount;
      toast.info('🔔 Bạn có thông báo mới!', {
        description: `Bạn có ${increaseCount} thông báo mới chưa đọc`,
        duration: 3000,
      });
    }

    // Update previous count for next comparison
    previousNotificationCountRef.current = currentUnreadCount;
  }, [query.data, query.isFetching, query.dataUpdatedAt, options?.enableToast]);

  // Real-time updates with toast notifications
  useEffect(() => {
    if (!accessToken || !session?.user?.id) return;

    // Helper function to invalidate notification queries
    const invalidateNotificationQueries = () => {
      // Refresh current notification list lazily
      queryClient.invalidateQueries({ queryKey: ['notifications-v2'] });

      // Throttle stats invalidation to avoid spamming the API
      const now = Date.now();
      if (now - lastStatsInvalidateRef.current > 10000) {
        lastStatsInvalidateRef.current = now;
        queryClient.invalidateQueries({
          queryKey: ['notifications-v2', 'stats'],
        });
      }
    };

    // KYC Status Update Handler
    const handleKycStatusUpdate = (data: any) => {
      if (options?.enableToast !== false) {
        toast.dismiss();

        if (data.type === 'kycApproved') {
          toast.success('✅ KYC của bạn đã được phê duyệt!', {
            description: 'Tài khoản của bạn đã được xác minh thành công.',
            duration: 1000,
          });
        } else if (data.type === 'kycChanging') {
          toast.warning('⚠️ KYC cần cập nhật', {
            description:
              data.message || 'Vui lòng cập nhật thông tin KYC theo yêu cầu.',
            duration: 1000,
          });
        }
      }

      invalidateNotificationQueries();
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    };

    // Post Commented Handler
    const handlePostCommented = (data: any) => {
      if (options?.enableToast !== false) {
        toast.dismiss();

        toast.info('💬 Bạn có bình luận mới!', {
          description: `${data.commenterName} đã bình luận bài viết của bạn`,
          duration: 1000,
          action: {
            label: 'Xem',
            onClick: () => {
              if (data.notificationId) {
                markNotificationAsRead(
                  data.notificationId,
                  session?.accessToken,
                )
                  .then(() => {
                    queryClient.invalidateQueries({
                      queryKey: ['notifications-v2'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['notifications-v2', 'stats'],
                    });
                  })
                  .catch(() => {});
              }
              router.push(`/?feature=community&postId=${data.postId}`);
            },
          },
        });
      }
      invalidateNotificationQueries();
    };

    // Post Liked Handler
    const handlePostLiked = (data: any) => {
      if (options?.enableToast !== false) {
        toast.dismiss();

        toast.success('❤️ Bạn có lượt thích mới!', {
          description: `${data.reactorName} đã thích bài viết của bạn`,
          duration: 1000,
          action: {
            label: 'Xem',
            onClick: () => {
              if (data.notificationId) {
                markNotificationAsRead(
                  data.notificationId,
                  session?.accessToken,
                )
                  .then(() => {
                    queryClient.invalidateQueries({
                      queryKey: ['notifications-v2'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['notifications-v2', 'stats'],
                    });
                  })
                  .catch(() => {});
              }
              router.push(`/?feature=community&postId=${data.postId}`);
            },
          },
        });
      }
      invalidateNotificationQueries();
    };

    // Post Approved Handler
    const handlePostApproved = (data: any) => {
      if (options?.enableToast !== false) {
        toast.dismiss();

        toast.success('✅ Bài viết đã được phê duyệt!', {
          description: `${data.adminName} đã phê duyệt và xuất bản bài viết của bạn`,
          duration: 1000,
          action: {
            label: 'Xem',
            onClick: () => {
              if (data.notificationId) {
                markNotificationAsRead(
                  data.notificationId,
                  session?.accessToken,
                )
                  .then(() => {
                    queryClient.invalidateQueries({
                      queryKey: ['notifications-v2'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['notifications-v2', 'stats'],
                    });
                  })
                  .catch(() => {});
              }
              router.push(`/?feature=community&postId=${data.postId}`);
            },
          },
        });
      }
      invalidateNotificationQueries();
    };

    // Mention Handler - URGENT NOTIFICATION (RED TOAST)
    const handleMention = (data: any) => {
      if (options?.enableToast !== false) {
        toast.dismiss();
        playMentionSound();

        toast.error('🔔 Bạn được nhắc đến!', {
          description: `${data.senderName} đã mention bạn trong ${data.conversationName || 'cuộc trò chuyện'}`,
          duration: 5000,
          action: {
            label: 'Xem tin nhắn',
            onClick: () => {
              if (data.notificationId) {
                markNotificationAsRead(
                  data.notificationId,
                  session?.accessToken,
                )
                  .then(() => {
                    queryClient.invalidateQueries({
                      queryKey: ['notifications-v2'],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['notifications-v2', 'stats'],
                    });
                  })
                  .catch(() => {});
              }
            },
          },
        });
      }
      invalidateNotificationQueries();
    };

    // Referral Handlers
    const handleNewDirectReferral = () => {
      if (options?.enableToast !== false) {
        toast.dismiss();
        toast.success('🎉 Bạn có người đăng ký mới!', {
          description: 'Kiểm tra thông báo để xem chi tiết.',
          duration: 1000,
        });
      }
      invalidateNotificationQueries();
    };

    const handleNewIndirectReferral = () => {
      if (options?.enableToast !== false) {
        toast.dismiss();
        toast.success('🎉 Bạn có người đăng ký gián tiếp mới!', {
          description: 'Kiểm tra thông báo để xem chi tiết.',
          duration: 1000,
        });
      }
      invalidateNotificationQueries();
    };

    // Set up socket event listeners
    const eventHandlers = {
      kycStatusUpdate: handleKycStatusUpdate,
      notificationKycSubmitted: invalidateNotificationQueries,
      newDirectReferralVerified: invalidateNotificationQueries,
      newDirectReferral: handleNewDirectReferral,
      newIndirectReferral: handleNewIndirectReferral,
      postCommented: handlePostCommented,
      postLiked: handlePostLiked,
      postApproved: handlePostApproved,
      mention: handleMention,
    };

    // Register all event listeners
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    // Cleanup function
    return () => {
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [
    accessToken,
    session?.user?.id,
    queryClient,
    options?.enableToast,
    router,
    playMentionSound,
  ]);

  return query;
};

// Hook to fetch notification stats with real-time updates
// Hook to get notification stats from the main notifications response
export const useNotificationStatsV2 = (accessToken?: string) => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const lastInvalidateRef = useRef(0);

  // Get stats from the main notifications query instead of separate API call
  const notificationsQuery = useInfiniteQuery({
    queryKey: ['notifications-v2'],
    queryFn: ({ pageParam }) =>
      fetchNotifications({
        accessToken,
        params: {
          limit: 10,
          cursor: pageParam as string,
        },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: any) => {
      // lastPage is now a single page object, get nextCursor directly
      return lastPage?.nextCursor || undefined;
    },
    enabled: !!accessToken,
    staleTime: 30000, // 30 seconds
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Extract stats from the first page of the response
  const stats = notificationsQuery.data?.pages?.[0]?.stats;

  // Real-time updates for stats
  useEffect(() => {
    if (!accessToken || !session?.user?.id) return;

    const handleStatsUpdate = () => {
      const now = Date.now();
      if (now - lastInvalidateRef.current > 10000) {
        lastInvalidateRef.current = now;
        queryClient.invalidateQueries({ queryKey: ['notifications-v2'] });
      }
    };

    const statsEvents = [
      'kycStatusUpdate',
      'notificationKycSubmitted',
      'newDirectReferralVerified',
      'postCommented',
      'postLiked',
      'postApproved',
      'mention',
    ];

    statsEvents.forEach((event) => {
      socket.on(event, handleStatsUpdate);
    });

    return () => {
      statsEvents.forEach((event) => {
        socket.off(event, handleStatsUpdate);
      });
    };
  }, [accessToken, session?.user?.id, queryClient]);

  return {
    data: stats,
    isLoading: notificationsQuery.isLoading,
    isError: notificationsQuery.isError,
    error: notificationsQuery.error,
  };
};

// Hook to mark notification as read
export const useMarkNotificationAsReadV2 = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: (notificationId: string) =>
      markNotificationAsRead(notificationId, session?.accessToken),
    onError: (error) => {
      console.error('Mark as read mutation error:', error);
      toast.error('Failed to mark notification as read');
    },
    onSuccess: (data, notificationId) => {
      console.log(
        '✅ Successfully marked notification as read:',
        notificationId,
      );

      // Update local state with server response
      queryClient.setQueryData(['notifications-v2'], (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            data:
              page.data?.map((n: NotificationV2) =>
                n.id === notificationId ? { ...n, isRead: true } : n,
              ) || page.data,
          })),
        };
      });

      // Update stats
      queryClient.setQueryData(
        ['notifications-v2', 'stats'],
        (oldStats: NotificationStats) => {
          if (!oldStats) return oldStats;
          return {
            ...oldStats,
            unread: Math.max(0, oldStats.unread - 1),
            read: oldStats.read + 1,
          };
        },
      );
    },
  });
};

// Hook to mark multiple notifications as read
export const useMarkNotificationsAsReadV2 = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: (notificationIds: string[]) =>
      markNotificationsAsRead(notificationIds, session?.accessToken),
    onError: (error) => {
      console.error('Mark notifications as read mutation error:', error);
      toast.error('Failed to mark notifications as read');
    },
    onSuccess: (data, notificationIds) => {
      console.log(
        '✅ Successfully marked notifications as read:',
        notificationIds,
      );

      // Update local state
      queryClient.setQueryData(['notifications-v2'], (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            data:
              page.data?.map((n: NotificationV2) =>
                notificationIds.includes(n.id) ? { ...n, isRead: true } : n,
              ) || page.data,
          })),
        };
      });

      // Update stats
      queryClient.setQueryData(
        ['notifications-v2', 'stats'],
        (oldStats: NotificationStats) => {
          if (!oldStats) return oldStats;
          return {
            ...oldStats,
            unread: Math.max(0, oldStats.unread - notificationIds.length),
            read: oldStats.read + notificationIds.length,
          };
        },
      );
    },
  });
};

// Hook to mark all notifications as read
export const useMarkAllNotificationsAsReadV2 = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: () => markAllNotificationsAsRead(session?.accessToken),
    onSuccess: () => {
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['notifications-v2'] });
      queryClient.invalidateQueries({
        queryKey: ['notifications-v2', 'stats'],
      });
    },
    onError: (error) => {
      console.error('Mark all as read mutation error:', error);
      toast.error('Failed to mark all notifications as read');
    },
  });
};

// Hook to mark notifications as seen
export const useMarkNotificationsAsSeenV2 = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: () => markNotificationsAsSeen(session?.accessToken),
    onSuccess: () => {
      // Update stats with new lastSeenAt
      queryClient.setQueryData(
        ['notifications-v2', 'stats'],
        (oldStats: NotificationStats) => {
          if (!oldStats) return oldStats;
          return {
            ...oldStats,
            lastSeenAt: new Date().toISOString(),
          };
        },
      );
    },
    onError: (error) => {
      console.error('Mark as seen mutation error:', error);
      toast.error('Failed to mark notifications as seen');
    },
  });
};

// Hook for real-time notification count (optimized for navbar)
export const useNotificationCountV2 = (accessToken?: string) => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const previousCountRef = useRef<number>(0);
  const [isVisible, setIsVisible] = useState(true);

  const query = useInfiniteQuery({
    queryKey: ['notifications-v2'],
    queryFn: ({ pageParam }) =>
      fetchNotifications({
        accessToken,
        params: {
          limit: 10,
          cursor: pageParam as string,
        },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: any) => {
      // lastPage is now a single page object, get nextCursor directly
      return lastPage?.nextCursor || undefined;
    },
    enabled: !!accessToken && isVisible,
    staleTime: 30000, // 30 seconds
    refetchInterval: isVisible ? 30000 : false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Extract unread count from the first page stats
  const unreadCount = query.data?.pages?.[0]?.stats?.unread || 0;

  // Track visibility
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Track count changes to show toast
  useEffect(() => {
    if (unreadCount !== undefined) {
      const currentCount = unreadCount;

      if (
        previousCountRef.current > 0 &&
        currentCount > previousCountRef.current
      ) {
        const newCount = currentCount - previousCountRef.current;

        if (newCount > 0) {
          toast.dismiss();
          toast.success(`Bạn có ${newCount} thông báo mới!`, {
            description: 'Nhấn vào biểu tượng thông báo để xem',
            duration: 1000,
          });
        }
      }

      previousCountRef.current = currentCount;
    }
  }, [unreadCount]);

  // Real-time updates for count
  useEffect(() => {
    if (!accessToken || !session?.user?.id) return;

    const handleCountUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-v2'] });
    };

    const countEvents = [
      'kycStatusUpdate',
      'notificationKycSubmitted',
      'newDirectReferralVerified',
      'postCommented',
      'postLiked',
      'postApproved',
      'mention',
    ];

    countEvents.forEach((event) => {
      socket.on(event, handleCountUpdate);
    });

    return () => {
      countEvents.forEach((event) => {
        socket.off(event, handleCountUpdate);
      });
    };
  }, [accessToken, session?.user?.id, queryClient]);

  return {
    data: unreadCount,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
};
