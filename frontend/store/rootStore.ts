import { makeAutoObservable, action } from 'mobx';
import AdminUserStore from './adminUserStore';
import DocumentsStore from './documentsStore';
import NewsStore from './newsStore';
import PostsStore from './postsStore';
import UserStore from './userStore';
import NotificationStore from './notificationStore';
import ActivityLogsStore from './activityLogsStore';
import { Session } from 'next-auth';

class RootStore {
  constructor() {
    this.newsStore = new NewsStore(this);
    this.documentsStore = new DocumentsStore(this);
    this.postsStore = new PostsStore(this);
    this.adminUserStore = new AdminUserStore(this);
    this.userStore = new UserStore(this);
    this.activityLogsStore = new ActivityLogsStore(this);
    this.notificationStore = new NotificationStore(this);
    makeAutoObservable(this, {
      setSession: action,
    });
  }

  session: Session | null = null;
  newsStore: NewsStore;
  documentsStore: DocumentsStore;
  adminUserStore: AdminUserStore;
  postsStore: PostsStore;
  userStore: UserStore;
  activityLogsStore: ActivityLogsStore;
  notificationStore: NotificationStore;
  setSession(session: Session | null) {
    this.session = session;
  }
}

export default RootStore;
export const rootStore = new RootStore();
