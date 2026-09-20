import { AxiosResponse } from 'axios';
import { APIRouters } from '../APIRouters';
import api from '..';
import {
  CreateNewsItem,
  GetCommentsQuery,
  NewsFilter,
} from '@/types/news.type';
import { AuthUser } from '@/lib/auth';

class GetNewsApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async getNews(filter: NewsFilter) {
    const response: AxiosResponse = await api.get(APIRouters.news.value, {
      params: {
        ...filter,
      },
      ...this.tokens,
    });
    return response;
  }

  async getAdminNews(filter: NewsFilter) {
    const response: AxiosResponse = await api.get(APIRouters.news.admin.value, {
      params: {
        ...filter,
      },
      ...this.tokens,
    });
    return response;
  }

  async getNewsById(newsId: string) {
    const response: AxiosResponse = await api.get(
      APIRouters.news.newsItemId.value(newsId),
      {
        ...this.tokens,
      },
    );
    return response;
  }

  async getNewsBySlug(slug: string) {
    const response: AxiosResponse = await api.get(
      APIRouters.news.newsItemId.slug.value(slug),
      {
        ...this.tokens,
      },
    );
    return response;
  }

  async getCommentNews(newsId: string, query: GetCommentsQuery) {
    const response: AxiosResponse = await api.get(
      APIRouters.news.newsItemId.comment.value(newsId),
      {
        params: {
          ...query,
        },
        ...this.tokens,
      },
    );
    return response;
  }

  async getRepliesComment(newsId: string, parentCommentId: string) {
    const response: AxiosResponse = await api.get(
      APIRouters.news.newsItemId.comment.commentId.value(
        newsId,
        parentCommentId,
      ),
      {
        ...this.tokens,
      },
    );
    return response;
  }
}

class PostNewsApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async createNews(newsData: CreateNewsItem) {
    const response: AxiosResponse = await api.post(APIRouters.news.value, {
      data: newsData,
      ...this.tokens,
    });
    return response;
  }

  async likeNews(newsId: string) {
    const response: AxiosResponse = await api.post(
      APIRouters.news.newsItemId.like.value(newsId),
      {
        ...this.tokens,
      },
    );
    return response;
  }

  async addComment(newsId: string, content: string, parentCommentId?: string) {
    const response: AxiosResponse = await api.post(
      APIRouters.news.newsItemId.comment.value(newsId),
      {
        data: {
          content,
          parentCommentId,
        },
        ...this.tokens,
      },
    );
    return response;
  }

  async likeComment(commentId: string) {
    const response: AxiosResponse = await api.post(
      APIRouters.news.comment.commentId.like.value(commentId),
      {
        ...this.tokens,
      },
    );
    return response;
  }
}

class PatchNewsApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async incrementView(newsId: string) {
    const response: AxiosResponse = await api.patch(
      APIRouters.news.newsItemId.views.value(newsId),
      {
        ...this.tokens,
      },
    );
    return response;
  }

  async updateNews(newsId: string, newsData: any) {
    const response: AxiosResponse = await api.patch(
      APIRouters.news.newsItemId.value(newsId),
      {
        data: newsData,
        ...this.tokens,
      },
    );
    return response;
  }

  async updateComment(commentId: string, content: string) {
    const response: AxiosResponse = await api.patch(
      APIRouters.news.comment.commentId.value(commentId),
      {
        data: { content },
        ...this.tokens,
      },
    );
    return response;
  }
}

class DeleteNewsApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async deleteNews(newsId: string) {
    const response: AxiosResponse = await api.delete(
      APIRouters.news.newsItemId.value(newsId),
      {
        ...this.tokens,
      },
    );
    return response;
  }

  async deleteComment(commentId: string) {
    const response: AxiosResponse = await api.delete(
      APIRouters.news.comment.commentId.value(commentId),
      {
        ...this.tokens,
      },
    );
    return response;
  }
}

export const getNewsApi = new GetNewsApi();
export const postNewsApi = new PostNewsApi();
export const patchNewsApi = new PatchNewsApi();
export const deleteNewsApi = new DeleteNewsApi();

// Factory for authenticated access
export const createNewsApis = (tokens: {
  accessToken: string;
  refreshToken?: string;
  user?: AuthUser;
}) => ({
  get: new GetNewsApi(tokens),
  post: new PostNewsApi(tokens),
  patch: new PatchNewsApi(tokens),
  delete: new DeleteNewsApi(tokens),
});
