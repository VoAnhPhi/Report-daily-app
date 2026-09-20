import { AuthUser } from '@/lib/auth';

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  data?: any;
  params?: Record<string, unknown> & ApiQueryParams;
  isRest?: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
}

export interface ApiQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
}
