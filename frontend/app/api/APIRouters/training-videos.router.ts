/**
 * Path constants for the member-facing training-videos (Video Rèn Luyện)
 * endpoints. Must match the acta-api `training-videos` controller routes.
 * Static routes declared before parameterised `:id/*` routes (§15).
 */
export const TRAINING_VIDEOS_ROUTER = {
  FEED: '/training-videos/feed',
  /** Chủ đề thực sự có video (để chỉ hiện chip danh mục không rỗng). */
  CATEGORIES: '/training-videos/categories',
  WATCH_SESSION: (id: string) => `/training-videos/${id}/watch-sessions`,
  HEARTBEAT: (id: string) => `/training-videos/${id}/heartbeats`,
  /** Legacy points route — kept for navbar badge only (50-03 left it untouched). */
  ME_PROGRESS: '/training-videos/me/progress',
  /** Số video chưa hoàn thành của người gọi — badge header, đếm server-side (không phụ thuộc trang feed). */
  ME_UNVIEWED_COUNT: '/training-videos/me/unviewed-count',
  /** Kiểm tra phiên xem đang hoạt động (cổng cảnh báo đăng nhập nơi khác) trước khi bắt đầu. */
  ME_ACTIVE_SESSION: '/training-videos/me/active-session',
  /** Xoá mọi phiên xem đang hoạt động (giữ nguyên tiến độ) — nút "Về trang chủ". */
  ME_SESSIONS_CLEAR: '/training-videos/me/sessions/clear',
  // HARD-08 (49-05) — member rating
  RATING: (id: string) => `/training-videos/${id}/rating`,
  // Phase-50 economy routes
  /** CANONICAL VND economy read (50-03 MeEconomyProgressResponseDto). NOT ME_PROGRESS. */
  ME_ECONOMY: '/training-videos/me/economy',
  /**
   * Phase-68 (68-01, D-10) — per-video reward projection for the completion-modal
   * ladder (`{actualReward}đ → {rewardAtNextLevel}đ ở Cấp {nextLevel} → tối đa
   * {maxReward}đ khi đạt Cấp {levelReachingMax}`). STATIC `me/` prefix declared
   * before any param `:id/*` route (§15). Must match the acta-api member route
   * `@Get('me/reward-projection/:videoId')` verbatim.
   */
  ME_REWARD_PROJECTION: (videoId: string) =>
    `/training-videos/me/reward-projection/${videoId}`,
  /**
   * Phase-71 (71-01, D-10) — member per-level reward/cap/accrual projection for
   * the level-card upsell modal (money/view + trần ngày + tiền tích lũy/lượt per
   * level + the caller's `currentLevel`). STATIC `me/` prefix declared before any
   * param `:id/*` route (§15). Must match the acta-api member route
   * `@Get('me/level-reward-projection')` verbatim.
   */
  ME_LEVEL_REWARD_PROJECTION: '/training-videos/me/level-reward-projection',
  ME_WATCH_HISTORY: '/training-videos/me/watch-history',
  ME_PAYMENT_METHODS: '/training-videos/me/payment-methods',
  ME_WITHDRAWALS: '/training-videos/me/withdrawals',
  // Phase-65 (D-16..D-20) — member leaderboard. STATIC routes declared before
  // any param `:id/*` route (§15). Must match the acta-api MemberLeaderboardController
  // (@Controller('training-videos/leaderboard') · @Get() + @Get('me')) verbatim.
  /** Top-10 + always-computed self-rank (D-19). */
  LEADERBOARD: '/training-videos/leaderboard',
  /** Self-only "Thành tích của bạn" card (D-19). */
  LEADERBOARD_ME: '/training-videos/leaderboard/me',
  COMPLETE: (id: string) => `/training-videos/${id}/complete`,
  FREEZE: (id: string) => `/training-videos/${id}/freeze`,
  /** Switch-away reset — reset tiến độ về 0 + nhả khóa phiên khi rời video. */
  ABANDON: (id: string) => `/training-videos/${id}/abandon`,
  CONFIRM_PRESENCE: (id: string) => `/training-videos/${id}/confirm-presence`,
  COMMENTS: (id: string) => `/training-videos/${id}/comments`,
  COMMENT: (commentId: string) => `/training-videos/comments/${commentId}`,
  // Phase-56 (D-05) — member like/unlike toggle (POST = like, DELETE = unlike).
  LIKE: (id: string) => `/training-videos/${id}/like`,
  COMMENT_REACTION: (commentId: string) =>
    `/training-videos/comments/${commentId}/reactions`,
} as const;

export const trainingVideos = TRAINING_VIDEOS_ROUTER;
