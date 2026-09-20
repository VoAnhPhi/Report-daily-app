import { createNewsApis } from '@/app/api/news';
import { messages } from '@/constants/message';
import { messagesBe } from '@/constants/messageBe';
import type {
  CreateNewsItem,
  GetCommentsQuery,
  NewsComment,
  NewsCommentLike,
  NewsFilter,
  NewsItem,
  PaginatedCommentsResponse,
} from '@/types/news.type';
import type { AxiosResponse } from 'axios';
import { AxiosError, HttpStatusCode } from 'axios';
import { action, makeAutoObservable, runInAction } from 'mobx';
import type RootStore from './rootStore';

class NewsStore {
  rootStore: RootStore;

  news: NewsItem[] = [];
  totalNewsItem = 0;
  page = 1;
  isLoading = false;

  // Cache properties for better performance
  private cache: Map<
    string,
    { data: NewsItem[]; total: number; timestamp: number }
  > = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  private lastFilter: NewsFilter | null = null;

  constructor(rootStore: RootStore) {
    makeAutoObservable(this, {
      setLoading: action,
      setNews: action,
      setTotalNewsItem: action,
      setPage: action,
      incrementNewsView: action,
      updateNewsCommentLikes: action,
      clearCache: action,
    });
    this.rootStore = rootStore;
  }

  // Clear cache method
  clearCache() {
    this.cache.clear();
    this.lastFilter = null;
  }

  // Refresh news data (bypass cache)
  public async refreshNews(filter?: NewsFilter): Promise<void> {
    const cacheKey = this.getCacheKey(filter || {});
    this.cache.delete(cacheKey); // Remove from cache to force fresh fetch
    this.lastFilter = null;
    await this.fetchNews(filter);
  }

  // Get cached data if available (for immediate display)
  public hasCachedData(filter?: NewsFilter): boolean {
    const cacheKey = this.getCacheKey(filter || {});
    return this.isCacheValid(cacheKey);
  }

  setLoading(value: boolean) {
    this.isLoading = value;
  }

  setNews(news: NewsItem[]) {
    this.news = news;
  }

  setTotalNewsItem(total: number) {
    this.totalNewsItem = total;
  }

  setPage(page: number) {
    this.page = page;
  }

  // Generate cache key from filter
  private getCacheKey = (filter: NewsFilter): string => {
    return JSON.stringify(filter);
  };

  // Check if cache is valid
  private isCacheValid = (cacheKey: string): boolean => {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.CACHE_DURATION;
  };

  // Check if current data is stale
  private isDataStale = (): boolean => {
    if (!this.lastFilter) return true;
    const cacheKey = this.getCacheKey(this.lastFilter);
    return !this.isCacheValid(cacheKey);
  };

  incrementNewsView(newsItemId: string) {
    this.news = this.news.map((item) =>
      item.id === newsItemId ? { ...item, views: item.views + 1 } : item,
    );
  }

  public async fetchNews(filter?: NewsFilter): Promise<void> {
    if (this.isLoading) return;
    const session = this.rootStore.session;
    if (!session) return;

    // Check if we have valid cached data for this filter
    const cacheKey = this.getCacheKey(filter || {});
    if (this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        runInAction(() => {
          this.setNews(cached.data);
          this.setTotalNewsItem(cached.total);
          this.setPage(filter?.page || 1);
        });
        return;
      }
    }

    // Check if filter hasn't changed and we have data (for navigation back)
    if (
      this.lastFilter &&
      JSON.stringify(this.lastFilter) === JSON.stringify(filter) &&
      this.news.length > 0
    ) {
      // If data is stale, refresh in background
      if (this.isDataStale()) {
        this.refreshNews(filter).catch(console.error);
      }
      return; // Use existing data
    }

    try {
      this.setLoading(true);
      const { get } = createNewsApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });
      const response = await get.getNews(filter);
      runInAction(() => {
        this.setNews(response.data.data);
        this.setTotalNewsItem(response.data.total);
        this.setPage(response.data.page);

        // Cache the result
        this.cache.set(cacheKey, {
          data: response.data.data,
          total: response.data.total,
          timestamp: Date.now(),
        });
        this.lastFilter = filter || null;
      });
    } catch (error) {
      console.error(error);
    } finally {
      this.setLoading(false);
    }
  }

  public async fetchAdminNews(filter?: NewsFilter): Promise<void> {
    if (this.isLoading) return;
    try {
      this.setLoading(true);
      const session = this.rootStore.session;
      if (!session) return;

      const { get } = createNewsApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });
      const response = await get.getAdminNews(filter);
      runInAction(() => {
        this.setNews(response.data.data);
        this.setTotalNewsItem(response.data.total);
        this.setPage(response.data.page);
      });
    } catch (error) {
      console.error(error);
    } finally {
      this.setLoading(false);
    }
  }

  public async incrementView(newsItemId: string): Promise<void> {
    try {
      if (this.isLoading) return;
      const session = this.rootStore.session;
      if (!session) return;

      this.setLoading(true);
      const { patch } = createNewsApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });
      await patch.incrementView(newsItemId);
      this.incrementNewsView(newsItemId);
    } catch (error) {
      console.error(error);
    } finally {
      this.setLoading(false);
    }
  }

  public async toggleLikeNews(
    newsItemId: string,
    userId: string,
  ): Promise<string> {
    try {
      this.setLoading(true);
      const session = this.rootStore.session;
      if (!session) return messages.userNotActive;

      const { post } = createNewsApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });

      const response = await post.likeNews(newsItemId);
      if (response.status === HttpStatusCode.Created) {
        this.updateNewsLikes(
          newsItemId,
          userId,
          response.data.like,
          response.data.toggleLike,
        );
        return '';
      }
      return messages.userNotActive;
    } catch (error) {
      console.error('Error toggling like:', error);
      if (error instanceof AxiosError) {
        if (error.response?.data.message === messagesBe.userNotActive) {
          return messages.userNotActive;
        }
      }
      return messages.somethingWentWrong;
    } finally {
      runInAction(() => {
        this.setLoading(false);
      });
    }
  }

  private updateNewsLikes = (
    newsItemId: string,
    userId: string,
    like: any,
    toggleLike: boolean,
  ) => {
    runInAction(() => {
      this.news = this.news.map((item) =>
        item.id === newsItemId
          ? {
              ...item,
              likes: toggleLike
                ? [...item.likes, like]
                : item.likes.filter((l) => l.userId !== userId),
            }
          : item,
      );
    });
  };

  private updateCommentLikesRecursive = (
    comments: NewsComment[],
    commentId: string,
    likes: NewsCommentLike[],
  ): NewsComment[] => {
    if (!comments) return [];
    return comments?.map((comment) => {
      if (comment.id === commentId) {
        return { ...comment, likes };
      }

      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: this.updateCommentLikesRecursive(
            comment.replies,
            commentId,
            likes,
          ),
        };
      }

      return comment;
    });
  };

  updateNewsCommentLikes(commentId: string, likes: NewsCommentLike[]) {
    this.news = this.news.map((item) => ({
      ...item,
      comments: this.updateCommentLikesRecursive(
        item.comments,
        commentId,
        likes,
      ),
    }));

    this.setLoading(false);
  }

  public async getCommentsPaginated(
    newsItemId: string,
    query: GetCommentsQuery = {},
  ): Promise<PaginatedCommentsResponse> {
    try {
      this.setLoading(true);
      const session = this.rootStore.session;
      if (!session) return;

      const { get } = createNewsApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });

      const response = await get.getCommentNews(newsItemId, query);
      this.updateNewsComments(newsItemId, response.data.data);
      return response.data;
    } catch (error) {
      console.error('Failed to get paginated comments:', error);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  private updateNewsComments = (
    newsItemId: string,
    rootComments: NewsComment[],
  ) => {
    this.news = this.news.map((item) =>
      item.id === newsItemId
        ? {
            ...item,
            comments: this.preserveNestedStructure(rootComments),
          }
        : item,
    );
  };

  private preserveNestedStructure = (
    comments: NewsComment[],
  ): NewsComment[] => {
    return comments.map((comment) => ({
      ...comment,
      replies: comment.replies
        ? this.preserveNestedStructure(comment.replies)
        : [],
    }));
  };

  public async loadRepliesForComment(
    newsItemId: string,
    parentCommentId: string,
  ): Promise<void> {
    try {
      this.setLoading(true);
      const session = this.rootStore.session;
      if (!session) return;

      const { get } = createNewsApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });

      const response = await get.getRepliesComment(newsItemId, parentCommentId);
      const replies: NewsComment[] = response.data;

      this.news = this.news.map((item) =>
        item.id === newsItemId
          ? {
              ...item,
              comments: this._addRepliesToComment(
                item.comments,
                parentCommentId,
                replies,
              ),
            }
          : item,
      );
    } catch (error) {
      console.error('Failed to load replies', error);
    }
  }

  private _addRepliesToComment = (
    comments: NewsComment[],
    parentId: string,
    repliesToAdd: NewsComment[],
  ): NewsComment[] => {
    return comments.map((comment) => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), ...repliesToAdd],
        };
      }

      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: this._addRepliesToComment(
            comment.replies,
            parentId,
            repliesToAdd,
          ),
        };
      }

      return comment;
    });
  };

  private addReplyRecursive = (
    comments: NewsComment[],
    parentId: string,
    newReply: NewsComment,
  ) => {
    for (let i = 0; i < comments.length; i++) {
      if (comments[i].id === parentId) {
        if (!comments[i].replies) {
          comments[i].replies = [];
        }
        comments[i].replies.push(newReply);
        return true;
      }

      if (comments[i].replies && comments[i].replies.length > 0) {
        if (this.addReplyRecursive(comments[i].replies, parentId, newReply)) {
          return true;
        }
      }
    }
    return false;
  };

  public async addComment(
    newsItemId: string,
    content: string,
    parentCommentId?: string,
  ): Promise<string> {
    try {
      this.setLoading(true);
      const session = this.rootStore.session;
      if (!session) return messages.userNotActive;

      const { post } = createNewsApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });

      const response: AxiosResponse<NewsComment> = await post.addComment(
        newsItemId,
        content,
        parentCommentId,
      );
      this.news = this.news.map((item) => {
        if (item.id !== newsItemId) return item;

        if (!response.data.parentId) {
          return {
            ...item,
            comments: [...item.comments, { ...response.data, replies: [] }],
            commentCount: item.commentCount + 1,
          };
        }

        return {
          ...item,
          comments: this._addRepliesToComment(
            item.comments,
            response.data.parentId,
            [
              {
                ...response.data,
                replies: [],
              },
            ],
          ),
          commentCount: item.commentCount + 1,
        };
      });
      return '';
    } catch (error) {
      console.log(error);
      if (error instanceof AxiosError) {
        if (error.response?.data.message === messagesBe.userNotActive) {
          return messages.userNotActive;
        }
      }
    } finally {
      this.setLoading(false);
    }
  }

  public async updateComment(
    commentId: string,
    content: string,
  ): Promise<void> {
    try {
      this.setLoading(true);
      const session = this.rootStore.session;
      if (!session) return;

      const { patch } = createNewsApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });
      const response = await patch.updateComment(commentId, content);
      if (response.status === HttpStatusCode.Ok) {
        this.news = this.news.map((item) => ({
          ...item,
          comments: item.comments.map((comment) =>
            comment.id === commentId ? { ...comment, content } : comment,
          ),
        }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      this.setLoading(false);
    }
  }

  public async deleteComment(commentId: string): Promise<void> {
    try {
      this.setLoading(true);
      const session = this.rootStore.session;
      if (!session) return;

      const { delete: deleteApi } = createNewsApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });

      const response = await deleteApi.deleteComment(commentId);

      if (response.status === HttpStatusCode.Ok) {
        this.news = this.news.map((item) => ({
          ...item,
          comments: item.comments.filter((comment) => comment.id !== commentId),
        }));
        this.setTotalNewsItem(this.totalNewsItem - 1);
      }
    } catch (error) {
      console.error(error);
    } finally {
      this.setLoading(false);
    }
  }

  public async likeComment(
    newsItemId: string,
    commentId: string,
  ): Promise<string> {
    try {
      this.setLoading(true);
      const session = this.rootStore.session;
      if (!session) return messages.userNotActive;

      const { post } = createNewsApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });

      const response: AxiosResponse = await post.likeComment(commentId);
      this.updateNewsCommentLikes(commentId, response.data.likes || []);
      return '';
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.data.message === messagesBe.userNotActive) {
          return messages.userNotActive;
        }
      }
    } finally {
      this.setLoading(false);
    }
  }

  public async fetchNewsById(newsId: string): Promise<void> {
    try {
      this.setLoading(true);
      const session = this.rootStore.session;
      if (!session) return;

      const { get } = createNewsApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });
      const response = await get.getNewsById(newsId);
      this.setNews([response.data]);
    } catch (error) {
      console.error(error);
    } finally {
      this.setLoading(false);
    }
  }

  public async createNews(newsData: CreateNewsItem): Promise<NewsItem> {
    try {
      this.setLoading(true);
      const session = this.rootStore.session;
      if (!session) throw new Error(messages.userNotActive);

      const { post } = createNewsApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });
      const response = await post.createNews(newsData);
      // Optionally add the new news item to the local state
      if (response.data) {
        this.news = [response.data, ...this.news];
        this.setTotalNewsItem(this.totalNewsItem + 1);
      }
      return response.data;
    } catch (error) {
      console.error('Failed to create news:', error);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  public async updateNews(newsId: string, newsData: any): Promise<void> {
    try {
      this.setLoading(true);
      const session = this.rootStore.session;
      if (!session) throw new Error(messages.userNotActive);

      const { patch } = createNewsApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });

      const response = await patch.updateNews(newsId, newsData);
      // Update the news item in local state
      this.news = this.news.map((item) =>
        item.id === newsId ? { ...item, ...response.data } : item,
      );
    } catch (error) {
      console.error('Failed to update news:', error);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  public async deleteNewsItem(newsId: string): Promise<boolean> {
    try {
      this.setLoading(true);
      const session = this.rootStore.session;
      if (!session) throw new Error(messages.userNotActive);

      const { delete: deleteApi } = createNewsApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });
      await deleteApi.deleteNews(newsId);
      // Remove the news item from local state
      this.news = this.news.filter((item) => item.id !== newsId);
      this.setTotalNewsItem(this.totalNewsItem - 1);
    } catch (error) {
      console.error('Failed to delete news:', error);
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  public async fetchNewsBySlug(fullSlug: string): Promise<void> {
    try {
      this.setLoading(true);
      const session = this.rootStore.session;
      if (!session) throw new Error(messages.userNotActive);

      const { get } = createNewsApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });
      const response = await get.getNewsBySlug(fullSlug);
      if (response.data) {
        this.setNews([response.data]);
      }
    } catch (error) {
      console.error('Failed to fetch news by slug:', error);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }
}

export default NewsStore;
