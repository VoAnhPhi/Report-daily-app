import {
  CreateDocumentCategoryFormValues,
  CreateDocumentChapterFormValues,
  CreateDocumentFormValues,
  UpdateDocumentChapterFormValues,
  UpdateDocumentFormValues,
} from '@/schemas/posts/documents.schema';
import {
  Document,
  DocumentCategory,
  DocumentChapter,
  DocumentQueryState,
  PaginatedDocuments,
  DocumentComment,
} from '@/types/documents.type';
import api from '..';
import { Attachment } from '@/types/attachment.type';
import { PaginatedUserDocumentsWithProgress } from '@/types/features/document-user.type';
import { AuthUser } from '@/lib/auth';

/**
 * Strip values that the backend treats as "no filter" so they never reach the
 * server as literal filters:
 * - drop the FE-only `view` field (UI state, not a query param)
 * - drop `categoryId` when it's empty or 'all' (FE sentinels for "no filter")
 * - drop `favoriteOnly` / `followingOnly` / `showAll` when they're false
 *   (some backends treat presence-of-key as truthy; safer to omit)
 * - drop `searchQuery` when empty
 */
function sanitizeDocumentQueryParams(
  query: DocumentQueryState,
): Record<string, unknown> {
  const { view, ...rest } = query;
  const params: Record<string, unknown> = { ...rest };

  if (!params.categoryId || params.categoryId === 'all') {
    delete params.categoryId;
  }
  if (params.favoriteOnly !== true) delete params.favoriteOnly;
  if (params.followingOnly !== true) delete params.followingOnly;
  if (params.showAll !== true) delete params.showAll;
  if (typeof params.searchQuery === 'string' && !params.searchQuery.trim()) {
    delete params.searchQuery;
  }
  return params;
}

class GetDocumentApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async getDocuments(query: DocumentQueryState) {
    const params = sanitizeDocumentQueryParams(query);
    const res = await api.get<PaginatedDocuments>('/documents', {
      params,
      ...this.tokens,
    });
    return res.data;
  }

  async getDocumentsByCurrentUser(query: DocumentQueryState) {
    const params = sanitizeDocumentQueryParams(query);
    const res = await api.get<PaginatedUserDocumentsWithProgress>(
      '/documents/user',
      {
        params,
        ...this.tokens,
      },
    );
    return res.data;
  }

  async getDocumentCategories() {
    const res = await api.get<DocumentCategory[]>('/documents/categories', {
      ...this.tokens,
    });
    return res.data;
  }

  async getDocumentById(id: string) {
    const res = await api.get<Document>(`/documents/${id}`, {
      ...this.tokens,
    });
    return res.data;
  }

  async getDocumentChapterById(documentId: string, chapterId: string) {
    const res = await api.get<DocumentChapter>(
      `/documents/${documentId}/chapters/${chapterId}`,
      {
        ...this.tokens,
      },
    );
    return res.data;
  }

  // Document Comments API
  async getDocumentComments(
    documentId: string,
    query: { page?: number; limit?: number } = {},
  ) {
    const res = await api.get<{
      data: DocumentComment[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/documents/${documentId}/comments`, {
      params: query,
      ...this.tokens,
    });
    return res.data;
  }

  async getDocumentCommentReplies(
    documentId: string,
    commentId: string,
    query: { page?: number; limit?: number } = {},
  ) {
    const res = await api.get<{
      data: DocumentComment[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/documents/${documentId}/comments/${commentId}`, {
      params: query,
      ...this.tokens,
    });
    return res.data;
  }
}

class PostDocumentApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async createDocument(data: CreateDocumentFormValues) {
    const res = await api.post<Document>('/documents', {
      data,
      ...this.tokens,
    });
    return res.data;
  }

  async createDocumentCategory(data: CreateDocumentCategoryFormValues) {
    const res = await api.post<DocumentCategory>('/documents/categories', {
      data,
      ...this.tokens,
    });
    return res.data;
  }

  async createDocumentChapter(
    documentId: string,
    data: CreateDocumentChapterFormValues,
  ) {
    const res = await api.post<DocumentChapter>(
      `/documents/${documentId}/chapters`,
      {
        data,
        ...this.tokens,
      },
    );
    return res.data;
  }

  async uploadDocumentThumbnail(id: string, thumbnailUrl: string) {
    const res = await api.post<Document>(`/documents/${id}/thumbnail`, {
      data: { thumbnailUrl },
      ...this.tokens,
    });
    return res.data;
  }

  async uploadDocumentAttachment(
    id: string,
    fileUrl: string,
    mimeType: string,
  ) {
    const res = await api.post<
      Pick<Attachment, 'id' | 'fileName' | 'mimeType' | 'fileUrl'>
    >(`/documents/${id}/attachment`, {
      data: { fileUrl, mimeType },
      ...this.tokens,
    });
    return res.data;
  }

  async toggleFavoriteDocument(documentId: string) {
    const res = await api.post<{
      success: boolean;
      message: string;
    }>(`/documents/${documentId}/user/favorite`, {
      ...this.tokens,
    });
    return res.data;
  }

  async toggleFollowDocument(documentId: string) {
    const res = await api.post<{
      success: boolean;
      message: string;
    }>(`/documents/${documentId}/user/follow`, {
      ...this.tokens,
    });
    return res.data;
  }

  async toggleChapterCompletion(documentId: string, chapterId: string) {
    const res = await api.post<{
      success: boolean;
      message: string;
    }>(`/documents/${documentId}/chapters/${chapterId}/user/complete`, {
      ...this.tokens,
    });
    return res.data;
  }

  async incrementChapterView(documentId: string, chapterId: string) {
    const res = await api.post<{
      success: boolean;
      message: string;
    }>(`/documents/${documentId}/chapters/${chapterId}/user/view`, {
      ...this.tokens,
    });
    return res.data;
  }

  async updateChapterProgress(
    documentId: string,
    chapterId: string,
    data: { scrollPercent?: number; videoPercent?: number },
  ) {
    const res = await api.post<{
      success: boolean;
      isCompleted: boolean;
      scrollPercent: number;
      videoPercent: number;
    }>(`/documents/${documentId}/chapters/${chapterId}/user/progress`, {
      data,
      ...this.tokens,
    });
    return res.data;
  }

  // Document Comments API
  async addDocumentComment(
    documentId: string,
    data: { content: string; parentId?: string },
  ) {
    const res = await api.post<DocumentComment>(
      `/documents/${documentId}/comments`,
      {
        data: {
          content: data.content,
          parentId: data.parentId,
        },
        ...this.tokens,
      },
    );
    return res.data;
  }

  async toggleDocumentCommentLike(commentId: string) {
    const res = await api.post<{ liked: boolean }>(
      `/documents/comments/${commentId}/like`,
      {
        ...this.tokens,
      },
    );
    return res.data;
  }
}

class PatchDocumentApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async updateDocument(id: string, data: UpdateDocumentFormValues) {
    const res = await api.patch<Document>(`/documents/${id}`, {
      data,
      ...this.tokens,
    });
    return res.data;
  }

  async updateDocumentChapter(
    documentId: string,
    chapterId: string,
    data: UpdateDocumentChapterFormValues,
  ) {
    const res = await api.patch<DocumentChapter>(
      `/documents/${documentId}/chapters/${chapterId}`,
      {
        data,
        ...this.tokens,
      },
    );
    return res.data;
  }

  async publish(documentId: string, isPublished: boolean) {
    const res = await api.patch<{
      success: boolean;
      message: string;
    }>(`/documents/${documentId}/publish`, {
      data: { isPublished },
      ...this.tokens,
    });
    return res.data;
  }

  async publishChapter(
    documentId: string,
    chapterId: string,
    isPublished: boolean,
  ) {
    const res = await api.patch<{
      success: boolean;
      message: string;
    }>(`/documents/${documentId}/chapters/${chapterId}/publish`, {
      data: { isPublished },
      ...this.tokens,
    });
    return res.data;
  }

  // Document Comments API
  async updateDocumentComment(commentId: string, data: { content: string }) {
    const res = await api.patch<DocumentComment>(
      `/documents/comments/${commentId}`,
      {
        ...data,
        ...this.tokens,
      },
    );
    return res.data;
  }
}

class PutDocumentApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async reorderChapters(
    documentId: string,
    chapters: { id: string; position: number }[],
  ) {
    const res = await api.put<Document[]>(
      `/documents/${documentId}/chapters/reorder`,
      {
        data: chapters,
        ...this.tokens,
      },
    );
    return res.data;
  }
}

class DeleteDocumentApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async deleteDocument(id: string) {
    const res = await api.delete<{
      success: boolean;
      message: string;
    }>(`/documents/${id}`, {
      ...this.tokens,
    });
    return res.data;
  }

  async deleteDocumentAttachment(documentId: string, attachmentId: string) {
    const res = await api.delete<{
      success: boolean;
      message: string;
    }>(`/documents/${documentId}/attachment/${attachmentId}`, {
      ...this.tokens,
    });
    return res.data;
  }

  async deleteDocumentChapter(documentId: string, chapterId: string) {
    const res = await api.delete<{
      success: boolean;
      message: string;
    }>(`/documents/${documentId}/chapters/${chapterId}`, {
      ...this.tokens,
    });
    return res.data;
  }

  // Document Comments API
  async deleteDocumentComment(commentId: string) {
    const res = await api.delete<{ success: boolean }>(
      `/documents/comments/${commentId}`,
      {
        ...this.tokens,
      },
    );
    return res.data;
  }
}

export const createDocumentApis = (tokens: {
  accessToken: string;
  refreshToken?: string;
  user?: AuthUser;
}) => ({
  get: new GetDocumentApi(tokens),
  post: new PostDocumentApi(tokens),
  put: new PutDocumentApi(tokens),
  patch: new PatchDocumentApi(tokens),
  delete: new DeleteDocumentApi(tokens),
});
