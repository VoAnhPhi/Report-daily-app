/**
 * @deprecated This MobX store is being replaced by the new SocialProvider.
 * Use @/components/providers/social-provider instead for new features.
 * This store is kept for backward compatibility with existing components.
 */
import { createPostApis } from '@/app/api/posts';
import { Post } from '@/types';
import { PostQueryState } from '@/types/social.type';
import { action, makeAutoObservable } from 'mobx';
import { toast } from 'sonner';
import RootStore from './rootStore';

class PostsStore {
  rootStore: RootStore;
  posts: Post[] = [];
  totalPosts: number = 0;
  page: number = 1;
  isLoading: boolean = false;

  constructor(rootStore: RootStore) {
    makeAutoObservable(this, {
      setLoading: action,
      setPosts: action,
      setTotalDocuments: action,
      setPage: action,
      fetchPosts: action,
      updatePostById: action,
    });

    this.rootStore = rootStore;
  }

  setLoading(value: boolean) {
    this.isLoading = value;
  }

  setPosts(posts: Post[]) {
    this.posts = posts;
  }

  setTotalDocuments(total: number) {
    this.totalPosts = total;
  }

  setPage(page: number) {
    this.page = page;
  }

  public async fetchPosts(query: PostQueryState): Promise<void> {
    try {
      this.setLoading(true);

      const res = await createPostApis({
        accessToken: this.rootStore.session?.accessToken || '',
        refreshToken: this.rootStore.session?.refreshToken || '',
        user: this.rootStore.session?.user || null,
      }).get.getPosts(query);

      this.setPosts(res.data);
      this.setTotalDocuments(res.total);
      this.setPage(res.page);
    } catch (error) {
      console.log(error);

      toast.error(
        'Có lỗi xảy ra khi tải khoảnh khắc cộng đồng. Vui lòng thử lại sau.',
      );
    } finally {
      this.setLoading(false);
    }
  }

  updatePostById(updatedPost: Post) {
    this.posts = this.posts.map((post) =>
      post.id === updatedPost.id ? updatedPost : post,
    );
  }
}

export default PostsStore;
