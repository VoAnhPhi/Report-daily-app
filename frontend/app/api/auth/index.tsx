import { AuthUser, LoginResponse } from '@/lib/auth';
import { IRegisterForm } from '@/types';
import { Session } from 'next-auth';
import api from '..';
import { APIRouters } from '../APIRouters';

export type CurrentUserResponse = Pick<
  AuthUser,
  | 'id'
  | 'email'
  | 'referenceId'
  | 'fullName'
  | 'phoneNumber'
  | 'role'
  | 'status'
  | 'isActive'
  | 'verificationDate'
  | 'createdAt'
>;

class GetAuthApi {
  async getCurrentUser(token: string) {
    const response = await api.get<CurrentUserResponse>(APIRouters.auth.currentUser.value, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  async getPermissions(token: string) {
    void token;
    return { userPermissions: [], userAdminRoles: [] };
  }
}

class PostAuthApi {
  async login(data: { username: string; password: string }) {
    const response = await api.post<LoginResponse>(APIRouters.auth.login.value, { data });
    return response.data;
  }

  async register(data: IRegisterForm) {
    const response = await api.post<{
      message: string;
      user: Pick<AuthUser, 'id' | 'email' | 'referenceId' | 'fullName'>;
    }>(APIRouters.auth.register.value, {
      data: {
        email: data.email,
        fullName: data.fullName,
        password: data.password,
        phoneNumber: data.phoneNumber,
        country: data.country,
      },
    });
    return response.data;
  }

  async refreshTokens({ refreshToken }: { refreshToken: string; username?: string }) {
    const response = await api.post<{ accessToken: string; refreshToken: string }>(
      APIRouters.auth.refreshToken.value,
      { data: { refreshToken } },
    );
    return response.data;
  }

  async logout(session: Session) {
    const response = await api.post(APIRouters.auth.logout.value, {
      data: {},
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user,
    });
    return response.data;
  }
}

export const getAuthApi = new GetAuthApi();
export const postAuthApi = new PostAuthApi();
