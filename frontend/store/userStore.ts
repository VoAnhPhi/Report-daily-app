import { createUserApis } from '@/app/api/user';
import {
  ReferralUser,
  ReferralUsersFilter
} from '@/types/user.type';
import { makeAutoObservable } from 'mobx';
import RootStore from './rootStore';

class UserStore {
  rootStore: RootStore;
  referralUser: ReferralUser[] | null = null;
  selectedReferralUser: ReferralUser | null = null;
  isLoading: boolean = false;
  isLoadingSelectedUser: boolean = false;
  avatarUrl: string | null = null;
  isLoadingAvatar: boolean = false;
  coverUrl: string | null = null;
  isLoadingCover: boolean = false;

  // Pagination state for referral users
  referralUsersPagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null = null;

  constructor(rootStore: RootStore) {
    makeAutoObservable(this);
    this.rootStore = rootStore;
  }

  setReferralUser(user: ReferralUser[]) {
    this.referralUser = user;
  }

  setReferralUsersPagination(pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }) {
    this.referralUsersPagination = pagination;
  }

  setSelectedReferralUser(user: ReferralUser | null) {
    this.selectedReferralUser = user;
  }

  clearReferralUser() {
    this.referralUser = null;
    this.referralUsersPagination = null;
  }

  // Reset avatar/cover held in-memory — call on account switch so the previous
  // user's media doesn't linger until a full page reload.
  clearUserMedia() {
    this.avatarUrl = null;
    this.coverUrl = null;
  }

  setLoading(isLoading: boolean) {
    this.isLoading = isLoading;
  }

  setLoadingSelectedUser(isLoading: boolean) {
    this.isLoadingSelectedUser = isLoading;
  }

  setAvatarUrl(avatarUrl: string | null) {
    this.avatarUrl = avatarUrl;
  }

  setLoadingAvatar(isLoading: boolean) {
    this.isLoadingAvatar = isLoading;
  }

  setCoverUrl(coverUrl: string | null) {
    this.coverUrl = coverUrl;
  }

  setLoadingCover(isLoading: boolean) {
    this.isLoadingCover = isLoading;
  }

  async fetchReferralUser(userId: string, filter?: ReferralUsersFilter) {
    this.setLoading(true);
    try {
      const { get } = createUserApis({
        accessToken: this.rootStore.session?.accessToken || '',
        refreshToken: this.rootStore.session?.refreshToken || '',
        user: this.rootStore.session?.user || null,
      });

      const response = await get.getReferralUsers(userId, filter);
      this.setReferralUser(response.data);
      this.setReferralUsersPagination({
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages,
        hasNext: response.hasNext,
        hasPrev: response.hasPrev,
      });
    } catch (error) {
      console.error(error);
    } finally {
      this.setLoading(false);
    }
  }

  async fetchReferralUserDetails(userId: string, filter?: ReferralUsersFilter) {
    this.setLoadingSelectedUser(true);
    try {
      const { get } = createUserApis({
        accessToken: this.rootStore.session?.accessToken || '',
        refreshToken: this.rootStore.session?.refreshToken || '',
        user: this.rootStore.session?.user || null,
      });

      const response = await get.getReferralUsers(userId, filter);
      return response;
    } catch (error) {
      console.error('Error fetching referral user details:', error);
      return null;
    } finally {
      this.setLoadingSelectedUser(false);
    }
  }

  async fetchAvatar() {
    this.setLoadingAvatar(true);
    try {
      const { get } = createUserApis({
        accessToken: this.rootStore.session?.accessToken || '',
        refreshToken: this.rootStore.session?.refreshToken || '',
        user: this.rootStore.session?.user || null,
      });

      const response = await get.getAvatar();
      this.setAvatarUrl(response.avatarUrl);
      return response.avatarUrl;
    } catch (error) {
      console.error('Error fetching avatar:', error);
      return null;
    } finally {
      this.setLoadingAvatar(false);
    }
  }

  async fetchCover() {
    this.setLoadingCover(true);
    try {
      const { get } = createUserApis({
        accessToken: this.rootStore.session?.accessToken || '',
        refreshToken: this.rootStore.session?.refreshToken || '',
        user: this.rootStore.session?.user || null,
      });

      const response = await get.getCover();
      this.setCoverUrl(response.coverUrl);
      return response.coverUrl;
    } catch (error) {
      console.error('Error fetching cover:', error);
      return null;
    } finally {
      this.setLoadingCover(false);
    }
  }
}

export default UserStore;
