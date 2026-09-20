import { type Notification, NotificationType } from "@/types/notification.type"
import type { IUser } from "@/types/user.type"

export const mockNotifications: Notification[] = [
  {
    id: "notif1",
    type: NotificationType.new_social_post,
    message: "Vừa có bài đăng mới ở Khoảnh khắc cộng đồng",
    link: "/posts/123",
    isRead: false,
    userId: "current_user_id",
    createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    targetType: "SOCIAL_POST",
    targetId: "post123",
  },
  {
    id: "notif2",
    type: NotificationType.like,
    message: "Một người dùng đã thích bài viết của bạn",
    link: "/posts/456",
    isRead: false,
    userId: "current_user_id",
    actorId: "user_liked_id",
    actor: {
      id: "user_liked_id",
      fullName: "Nguyễn Văn A",
      email: "nguyenvana@example.com",
      avatar: {
        fileUrl: "https://i.pravatar.cc/150?img=3",
      },
      role: "user",
      status: "active",
      referenceId: "ref-123",
    } as IUser,
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    targetType: "POST",
    targetId: "post456",
  },
  {
    id: "notif3",
    type: NotificationType.new_news_post,
    message: "Vừa có bài đăng mới ở Sự kiện tin tức",
    link: "/news/789",
    isRead: false,
    userId: "current_user_id",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    targetType: "NEWS",
    targetId: "news789",
  },
  {
    id: "notif4",
    type: NotificationType.new_announcement,
    message: "Vừa có bài đăng mới ở Tuyển dụng",
    link: "/admin/posts/announcements",
    isRead: true,
    userId: "current_user_id",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    targetType: "ANNOUNCEMENT",
    targetId: "announcement101",
  },
  {
    id: "notif5",
    type: NotificationType.account_approved,
    message: "Tài khoản của bạn vừa được phê duyệt",
    link: "/profile",
    isRead: false,
    userId: "current_user_id",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    targetType: "USER",
    targetId: "current_user_id",
  },
  {
    id: "notif6",
    type: NotificationType.comment,
    message: "Một người dùng đã bình luận vào bài viết của bạn",
    link: "/posts/456#comments",
    isRead: false,
    userId: "current_user_id",
    actorId: "user_commented_id",
    actor: {
      id: "user_commented_id",
      fullName: "Trần Thị B",
      email: "tranthib@example.com",
      avatar: {
        fileUrl: "https://i.pravatar.cc/150?img=12",
      },
      role: "user",
      status: "active",
      referenceId: "ref-456",
    } as IUser,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
    targetType: "POST",
    targetId: "post456",
  },
  {
    id: "notif7",
    type: NotificationType.like,
    message: "Một người dùng đã thích bài viết của bạn",
    link: "/posts/789",
    isRead: true,
    userId: "current_user_id",
    actorId: "user_liked_id_2",
    actor: {
      id: "user_liked_id_2",
      fullName: "Lê Văn C",
      email: "levanc@example.com",
      avatar: {
        fileUrl: "https://i.pravatar.cc/150?img=20",
      },
      role: "user",
      status: "active",
      referenceId: "ref-789",
    } as IUser,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
    targetType: "POST",
    targetId: "post789",
  },
]
