import { AuthUser } from '@/lib/auth';
import { ApiRequestOptions } from '@/types/index';
import { getApiBaseUrl } from '@/lib/api-url';
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosRequestHeaders,
  AxiosResponse,
  HttpStatusCode,
} from 'axios';
import { toast } from 'sonner';
import { postAuthApi } from './auth';

// Deduplication guard: max 1 rate-limit toast per 5 seconds
let _lastRateLimitToastTime = 0;
const RATE_LIMIT_TOAST_COOLDOWN_MS = 5_000;

// Extend AxiosRequestConfig to include _retry flag and _retryCount for 429 handling
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
}

// Custom error class for API errors
export class APIError<TError = unknown> extends Error {
  public retryAfter?: number; // Retry-After header value in seconds

  constructor(
    message: string,
    public statusCode?: number,
    public response?: TError,
    retryAfter?: number,
  ) {
    super(message);
    this.name = 'APIError';
    this.retryAfter = retryAfter;
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/public/*',
  '/forum/stats',
  '/api/*',
  '/health',
  '/users/reference/*',
  '/services/shipment/fee', // GHTK shipping fee calculation (public)
] as const;

const isPublicRoute = (url: string): boolean => {
  const urlWithoutQuery = url?.split('?')[0];
  const normalizedUrl = urlWithoutQuery?.replace(/^\/api/, '');

  // Cart and order routes require authentication, so exclude them from public routes
  // Exception: guest cart and guest order routes are public
  if (normalizedUrl?.startsWith('/public/cart/guest')) {
    // Allow guest cart routes to be public
    return true;
  }
  if (normalizedUrl?.startsWith('/public/orders/guest')) {
    // Allow guest order routes to be public
    return true;
  }
  if (
    normalizedUrl?.startsWith('/public/cart') ||
    normalizedUrl?.startsWith('/public/orders') ||
    normalizedUrl?.startsWith('/public/return-orders')
  ) {
    return false;
  }

  if (
    normalizedUrl?.startsWith('/users') &&
    normalizedUrl?.endsWith('/activate')
  ) {
    const baseRoute = normalizedUrl.slice(0, -'/activate'.length);
    return normalizedUrl.startsWith(baseRoute);
  }

  return PUBLIC_ROUTES.some((route) => {
    if (route.endsWith('*')) {
      const baseRoute = route.slice(0, -1);
      return normalizedUrl?.startsWith(baseRoute);
    }

    return normalizedUrl === route;
  });
};

// Helper to get auth token from localStorage
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('accessToken');
};

// Helper to get refresh token from localStorage
export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('refreshToken');
};

// Helper to set auth token
export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', token);
  }
};

export const setRole = (role: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('role', role);
  }
};

export const setRefreshToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('refreshToken', token);
  }
};

export const setAccessExpireTime = (time: number): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessExpireTime', time.toString());
  }
};

export const setEmailLoggedIn = (email: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('email', email);
  }
};

export const getEmailLoggedIn = (): string | null => {
  if (typeof window === 'undefined') {
    return null; // Handle server-side case
  }
  return localStorage.getItem('email');
};

// Helper to clear all auth tokens (useful when switching users)
export const clearAuthTokens = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('accessExpireTime');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
  }
};

// Helper to sync tokens from session to localStorage
// This ensures localStorage has the latest tokens from NextAuth session
export const syncTokensFromSession = (
  accessToken?: string,
  refreshToken?: string,
  email?: string,
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  // If we have new tokens from session, update localStorage
  if (accessToken) {
    localStorage.setItem('accessToken', accessToken);
  }
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
  if (email) {
    localStorage.setItem('email', email);
  }
};

// Create and configure axios instance
const createAxiosInstance = <TError = unknown>(
  accessToken?: string,
  refreshToken?: string,
  user?: AuthUser,
): AxiosInstance => {
  // Use INTERNAL_API_URL for server-side, NEXT_PUBLIC_API_URL for client-side
  const getBaseUrl = getApiBaseUrl;

  const instance = axios.create({
    baseURL: getBaseUrl(),
    timeout: 15000, // Reduced from 30000 to 15000ms for faster failure detection
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor
  instance.interceptors.request.use(
    async (config) => {
      if (
        config.url?.startsWith(
          '/e-commerce/checkout/create-order-from-guest-cart',
        )
      ) {
        return config;
      }

      // Skip auth for public routes
      if (isPublicRoute(config.url || '')) {
        return config;
      }

      if (config.headers?.Authorization) {
        return config;
      }
      if (!accessToken) {
        throw new APIError<TError>('No authentication token found', 401);
      }

      config.headers = config.headers || ({} as AxiosRequestHeaders);
      config.headers['Authorization'] = `Bearer ${accessToken}`;
      return config;
    },
    (error) => Promise.reject(new APIError<TError>(error.message)),
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<TError>) => {
      // ✅ Network / CORS / DNS / refused => no response
      if (!error.response) {
        const code = (error as any).code || (error.cause as any)?.code;

        const msg =
          code === 'ECONNREFUSED'
            ? 'Không kết nối được tới máy chủ.'
            : code === 'ETIMEDOUT'
              ? 'Kết nối tới máy chủ bị timeout.'
              : code === 'ENOTFOUND'
                ? 'Không tìm thấy domain máy chủ (DNS).'
                : 'Lỗi mạng khi gọi máy chủ.';

        throw new APIError<TError>(msg, 503, { code } as any);
      }

      const statusCode = error.response?.status;
      const originalRequest = error.config as ExtendedAxiosRequestConfig;

      // Handle token refresh for 410 status code (token expired)
      if (
        statusCode === HttpStatusCode.Gone &&
        originalRequest &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true; // Prevent infinite loops

        if (!refreshToken || !accessToken) {
          if (typeof window !== 'undefined') {
            clearAuthTokens();
          }
          throw new APIError<TError>('No refresh token available', 401);
        }

        try {
          // Use the current user's info for refresh, not the old token's user
          // This ensures we refresh with the correct user context
          const usernameForRefresh = user?.referenceId || '';

          console.log('[TOKEN REFRESH] Attempting to refresh token for user:', {
            username: usernameForRefresh,
            userId: user?.id,
            hasRefreshToken: !!refreshToken,
          });

          const response = await postAuthApi.refreshTokens({
            refreshToken: refreshToken,
            username: usernameForRefresh,
          });

          console.log('[TOKEN REFRESH] Refresh successful for user:', {
            username: usernameForRefresh,
          });

          setAuthToken(response.accessToken);
          setRefreshToken(response.refreshToken);

          originalRequest.headers =
            originalRequest.headers || ({} as AxiosRequestHeaders);
          originalRequest.headers['Authorization'] =
            `Bearer ${response.accessToken}`;
          return axios(originalRequest);
        } catch (refreshError: any) {
          console.error('[TOKEN REFRESH] Token refresh failed:', {
            error: refreshError?.message,
            response: refreshError?.response?.data,
            username: user?.referenceId,
            userId: user?.id,
          });

          // Check if this is a user mismatch error (refresh token belongs to different user)
          const errorMessage = refreshError?.response?.data?.message || refreshError?.message || '';
          const isUserMismatch = errorMessage.includes('invalid') ||
                                errorMessage.includes('Invalid refresh token') ||
                                refreshError?.response?.status === 401;

          if (isUserMismatch) {
            console.warn('[TOKEN REFRESH] User mismatch detected - likely switched accounts');
          }

          // Clear ALL tokens - this may be due to user switching accounts
          if (typeof window !== 'undefined') {
            clearAuthTokens();
          }

          throw new APIError<TError>(
            'Session expired - Login again',
            401,
            refreshError.response?.data as TError,
          );
        }
      }

      // Handle 429 Too Many Requests with automatic retry
      if (statusCode === 429 && originalRequest) {
        const retryCount = originalRequest._retryCount ?? 0;
        if (retryCount < 3) {
          originalRequest._retryCount = retryCount + 1;

          // Prefer Retry-After header; fall back to exponential backoff (1s, 2s, 4s)
          const retryAfterHeader =
            error.response?.headers?.['retry-after'] ||
            error.response?.headers?.['Retry-After'];
          const waitSeconds = retryAfterHeader
            ? parseInt(String(retryAfterHeader), 10)
            : Math.pow(2, retryCount); // 1, 2, 4

          await new Promise<void>((resolve) =>
            setTimeout(resolve, waitSeconds * 1000),
          );
          return instance(originalRequest);
        }

        // Retries exhausted — show toast, deduplicated to max 1 per 5 seconds
        if (typeof window !== 'undefined') {
          const now = Date.now();
          if (now - _lastRateLimitToastTime >= RATE_LIMIT_TOAST_COOLDOWN_MS) {
            _lastRateLimitToastTime = now;
            toast.error('Hệ thống đang bận, vui lòng thử lại sau vài giây');
          }
        }
      }

      // Handle other HTTP errors
      const errorMessage =
        (error.response?.data as any)?.message ||
        error.message ||
        'An error occurred';

      // Tài khoản bị vô hiệu hóa (JwtAuthGuard trả 403 kèm câu tiếng Việt):
      // access token phía client còn hạn tới 30 ngày nên phải chủ động dọn
      // token cục bộ ngay — nếu không user bị khóa cứ thấy lỗi lẻ tẻ ở từng
      // API mà session không bao giờ chết. SessionSync sẽ đẩy về /login ở
      // vòng session kế tiếp.
      if (
        statusCode === 403 &&
        typeof window !== 'undefined' &&
        typeof errorMessage === 'string' &&
        errorMessage.includes('Tài khoản đã bị vô hiệu hóa')
      ) {
        clearAuthTokens();
      }

      // Extract Retry-After header for 429 (Too Many Requests) errors
      // Axios normalizes headers to lowercase
      const retryAfterHeader =
        error.response?.headers?.['retry-after'] ||
        error.response?.headers?.['Retry-After'];
      const retryAfter = retryAfterHeader
        ? parseInt(String(retryAfterHeader), 10)
        : statusCode === 429
          ? 60
          : undefined; // Default to 60 seconds for 429 errors if no header

      throw new APIError<TError>(
        errorMessage,
        statusCode,
        error.response?.data,
        retryAfter,
      );
    },
  );

  return instance;
};

/**
 * Makes an HTTP request using the specified method, URL, and options.
 *
 * @template TData - The type of the response data
 * @template TError - The type of the error response
 */
export const makeRequest = async <TData = unknown, TError = unknown>(
  method: HttpMethod,
  url: string,
  options?: ApiRequestOptions & { [key: string]: any },
): Promise<AxiosResponse<TData>> => {
  const httpClient = createAxiosInstance<TError>(
    options?.accessToken,
    options?.refreshToken,
    options?.user,
  );

  const config: AxiosRequestConfig = {
    method,
    url,
    headers: options?.headers,
    params: options?.params,
    ...(options?.isRest && { transformResponse: [] }),
    ...(method !== 'GET' && {
      data: options?.data ?? {},
    }),
  };

  try {
    const response = await httpClient.request<TData>(config);
    return response;
  } catch (error) {
    // Re-throw the error with proper typing
    if (error instanceof APIError) {
      return Promise.reject(error as APIError<TError>);
    }
    // Handle unexpected errors
    return Promise.reject(
      new APIError<TError>(
        error instanceof Error ? error.message : 'Unknown error occurred',
      ),
    );
  }
};

// Export a singleton instance with convenience methods
export const api = {
  get: <TData = unknown, TError = unknown>(
    url: string,
    options?: ApiRequestOptions,
  ): Promise<AxiosResponse<TData>> =>
    makeRequest<TData, TError>('GET', url, options),

  post: <TData = unknown, TError = unknown>(
    url: string,
    options?: ApiRequestOptions,
  ): Promise<AxiosResponse<TData>> =>
    makeRequest<TData, TError>('POST', url, options),

  put: <TData = unknown, TError = unknown>(
    url: string,
    options?: ApiRequestOptions,
  ): Promise<AxiosResponse<TData>> =>
    makeRequest<TData, TError>('PUT', url, options),

  patch: <TData = unknown, TError = unknown>(
    url: string,
    options?: ApiRequestOptions,
  ): Promise<AxiosResponse<TData>> =>
    makeRequest<TData, TError>('PATCH', url, options),

  delete: <TData = unknown, TError = unknown>(
    url: string,
    options?: ApiRequestOptions,
  ): Promise<AxiosResponse<TData>> =>
    makeRequest<TData, TError>('DELETE', url, options),
};

export default api;
