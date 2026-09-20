import { Attachment } from './attachment.type';
import { MuxData } from './mux.type';

export type DocumentComment = {
  id: string;
  content: string;
  userId: string;
  documentId: string;
  parentId?: string | null;
  user: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  };
  likes: number;
  isLiked: boolean;
  repliesCount: number;
  replies?: DocumentComment[];
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentCategory = {
  id: string;

  name: string;
  description?: string | null;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
};

export type DocumentChapter = {
  id: string;

  title: string;
  content?: string;
  position: number;
  views: number;
  videoUrl?: string;
  isPublished: boolean;

  muxData?: MuxData | null;

  documentId: string;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  publishedAt?: Date | null;
  isCompleted: boolean;
};

export type Document = {
  id: string;

  title: string;
  description?: string;
  categoryId: string;
  categoryName: string;
  // Mirrors the backend DTO: surfaces a soft-deleted category so the UI can
  // explain why a document may be hidden from the storefront.
  categoryDeletedAt?: Date | null;
  slug?: string;
  downloads: number;
  isPublished: boolean;
  // Admin "ghim": pinned documents float to the top (badge "Ghim" in the UI).
  isPinned?: boolean;
  pinnedAt?: Date | null;
  // Aggregates từ backend: số bình luận (chưa xoá) + số người yêu thích.
  commentCount?: number;
  favoriteCount?: number;
  thumbnailUrl: string;
  chapters: DocumentChapter[];
  attachments: Pick<Attachment, 'id' | 'fileName' | 'mimeType' | 'fileUrl'>[];
  uploader: {
    id: string;
    fullName: string;
    referenceId: string;
    avatarUrl?: string | null;
    verificationDate?: Date | null;
  };
  // Backend returns the viewer's relationship to the document nested here.
  userDocument?: {
    isFollowing: boolean;
    isFavorite: boolean;
    lastViewed: boolean;
  };
  // Flattened from `userDocument` by the query `select` for convenient access
  // in the card and the UserDocumentWithProgress mapper.
  isFollowing?: boolean;
  isFavorite?: boolean;
  lastViewed?: boolean;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  publishedAt?: Date | null;
};

export type PaginatedDocuments = {
  data: Document[];
  total: number;
  page: number;
  totalPages: number;
};

export interface DocumentQueryState {
  searchQuery: string;
  categoryId: string;
  uploaderId?: string;
  mode: 'all' | 'downloads' | 'latest' | 'views';
  page: number;
  limit: number;
  showAll: boolean;
  view: 'cards' | 'table';
  favoriteOnly?: boolean;
  followingOnly?: boolean;
}
