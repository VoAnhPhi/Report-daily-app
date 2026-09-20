import { Attachment } from './attachment.type';
import { MuxData } from './mux.type';

export enum NewsCategory {
  ALL = 'all',
  NEWS = 'news',
  EVENT = 'event',
  ANNOUNCEMENT = 'announcement',
}

export enum NewsCategoryCreate {
  NEWS = 'news',
  EVENT = 'event',
  ANNOUNCEMENT = 'announcement',
}

export interface CommentUser {
  id: string;
  fullName: string;
  referenceId: string;
  avatar: {
    fileUrl: string;
  };
}

export interface NewsComment {
  id: string;
  user: CommentUser;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  parentId: string | null;
  replies: NewsComment[];
  replyCount: number;
  likes: NewsCommentLike[];
}

export interface NewsFilter {
  page?: number;
  limit?: number;
  searchQuery?: string;
  category?: NewsCategory;
  sortBy?: string;
  authorId?: string;
}

export interface NewsLike {
  id: string;
  userId: string;
  newsId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewsCommentLike {
  id: string;
  userId: string;
  commentId: string;
  createdAt: string;
  updatedAt: string;
  user: CommentUser;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: NewsCategoryCreate;
  duration: string | null;
  level: string | null;
  views: number;
  rating: number;
  location: string | null;
  date: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  authorId: string;
  imageUrls: string[];
  videoUrls: string[];
  slug: string;
  author: {
    id: string;
    fullName: string;
    email: string;
    referenceId: string;
    avatar: Attachment;
  };
  comments: NewsComment[];
  likes: NewsLike[];
  isLiked?: boolean;
  commentCount: number;
  muxData?: MuxData[];
}

export interface GetCommentsQuery {
  page?: number;
  limit?: number;
  skip?: number;
}

export interface PaginatedCommentsResponse {
  data: NewsComment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CreateNewsItem {
  title: string;
  summary: string;
  content: string;
  category: NewsCategoryCreate;
  date?: string;
  location?: string;
  duration?: string;
  level?: string;
  imageUrls?: string[];
  videoUrls?: string[];
  slug?: string;
}
