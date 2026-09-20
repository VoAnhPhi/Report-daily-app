import {
  PaginatedPosts,
  Post,
  PostQueryState,
  PostAnalytics,
  PostFeeling,
  PostActivityCategory,
  PostActivity,
  PostCooldownState,
} from '@/types/social.type';
import { Comment } from '@/types';
import api from '..';
import { AuthUser } from '@/lib/auth';

// Types for place suggestions
export interface PlaceSuggestion {
  id: string;
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  // Goong API v2 compound data
  compound?: {
    commune?: string;
    district?: string;
    province?: string;
  };
}

interface PlaceSuggestionsResponse {
  status: string;
  predictions: PlaceSuggestion[];
  error_message?: string;
}

export class GetPostApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async getPosts(query: PostQueryState) {
    const { view, showAll, myPosts, ...restParams } = query;

    // Only include showAll and myPosts if they are explicitly true
    const queryParams = {
      ...restParams,
      ...(showAll === true && { showAll: true }),
      ...(myPosts === true && { myPosts: true }),
    };

    const res = await api.get<PaginatedPosts>('/posts', {
      params: queryParams,
      ...this.tokens,
    });

    return res.data;
  }

  async getPostById(postId: string, includeAnalytics: boolean = false) {
    const res = await api.get<Post>(`/posts/${postId}`, {
      params: { includeAnalytics },
      ...this.tokens,
    });
    return res.data;
  }

  async getPostAnalytics(postId: string) {
    const res = await api.get<PostAnalytics>(`/posts/${postId}/analytics`, {
      ...this.tokens,
    });
    return res.data;
  }

  async getFeelings() {
    const res = await api.get<PostFeeling[]>('/posts/feelings', {
      ...this.tokens,
    });
    return res.data;
  }

  async getActivityCategories() {
    const res = await api.get<PostActivityCategory[]>(
      '/posts/activity-categories',
      {
        ...this.tokens,
      },
    );
    return res.data;
  }

  async getActivitiesByCategory(categoryId: string) {
    const res = await api.get<PostActivity[]>(
      `/posts/activities/${categoryId}`,
      {
        ...this.tokens,
      },
    );
    return res.data;
  }

  async getTopLevelComments(postId: string, page = 1, limit = 10) {
    const res = await api.get<Comment[]>(`/posts/${postId}/comments`, {
      params: { page, limit },
      ...this.tokens,
    });
    return res.data;
  }

  async getReplies(parentId: string, page = 1, limit = 10) {
    const res = await api.get<Comment[]>(
      `/posts/comments/${parentId}/replies`,
      {
        params: { page, limit },
        ...this.tokens,
      },
    );
    return res.data;
  }

  async getPlaceSuggestions(query: string) {
    try {
      if (!query.trim()) return [];

      const params = new URLSearchParams();
      params.append('query', query.trim());

      const res = await api.get<PlaceSuggestionsResponse>(
        `/posts/place-suggestions?${params.toString()}`,
        {
          ...this.tokens,
        },
      );

      if (res.data.status !== 'OK') {
        throw new Error(
          res.data.error_message || 'Place suggestions service error',
        );
      }

      return res.data.predictions || [];
    } catch (error) {
      console.error('Error fetching place suggestions:', error);
      throw error;
    }
  }

  /**
   * Khoảng nghỉ đăng bài còn lại của chính người dùng. Máy chủ là nguồn sự thật:
   * không cache ở tầng axios, và gọi lại sau mỗi lần đăng thành công.
   */
  /**
   * Tab "Lưu trữ": bài mình được gắn thẻ và đã tự ẩn khỏi trang cá nhân.
   * Luôn là của CHÍNH người gọi — máy chủ suy từ JWT, không nhận id người khác.
   */
  async getArchivedPosts(page = 1, limit = 10) {
    const res = await api.get<PaginatedPosts>('/posts/archived', {
      params: { page, limit },
      ...this.tokens,
    });
    return res.data;
  }

  async getPostCooldown() {
    const res = await api.get<PostCooldownState>('/posts/post-cooldown', {
      ...this.tokens,
    });
    return res.data;
  }

  async getPendingVerificationPosts(page: number = 1, limit: number = 20) {
    const res = await api.get<PaginatedPosts>('/posts/pending-verification', {
      params: { page, limit },
      ...this.tokens,
    });
    return res.data;
  }

  async getPlaceSuggestionsV2(query: string) {
    try {
      if (!query.trim()) return [];

      const params = new URLSearchParams();
      params.append('query', query.trim());

      const res = await api.get<PlaceSuggestionsResponse>(
        `/posts/place-suggestions-v2?${params.toString()}`,
        {
          ...this.tokens,
        },
      );

      if (res.data.status !== 'OK') {
        throw new Error(
          res.data.error_message || 'Place suggestions service error',
        );
      }

      return res.data.predictions || [];
    } catch (error) {
      console.error('Error fetching place suggestions V2:', error);
      throw error;
    }
  }
}

export class PostPostApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async addComment(postId: string, content: string, parentId?: string) {
    const res = await api.post<Comment>(`/posts/${postId}/comments`, {
      data: { content, parentId },
      ...this.tokens,
    });
    return res.data;
  }
}

export class PatchPostApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async updateComment(commentId: string, content: string) {
    const res = await api.put<Comment>(`/posts/comments/${commentId}`, {
      data: { content },
      ...this.tokens,
    });
    return res.data;
  }

  /**
   * Ẩn / hiện lại bài mình được gắn thẻ trên trang cá nhân của mình.
   *
   * Cờ tường minh chứ không phải toggle: bấm "Hoàn tác" hai lần vẫn ra đúng một
   * kết quả, không lật ngược trạng thái.
   */
  async setTagProfileVisibility(postId: string, hidden: boolean) {
    const res = await api.patch<{
      postId: string;
      hidden: boolean;
      hiddenFromProfileAt: string | null;
    }>(`/posts/${postId}/tag/visibility`, {
      data: { hidden },
      ...this.tokens,
    });
    return res.data;
  }
}

export class DeletePostApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async deleteComment(commentId: string) {
    const res = await api.delete<{ success: boolean; message: string }>(
      `/posts/comments/${commentId}`,
      { ...this.tokens },
    );
    return res.data;
  }

  /** Gỡ thẻ của chính mình khỏi bài viết. Không đảo được. */
  async removeOwnTag(postId: string) {
    const res = await api.delete<{ postId: string; removed: boolean }>(
      `/posts/${postId}/tag`,
      { ...this.tokens },
    );
    return res.data;
  }
}

export const createPostApis = (tokens: {
  accessToken: string;
  refreshToken?: string;
  user?: AuthUser;
}) => ({
  get: new GetPostApi(tokens),
  post: new PostPostApi(tokens),
  patch: new PatchPostApi(tokens),
  delete: new DeletePostApi(tokens),
  analytics: {
    getPostAnalytics: (postId: string) =>
      new GetPostApi(tokens).getPostAnalytics(postId),
  },
  placeSuggestions: {
    getPlaceSuggestions: (query: string) =>
      new GetPostApi(tokens).getPlaceSuggestions(query),
    getPlaceSuggestionsV2: (query: string) =>
      new GetPostApi(tokens).getPlaceSuggestionsV2(query),
  },
});
