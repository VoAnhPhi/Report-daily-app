import { postAuthApi } from '@/app/api/auth';
import { RecognizedUser, Role, UserStatus } from '@/types/user.type';
import NextAuth, { DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { signOut as clientSignOut } from 'next-auth/react';

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  phoneNumber: string;
  referenceId: string;
  accessToken?: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  action: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPermission {
  id: string;
  userId: string;
  permissionId: string;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  permission: Permission;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  createdAt: Date;
  updatedAt: Date;
  permission: Permission;
}

export interface AdminRole {
  id: string;
  code: string;
  name: string;
  description: string;
  level: number;
  isSystem: boolean;
  color: string;
  isActive: boolean;
  rolePermissions?: RolePermission[];
}

export interface UserAdminRole {
  id: string;
  userId: string;
  roleId: string;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  role: AdminRole;
}

export interface AuthUser {
  id: string;
  email?: string;
  referenceId: string;
  fullName: string;
  avatarUrl?: string;
  phoneNumber?: string;
  role: Role;
  status: UserStatus;
  isActive: boolean;
  verificationDate: Date;
  createdAt: Date;
  recognizedUser?: RecognizedUser | null;
}

export interface LoginResponse {
  success?: boolean;
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  message?: string;
  error?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export const USER_CONFIG_KEYS = {} as const;
export type UserConfigKey = keyof typeof USER_CONFIG_KEYS;
export const REFRESH_ERROR_CODE = 'RefreshAccessTokenError';
export const isRefreshError = (value: unknown): boolean => value === REFRESH_ERROR_CODE;
export const isAccessTokenExpired = (expiresAt?: number | string | Date | null) =>
  expiresAt ? new Date(expiresAt).getTime() <= Date.now() : true;
export const computeAccessTokenExpiry = (seconds = 900) => Date.now() + seconds * 1000;
export const extractAuthErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error ?? 'Đăng nhập thất bại');

declare module 'next-auth' {
  interface Session {
    user: AuthUser & DefaultSession['user'];
    accessToken?: string;
    refreshToken?: string;
    error?: string | null;
  }

  interface User extends AuthUser {
    accessToken?: string;
    refreshToken?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  basePath: '/api/auth',
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  pages: { signIn: '/login', signOut: '/login' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Email hoặc mã tài khoản', type: 'text' },
        password: { label: 'Mật khẩu', type: 'password' },
      },
      authorize: async (credentials) => {
        const username = String(credentials?.username ?? '').trim();
        const password = String(credentials?.password ?? '');
        if (!username || !password) return null;
        try {
          const response = await postAuthApi.login({ username, password });
          if (!response.user || !response.accessToken) return null;
          return {
            ...response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.user = user;
        token.id = user.id;
        token.email = user.email;
        token.referenceId = user.referenceId;
        token.fullName = user.fullName;
        token.role = user.role;
        token.status = user.status;
        token.isActive = user.isActive;
        token.phoneNumber = user.phoneNumber;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
      }
      return token;
    },
    async session({ session, token }) {
      const user = (token.user ?? {
        id: token.id,
        email: token.email,
        referenceId: token.referenceId,
        fullName: token.fullName,
        role: token.role,
        status: token.status,
        isActive: token.isActive,
        phoneNumber: token.phoneNumber,
      }) as AuthUser;
      return {
        ...session,
        user: { ...session.user, ...user },
        accessToken: token.accessToken as string | undefined,
        refreshToken: token.refreshToken as string | undefined,
        error: (token.error as string | undefined) ?? null,
      };
    },
  },
});

export const signOutClearStorage = async (options?: {
  callbackUrl?: string;
  redirect?: boolean;
}) => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('accessExpireTime');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
    sessionStorage.clear();
  }
  await clientSignOut({ redirect: false });
  if (options?.redirect !== false && typeof window !== 'undefined') {
    window.location.href = options?.callbackUrl ?? '/login';
  }
};
