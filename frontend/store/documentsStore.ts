import { DocumentQueryState } from '@/types/documents.type';
import {
  UserDocumentChapterWithProgress,
  UserDocumentWithProgress,
} from '@/types/features/document-user.type';
import { action, makeAutoObservable } from 'mobx';
import { toast } from 'sonner';
import RootStore from './rootStore';
import { createDocumentApis } from '@/app/api/documents';

class DocumentsStore {
  rootStore: RootStore;

  documents: UserDocumentWithProgress[] = [];
  totalDocuments: number = 0;
  page: number = 1;
  isLoading: boolean = false;

  constructor(rootStore: RootStore) {
    makeAutoObservable(this, {
      setLoading: action,
      setDocuments: action,
      setTotalDocuments: action,
      setPage: action,
      incrementChapterView: action,
      toggleFavoriteDocument: action,
      toggleFollowDocument: action,
      toggleChapterCompletion: action,
      countChaptersCompleted: action,
      getChapters: action,
      fetchDocuments: action,
    });
    this.rootStore = rootStore;
  }

  setLoading(value: boolean) {
    this.isLoading = value;
  }

  setDocuments(documents: UserDocumentWithProgress[]) {
    this.documents = documents;
  }

  setTotalDocuments(total: number) {
    this.totalDocuments = total;
  }

  setPage(page: number) {
    this.page = page;
  }

  public async incrementChapterView(
    documentId: string,
    chapterId: string,
  ): Promise<void> {
    try {
      const session = this.rootStore.session;
      if (!session) {
        toast.error('Bạn cần đăng nhập để thực hiện hành động này');
        return;
      }

      const { post } = createDocumentApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });

      const res = await post.incrementChapterView(documentId, chapterId);

      if (res.success) {
        this.documents = this.documents.map((doc) =>
          doc.id === documentId
            ? {
                ...doc,
                chapters: doc.chapters.map((chapter) =>
                  chapter.id === chapterId
                    ? { ...chapter, views: chapter.views + 1 }
                    : chapter,
                ),
              }
            : doc,
        );
      }
    } catch (error) {
      console.error('Error incrementing chapter view:', error);
      toast.error('Không thể cập nhật lượt xem chương');
    }
  }

  public async fetchDocuments(query: DocumentQueryState): Promise<void> {
    try {
      this.setLoading(true);
      const session = this.rootStore.session;
      if (!session) {
        toast.error('Bạn cần đăng nhập để xem tài liệu');
        return;
      }

      const { get } = createDocumentApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });

      const res = await get.getDocumentsByCurrentUser(query);

      this.setDocuments(res.data);
      this.setTotalDocuments(res.total);
      this.setPage(res.page);
    } catch (error) {
      console.log(error);
      toast.error(error.message || 'Có lỗi xảy ra khi tải tài liệu');
    } finally {
      this.setLoading(false);
    }
  }

  public async toggleFavoriteDocument(documentId: string): Promise<void> {
    try {
      const session = this.rootStore.session;
      if (!session) {
        toast.error('Bạn cần đăng nhập để thực hiện hành động này');
        return;
      }

      const { post } = createDocumentApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });
      const res = await post.toggleFavoriteDocument(documentId);

      if (res.success) {
        this.documents = this.documents.map((doc) =>
          doc.id === documentId ? { ...doc, isFavorite: !doc.isFavorite } : doc,
        );

        toast.success('Cập nhật tài liệu yêu thích thành công');
      } else {
        toast.error('Không thể cập nhật tài liệu yêu thích');
      }
    } catch (error) {
      console.error('Error toggling favorite document:', error);
      toast.error('Không thể cập nhật tài liệu yêu thích');
    }
  }

  public async toggleFollowDocument(documentId: string): Promise<void> {
    try {
      const session = this.rootStore.session;
      if (!session) {
        toast.error('Bạn cần đăng nhập để thực hiện hành động này');
        return;
      }

      const { post } = createDocumentApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });

      const res = await post.toggleFollowDocument(documentId);

      if (res.success) {
        this.documents = this.documents.map((doc) =>
          doc.id === documentId
            ? { ...doc, isFollowing: !doc.isFollowing }
            : doc,
        );

        toast.success('Cập nhật tài liệu theo dõi thành công');
      } else {
        toast.error('Không thể cập nhật tài liệu theo dõi');
      }
    } catch (error) {
      console.error('Error toggling follow document:', error);
      toast.error('Không thể cập nhật tài liệu theo dõi');
    }
  }

  async toggleChapterCompletion(
    documentId: string,
    chapterId: string,
  ): Promise<void> {
    try {
      const session = this.rootStore.session;
      if (!session) {
        toast.error('Bạn cần đăng nhập để thực hiện hành động này');
        return;
      }

      const { post } = createDocumentApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });

      const res = await post.toggleChapterCompletion(documentId, chapterId);

      if (res.success) {
        this.documents = this.documents.map((doc) =>
          doc.id === documentId
            ? {
                ...doc,
                chapters: doc.chapters.map((chapter) =>
                  chapter.id === chapterId
                    ? { ...chapter, isCompleted: !chapter.isCompleted }
                    : chapter,
                ),
              }
            : doc,
        );
        toast.success('Cập nhật chương thành công');
      } else {
        toast.error('Không thể cập nhật chương');
      }
    } catch (error) {
      console.error('Error toggling chapter completion:', error);
      toast.error('Không thể cập nhật chương');
    }
  }

  async countChaptersCompleted(documentId: string): Promise<number> {
    const document = this.documents.find((doc) => doc.id === documentId);
    if (!document) return 0;

    return document.chapters.filter((chapter) => chapter.isCompleted).length;
  }

  getChapters(documentId: string): UserDocumentChapterWithProgress[] {
    return this.documents.find((doc) => doc.id === documentId)?.chapters || [];
  }
}

export default DocumentsStore;
