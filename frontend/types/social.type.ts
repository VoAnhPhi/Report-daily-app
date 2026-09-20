import { Attachment } from './attachment.type';
import { MuxData } from './mux.type';
import { UserReferenceResponse } from './user.type';

export enum ReactionType {
  LIKE = 'LIKE',
  LOVE = 'LOVE',
  HAHA = 'HAHA',
  WOW = 'WOW',
  SAD = 'SAD',
  ANGRY = 'ANGRY',
}

export enum NotificationType {
  FOLLOW = 'FOLLOW',
  LIKE = 'LIKE',
  COMMENT = 'COMMENT',
  MENTION = 'MENTION',
  MESSAGE = 'MESSAGE',
}

export enum PostStatus {
  normal = 'normal',
  active = 'active',
  pro = 'pro',
}

export enum VerificationStatus {
  none = 'none',
  pending = 'pending',
  approved = 'approved',
  rejected = 'rejected',
}

/** Verification thresholds matching backend VERIFICATION_THRESHOLDS */
export const VERIFICATION_THRESHOLDS = {
  /** Net positive (non-ANGRY) reactions from verifiers to approve a pending post */
  APPROVAL_SCORE: 2,
  /** Number of ANGRY reactions from regular users to demote a 'none' post */
  DEMOTION_ANGRY_COUNT: 5,
  /** Number of ANGRY reactions from privileged/recognized users to demote (instant) */
  PRIVILEGED_DEMOTION_ANGRY_COUNT: 1,
} as const;

/** @deprecated Use VERIFICATION_THRESHOLDS instead */
export const DEMOTION_THRESHOLDS = {
  REGULAR_USER_ANGRY_COUNT: VERIFICATION_THRESHOLDS.DEMOTION_ANGRY_COUNT,
  PRIVILEGED_USER_ANGRY_COUNT: VERIFICATION_THRESHOLDS.PRIVILEGED_DEMOTION_ANGRY_COUNT,
} as const;

export interface PostLocation {
  id: string;
  address: string;
  postId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostFeeling {
  id: string;
  label: string;
  icon: string;
}

export interface PostActivityCategory {
  id: string;
  name: string;
  icon: string;
}

export interface PostActivity {
  id: string;
  label: string;
  icon: string;
  categoryId: string;
}

export type PostActivityWithCategory = PostActivity & {
  category?: PostActivityCategory;
};

/**
 * Trạng thái khoảng nghỉ giữa hai lần đăng bài, đọc từ `GET /posts/post-cooldown`.
 * Đây là nguồn sự thật DUY NHẤT cho badge đếm ngược — frontend không tự suy mốc
 * kế tiếp, mà gọi lại endpoint sau mỗi lần đăng thành công.
 */
export interface PostCooldownState {
  /** Người dùng được miễn khoảng nghỉ (super admin / có quyền nội dung). */
  isExempt: boolean;
  /** Được phép đăng ngay bây giờ. */
  canPost: boolean;
  /** Số giây còn lại tại thời điểm máy chủ trả lời; `0` khi đã được phép đăng. */
  remainingSeconds: number;
  /** Mốc ISO được phép đăng lần kế tiếp; `null` khi được phép đăng ngay. */
  nextAllowedAt: string | null;
  /** Lần đăng gần nhất (không tính bài hệ thống tự tạo). */
  lastPostAt: string | null;
  /** Độ dài khoảng nghỉ theo phút, do máy chủ quyết định. */
  cooldownMinutes: number;
}

/** Xem `Post.viewerTag`. */
export interface PostViewerTag {
  hiddenFromProfile: boolean;
}

export interface Post {
  id: string;

  content?: string | null;
  isPublished: boolean;
  note?: string | null;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  publishedAt?: Date | null;

  imageUrls: string[];
  videoUrls: string[];

  location?: PostLocation;

  /**
   * Điểm cầu mà bài viết được đăng vào. Vắng mặt với bài social thường.
   *
   * Bài điểm cầu là `Post` THẬT, chỉ khác ở chỗ mang `warehouseId` — nên nó
   * xuất hiện trên feed như mọi bài khác, và huy hiệu này là dấu hiệu duy nhất
   * cho người đọc biết nó thuộc điểm cầu nào.
   *
   * `slug` dùng để mở đúng điểm cầu bên acta-solutions.
   */
  warehouse?: {
    id: string;
    displayName: string;
    slug: string;
  };

  /**
   * Loại bài, do máy chủ đặt. `'offer'` = một ƯU ĐÃI do chủ địa điểm đăng bên
   * acta-solutions.
   *
   * ⚠ Ưu đãi KHÔNG có trường dữ liệu riêng nào — nó là một bài viết bình thường
   * mang cờ này, tiêu đề và mức giảm viết trong `content`. Nhận diện DUY NHẤT
   * bằng trường này; đừng suy từ sự có mặt của `warehouse`, vì tin điểm cầu
   * thường cũng có `warehouse`.
   *
   * Các giá trị khác đã dùng: `'avatar_update'` (bài hệ thống), `'quote'`.
   */
  postType?: string | null;

  /**
   * ── KHOẢNG THỜI GIAN HOẠT ĐỘNG CỦA TIN ƯU ĐÃI ─────────────────────────────
   * Chuỗi ISO-8601, chỉ bài `postType === 'offer'` mới có.
   *
   * `offerStartAt` null = tin cũ, coi như đã hiệu lực từ đầu.
   * `offerEndAt` null = ưu đãi KHÔNG có hạn kết thúc.
   *
   * ⚠ ĐỪNG tự tính hết hạn bằng `offerEndAt < now`: viết trần như thế thì tin
   * không hạn (null) và tin cũ đều bị gắn nhãn hết hạn oan, mà không có lỗi nào
   * nổ ra. Dùng `isOfferExpired` do acta-api tính sẵn.
   */
  offerStartAt?: string | null;
  offerEndAt?: string | null;
  isOfferExpired?: boolean;
  /**
   * Ưu đãi CHƯA tới mốc bắt đầu — acta-api tính, giao diện không tự so.
   *
   * Cùng lý do với `isOfferExpired`, cộng một lý do riêng: so mốc với
   * `Date.now()` trong lúc render là gọi hàm không thuần (React Compiler chặn),
   * và kết quả còn lệch giữa lượt dựng HTML ở máy chủ với lượt cấp nước ở máy
   * khách vì hai bên dùng hai đồng hồ khác nhau.
   */
  isOfferUpcoming?: boolean;

  /**
   * Địa điểm của bài ưu đãi. acta-api ĐÃ trả hai trường này từ
   * `PostResponseDto`; trước đây kiểu ở đây không khai nên chúng tới nơi mà
   * giao diện không nhìn thấy.
   */
  businessLocationId?: string | null;
  businessLocation?: { id: string; name: string; slug: string } | null;

  reactionCount: number;
  commentCount: number;

  status?: PostStatus;
  verificationStatus?: VerificationStatus;

  // Relations
  user: UserReferenceResponse;
  taggedUsers: UserReferenceResponse[];
  /**
   * Trạng thái thẻ của NGƯỜI ĐANG XEM trên bài này. `null`/vắng mặt = người xem
   * không được gắn thẻ (hoặc đã tự gỡ) ⇒ không hiện nhóm hành động thẻ.
   */
  viewerTag?: PostViewerTag | null;
  reactions: Reaction[];
  muxData: MuxData[];
  analytics?: PostAnalytics;
  feeling?: PostFeeling;
  activity?: PostActivityWithCategory;
  pinnedProducts: PostPinnedProduct[];
}

export interface PostPinnedProduct {
  id: string;
  code: string;
  name: string;
  slug: string;
  thumbnail: string;
  price: number;
  taxType?: string | null;
  taxRate?: string | null;
  taxRateDirect?: number | null;
  isActive: boolean;
  allowsSale: boolean;
  business: {
    id: string;
    name: string;
  };
}

export interface Comment {
  id: string;

  content: string;

  userId: string;
  postId: string;
  parentId?: string | null;
  likeCount: number;
  isLikedByCurrentUser?: boolean;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  // Relations
  user: UserReferenceResponse;
  post: Post;
  parent?: Comment | null;
  replies: Comment[];
  reactions?: CommentReaction[];
  /**
   * Người được nhắc bằng `@` trong chính bình luận này. Bộ vẽ mention đối chiếu
   * id trong `content` với danh sách này — thiếu nó thì mọi lượt nhắc rơi về
   * chữ thường, trông như tính năng chết.
   */
  taggedUsers?: {
    id: string;
    fullName: string;
    referenceId: string;
    avatarUrl?: string;
  }[];
}

export interface Share {
  id: string;

  createdAt: Date;
  updatedAt: Date;

  postId: string;

  // Relations
  user: UserReferenceResponse;
}

export interface Reaction {
  id: string;

  type: ReactionType;

  userId: string;
  postId: string;

  // Relations
  user: UserReferenceResponse;
  post: Post;
}

export interface CommentReaction {
  id: string;

  type: ReactionType;

  userId: string;
  commentId: string;

  user: UserReferenceResponse;
  comment: Comment;
}

export interface Notification {
  id: string;

  type: NotificationType;
  message?: string | null;
  templateData?: Record<string, any> | null;
  link?: string | null;
  isRead: boolean;

  userId: string;
  actorId: string;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  // Relations
  user: UserReferenceResponse;
  actor: UserReferenceResponse;
}

export interface Follower {
  id: string;

  followerId: string;
  followingId: string;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  // Relations
  follower: UserReferenceResponse;
  following: UserReferenceResponse;
}

export type PaginatedPosts = {
  data: Post[];
  total: number;
  page: number;
  totalPages: number;
};

export interface PostQueryState {
  mode: 'latest' | 'most-reacted' | 'most-commented' | 'all';
  referenceId?: string;
  /**
   * Feed trang cá nhân: bài TỰ ĐĂNG **hoặc** được gắn thẻ. Khác `referenceId`
   * (chỉ bài tự đăng, khớp kiểu `contains` trên mã giới thiệu).
   */
  profileUserId?: string;
  searchQuery?: string;
  postId?: string;
  page?: number;
  limit?: number;
  showAll?: boolean;
  view?: 'table' | 'feed';
  myPosts?: boolean;
  userId?: string;
  status?: PostStatus;
  pendingVerification?: boolean;
}

export interface PostAnalytics {
  interactions: number;
  engagementRate: number;
  contentMetrics: {
    hasImages: boolean;
    hasVideos: boolean;
    contentLength: number;
    averageCommentLength: number;
  };
  demographics: {
    ageGroups: { range: string; count: number; percentage: number }[];
    genders: { type: string; count: number; percentage: number }[];
    countries: { country: string; count: number; percentage: number }[];
    userRoles: { role: string; count: number; percentage: number }[];
    verificationStatus: { verified: number; unverified: number };
  };
  reactionBreakdown: {
    type: string;
    count: number;
    percentage: number;
  }[];
  timeAnalytics: {
    daysSinceCreated: number;
    daysSincePublished: number;
    peakEngagementHour: number;
    isRecentlyCreated: boolean;
  };
  performanceMetrics: {
    engagementVelocity: number;
    commentToReactionRatio: number;
    averageResponseTime: number;
  };
}

// =======================
// 🆕 New Messaging System
// =======================

export interface Conversation {
  id: string;
  name?: string;
  imageUrl?: string;
  isGroup: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;

  pinnedMessageId?: string;
  pinnedMessage?: Message;

  members: ConversationMember[];
  messages: Message[];
  createdBy: UserReferenceResponse;
}

export interface ConversationMember {
  id: string;
  role: 'MEMBER' | 'ADMIN' | 'OWNER';
  joinedAt: Date;
  isMuted: boolean;
  isRemoved: boolean;
  isTyping: boolean;
  isHidden: boolean;

  conversationId: string;
  userId: string;

  user: UserReferenceResponse;
  conversation: Conversation;
}

export interface Message {
  id: string;
  content?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;

  conversationId: string;
  conversation: Conversation;

  senderId: string;
  sender: UserReferenceResponse;

  mentions?: UserReferenceResponse[];
  attachments?: Attachment[];
  seenBy?: UserReferenceResponse[];
  pinnedInConversation?: Conversation;
}
