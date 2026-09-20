import { Attachment } from '../attachment.type';
import { MuxData } from '../mux.type';

export type UserDocumentChapterWithProgress = {
  id: string;

  title: string;
  content?: string | null;
  position: number;
  views?: number;
  videoUrl?: string | null;

  muxData?: MuxData | null;

  isPublished: boolean;
  isCompleted: boolean;
  // Auto-completion progress (max reached). Text done at >=90 scroll, video at
  // >=67 (2/3). Backend computes isCompleted from these (sticky once true).
  scrollPercent?: number;
  videoPercent?: number;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  publishedAt?: Date | null;
};

export type UserDocumentWithProgress = {
  id: string;

  title: string;
  description?: string | null;
  categoryId: string;
  categoryName: string;
  slug?: string | null;
  downloads?: number;

  isPublished: boolean;
  isPinned?: boolean;
  thumbnailUrl?: string | null;

  chapters: UserDocumentChapterWithProgress[];

  attachments: Pick<Attachment, 'id' | 'fileName' | 'mimeType' | 'fileUrl'>[];

  uploader: {
    id: string;
    fullName: string;
    referenceId: string;
    avatarUrl?: string | null;
    verificationDate?: Date | null;
  };

  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date | null;

  // user flags
  isFollowing?: boolean;
  isFavorite?: boolean;
  lastViewed: boolean;

  // Aggregates từ backend: số bình luận (chưa xoá) + số người yêu thích.
  commentCount?: number;
  favoriteCount?: number;
};

export type PaginatedUserDocumentsWithProgress = {
  data: UserDocumentWithProgress[];
  total: number;
  page: number;
  totalPages: number;
};
