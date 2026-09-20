import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { createTrainingVideoApis } from '@/app/api/training-videos';
import { getTrainingDeviceId } from '@/lib/training/device-id';
import {
  CompleteTrainingVideoResponse,
  ConfirmPresenceResponse,
  CreateTrainingCommentRequest,
  CreateTrainingWithdrawalRequest,
  FreezeResponse,
  MemberLeaderboard,
  MemberLeaderboardQuery,
  PaginatedTrainingComments,
  PaginatedTrainingFeed,
  TrainingLevelRewardProjection,
  TrainingMeProgress,
  TrainingPaymentMethod,
  TrainingProgressSummary,
  TrainingRewardProjection,
  TrainingVideoCategory,
  TrainingVideoComment,
  TrainingWatchHistory,
  TrainingWithdrawalRequest,
  WatchSessionResponse,
  ActiveSessionResponse,
} from '@/types/training-video.type';
import { ReactionType } from '@/types/social.type';

// ============================================================================
// Query Keys
// ============================================================================

export const trainingVideoKeys = {
  all: ['training-videos'] as const,
  feed: (category?: TrainingVideoCategory, focusId?: string) =>
    [...trainingVideoKeys.all, 'feed', category ?? 'all', focusId ?? 'none'] as const,
  categories: () => [...trainingVideoKeys.all, 'categories'] as const,
  myProgress: () => [...trainingVideoKeys.all, 'me', 'progress'] as const,
  unviewedCount: () => [...trainingVideoKeys.all, 'me', 'unviewed-count'] as const,
  activeSession: () => [...trainingVideoKeys.all, 'me', 'active-session'] as const,
  meProgressEconomy: () =>
    [...trainingVideoKeys.all, 'me', 'economy'] as const,
  watchHistory: () =>
    [...trainingVideoKeys.all, 'me', 'watch-history'] as const,
  // Phase-68 (D-10) — per-video reward projection for the completion-modal ladder,
  // keyed by videoId so each completed video fetches its OWN unlock path.
  rewardProjection: (videoId: string) =>
    [...trainingVideoKeys.all, 'me', 'reward-projection', videoId] as const,
  // Phase-71 (D-10) — member per-level reward/cap/accrual projection for the
  // level-card upsell modal. Single per-member surface (no videoId) — one cache
  // entry shared by every level card.
  levelRewardProjection: () =>
    [...trainingVideoKeys.all, 'me', 'level-reward-projection'] as const,
  paymentMethods: () =>
    [...trainingVideoKeys.all, 'me', 'payment-methods'] as const,
  comments: (videoId: string) =>
    [...trainingVideoKeys.all, 'comments', videoId] as const,
  // Phase-65 — member leaderboard, keyed by the (mode, from, to) window so a
  // category-tab or time-filter change refetches the correct slice (D-20).
  // Phase-78 — the scope dimension (scopeType, scopeId, teamView) joins the key so
  // switching scope refetches the correct slice instead of serving a stale
  // cross-scope cache hit (without this a scope change would silently reuse the
  // global board's data).
  leaderboard: (query: MemberLeaderboardQuery) =>
    [
      ...trainingVideoKeys.all,
      'leaderboard',
      query.mode ?? 'completion',
      query.from ?? 'default',
      query.to ?? 'now',
      query.scopeType ?? 'global',
      query.scopeId ?? 'none',
      query.teamView ?? 'members',
    ] as const,
} as const;

// ============================================================================
// Feed — vertical TikTok-style infinite scroll (VID-14)
// ============================================================================

/**
 * Infinite-scroll feed of published training videos with the caller's own
 * progress attached. Mirrors `usePosts`: gated on an authenticated session,
 * `page < totalPages` cursor rule, window-focus refetch off.
 */
export function useTrainingVideoFeed(options?: {
  category?: TrainingVideoCategory;
  /** Caller-side gate (e.g. the TRAINING_VIDEOS feature flag). Default true. */
  enabled?: boolean;
  focusId?: string;
}) {
  const category = options?.category;
  const enabled = options?.enabled ?? true;
  const focusId = options?.focusId;
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const query = useInfiniteQuery<PaginatedTrainingFeed, Error>({
    queryKey: trainingVideoKeys.feed(category, focusId),
    queryFn: async ({ pageParam }) => {
      if (!session?.accessToken) {
        throw new Error('No access token');
      }
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      // CURSOR contract: send the previous page's nextCursor (none on page 1).
      // pageParam is typed `unknown` by useInfiniteQuery; it is a string cursor
      // here (initialPageParam null → string thereafter), narrowed before use.
      return apis.get.getFeed({
        ...(pageParam ? { cursor: pageParam as string } : {}),
        ...(category ? { category } : {}),
        ...(!pageParam && focusId ? { focusId } : {}),
      });
    },
    enabled: enabled && isAuthenticated && !!session?.accessToken,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    networkMode: 'online',
  });

  const videos = query.data?.pages.flatMap((page) => page.data) ?? [];
  // Count of LOADED videos only — the cursor feed carries no server total; the
  // header badge uses the dedicated /me/unviewed-count endpoint instead.
  const totalVideos = videos.length;

  return {
    ...query,
    videos,
    totalVideos,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

/**
 * 50-05 — the distinct categories that actually have published videos, so the
 * filter chip row renders ONLY non-empty chủ đề (never a category with 0 video).
 */
export function useTrainingVideoCategories(options?: { enabled?: boolean }) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const enabled = options?.enabled ?? true;

  return useQuery<TrainingVideoCategory[], Error>({
    queryKey: trainingVideoKeys.categories(),
    queryFn: async () => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.get.getCategories();
    },
    enabled: enabled && isAuthenticated && !!session?.accessToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// ============================================================================
// Watch session (VID-14/16) — start a server-clock session for a video
// ============================================================================

/**
 * Starts a watch session for a video, returning the server-issued
 * `sessionId` + `startedAt` that anchor the heartbeat pacing check.
 */
export function useStartWatchSession() {
  const { data: session } = useSession();

  return useMutation<
    WatchSessionResponse,
    Error,
    { videoId: string; takeover?: boolean }
  >({
    mutationFn: async ({ videoId, takeover }) => {
      if (!session?.accessToken) {
        throw new Error('No access token');
      }
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      // RC-F — present the prior sessionId THIS device held for this video (across
      // a reload / fast switch) so the server reclaims its own ghost lock inside the
      // liveness window instead of false-409ing the member's OWN session. Safe: the
      // server reclaims ONLY on an exact holder match, so a stale/foreign value is
      // simply ignored.
      let priorSessionId: string | undefined;
      try {
        priorSessionId =
          sessionStorage.getItem(`training-prior-session-${videoId}`) ??
          undefined;
      } catch {
        priorSessionId = undefined; // private mode — skip; never block the start
      }
      // Phase-77 (77-06, D-01): stamp the stable per-browser deviceId so the
      // server can same-device self-supersede (silent F5 / multi-tab) instead of
      // false-409ing the member's OWN session. undefined (SSR/private-mode) is
      // fine — the server keeps its existing behaviour (D-04 fail-safe).
      const result = await apis.post.startWatchSession(
        videoId,
        takeover,
        priorSessionId,
        getTrainingDeviceId(),
      );
      // Persist the new sessionId so a subsequent reload can prove same-origin.
      try {
        sessionStorage.setItem(
          `training-prior-session-${videoId}`,
          result.sessionId,
        );
      } catch {
        /* private mode — self-reclaim just won't be available; not fatal */
      }
      return result;
    },
  });
}

/**
 * Entry-gate probe — does the member already have an ACTIVE watch session
 * (possibly on another device)? Re-checks on every entry (staleTime 0,
 * refetchOnMount 'always') so the takeover dialog is current. retry:false +
 * gcTime:0 keep it cheap; the gate treats an error as "no active session"
 * (fail-open) so a probe failure never blocks entry.
 */
export function useActiveSession(enabled: boolean = true) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  return useQuery<ActiveSessionResponse, Error>({
    queryKey: trainingVideoKeys.activeSession(),
    queryFn: async () => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      // Phase-77 (77-06, D-04): pass the stable per-browser deviceId so the
      // entry-gate suppresses the false "phiên xem ở nơi khác" dialog on a
      // same-browser F5 / 2nd tab. undefined (SSR/private-mode) → server keeps
      // its existing behaviour.
      return apis.get.getActiveSession(getTrainingDeviceId());
    },
    enabled: enabled && isAuthenticated && !!session?.accessToken,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/** "Về trang chủ" — clear ALL the member's active watch sessions (coverage
 *  preserved server-side). Used by the takeover dialog's leave button. */
export function useClearSessions() {
  const { data: session } = useSession();

  return useMutation<
    { cleared: boolean; cancelledSessions: number },
    Error,
    void
  >({
    mutationFn: async () => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.post.clearSessions();
    },
  });
}

// ============================================================================
// me/progress — canonical training-points total + navbar badge source
// ============================================================================

/**
 * The caller's training progress summary (canonical points total + completed
 * count + an unviewed-today count for the navbar badge).
 */
export function useTrainingProgress() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  return useQuery<TrainingProgressSummary, Error>({
    queryKey: trainingVideoKeys.myProgress(),
    queryFn: async () => {
      if (!session?.accessToken) {
        throw new Error('No access token');
      }
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.get.getMyProgress();
    },
    enabled: isAuthenticated && !!session?.accessToken,
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * HARD-07 — the points the member has earned from training videos TODAY (the
 * `x` in "Hôm nay bạn đã nhận x điểm rèn luyện"). Derived client-side by summing
 * the me/progress ledger history rows whose `createdAt` falls on the local
 * calendar day. There is no per-day TARGET (`y`) exposed by the backend (the
 * daily cap is a server-only ceiling), so the home card renders the x-only form.
 */
export function useTrainingPointsToday(): {
  earnedToday: number;
  isLoading: boolean;
} {
  const { data, isLoading } = useTrainingProgress();
  const earnedToday = (() => {
    if (!data) return 0;
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    return data.history.reduce((sum, row) => {
      const createdAt = new Date(row.createdAt).getTime();
      return createdAt >= startOfDay ? sum + row.points : sum;
    }, 0);
  })();
  return { earnedToday, isLoading };
}

/**
 * Count of published training videos the member has not yet completed — drives
 * the navbar GraduationCap badge. Reads the dedicated server-side
 * GET /training-videos/me/unviewed-count (eligible − completed) so the badge is
 * accurate regardless of how many feed pages are loaded. Previously this DERIVED
 * the count from the loaded feed, so the global navbar badge capped at the first
 * page (20) — the bug this fixes. "Not completed" overall (true same-day
 * semantics is a separate HARD-07 hardening item).
 */
export function useTrainingUnviewedTodayCount(enabled: boolean = true): number {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const { data } = useQuery<number, Error>({
    queryKey: trainingVideoKeys.unviewedCount(),
    queryFn: async () => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      const res = await apis.get.getUnviewedCount();
      return res.count;
    },
    enabled: enabled && isAuthenticated && !!session?.accessToken,
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return data ?? 0;
}

// ============================================================================
// Phase-50 economy hooks
// ============================================================================

/**
 * Canonical VND economy read — reads GET /training-videos/me/economy
 * (MeEconomyProgressResponseDto). NOT the legacy ME_PROGRESS points route.
 */
export function useTrainingMeProgress() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  return useQuery<TrainingMeProgress, Error>({
    queryKey: trainingVideoKeys.meProgressEconomy(),
    queryFn: async () => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.get.getMeProgressEconomy();
    },
    enabled: isAuthenticated && !!session?.accessToken,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useTrainingWatchHistory() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  return useQuery<TrainingWatchHistory, Error>({
    queryKey: trainingVideoKeys.watchHistory(),
    queryFn: async () => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.get.getWatchHistory();
    },
    enabled: isAuthenticated && !!session?.accessToken,
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * VND earned + videos completed from training videos TODAY (the "Nđ" in "Hôm
 * nay bạn đã nhận Nđ thù lao rèn luyện" on the home card). Sums/counts the
 * me/watch-history earn rows whose `completedAt` falls on the local calendar
 * day. Mirrors `useTrainingPointsToday` but over the Phase-50 VND ledger (the
 * card moved from điểm → thù lao/VND). `completedToday` feeds the home card's
 * "còn bao nhiêu lượt nữa là chạm trần hôm nay" progress bar against the D-50
 * 100-lượt/ngày cap.
 */
export function useTrainingVndToday(): {
  earnedVndToday: number;
  completedToday: number;
  isLoading: boolean;
} {
  const { data, isLoading } = useTrainingWatchHistory();
  const { earnedVndToday, completedToday } = (() => {
    if (!data) return { earnedVndToday: 0, completedToday: 0 };
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    return data.rows.reduce(
      (acc, row) => {
        const completedAt = new Date(row.completedAt).getTime();
        if (completedAt >= startOfDay) {
          acc.earnedVndToday += row.amountVnd;
          acc.completedToday += 1;
        }
        return acc;
      },
      { earnedVndToday: 0, completedToday: 0 },
    );
  })();
  return { earnedVndToday, completedToday, isLoading };
}

/**
 * Phase-68 (68-01/68-05, D-10) — the caller's per-video reward projection feeding
 * the completion-modal §6.2 unlock ladder (actualReward / maxReward / nextLevel /
 * rewardAtNextLevel / levelReachingMax). `enabled`-gated so it only fires for a
 * capped/gated video that may carry an unlockable ceiling — the modal snapshots the
 * resolved data into AwardResult at award time, so this never needs to stay live
 * after the carousel auto-advances. Keyed by `videoId` (each video its own ladder),
 * token passed via the api client's per-call options (never the body).
 */
export function useTrainingRewardProjection(
  videoId: string,
  enabled: boolean,
) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  return useQuery<TrainingRewardProjection, Error>({
    queryKey: trainingVideoKeys.rewardProjection(videoId),
    queryFn: async () => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.get.getRewardProjection(videoId);
    },
    enabled:
      enabled && isAuthenticated && !!session?.accessToken && !!videoId,
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Phase-71 (71-03, D-10) — the caller's per-LEVEL reward/cap/accrual projection
 * feeding the clickable level-card upsell modal (money/view + trần ngày + tiền
 * tích lũy/lượt per level + the materialized `currentLevel` driving the "đã đạt"
 * CTA suppression). A single per-member surface (no videoId) — one cache entry
 * shared by every level card. `enabled` defaults to true (cards are always on
 * the levels tab); pass `false` to defer the fetch until the modal opens. Token
 * passed via the api client's per-call options (never the body).
 */
export function useTrainingLevelRewardProjection(enabled = true) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  return useQuery<TrainingLevelRewardProjection, Error>({
    queryKey: trainingVideoKeys.levelRewardProjection(),
    queryFn: async () => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.get.getLevelRewardProjection();
    },
    enabled: enabled && isAuthenticated && !!session?.accessToken,
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useTrainingPaymentMethods() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  return useQuery<TrainingPaymentMethod[], Error>({
    queryKey: trainingVideoKeys.paymentMethods(),
    queryFn: async () => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.get.getPaymentMethods();
    },
    enabled: isAuthenticated && !!session?.accessToken,
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useTrainingComments(videoId: string) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  return useInfiniteQuery({
    queryKey: trainingVideoKeys.comments(videoId),
    queryFn: async ({ pageParam }) => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      // Cursor-based (null = first page, newest-first). Previously this sent
      // `?page=` which the cursor backend ignored, so getNextPageParam never
      // advanced and "Tải thêm" was a no-op.
      return apis.get.getComments(
        videoId,
        pageParam ? { cursor: pageParam } : {},
      );
    },
    enabled: isAuthenticated && !!session?.accessToken && !!videoId,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor : undefined,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// ============================================================================
// Phase-50 mutations
// ============================================================================

export function useCompleteTrainingVideo() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  // Phase-55 (D-07): mutation var `string` → `{ videoId, sessionId }` (mirror
  // useAbandonTrainingVideo) để chuyển id phiên xem hiện có xuống POST body. Một
  // 400 stale-session (CW-1, message backend sở hữu) nổi lên qua channel lỗi/
  // toast sẵn có của CompleteButton (IC-7) — KHÔNG thêm surface mới.
  // Phase-71 (71-03, D-01..D-03): mutation vars widened with the two OPTIONAL apply
  // flags. `applyOverflow` ("Dùng ngay") applies the pending over-cap multiplier to
  // THIS matured+earning completion; `confirmDespiteLoss` is the warn-on-loss
  // confirm. Omitted/false = default keep (D-03). No new endpoint — folded into the
  // existing complete call. The me-economy invalidation below refreshes the "Ví tích
  // lũy" card after an apply.
  return useMutation<
    CompleteTrainingVideoResponse,
    Error,
    {
      videoId: string;
      sessionId: string;
      applyOverflow?: boolean;
      confirmDespiteLoss?: boolean;
    }
  >({
    mutationFn: async ({
      videoId,
      sessionId,
      applyOverflow,
      confirmDespiteLoss,
    }) => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.post.complete(
        videoId,
        sessionId,
        applyOverflow,
        confirmDespiteLoss,
      );
    },
    onSuccess: (res, { videoId }) => {
      // OPTIMISTIC lock-flip — mark the just-completed video locked + zero its
      // coverage in EVERY feed cache IMMEDIATELY (synchronously), before the async
      // refetch lands. The player's CTA + verify gates key on `!video.locked`, so
      // this self-suppresses them at once and closes the dismissal→refetch race:
      // a fast "Tuyệt vời" tap on a slow network could otherwise clear the
      // completedVideoId latch while locked was still stale-false → CTA re-enables →
      // second tap → cooldown 400. The latch keeps the video VISIBLE (not advanced)
      // until dismissal; the invalidation below reconciles the exact nextUnlockAt.
      if (res.awarded) {
        const optimisticUnlockAt = new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString();
        queryClient.setQueriesData<InfiniteData<PaginatedTrainingFeed>>(
          { queryKey: [...trainingVideoKeys.all, 'feed'] },
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                data: page.data.map((v) =>
                  v.id === videoId
                    ? {
                        ...v,
                        locked: true,
                        nextUnlockAt: v.nextUnlockAt ?? optimisticUnlockAt,
                        progress: v.progress
                          ? { ...v.progress, coveragePercent: 0 }
                          : v.progress,
                      }
                    : v,
                ),
              })),
            };
          },
        );
      }
      void queryClient.invalidateQueries({
        queryKey: trainingVideoKeys.meProgressEconomy(),
      });
      // Prefix key → invalidate EVERY feed variant (any category filter), not just
      // the 'all' feed. `feed()` resolves to [...all,'feed','all'], so a member on a
      // category-filtered feed [...all,'feed',<category>] never had the just-completed
      // video refetched → it stayed locked=false → re-watchable → a 2nd POST hit the
      // cooldown 400. Mirrors abandon/like/all-done which already use this prefix.
      void queryClient.invalidateQueries({
        queryKey: [...trainingVideoKeys.all, 'feed'],
      });
      // Hoàn thành video vừa ghi thêm 1 dòng earn vào ledger → lịch sử rèn luyện
      // (cả modal "Lịch sử" lẫn ô "Đã hoàn thành: N lượt") phải refetch, nếu
      // không số dư đã nhảy nhưng lịch sử vẫn hiển thị dữ liệu cũ (lệch số dư).
      void queryClient.invalidateQueries({
        queryKey: trainingVideoKeys.watchHistory(),
      });
    },
  });
}

/**
 * Switch-away reset (50-04): khi rời video (panel phải / phím mũi tên / cuộn),
 * reset tiến độ video VỪA RỜI về 0 trên server + nhả khóa phiên (kèm sessionId
 * để server holder-check). onSuccess đồng bộ cache feed → progress.coveragePercent
 * = 0 để sidebar (max(live, saved)) không hiển thị % cũ khi quay lại.
 */
export function useAbandonTrainingVideo() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation<
    { abandoned: boolean },
    Error,
    { videoId: string; sessionId?: string }
  >({
    mutationFn: async ({ videoId, sessionId }) => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.post.abandon(videoId, sessionId);
    },
    onSuccess: (_res, { videoId }) => {
      queryClient.setQueriesData<InfiniteData<PaginatedTrainingFeed>>(
        { queryKey: [...trainingVideoKeys.all, 'feed'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((v) =>
                v.id === videoId && v.progress
                  ? { ...v, progress: { ...v.progress, coveragePercent: 0 } }
                  : v,
              ),
            })),
          };
        },
      );
    },
  });
}

/**
 * Phase-56 (D-05) — like/unlike toggle with an OPTIMISTIC update over the
 * infinite feed cache. `onMutate` flips `isLiked` + bumps `likeCount` instantly
 * (before the server responds); `onError` rolls the change back SILENTLY — NO
 * toast (operator choice). The server is the source of truth: `onSettled`
 * invalidates the feed so the persisted count reconciles. Mirrors
 * `useAbandonTrainingVideo`'s setQueriesData-over-feed pattern. Typed context
 * `{ previous: unknown }` (§21 — no `any`).
 */
export function useToggleLike() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { videoId: string; like: boolean },
    { previous: unknown }
  >({
    mutationFn: async ({ videoId, like }) => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      if (like) {
        await apis.post.like(videoId);
      } else {
        await apis.post.unlike(videoId);
      }
    },
    onMutate: async ({ videoId, like }) => {
      const key = [...trainingVideoKeys.all, 'feed'];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueriesData({ queryKey: key });
      queryClient.setQueriesData<InfiniteData<PaginatedTrainingFeed>>(
        { queryKey: key },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((v) =>
                v.id === videoId
                  ? {
                      ...v,
                      isLiked: like,
                      likeCount: Math.max(0, v.likeCount + (like ? 1 : -1)),
                    }
                  : v,
              ),
            })),
          };
        },
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      // SILENT rollback — restore each captured feed snapshot, NO toast (D-05).
      if (!ctx?.previous) return;
      for (const [queryKey, data] of ctx.previous as [
        readonly unknown[],
        unknown,
      ][]) {
        queryClient.setQueryData(queryKey, data);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: [...trainingVideoKeys.all, 'feed'],
      });
    },
  });
}

export function useFreezeTrainingVideo() {
  const { data: session } = useSession();

  return useMutation<FreezeResponse, Error, string>({
    mutationFn: async (videoId: string) => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.post.freeze(videoId);
    },
  });
}

export function useConfirmPresence() {
  const { data: session } = useSession();

  return useMutation<ConfirmPresenceResponse, Error, string>({
    mutationFn: async (videoId: string) => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.post.confirmPresence(videoId);
    },
  });
}

export function useCreateTrainingComment(videoId: string) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation<
    TrainingVideoComment,
    Error,
    CreateTrainingCommentRequest
  >({
    mutationFn: async (body: CreateTrainingCommentRequest) => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.post.createComment(videoId, body);
    },
    onSuccess: (newComment, body) => {
      // Surface the new comment IMMEDIATELY (the reported bug: it didn't show
      // until a full page reload). Backend orders top-level newest-first; replies
      // render embedded under their parent (TrainingCommentItem), oldest-first.
      // The invalidate below still runs to reconcile against the server.
      queryClient.setQueryData<
        InfiniteData<PaginatedTrainingComments, string | null>
      >(trainingVideoKeys.comments(videoId), (old) => {
        if (!old || old.pages.length === 0) return old;
        if (body.parentId) {
          // Reply — append under its parent (guard against a double-insert).
          const parentId = body.parentId;
          return {
            ...old,
            pages: old.pages.map((pg) => ({
              ...pg,
              data: pg.data.map((c) =>
                c.id === parentId &&
                !c.replies.some((r) => r.id === newComment.id)
                  ? { ...c, replies: [...c.replies, newComment] }
                  : c,
              ),
            })),
          };
        }
        // Top-level — prepend to page 1 (newest-first).
        const [first, ...rest] = old.pages;
        if (first.data.some((c) => c.id === newComment.id)) return old;
        return {
          ...old,
          pages: [{ ...first, data: [newComment, ...first.data] }, ...rest],
        };
      });
      void queryClient.invalidateQueries({
        queryKey: trainingVideoKeys.comments(videoId),
      });
    },
  });
}

export function useReactTrainingComment(videoId: string) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation<
    TrainingVideoComment,
    Error,
    { commentId: string; type: ReactionType }
  >({
    mutationFn: async ({ commentId, type }) => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.post.reactComment(commentId, type);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: trainingVideoKeys.comments(videoId),
      });
    },
  });
}

export function useDeleteTrainingComment(videoId: string) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (commentId: string) => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.post.deleteComment(commentId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: trainingVideoKeys.comments(videoId),
      });
    },
  });
}

export function useRequestTrainingWithdrawal() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation<
    TrainingWithdrawalRequest,
    Error,
    CreateTrainingWithdrawalRequest
  >({
    mutationFn: async (body: CreateTrainingWithdrawalRequest) => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.post.requestWithdrawal(body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: trainingVideoKeys.meProgressEconomy(),
      });
    },
  });
}

// ============================================================================
// Phase-65 — member leaderboard (Bảng xếp hạng rèn luyện, D-16..D-20)
// ============================================================================

/**
 * The member leaderboard for the selected non-money category + time window:
 * Top-10 podium+list + an always-computed self-rank (D-19). Lean by design —
 * Top-10 + self only, no deep pagination (D-20). Mirrors `useTrainingMeProgress`:
 * gated on an authenticated session, token passed via the api client's per-call
 * options spread (never the body, D-5). Money is never returned (D-17 — the
 * backend serves the trimmed projection).
 */
export function useTrainingLeaderboard(
  query: MemberLeaderboardQuery,
  options?: { enabled?: boolean },
) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  // Phase-78 (GAP-1) — caller-side gate so the member surface can suppress a
  // business_team request while its team id is still unresolved (avoids the
  // no-scopeId→400 class). Mirrors useTrainingVideoFeed's `enabled` pattern.
  const enabled = options?.enabled ?? true;

  return useQuery<MemberLeaderboard, Error>({
    queryKey: trainingVideoKeys.leaderboard(query),
    queryFn: async () => {
      if (!session?.accessToken) throw new Error('No access token');
      const apis = createTrainingVideoApis({
        accessToken: session.accessToken,
        user: session.user,
      });
      return apis.get.getLeaderboard(query);
    },
    enabled: enabled && isAuthenticated && !!session?.accessToken,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
