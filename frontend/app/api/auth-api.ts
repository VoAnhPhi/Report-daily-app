import { AuthUser } from '@/lib/auth';
import api from '.';
import { auth } from './APIRouters/auth.router';

export class AuthApi {
  constructor(private readonly tokens?: { accessToken?: string; refreshToken?: string; user?: AuthUser }) {}

  async getCurrentUser() {
    const response = await api.get<AuthUser>(auth.currentUser.value, {
      accessToken: this.tokens?.accessToken,
      refreshToken: this.tokens?.refreshToken,
      user: this.tokens?.user,
    });
    return response.data;
  }
}

export const createAuthApi = (tokens?: { accessToken?: string; refreshToken?: string; user?: AuthUser }) =>
  new AuthApi(tokens);

export const authApi = new AuthApi();
