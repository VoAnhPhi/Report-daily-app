// New notification types based on the updated API structure
export interface NotificationV2 {
  id: string;
  scope: 'personal' | 'system' | 'global';
  action: string;
  message: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
  payload?: Record<string, any>;

  // Actor information
  actorUser?: {
    id: string;
    fullName?: string;
    avatar?: {
      fileUrl?: string;
    };
  };

  // Related entities
  postId?: string;
  commentId?: string;
  orderId?: string;
  messageId?: string;
  likeId?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  lastSeenAt?: string;
}

export interface NotificationFeed {
  data: NotificationV2[];
  nextCursor?: string;
  pageSize: number;
  nextPage: boolean; // true/false để FE biết có trang tiếp theo
}

export interface NotificationResponse {
  stats: NotificationStats;
  pages: NotificationFeed[]; // Array of pages thay vì feed đơn lẻ
}

export interface NotificationQueryParams {
  limit?: number;
  cursor?: string;
}

/**
 * Notification actions enum (matching backend).
 *
 * ⚠ Giá trị PHẢI là snake_case đúng như enum Prisma `NotificationAction`:
 * acta-api không map lại qua ResponseDto nên client nhận nguyên chuỗi Prisma.
 * Bản trước khai camelCase (`kycApproved = 'kycApproved'`) nên mọi so sánh với
 * action nhiều từ đều SAI — đó là lý do trước đây phần lớn thông báo rơi về
 * biểu tượng chuông xám mặc định.
 *
 * Bảng phân loại/biểu tượng đầy đủ nằm ở `constants/notification-visuals.ts`;
 * enum này chỉ giữ các action được so sánh trực tiếp trong code.
 */
export enum NotificationAction {
  // KYC
  kycSubmitted = 'kyc_submitted',
  kycApproved = 'kyc_approved',
  kycChanging = 'kyc_changing',
  kycChanged = 'kyc_changed',

  // User
  directReferralRegistered = 'direct_referral_registered',
  indirectReferralRegistered = 'indirect_referral_registered',
  directReferralVerified = 'direct_referral_verified',
  birthdayReminder = 'birthday_reminder',
  pendingApproval = 'pending_approval',

  // Message
  mentioned = 'mentioned',

  // Generic
  created = 'created',
  updated = 'updated',
  deleted = 'deleted',
  liked = 'liked',
  commented = 'commented',
  shared = 'shared',
  viewed = 'viewed',
  downloaded = 'downloaded',
  followed = 'followed',
  unfollowed = 'unfollowed',
  approved = 'approved',
  rejected = 'rejected',
  published = 'published',
  unpublished = 'unpublished',
  systemAlert = 'system_alert',

  // Rating / Review (admin reply to a product review).
  ratingReplied = 'rating_replied',
  ratingEdited = 'rating_edited',
}

// Related models enum (matching backend)
export enum RelatedModel {
  newsItem = 'newsItem',
  document = 'document',
  post = 'post',
  user = 'user',
  comment = 'comment',
  system = 'system',
  message = 'message',
  order = 'order',
  like = 'like',
  /** Báo cáo hằng ngày — server gửi `RelatedModel.daily_report` kèm `relatedModelId`. */
  dailyReport = 'daily_report',
}
