import { IUser } from "./user.type";
export interface Notification {
  id: string;
  type: NotificationType;
  message?: string;
  link?: string;
  isRead: boolean;
  userId: string;
  actorId?: string;
  actor?: IUser;
  createdAt: Date;
  targetType: string;
  targetId: string;
}

export enum NotificationType {
  follow = 'follow',
  like = 'like',
  comment = 'comment',
  mention = 'mention',
  message = 'message',
  new_social_post = 'new_social_post',
  new_document = 'new_document',
  new_event = 'new_event',
  new_news = 'new_news',
  new_user = 'new_user',
  new_announcement = 'new_announcement',
  new_comment = 'new_comment',
  new_like = 'new_like',
  new_follow = 'new_follow',
  new_news_post = 'new_news_post',
  new_document_post = 'new_document_post',
  new_event_post = 'new_event_post',
  new_announcement_post = 'new_announcement_post',
  new_user_post = 'new_user_post',
  new_comment_post = 'new_comment_post',
  new_like_post = 'new_like_post',
  new_follow_post = 'new_follow_post',
  account_approved = 'account_approved',
  account_rejected = 'account_rejected',
  account_suspended = 'account_suspended',
  account_deleted = 'account_deleted',
  account_locked = 'account_locked',
  account_unlocked = 'account_unlocked',
  account_reset_password = 'account_reset_password',

  // HALF Wallet
  half_wallet_admin_processing = 'half_wallet_admin_processing',
  half_wallet_rejected = 'half_wallet_rejected',
  half_transfer_approved = 'half_transfer_approved',
  half_transfer_rejected = 'half_transfer_rejected',
  half_manual_sent = 'half_manual_sent',
}