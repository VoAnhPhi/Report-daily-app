import { AuthUser } from '@/lib/auth';
import { ReferenceUser } from '@/types';
import api from '..';
import { APIRouters } from '../APIRouters';
import {
  NewUser,
  PaginatedUsers,
  UserFilter,
  ReferralUsersFilter,
  PaginatedReferralUsers,
} from '@/types/user.type';
import { SuggestUser } from '@/types/features/suggest-user.type';
import { Attachment } from '@/types/attachment.type';
import { UserProfile } from '@/types/features/profile.type';

interface MessageResponse {
  message: string;
}

class GetUserApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async fetchByReferenceId(referenceId: string) {
    const res = await api.get<ReferenceUser>(
      APIRouters.user.referenceId.value(referenceId),
      {
        ...this.tokens,
      },
    );
    return res.data;
  }

  async getOldAvatar() {
    try {
      const res = await api.get<Attachment[]>(`/users/old-avatars`, {
        ...this.tokens,
      });
      return res.data;
    } catch (error) {
      console.error('Error fetching old avatar:', error);
      throw error;
    }
  }

  async getOldCovers() {
    try {
      const res = await api.get<Attachment[]>(`/users/old-covers`, {
        ...this.tokens,
      });
      return res.data;
    } catch (error) {
      console.error('Error fetching old covers:', error);
      throw error;
    }
  }

  async getAvatar() {
    try {
      const res = await api.get<{ avatarUrl: string | null }>(`/users/avatar`, {
        ...this.tokens,
      });
      return res.data;
    } catch (error) {
      console.error('Error fetching avatar:', error);
      throw error;
    }
  }

  async getCover() {
    try {
      const res = await api.get<{ coverUrl: string | null }>(`/users/cover`, {
        ...this.tokens,
      });
      return res.data;
    } catch (error) {
      console.error('Error fetching cover:', error);
      throw error;
    }
  }

  async getUserListForAdmin(filter: UserFilter) {
    const res = await api.get<PaginatedUsers>(
      `${APIRouters.user.value}/admin/users`,
      {
        params: {
          searchTerm: filter.searchTerm,
          status: filter.status,
          page: filter.page,
          limit: filter.limit,
        },
        ...this.tokens,
      },
    );
    return res.data;
  }

  async getReferralUsers(userId: string, filter?: ReferralUsersFilter) {
    const res = await api.get<PaginatedReferralUsers>(
      `${APIRouters.user.value}/referral-users/${userId}`,
      {
        params: {
          page: filter?.page || 1,
          limit: filter?.limit || 20,
          type: filter?.type || 'all',
        },
        ...this.tokens,
      },
    );
    return res.data;
  }

  async getDirectReferrals(
    userId: string,
    filter?: Omit<ReferralUsersFilter, 'type'>,
  ) {
    const res = await api.get<PaginatedReferralUsers>(
      `${APIRouters.user.value}/direct-referrals/${userId}`,
      {
        params: {
          page: filter?.page || 1,
          limit: filter?.limit || 20,
        },
        ...this.tokens,
      },
    );
    return res.data;
  }

  async getIndirectReferrals(
    userId: string,
    filter?: Omit<ReferralUsersFilter, 'type'>,
  ) {
    const res = await api.get<PaginatedReferralUsers>(
      `${APIRouters.user.value}/indirect-referrals/${userId}`,
      {
        params: {
          page: filter?.page || 1,
          limit: filter?.limit || 20,
        },
        ...this.tokens,
      },
    );
    return res.data;
  }

  async getSuggestedUsers() {
    const res = await api.get<SuggestUser[]>('/users/suggest', {
      ...this.tokens,
    });
    return res.data;
  }

  async getNewUsers() {
    const res = await api.get<NewUser[]>('/users/new-users', {
      ...this.tokens,
    });
    return res.data;
  }

  async getUserProfile(userId: string) {
    try {
      const res = await api.get<UserProfile>(`/users/profile/${userId}`, {
        ...this.tokens,
      });
      return res.data;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}

class PatchUserApi {
  constructor(
    private tokens?: {
      accessToken?: string;
      refreshToken?: string;
      user?: AuthUser;
    },
  ) {}

  async updateProfile(userId: string, data: any) {
    const res = await api.patch<ReferenceUser>(
      `${APIRouters.user.value}/${userId}`,
      {
        data,
        ...this.tokens,
      },
    );
    return res.data;
  }

  async updateAvatar(avatarUrl: string, originalFileName: string) {
    const res = await api.patch<Attachment>(
      `${APIRouters.user.value}/update-avatar`,
      {
        data: {
          avatarUrl,
          originalFileName,
        },
        ...this.tokens,
      },
    );
    return res.data;
  }

  async updateCover(coverUrl: string, originalFileName: string) {
    const res = await api.patch<Attachment>(
      `${APIRouters.user.value}/update-cover`,
      {
        data: {
          coverUrl,
          originalFileName,
        },
        ...this.tokens,
      },
    );
    return res.data;
  }

  async requestAction(userId: string, requestAction: string, reason?: string) {
    const res = await api.patch<MessageResponse>(
      APIRouters.admin.userId.requestAction.value(userId, requestAction),
      {
        data: { reason },
        ...this.tokens,
      },
    );
    return res.data;
  }

  async handleActionReferrer(
    userId: string,
    referralId: string,
    requestAction: string,
    reason?: string,
  ) {
    const res = await api.patch<ReferenceUser>(
      APIRouters.user.userId.referrer.referrerId.requestAction.value(
        userId,
        referralId,
        requestAction,
      ),
      {
        data: { reason },
        ...this.tokens,
      },
    );
    return res.data;
  }

  async updateUserConfig(key: string, value: any) {
    const res = await api.patch<MessageResponse>(`/users-config/${key}`, {
      data: { value },
      ...this.tokens,
    });
    return res.data;
  }

  async updateBadgePreferences(badges: string[] | null) {
    const res = await api.patch<MessageResponse>(`/users-config/badge-preferences`, {
      data: { badges },
      ...this.tokens,
    });
    return res.data;
  }

  async updateUserAvatarByAdmin(
    userId: string,
    avatarUrl: string,
    originalFileName?: string,
  ) {
    const res = await api.patch<{
      success: boolean;
      data: any;
      message: string;
      updatedBy: string;
    }>(`/users/admin/${userId}/avatar`, {
      data: { avatarUrl, originalFileName },
      ...this.tokens,
    });
    return res.data;
  }
}

export const getUserApi = new GetUserApi();
export const patchUserApi = new PatchUserApi();

export const createUserApis = (tokens: {
  accessToken: string;
  refreshToken?: string;
  user?: AuthUser;
}) => ({
  get: new GetUserApi(tokens),
  patch: new PatchUserApi(tokens),
});
