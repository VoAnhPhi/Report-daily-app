import api from '.';
import { AuthUser } from '@/lib/auth';
import { TRAINING_VIDEOS_ROUTER } from './APIRouters/training-videos.router';
import {
  CompleteTrainingVideoResponse,
  ConfirmPresenceResponse,
  CreateTrainingCommentRequest,
  CreateTrainingWithdrawalRequest,
  FreezeResponse,
  HeartbeatRequest,
  HeartbeatResponse,
  MemberLeaderboard,
  MemberLeaderboardQuery,
  MemberLeaderboardRow,
  MyVideoRating,
  PaginatedTrainingComments,
  PaginatedTrainingFeed,
  RateTrainingVideoRequest,
  TrainingFeedQuery,
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

/**
 * Read-side training-videos API (Video Rèn Luyện). Bearer token is injected by
 * the shared axios singleton via the per-call `...this.tokens` spread, exactly
 * like `app/api/posts/index.ts`.
 */
export class GetTrainingVideoApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async getFeed(query: TrainingFeedQuery = {}): Promise<PaginatedTrainingFeed> {
    const res = await api.get<PaginatedTrainingFeed>(
      TRAINING_VIDEOS_ROUTER.FEED,
      {
        params: query,
        ...this.tokens,
      },
    );
    return res.data;
  }

  // Các chủ đề thực sự có video đã xuất bản (để chỉ hiện chip danh mục không rỗng).
  async getCategories(): Promise<TrainingVideoCategory[]> {
    const res = await api.get<TrainingVideoCategory[]>(
      TRAINING_VIDEOS_ROUTER.CATEGORIES,
      { ...this.tokens },
    );
    return res.data;
  }

  async getMyProgress(): Promise<TrainingProgressSummary> {
    const res = await api.get<TrainingProgressSummary>(
      TRAINING_VIDEOS_ROUTER.ME_PROGRESS,
      {
        ...this.tokens,
      },
    );
    return res.data;
  }

  // Số video chưa hoàn thành của người gọi — đếm server-side, không phụ thuộc số
  // trang feed đã tải (badge GraduationCap ở header).
  async getUnviewedCount(): Promise<{ count: number }> {
    const res = await api.get<{ count: number }>(
      TRAINING_VIDEOS_ROUTER.ME_UNVIEWED_COUNT,
      {
        ...this.tokens,
      },
    );
    return res.data;
  }

  // Entry-gate probe — is a watch session active (possibly on another device)?
  // Phase-77 (77-06, D-04): the stable per-browser `deviceId` rides as a QUERY
  // param (sent only when present) so the backend can recognise the SAME browser
  // (F5 / 2nd tab) and suppress the false "phiên xem ở nơi khác" dialog. The JWT
  // stays in the OPTIONS arg (`...this.tokens`) — deviceId is NEVER mixed into
  // the token options or a body.
  async getActiveSession(deviceId?: string): Promise<ActiveSessionResponse> {
    const res = await api.get<ActiveSessionResponse>(
      TRAINING_VIDEOS_ROUTER.ME_ACTIVE_SESSION,
      {
        ...(deviceId ? { params: { deviceId } } : {}),
        ...this.tokens,
      },
    );
    return res.data;
  }

  // HARD-08 — the caller's current rating + the video's aggregate.
  async getMyRating(videoId: string): Promise<MyVideoRating> {
    const res = await api.get<MyVideoRating>(
      TRAINING_VIDEOS_ROUTER.RATING(videoId),
      {
        ...this.tokens,
      },
    );
    return res.data;
  }

  async getMeProgressEconomy(): Promise<TrainingMeProgress> {
    const res = await api.get<TrainingMeProgress>(
      TRAINING_VIDEOS_ROUTER.ME_ECONOMY,
      { ...this.tokens },
    );
    return res.data;
  }

  async getWatchHistory(): Promise<TrainingWatchHistory> {
    const res = await api.get<TrainingWatchHistory>(
      TRAINING_VIDEOS_ROUTER.ME_WATCH_HISTORY,
      { ...this.tokens },
    );
    return res.data;
  }

  // Phase-68 (68-01, D-10) — per-video reward projection feeding the completion
  // modal's §6.2 unlock ladder. JWT member-gated; caller level resolved
  // server-side. Token passed as options (`...this.tokens`), never the body.
  async getRewardProjection(
    videoId: string,
  ): Promise<TrainingRewardProjection> {
    const res = await api.get<TrainingRewardProjection>(
      TRAINING_VIDEOS_ROUTER.ME_REWARD_PROJECTION(videoId),
      { ...this.tokens },
    );
    return res.data;
  }

  // Phase-71 (71-01/71-03, D-10) — member per-level reward/cap/accrual projection
  // for the level-card upsell modal (money/view + trần ngày + tiền tích lũy/lượt
  // per level + the caller's `currentLevel`). JWT member-gated; level resolved
  // server-side. Token passed as options (`...this.tokens`), never the body —
  // mirror `getRewardProjection`.
  async getLevelRewardProjection(): Promise<TrainingLevelRewardProjection> {
    const res = await api.get<TrainingLevelRewardProjection>(
      TRAINING_VIDEOS_ROUTER.ME_LEVEL_REWARD_PROJECTION,
      { ...this.tokens },
    );
    return res.data;
  }

  async getPaymentMethods(): Promise<TrainingPaymentMethod[]> {
    const res = await api.get<TrainingPaymentMethod[]>(
      TRAINING_VIDEOS_ROUTER.ME_PAYMENT_METHODS,
      { ...this.tokens },
    );
    return res.data;
  }

  async getComments(
    videoId: string,
    params: { cursor?: string; limit?: number } = {},
  ): Promise<PaginatedTrainingComments> {
    const res = await api.get<PaginatedTrainingComments>(
      TRAINING_VIDEOS_ROUTER.COMMENTS(videoId),
      { params, ...this.tokens },
    );
    return res.data;
  }

  // Phase-65 (D-16..D-20) — member leaderboard Top-10 + always-computed self-rank.
  // ⚠ 2nd arg là OPTIONS (params + token-passing `...this.tokens`), KHÔNG phải body —
  // thiếu tokens sẽ giả "Lỗi mạng" (mirror getFeed/getComments). userId của self
  // được suy ra server-side từ JWT (D-5) — FE KHÔNG bao giờ gửi userId.
  //
  // Phase-78 (D-03/D-07, LBS §3) — the query now carries the scope dimension
  // (`scopeType` + `scopeId` + `teamView`) threaded through the SAME session-token
  // call. The axios params serializer drops `undefined`, so a `referral_tree`
  // request never sends a `scopeId` (the server forces root = self, D-07/T-78-10);
  // a `business_team` request sends the selected teamId and the server gates on
  // active membership (D-03/§13/T-78-11). The trimmed `MemberLeaderboard`
  // projection (no money/PII/risk, D-17) is unchanged by scope.
  async getLeaderboard(
    query: MemberLeaderboardQuery = {},
  ): Promise<MemberLeaderboard> {
    const res = await api.get<MemberLeaderboard>(
      TRAINING_VIDEOS_ROUTER.LEADERBOARD,
      { params: query, ...this.tokens },
    );
    return res.data;
  }

  // Self-only "Thành tích của bạn" card — keyed off the JWT user (D-5/D-19).
  // null khi member chưa có hoạt động trong kỳ. Token as options, never body.
  // Phase-78 — honors the same scope params (the server applies the D-07 root-self
  // forcing + D-03 team gate to `me` too: a forbidden team yields self = null).
  async getMyRank(
    query: MemberLeaderboardQuery = {},
  ): Promise<MemberLeaderboardRow | null> {
    const res = await api.get<MemberLeaderboardRow | null>(
      TRAINING_VIDEOS_ROUTER.LEADERBOARD_ME,
      { params: query, ...this.tokens },
    );
    return res.data;
  }
}

/**
 * Write-side training-videos API: start a watch session and send heartbeats.
 * The heartbeat body carries the player's REAL `positionSeconds` plus the
 * honest `visibilityState`/`playbackRate`; the server credits at its own pace.
 */
export class PostTrainingVideoApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async startWatchSession(
    videoId: string,
    takeover?: boolean,
    priorSessionId?: string,
    deviceId?: string,
  ): Promise<WatchSessionResponse> {
    const params: Record<string, string> = {};
    // Cross-device takeover ("Chuyển sang thiết bị này"): ?takeover=1 makes the
    // server force-acquire the lock over any existing holder.
    if (takeover) params.takeover = '1';
    // RC-F same-origin self-reclaim: present the EXACT prior sessionId THIS device
    // held so the server reclaims its OWN ghost lock immediately on a reload / fast
    // A→B switch (no 12s liveness wait). A 2nd device can't supply it, so cross-
    // device single-watch is intact; the server ignores it unless it matches the
    // current lock holder.
    if (priorSessionId && !takeover) params.priorSessionId = priorSessionId;
    // Phase-77 (77-06, D-01/D-04): the stable per-browser `deviceId` rides as a
    // QUERY param (sent only when present) so the backend can same-device
    // self-supersede (silent F5 / multi-tab) instead of false-409ing. Kept out of
    // the body — `data:{}` stays empty — and out of the token OPTIONS (`...this.tokens`).
    if (deviceId) params.deviceId = deviceId;
    const res = await api.post<WatchSessionResponse>(
      TRAINING_VIDEOS_ROUTER.WATCH_SESSION(videoId),
      {
        data: {},
        ...(Object.keys(params).length > 0 ? { params } : {}),
        ...this.tokens,
      },
    );
    return res.data;
  }

  // "Về trang chủ" — clear ALL the user's active watch sessions (lock released +
  // live forensics rows cancelled). Coverage is preserved server-side.
  async clearSessions(): Promise<{
    cleared: boolean;
    cancelledSessions: number;
  }> {
    const res = await api.post<{ cleared: boolean; cancelledSessions: number }>(
      TRAINING_VIDEOS_ROUTER.ME_SESSIONS_CLEAR,
      {
        data: {},
        ...this.tokens,
      },
    );
    return res.data;
  }

  async sendHeartbeat(
    videoId: string,
    body: HeartbeatRequest,
  ): Promise<HeartbeatResponse> {
    const res = await api.post<HeartbeatResponse>(
      TRAINING_VIDEOS_ROUTER.HEARTBEAT(videoId),
      {
        data: body,
        ...this.tokens,
      },
    );
    return res.data;
  }

  // HARD-08 — upsert the caller's rating (1..5 + optional comment). userId is
  // derived server-side from the JWT (never the body) — D-5.
  async rate(
    videoId: string,
    body: RateTrainingVideoRequest,
  ): Promise<MyVideoRating> {
    const res = await api.post<MyVideoRating>(
      TRAINING_VIDEOS_ROUTER.RATING(videoId),
      {
        data: body,
        ...this.tokens,
      },
    );
    return res.data;
  }

  // Phase-55 (D-07): complete BẮT BUỘC kèm `sessionId` (id phiên xem hiện có —
  // RQ-1, KHÔNG thêm field wire mới) để backend bind-session-bind tại complete
  // thành công. ⚠ 2nd arg là options (token-passing), KHÔNG phải body — thiếu
  // tokens sẽ giả "Lỗi mạng"; mirror `abandon` bên dưới.
  //
  // Phase-71 (71-03, D-01..D-03): widened with the two OPTIONAL apply flags —
  // `applyOverflow` ("Dùng ngay" applies the pending over-cap multiplier to THIS
  // matured+earning completion) + `confirmDespiteLoss` (warn-on-loss confirm when
  // the bump would be clipped/floored). No new endpoint — P69 folded apply into
  // `/complete`. Flags ride in the request BODY alongside `sessionId`; tokens stay
  // in the OPTIONS arg (`...this.tokens`), never the body.
  async complete(
    videoId: string,
    sessionId: string,
    applyOverflow?: boolean,
    confirmDespiteLoss?: boolean,
  ): Promise<CompleteTrainingVideoResponse> {
    const res = await api.post<CompleteTrainingVideoResponse>(
      TRAINING_VIDEOS_ROUTER.COMPLETE(videoId),
      { data: { sessionId, applyOverflow, confirmDespiteLoss }, ...this.tokens },
    );
    return res.data;
  }

  async freeze(videoId: string): Promise<FreezeResponse> {
    const res = await api.post<FreezeResponse>(
      TRAINING_VIDEOS_ROUTER.FREEZE(videoId),
      { data: {}, ...this.tokens },
    );
    return res.data;
  }

  async confirmPresence(videoId: string): Promise<ConfirmPresenceResponse> {
    const res = await api.post<ConfirmPresenceResponse>(
      TRAINING_VIDEOS_ROUTER.CONFIRM_PRESENCE(videoId),
      { data: {}, ...this.tokens },
    );
    return res.data;
  }

  // Switch-away reset — reset tiến độ video vừa rời về 0 + nhả khóa phiên (kèm
  // sessionId để server holder-check khi nhả khóa).
  async abandon(
    videoId: string,
    sessionId?: string,
  ): Promise<{ abandoned: boolean }> {
    const res = await api.post<{ abandoned: boolean }>(
      TRAINING_VIDEOS_ROUTER.ABANDON(videoId),
      { data: sessionId ? { sessionId } : {}, ...this.tokens },
    );
    return res.data;
  }

  async createComment(
    videoId: string,
    body: CreateTrainingCommentRequest,
  ): Promise<TrainingVideoComment> {
    const res = await api.post<TrainingVideoComment>(
      TRAINING_VIDEOS_ROUTER.COMMENTS(videoId),
      { data: body, ...this.tokens },
    );
    return res.data;
  }

  async reactComment(
    commentId: string,
    type: ReactionType,
  ): Promise<TrainingVideoComment> {
    const res = await api.post<TrainingVideoComment>(
      TRAINING_VIDEOS_ROUTER.COMMENT_REACTION(commentId),
      { data: { type }, ...this.tokens },
    );
    return res.data;
  }

  async deleteComment(commentId: string): Promise<{ success: boolean }> {
    const res = await api.delete<{ success: boolean }>(
      TRAINING_VIDEOS_ROUTER.COMMENT(commentId),
      { ...this.tokens },
    );
    return res.data;
  }

  // Phase-56 (D-05) — like a video. userId is derived server-side from the JWT
  // (never the body). ⚠ 2nd arg là OPTIONS (token-passing), KHÔNG phải body —
  // thiếu tokens sẽ giả "Lỗi mạng"; mirror `deleteComment`/`abandon`.
  async like(videoId: string): Promise<void> {
    await api.post(TRAINING_VIDEOS_ROUTER.LIKE(videoId), {
      data: {},
      ...this.tokens,
    });
  }

  // Phase-56 (D-05) — unlike a video (idempotent server-side). Token-passing
  // options, NOT a body — mirror `deleteComment`.
  async unlike(videoId: string): Promise<void> {
    await api.delete(TRAINING_VIDEOS_ROUTER.LIKE(videoId), {
      ...this.tokens,
    });
  }

  async requestWithdrawal(
    body: CreateTrainingWithdrawalRequest,
  ): Promise<TrainingWithdrawalRequest> {
    const res = await api.post<TrainingWithdrawalRequest>(
      TRAINING_VIDEOS_ROUTER.ME_WITHDRAWALS,
      { data: body, ...this.tokens },
    );
    return res.data;
  }
}

export const createTrainingVideoApis = (tokens: {
  accessToken: string;
  refreshToken?: string;
  user?: AuthUser;
}) => ({
  get: new GetTrainingVideoApi(tokens),
  post: new PostTrainingVideoApi(tokens),
});
