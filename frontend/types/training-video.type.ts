/**
 * Training Video (Video Rèn Luyện) DTO mirrors — client-side types for the
 * acta-social /videos feed. These mirror the acta-api plan 48-02 response
 * shapes (`training-videos` member module) and the class-validator request
 * bodies. The SERVER is the sole authority for crediting points; everything
 * the client sends is advisory and everything it renders is server-returned.
 *
 * TODO(48-01 contracts): the canonical enums live in
 * `@acta/prisma-contracts` (`training-video.prisma` inline enums
 * `TrainingVideoCategory` / `TrainingVideoStatus` / `WatchProgressStatus`).
 * Keep these literal unions in sync if the contracts enums change.
 */

import type { ReactionType } from '@/types/social.type';

// ---------------------------------------------------------------------------
// Enum unions (mirror the 48-01 contracts inline enums)
// ---------------------------------------------------------------------------

/** Member-facing training video category (lowercase/snake_case per contracts). */
export type TrainingVideoCategory =
  | 'onboarding'
  | 'sales'
  | 'product'
  | 'compliance'
  | 'skill'
  | 'other';

/** Publish lifecycle of a training video. */
export type TrainingVideoStatus = 'draft' | 'published' | 'archived';

/** Per-user watch-progress lifecycle. */
export type WatchProgressStatus = 'not_started' | 'in_progress' | 'completed';

/** Visibility state forwarded honestly to the server pacing check. */
export type TrainingVisibilityState =
  | 'visible'
  | 'hidden'
  | 'prerender'
  | 'unloaded';

// ---------------------------------------------------------------------------
// Progress / segments
// ---------------------------------------------------------------------------

/** A server-credited watched interval, in whole/decimal seconds. */
export interface WatchedSegment {
  start: number;
  end: number;
}

/**
 * The caller's per-video progress (nested in the feed item and returned by
 * `GET /training-videos/me/progress`). All values are server-authoritative.
 */
export interface TrainingWatchProgress {
  coveragePercent: number;
  watchedSegments: WatchedSegment[];
  status: WatchProgressStatus;
  pointsAwardedAt: string | null;
  pointsAwarded: number;
  completedAt: string | null;
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

/** One video in the member feed, with the caller's own progress attached. */
export interface TrainingVideoFeedItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: TrainingVideoCategory;
  pointsReward: number;
  /**
   * Phase 53 — the minimum training level required to earn the FULL `pointsReward`
   * (hệ số). `1` (the default) means "áp dụng mọi cấp" / ungated. A viewer below
   * this level still EARNS, but at an effective multiplier of ×1 (D-02).
   */
  minLevelForMultiplier: number;
  /**
   * Phase 53 — the multiplier THIS viewer actually earns on this video, gated by
   * their materialized training level: `eligible ? pointsReward : 1` (server-resolved).
   */
  effectiveMultiplier: number;
  /**
   * Phase 53 — `true` when the viewer's level ≥ `minLevelForMultiplier` (they earn
   * the full hệ số). Drives the 3-state Hệ số chip (D-08).
   */
  eligible: boolean;
  /**
   * Phase 66 (D-01..D-05) — số tiền THỰC NHẬN dự kiến nếu hoàn thành video này
   * NGAY BÂY GIỜ (Int VND) = mức tiền/lượt cấp hiện tại × hệ số thực nhận →
   * min(trần thưởng video) → min(quota tiền còn lại trong ngày). Display-only —
   * KHÔNG phải snapshot ledger (ledger quyết ở claimAndAward). Mirrors acta-api
   * TrainingVideoFeedResponseDto.actualReward.
   */
  actualReward: number;
  /**
   * Phase 66 (D-01..D-05) — số tiền TỐI ĐA của video tại cấp HIỆN TẠI (Int VND)
   * = mức tiền/lượt × hệ số thực nhận → min(trần thưởng video), TRƯỚC khi áp trần
   * ngày. Mục tiêu "Tối đa" để kích cầu. Mirrors acta-api
   * TrainingVideoFeedResponseDto.maxReward.
   */
  maxReward: number;
  /**
   * Phase 66/68 (D-01..D-05) — `true` khi video bật trần thưởng/video. Lái nhãn
   * 🔒 "Tối đa" trên HesoChip: khi `true` chip chuyển sang trạng thái reward-cap
   * (`Nhận {actualReward}đ` + `Tối đa {maxReward}đ 🔒`); khi `false` chip giữ
   * nguyên 3 trạng thái hệ số P53. Mirrors acta-api
   * TrainingVideoFeedResponseDto.rewardCapEnabled — exposed in 68-04 (the field
   * 68-03 deferred now has a real wire source). NOTE: `actualReward < maxReward`
   * một mình không đủ để suy ra cap-on (clamp trần NGÀY cũng hạ actualReward) —
   * phải đọc cờ này.
   */
  rewardCapEnabled: boolean;
  requiredCoveragePercent: number;
  /** Server-written from the Mux webhook; null until the asset is ready. */
  durationSeconds: number | null;
  muxPlaybackId: string | null;
  /**
   * URL HLS đã dựng sẵn phía API theo `provider` (Mux hoặc MinIO tự host).
   * Frontend KHÔNG tự ghép URL nữa — nhờ vậy hai nhà cung cấp chạy song song
   * mà giao diện không cần biết video nào thuộc bên nào.
   * null = chưa sẵn sàng phát.
   */
  playbackUrl: string | null;
  thumbnailUrl: string | null;
  status: TrainingVideoStatus;
  /** The caller's per-user progress (may be a fresh zero-progress row). */
  progress: TrainingWatchProgress | null;
  cooldownMinutes: number;
  nextUnlockAt: string | null;
  locked: boolean;
  commentCount: number;
  likeCount: number;
  /** Phase-56 (D-05) — whether the current viewer has liked this video (per-JWT). */
  isLiked: boolean;
}

/**
 * CURSOR-paginated feed response — mirrors the acta-api
 * `PaginatedTrainingVideoFeedResponse` ({ data, nextCursor, hasNext }). The old
 * page/total/totalPages shape NEVER matched the cursor backend, so
 * getNextPageParam read `undefined < undefined` and stopped at page 1 (max 20).
 */
export interface PaginatedTrainingFeed {
  data: TrainingVideoFeedItem[];
  /** Last video id of this page; null when there is no next page. */
  nextCursor: string | null;
  /** True when another page exists. */
  hasNext: boolean;
}

/**
 * GET /training-videos/me/active-session — the entry-gate probe (mirrors the
 * acta-api ActiveSessionResponseDto). Reports whether the member already has an
 * active watch session (possibly on another device) so the FE can offer the
 * cross-device takeover dialog BEFORE the player starts.
 */
export interface ActiveSessionResponse {
  active: boolean;
  sessionId: string | null;
  /** Thiết bị · trình duyệt of the holding session (parsed from UA). */
  deviceLabel: string | null;
  ipAddress: string | null;
  videoId: string | null;
  startedAt: string | null;
  lastHeartbeatAt: string | null;
}

/**
 * Query params accepted by `GET /training-videos/feed` (cursor-paginated).
 * Declared as a `type` (not `interface`) so it is structurally assignable to
 * the axios singleton's `Record<string, unknown> & ApiQueryParams` params
 * type without a cast (§21 — interfaces lack the implicit index signature).
 */
export type TrainingFeedQuery = {
  cursor?: string;
  limit?: number;
  /** HARD-07 — optional category filter (drives the /videos feed chip row). */
  category?: TrainingVideoCategory;
  focusId?: string;
};

// ---------------------------------------------------------------------------
// Watch session + heartbeat
// ---------------------------------------------------------------------------

/** Response of `POST /training-videos/:id/watch-sessions`. */
export interface WatchSessionResponse {
  sessionId: string;
  startedAt: string;
  coveragePercent: number;
  /** HARD-02 seed nonce — the client must resubmit it on the FIRST heartbeat. */
  nonce: string;
  /** Phase 50 — current watch-token epoch; the client echoes it on every
   *  heartbeat so a post-reset epoch bump is detected (STALE_TOKEN otherwise). */
  watchTokenVersion: number;
}

/** Request body of `POST /training-videos/:id/heartbeats` (class-validator). */
export interface HeartbeatRequest {
  sessionId: string;
  /** HARD-02 — the nonce the server issued on the previous accepted heartbeat. */
  nonce: string;
  positionSeconds: number;
  visibilityState: TrainingVisibilityState;
  playbackRate: number;
  /**
   * HARD-03 — the id of the "Tiếp tục xem" checkpoint the member just confirmed
   * (sent on the next heartbeat after a `pendingCheckpoint` was shown). Absent
   * on a normal heartbeat.
   */
  confirmedCheckpointId?: string;
  /** Phase 50 — the watch-token epoch the client last received; lets the server
   *  reject heartbeats from a pre-reset epoch (STALE_TOKEN). Omitted only on the
   *  very first beat before the seed value is known. */
  watchTokenVersion?: number;
  /** The video genuinely finished (onEnded). The server snaps coverage to 100%
   *  when set + the credited watch is at the end — makes requiredCoveragePercent
   *  = 100 reachable despite the HLS playable tail being shorter than the asset. */
  ended?: boolean;
}

/**
 * HARD-02/03 machine-readable reason a heartbeat was gated by the anti-abuse
 * layers — lets the client branch without parsing the Vietnamese copy.
 */
export type HeartbeatRejectedReason =
  | 'NONCE'
  | 'RATE'
  | 'OUT_OF_ORDER'
  | 'FROZEN'
  | 'STALE_TOKEN'
  // Redis (anti-replay / rate-limit store) unreachable — soft-reject is an
  // INFRASTRUCTURE blip, not the member. The player shows a calm "đang đồng bộ"
  // amber and never escalates (no client action fixes an outage).
  | 'SERVICE_DEGRADED';

/**
 * HARD-03 — the server-due "Tiếp tục xem" checkpoint the client must confirm
 * within the grace window. Present ONLY on a long video while a checkpoint is
 * due-but-unconfirmed; absent otherwise (short videos never carry one).
 */
export interface PendingCheckpoint {
  id: string;
  positionSeconds: number;
  /** ISO deadline (server clock) — past it the checkpoint is missed. */
  expiresAt: string;
}

/** Authoritative response of a heartbeat — the ONLY source of credit truth. */
export interface HeartbeatResponse {
  coveragePercent: number;
  watchedSegments: WatchedSegment[];
  missingSegments?: WatchedSegment[];
  awarded: boolean;
  pointsAwarded?: number;
  /** HARD-02 — the rotated nonce to resubmit on the next heartbeat. */
  nonce: string;
  /** HARD-02/03 — set when the heartbeat was gated (no coverage advance). */
  rejectedReason?: HeartbeatRejectedReason;
  /** Phase 50 — present (future ISO) while inside the 30s leave-reset grace
   *  window. Absent on a TRUE reset (window elapsed) — this is how the client
   *  tells "still counting down, please confirm" apart from "progress reset". */
  frozenUntil?: string | null;
  /** Phase 50 — current authoritative epoch after this beat; client adopts it. */
  watchTokenVersion?: number;
  /** HARD-03 — the due checkpoint to confirm; pauses playback + shows overlay. */
  pendingCheckpoint?: PendingCheckpoint;
}

/** One training-points ledger row in the me/progress history. */
export interface TrainingPointHistoryItem {
  id: string;
  points: number;
  sourceId: string | null;
  sourceName: string | null;
  createdAt: string;
}

/**
 * Response of `GET /training-videos/me/progress` (VID-08). Mirrors the backend
 * `TrainingProgressResponseDto` exactly — `totalTrainingPoints` is the canonical
 * training-points total (ledger aggregate `sourceType='training_video'`).
 */
export interface TrainingProgressSummary {
  totalTrainingPoints: number;
  completedVideoCount: number;
  history: TrainingPointHistoryItem[];
}

/**
 * HARD-08 (49-05) — member rating shapes. Mirrors the acta-api
 * MyVideoRatingResponseDto + RateTrainingVideoDto. Platform-global (D-5).
 */
export interface MyVideoRating {
  myRating: number | null;
  myComment: string | null;
  averageRating: number;
  ratingCount: number;
}

export interface RateTrainingVideoRequest {
  rating: number;
  comment?: string;
}

// ---------------------------------------------------------------------------
// Phase-50 economy: milestones + me/economy + watch-history
// ---------------------------------------------------------------------------

/** Mirror of 50-03 LevelMilestoneDto */
export interface TrainingLevelMilestone {
  level: number;
  name: string | null;
  conditionText: string;
  moneyPerViewVnd: number;
  isCurrent: boolean;
  achievedAt: string | null;
}

/** Mirror of 50-03 NextLevelDto */
export interface TrainingNextLevel {
  level: number;
  conditionText: string;
  f1Threshold: number;
  f2Threshold: number;
  moneyPerViewVnd: number;
  requiresShareholderTitle: boolean;
}

/** Mirror of 50-03 MeEconomyProgressResponseDto (GET /training-videos/me/economy) */
export interface TrainingMeProgress {
  balanceVnd: number;
  currentLevel: number;
  moneyPerViewVnd: number;
  currentLevelAchievedAt: string | null;
  nextLevel: TrainingNextLevel | null;
  milestones: TrainingLevelMilestone[];
  /** Phase-56 (D-09) — true when the caller holds a shareholder recognition.
   *  Derived server-side from the caller's own userRecognition (56-03), surfaced
   *  on GET /training-videos/me/economy. Display-only (no backend work in FE). */
  isShareholder: boolean;
  /** D-14 — số F1 cổ đông hiện tại (tử số thanh tiến độ); luôn có, kể cả 0 (D-16);
   *  bar renders Phase 58. Mirrors acta-api MeEconomyProgressResponseDto.currentF1Count. */
  currentF1Count: number;
  /** D-14 — số F2 cổ đông hiện tại (tử số thanh tiến độ); luôn có, kể cả 0 (D-16);
   *  bar renders Phase 58. Mirrors acta-api MeEconomyProgressResponseDto.currentF2Count. */
  currentF2Count: number;
  /**
   * Phase 66 (D-12) — hạn mức TIỀN còn lại trong ngày hôm nay (Int VND) tại cấp
   * hiện tại = trần thưởng/ngày − tổng đã kiếm hôm nay (clamp ≥ 0). `null` khi
   * cấp KHÔNG có trần thưởng/ngày (không giới hạn). Mirrors acta-api
   * MeEconomyProgressResponseDto.dailyRemaining.
   */
  dailyRemaining: number | null;
  /**
   * Phase 66 (D-12) — true khi đã chạm TRẦN THƯỞNG/NGÀY của cấp (dailyRemaining ≤ 0
   * và cấp có trần). ⚠ TÁCH BIỆT với trần 100 lượt/ngày (chỉ nói về quota TIỀN).
   * Không trùng `dailyCapReached` (100-count) — đây là cờ reward-cap riêng. Mirrors
   * acta-api MeEconomyProgressResponseDto.dailyRewardCapReached.
   */
  dailyRewardCapReached: boolean;
  /**
   * Phase 66 (D-08) — thời điểm hiện tại của server, ISO string. ⚠ acta-api khai báo
   * trường này là `Date` nhưng nó serialize thành CHUỖI ISO qua JSON — wire type ở
   * acta-social PHẢI là `string`, KHÔNG phải `Date`. Dùng để đếm ngược về 00:00 giờ
   * VN mà không lệ thuộc đồng hồ máy người dùng. Mirrors acta-api
   * MeEconomyProgressResponseDto.serverNowUtc.
   */
  serverNowUtc: string;
  /**
   * Phase 66 (D-08) — số GIÂY còn lại đến lần reset trần ngày kế tiếp (00:00 giờ VN),
   * server-computed. Dùng cho đồng hồ đếm ngược màn hình thành viên (P68). Mirrors
   * acta-api MeEconomyProgressResponseDto.timeToNextDayReset.
   */
  timeToNextDayReset: number;
  /**
   * Phase 69 (D-12) — Số TIỀN over-cap đang tích lũy chờ (Int VND) trên hàng accrual
   * của người gọi. LUÔN có (kể cả khi đang chạm trần ngày); = 0 khi chưa có hàng
   * accrual nào. Read-only (không thay đổi trạng thái). Mirrors acta-api
   * MeEconomyProgressResponseDto.pendingOverflowMoneyVnd.
   */
  pendingOverflowMoneyVnd: number;
  /**
   * Phase 69 (D-12) — Hệ số over-cap đang tích lũy chờ (basis-points; 10000 = ×1).
   * LUÔN có (kể cả khi đang chạm trần ngày); = 0 khi chưa có hàng accrual. Read-only
   * — đây là hệ số sẽ dùng cho "dùng ngay" khi đã chín. Mirrors acta-api
   * MeEconomyProgressResponseDto.pendingOverflowMultiplierBp.
   */
  pendingOverflowMultiplierBp: number;
  /**
   * Phase 71 (D-08) — true khi hệ số tích lũy over-cap đã CHÍN (tích lũy ở VN-day
   * trước) VÀ thành viên đang CÒN hạn mức kiếm trong ngày (chưa chạm trần ngày) ⇒
   * dùng được NGAY hôm nay. false khi mới tích lũy hôm nay (chưa chín), đang chạm
   * trần ngày, hoặc không có hệ số chờ. Suy ra server-side; mốc VN-day thô KHÔNG bao
   * giờ lộ ra client (§22 read-only). Drives nhãn trạng thái hệ số trên wallet card.
   * Mirrors acta-api MeEconomyProgressResponseDto.overflowMultiplierUsableToday.
   */
  overflowMultiplierUsableToday: boolean;
  /**
   * Danh sách cần chăm sóc — true khi số dư ví Video rèn luyện đã chạm ngưỡng
   * (≥ 10.000.000đ) và thành viên bị gắn cờ: hoàn thành video vẫn được ghi nhận
   * nhưng KHÔNG cộng thưởng (0đ) cho tới khi quản trị viên mở khóa. Mirrors acta-api
   * MeEconomyProgressResponseDto.careRequired.
   */
  careRequired: boolean;
  /**
   * Lời nhắn hiển thị cho thành viên khi `careRequired` (liên hệ người bảo trợ /
   * hotline Zalo). `null` khi `careRequired` là false. Client render nguyên văn,
   * rơi về hằng số `CARE_REQUIRED_FALLBACK_MESSAGE` nếu server trả null. Mirrors
   * acta-api MeEconomyProgressResponseDto.careMessage.
   */
  careMessage: string | null;
}

/** One earn row from GET /training-videos/me/watch-history. Field names mirror
 *  the backend MeWatchHistoryResponseDto WatchHistoryRowDto exactly (§17). */
export interface TrainingWatchHistoryRow {
  /** Bare scalar — null if the source video was deleted. */
  videoId: string | null;
  title: string;
  completedAt: string;
  amountVnd: number;
  /** Hệ số (coefficient) tại thời điểm thưởng — snapshot. Row cũ: hệ số hiện tại của video. */
  pointsReward: number | null;
  /** Mức tiền/lượt (VND) tại thời điểm thưởng — snapshot chính xác; null cho row cũ. */
  moneyPerViewVnd: number | null;
  /**
   * Phase 53 (D-10) — the video's CURRENT minimum gate level (forward-looking, not
   * a snapshot). `null` when the source video was deleted. Used to render the
   * kích-cầu line on rows that were gated down.
   */
  currentMinLevel: number | null;
  /**
   * Phase 53 (D-10) — the video's CURRENT full hệ số (forward-looking). `null` when
   * the source video was deleted. A row is "gated down" when its received coefficient
   * (`pointsReward`) is below this value.
   */
  currentPointsReward: number | null;
  /**
   * Phase 66 (D-09) — single-scalar lý do tiền thưởng lượt này bị giới hạn, đọc từ
   * breakdown snapshot tại thời điểm thưởng (KHÔNG tính lại — §22). `null` cho row cũ
   * chưa có breakdown hoặc khi không bị giới hạn. Giữ cho back-compat — `limitReasons`
   * (P68) là superset. Mirrors acta-api WatchHistoryRowDto.limitReason.
   */
  limitReason: string | null;
  /**
   * Phase 68 (D-15) — số tiền ĐÁNG LẼ được nhận (X = pre-cap, base × hệ số TRƯỚC mọi
   * trần) đọc từ breakdown snapshot (`calculatedRewardAmount`). Dùng để dựng dòng
   * `{X}đ ({Y}đ - lý do)` với Y = `amountVnd` (thực nhận). `null` cho row cũ chưa có
   * breakdown (§22 — KHÔNG tính lại tiền đã nhận). Mirrors acta-api
   * WatchHistoryRowDto.calculatedRewardAmount.
   */
  calculatedRewardAmount: number | null;
  /**
   * Phase 68 (D-14/D-15) — TẬP các trần đã chạm cho lượt này, suy ra từ breakdown
   * snapshot (KHÔNG tính lại): `'video_reward_cap_hit'` (→ "trần video"),
   * `'daily_reward_cap_hit'` (→ "trần ngày"). `[]` cho row không bị giới hạn hoặc
   * row cũ chưa có breakdown. Superset của `limitReason` (P66) — client nối nhiều lý
   * do bằng ` + `. (Trần 100 lượt/ngày KHÔNG nằm trong tập này — xem 68-02-SUMMARY.)
   * Mirrors acta-api WatchHistoryRowDto.limitReasons.
   */
  limitReasons: string[];
}

/** Mirror of 50-03 MeWatchHistoryResponseDto ({ rows, totals }). */
export interface TrainingWatchHistory {
  rows: TrainingWatchHistoryRow[];
  totals: {
    totalViews: number;
    totalVnd: number;
  };
}

// ---------------------------------------------------------------------------
// Phase-68 (D-10): per-video reward projection — the completion-modal ladder
// ---------------------------------------------------------------------------

/**
 * Mirror of plan 68-01 `RewardProjectionResponseDto`
 * (`GET /training-videos/me/reward-projection/:videoId`, member-gated). Drives the
 * acta-social completion-modal reward ladder (68-05):
 * `{actualReward}đ → {rewardAtNextLevel}đ ở Cấp {nextLevel} → tối đa {maxReward}đ
 * khi đạt Cấp {levelReachingMax}`. All amounts are Int VND, computed server-side from
 * the video's PERSISTED cap config (RC §11 per-video formula; daily cap NEVER read).
 * Field names mirror the acta-api DTO verbatim — THIS is the wire contract.
 *
 * ⚠ Middle-node-collapse signal (D-10): when `rewardAtNextLevel === actualReward` the
 * next level does NOT raise the reward (viewer still ×1 below `minLevelForMultiplier`)
 * → acta-social collapses the ladder's MIDDLE node. There is no separate flag —
 * equality IS the signal.
 */
export interface TrainingRewardProjection {
  /** rewardAfterCap tại cấp HIỆN TẠI của người gọi (Int VND). */
  actualReward: number;
  /** Trần video (Int VND): rewardCapAmount khi bật trần, ngược lại là thưởng đầy đủ
   *  cao nhất (chưa trần) trên tất cả các cấp. */
  maxReward: number;
  /** Cấp kế tiếp ngay sau cấp hiện tại; `null` khi đang ở cấp cao nhất có cấu hình. */
  nextLevel: number | null;
  /** rewardAfterCap tại `nextLevel` (Int VND); `null` khi `nextLevel` là null.
   *  `=== actualReward` ⇒ thu gọn nút giữa của thang thưởng (D-10). */
  rewardAtNextLevel: number | null;
  /** Cấp ĐẦU TIÊN (tăng dần) có rewardAfterCap === maxReward; `null` nếu không cấp nào
   *  đạt mức tối đa. */
  levelReachingMax: number | null;
  /**
   * Phase 69 (D-01/D-12) — Khoản TIỀN CỘNG THÊM (Int VND) mà "dùng ngay" sẽ ghi có
   * nếu áp hệ số over-cap đang chờ vào video NÀY tại cấp hiện tại = phần bump sau khi
   * đã kẹp bởi hạn mức ngày (dailyRemaining). Dùng CHUNG công thức floor + 2-cap với
   * đường apply thật nên hiển thị KHỚP với số sẽ ghi có. Read-only, = 0 khi không có
   * hệ số chờ hoặc đang chạm trần ngày. Mirrors acta-api
   * RewardProjectionResponseDto.projectedOverflowBumpVnd.
   */
  projectedOverflowBumpVnd: number;
  /**
   * Phase 69 (D-01) — true CHỈ KHI hệ số over-cap chờ đã CHÍN (tích lũy ở VN-day
   * trước) VÀ chưa chạm trần ngày (dailyRemaining > 0 hoặc null) ⇒ mở intercept "dùng
   * ngay". false khi đang chạm trần hoặc hệ số mới tích lũy hôm nay (chỉ hiển thị,
   * chưa dùng được). Mirrors acta-api RewardProjectionResponseDto.overflowApplyEligible.
   */
  overflowApplyEligible: boolean;
  /**
   * Phase 69 (D-02/D-07) — true khi phần bump bị hạn mức ngày KẸP BỚT (số ghi có thực
   * < bump đầy đủ) — tức "dùng ngay" bây giờ sẽ MẤT một phần. Tín hiệu để màn hình
   * thành viên cảnh báo trước khi xác nhận (P71). Mirrors acta-api
   * RewardProjectionResponseDto.overflowWouldBeReduced.
   */
  overflowWouldBeReduced: boolean;
  /**
   * Danh sách cần chăm sóc — true khi số dư ví Video rèn luyện đã chạm ngưỡng
   * (≥ 10.000.000đ) và thành viên bị gắn cờ: hoàn thành video vẫn được ghi nhận
   * nhưng KHÔNG cộng thưởng (0đ) cho tới khi quản trị viên mở khóa. Mirrors acta-api
   * RewardProjectionResponseDto.careRequired.
   */
  careRequired: boolean;
  /**
   * Lời nhắn hiển thị cho thành viên khi `careRequired` (liên hệ người bảo trợ /
   * hotline Zalo). `null` khi `careRequired` là false. Client render nguyên văn,
   * rơi về hằng số `CARE_REQUIRED_FALLBACK_MESSAGE` nếu server trả null. Mirrors
   * acta-api RewardProjectionResponseDto.careMessage.
   */
  careMessage: string | null;
}

// ---------------------------------------------------------------------------
// Phase-71 (D-10/D-12): per-LEVEL reward/cap/accrual projection — upsell modal
// ---------------------------------------------------------------------------

/**
 * Mirror of plan 71-01 `MemberLevelRewardProjectionItemDto` — one row per
 * configured training level. Drives the acta-social level-upsell modal comparing
 * the member's current level against a tapped level across THREE per-level metrics:
 * money/view, trần ngày, and over-cap money accrual per lượt. All amounts Int VND.
 *
 * ⚠ Per-LEVEL only (D-12): deliberately EXCLUDES the per-VIDEO over-cap accrual hệ số
 * (a per-video metric, never per-level) and the admin-only preview compute fields.
 * Field names mirror the acta-api DTO verbatim — THIS is the wire contract.
 */
export interface TrainingLevelRewardProjectionItem {
  /** Cấp độ rèn luyện (1 = L1, 2 = L2, 3+ = quản trị viên đặt). */
  level: number;
  /** Tên cấp độ (tuỳ chọn). */
  name: string | null;
  /** Số tiền VND thưởng mỗi lượt xem cấu hình tại cấp này (Int VND). */
  moneyPerViewVnd: number;
  /** Trần thưởng/ngày (Int VND) tại cấp này — tổng tiền tối đa kiếm trong một ngày VN.
   *  `null` = cấp không giới hạn trần ngày. */
  dailyRewardCapAmount: number | null;
  /** Tiền tích lũy vượt trần (Int VND) cộng vào ví tích lũy mỗi lượt hoàn thành quá
   *  trần tại cấp này — live từ TrainingLevelConfig. `null` = cấp này không tích lũy gì. */
  overflowAccrualAmountVnd: number | null;
}

/**
 * Mirror of plan 71-01 `MemberLevelRewardProjectionResponseDto` envelope — rows
 * ordered by level asc. `currentLevel` is the caller's MATERIALIZED training level
 * (resolved server-side from JWT userId — D-5), driving the "đã đạt" suppression of
 * the upsell CTA in the level-comparison modal.
 */
export interface TrainingLevelRewardProjection {
  levels: TrainingLevelRewardProjectionItem[];
  /** Cấp độ hiện tại của người gọi (suy ra server-side từ JWT userId) — ẩn nút
   *  "lên cấp" cho cấp đã đạt trong modal so sánh. */
  currentLevel: number;
}

// ---------------------------------------------------------------------------
// Phase-50: complete / freeze / confirm-presence responses
// ---------------------------------------------------------------------------

export interface CompleteTrainingVideoResponse {
  awarded: boolean;
  amountVnd: number;
  balanceVnd: number;
  /**
   * Phase 66 (D-10..D-13) — true khi đã chạm trần 100 lượt/ngày (KHÔNG cộng tiền lần
   * này). Mirrors acta-api CompleteResultResponseDto.dailyCapReached. KEEP — đây là cờ
   * 100-count, TÁCH BIỆT với `dailyRewardCapReached`.
   */
  dailyCapReached: boolean;
  /**
   * Phase 66 (D-12) — true khi chạm TRẦN THƯỞNG/NGÀY của cấp (tiền bị giới hạn hoặc 0đ
   * vì hết quota ngày). ⚠ TÁCH BIỆT với `dailyCapReached` (trần 100 lượt): lần hoàn
   * thành VẪN tính + VẪN mở cooldown. Drives modal branching (68-05). Mirrors acta-api
   * CompleteResultResponseDto.dailyRewardCapReached.
   */
  dailyRewardCapReached: boolean;
  /**
   * Phase 69 (D-12) — hệ số tích lũy vượt-trần ĐANG CHỜ (basis-points; 10000 = ×1)
   * sau lần hoàn thành này. Luôn có; = 0 khi vừa "dùng ngay" thành công (đã reset).
   * Mirrors acta-api CompleteResultResponseDto.pendingOverflowMultiplierBp.
   */
  pendingOverflowMultiplierBp: number;
  /**
   * Phase 69 (D-12) — hũ tiền tích lũy vượt-trần ĐANG CHỜ (Int VND) — chi trả vào
   * nửa đêm bởi cron. Luôn có; KHÔNG bị "dùng ngay" đụng tới. Mirrors acta-api
   * CompleteResultResponseDto.pendingOverflowMoneyVnd.
   */
  pendingOverflowMoneyVnd: number;
  /**
   * Phase 69 (D-04/D-06/D-07) — số tiền bump (Int VND) thực sự được cộng từ "dùng
   * ngay" lần này (sau khi qua trần 2 lớp). Chỉ có trên lần hoàn thành CÓ áp dụng;
   * = 0 khi apply bị huỷ vì lỗ chưa xác nhận. Mirrors acta-api
   * CompleteResultResponseDto.appliedOverflowBumpVnd (optional).
   */
  appliedOverflowBumpVnd?: number;
  /**
   * Phase 69 (D-04/D-07) — true khi bump bị trần cắt bớt (bumpCreditedVnd < bumpVnd).
   * Khi true mà chưa confirmDespiteLoss ⇒ apply bị HUỶ (cộng gốc, giữ hệ số) để
   * client xác nhận lại. Mirrors acta-api CompleteResultResponseDto.overflowBumpReduced
   * (optional).
   */
  overflowBumpReduced?: boolean;
  /**
   * Danh sách cần chăm sóc — true khi số dư ví Video rèn luyện đã chạm ngưỡng
   * (≥ 10.000.000đ) và thành viên bị gắn cờ: hoàn thành video vẫn được ghi nhận
   * nhưng KHÔNG cộng thưởng (0đ) cho tới khi quản trị viên mở khóa. Mirrors acta-api
   * CompleteResultResponseDto.careRequired.
   */
  careRequired: boolean;
  /**
   * Lời nhắn hiển thị cho thành viên khi `careRequired` (liên hệ người bảo trợ /
   * hotline Zalo). `null` khi `careRequired` là false. Client render nguyên văn,
   * rơi về hằng số `CARE_REQUIRED_FALLBACK_MESSAGE` nếu server trả null. Mirrors
   * acta-api CompleteResultResponseDto.careMessage.
   */
  careMessage: string | null;
}

export interface FreezeResponse {
  frozenUntil: string;
}

export interface ConfirmPresenceResponse {
  /** Server cleared the freeze window in time → keep watching. Field name must
   *  match the backend payload exactly ({ confirmed }) — Master Skill §17. */
  confirmed: boolean;
}

// ---------------------------------------------------------------------------
// Phase-50: comments
// ---------------------------------------------------------------------------

export interface TrainingCommentReaction {
  type: ReactionType;
  count: number;
}

export interface TrainingVideoComment {
  id: string;
  videoId: string;
  parentId: string | null;
  content: string;
  imageUrl: string | null;
  user: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  likeCount: number;
  reactions: TrainingCommentReaction[];
  myReaction: ReactionType | null;
  replies: TrainingVideoComment[];
  createdAt: string;
}

export interface PaginatedTrainingComments {
  data: TrainingVideoComment[];
  // Cursor pagination — matches the backend GET :videoId/comments contract
  // (cursor/limit → { data, nextCursor, hasNext }). The old page/totalPages
  // shape never matched, so the server ignored `?page=` and load-more was dead.
  nextCursor: string | null;
  hasNext: boolean;
}

export type CreateTrainingCommentRequest = {
  content: string;
  parentId?: string;
  imageUrl?: string;
  imageFileKey?: string;
};

// ---------------------------------------------------------------------------
// Phase-50: payment methods + withdrawal
// ---------------------------------------------------------------------------

export interface TrainingPaymentMethod {
  id: string;
  type: 'BANK_TRANSFER' | 'E_WALLET';
  bankName: string | null;
  bankAccount: string | null;
  accountHolderName: string | null;
  eWalletProvider: string | null;
  eWalletAccount: string | null;
}

export interface TrainingWithdrawalRequest {
  id: string;
  amountVnd: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  paymentMethodId: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export type CreateTrainingWithdrawalRequest = {
  amountVnd: number;
  paymentMethodId: string;
};

// ---------------------------------------------------------------------------
// Phase-65 (D-16..D-20): member leaderboard — Bảng xếp hạng rèn luyện
// ---------------------------------------------------------------------------

/**
 * The member-facing ranking categories (D-17 / D-20) — the NON-MONEY subset of
 * the backend `LeaderboardMode`. The `reward` (tổng tiền) mode is DELIBERATELY
 * absent: members never rank by / see anyone's reward money (D-17 privacy). The
 * backend `memberList` falls back to `completion` if a money mode is ever asked,
 * but the FE simply never offers one.
 */
export type MemberLeaderboardMode = 'completion' | 'streak' | 'watchSeconds';

/**
 * The member time window (D-20). Mapped to ISO `from`/`to` query params on the
 * client; the label set is fixed by the UI-SPEC ([MEMBER] time filter).
 */
export type MemberLeaderboardWindow = 'today' | 'last7' | 'last30' | 'thisMonth';

/**
 * Phase-78 (D-03 / D-07 / LBS §3) — the member leaderboard scope dimension. String
 * enum values byte-identical to the backend `LeaderboardScopeType` so they pass
 * `@IsEnum` untouched (no boolean `@Transform` Pitfall). `global` is the DEFAULT
 * (byte-identical to the P65 v1 path). For `referral_tree` the client sends NO
 * `scopeId` — the server forces root = the authenticated caller (D-07 / T-78-10);
 * for `business_team` it sends the selected `scopeId` (teamId) and the server gates
 * on active membership (D-03 / §13 / T-78-11 — the FE hide is cosmetic only).
 */
export type MemberLeaderboardScopeType =
  | 'global'
  | 'referral_tree'
  | 'business_team';

/**
 * Phase-78 (D-08 / LBS §6.4) — the `business_team` sub-mode. `members` ranks the
 * members within a team (DEFAULT); `teams` is the admin-only team-vs-team board
 * (never offered on the member surface). String enum (no boolean flag).
 */
export type MemberLeaderboardTeamView = 'members' | 'teams';

/**
 * One row of the member leaderboard — mirrors the backend TRIMMED
 * `MemberLeaderboardRowDto` (65-02). It carries ONLY the competition surface a
 * member may see: rank, display name, avatar, level, the selected non-money
 * metric value, and a self flag. It has NO money / email / phone / risk field
 * (D-17 privacy split — enforced at the type layer, not just at runtime).
 */
export interface MemberLeaderboardRow {
  rank: number;
  displayName: string;
  avatar: string | null;
  level: number;
  /** The value of the selected non-money category — never a VND amount (D-17). */
  metricValue: number;
  isSelf: boolean;
  /**
   * Người chăm sóc đang hoạt động của thành viên này. `null` ở cả hai field khi
   * chưa được chăm sóc. Đây là thông tin của NGƯỜI CHĂM SÓC, không phải
   * referenceId của chính thành viên (vốn bị ẩn theo D-17).
   */
  babysitterRefId: string | null;
  babysitterName: string | null;
}

/**
 * The member leaderboard payload (D-19): Top-N podium+list + an always-computed
 * self-rank card (present even when the member is outside the top — `self.rank`
 * may be e.g. 727). `self` is null only when the member has no activity in the
 * period. Money is hidden everywhere (D-17).
 */
export interface MemberLeaderboard {
  mode: MemberLeaderboardMode;
  top: MemberLeaderboardRow[];
  self: MemberLeaderboardRow | null;
  updatedAt: string;
}

/**
 * The member leaderboard query. `mode` selects the non-money category; `from`/`to`
 * carry the ISO window derived from the chosen {@link MemberLeaderboardWindow}.
 * No deep pagination (D-20 — Top-10 + self only). Declared as a `type` (not an
 * interface) so it is structurally assignable to the axios singleton's
 * `Record<string, unknown> & ApiQueryParams` params type without a cast (§21).
 */
export type MemberLeaderboardQuery = {
  mode?: MemberLeaderboardMode;
  from?: string;
  to?: string;
  /**
   * Phase-78 (LBS §3) — the active scope. Omitted / `global` = toàn hệ thống
   * (byte-identical v1 path). `referral_tree` / `business_team` re-query the
   * scoped set (the server enforces the real access boundary — 78-05).
   */
  scopeType?: MemberLeaderboardScopeType;
  /**
   * Only meaningful for `business_team` (the selected teamId). The client MUST
   * NOT send a `scopeId` for `referral_tree` — the server forces root = self
   * (D-07 / T-78-10); `undefined` is dropped by the axios params serializer.
   */
  scopeId?: string;
  /** Phase-78 `business_team` sub-mode (D-08); the member surface only ever uses `members`. */
  teamView?: MemberLeaderboardTeamView;
};
