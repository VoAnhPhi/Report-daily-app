import { AdminUserItem, UserFilter } from '@/types/user.type';
import { makeAutoObservable } from 'mobx';
import RootStore from './rootStore';
import { createUserApis } from '@/app/api/user';
import { Session } from 'next-auth';
import { toast } from 'sonner';

class AdminUserStore {
  rootStore: RootStore;
  users: AdminUserItem[] = [];
  totalUsers: number = 0;
  isLoading: boolean = false;

  constructor(rootStore: RootStore) {
    makeAutoObservable(this);
    this.rootStore = rootStore;
  }

  setUsers(users: AdminUserItem[]) {
    this.users = users;
  }

  setTotalUsers(total: number) {
    this.totalUsers = total;
  }

  setLoading(isLoading: boolean) {
    this.isLoading = isLoading;
  }

  async fetchUsers(filter: UserFilter, session: Session) {
    this.setLoading(true);
    try {
      const { get } = createUserApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });
      const response = await get.getUserListForAdmin(filter);
      this.setUsers(response.data);
      this.setTotalUsers(response.total);
    } catch (error) {
      toast.error(
        'Đã có lỗi xảy ra khi tải danh sách người dùng. Vui lòng thử lại sau.',
      );
      console.error(error);
    } finally {
      this.setLoading(false);
    }
  }

  async requestAction(
    userId: string,
    requestActionHandler: string,
    session: Session,
    reason?: string,
  ) {
    try {
      const { patch } = createUserApis({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });
      const response = await patch.requestAction(
        userId,
        requestActionHandler,
        reason,
      );
      return response;
    } catch (error) {
      toast.error(
        'Đã có lỗi xảy ra khi thực hiện yêu cầu. Vui lòng thử lại sau.',
      );
      console.error(error);
    }
  }
}

export default AdminUserStore;
