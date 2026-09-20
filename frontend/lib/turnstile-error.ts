import { APIError } from '@/app/api';

/**
 * Discriminator returned by acta-api when Cloudflare Turnstile verification fails.
 * Mirrors `TurnstileVerificationException` in
 * `acta-api/src/turnstile/turnstile.exception.ts`.
 */
export const TURNSTILE_ERROR_TAG = 'TurnstileVerificationFailed';

/**
 * Sentinel prefix used to smuggle a Turnstile failure through the next-auth
 * `CredentialsSignin.code` channel. The credentials provider in `lib/auth.ts`
 * encodes the message with this prefix so login forms can detect a Turnstile
 * failure (vs. a real credential failure) and render the non-blame UX.
 */
export const TURNSTILE_SIGNIN_CODE_PREFIX = 'TURNSTILE:';

export interface TurnstileErrorBody {
  statusCode: number;
  message: string;
  error: typeof TURNSTILE_ERROR_TAG;
  errorCodes?: string[];
  isReplay?: boolean;
}

export interface TurnstileErrorInfo {
  /** Vietnamese, user-facing message from the backend (already non-blame). */
  message: string;
  /** Cloudflare error codes (e.g. `timeout-or-duplicate`, `internal-error`). */
  errorCodes: string[];
  /** True when the token was reused or expired — safe to auto-reset and retry. */
  isReplay: boolean;
}

/**
 * Detect a Turnstile failure inside an axios-thrown {@link APIError}.
 * Returns null for any other error so callers can fall through to existing handling.
 */
export function getTurnstileErrorFromApi(
  error: unknown,
): TurnstileErrorInfo | null {
  if (!(error instanceof APIError)) return null;
  if (error.statusCode !== 403) return null;

  const body = error.response as Partial<TurnstileErrorBody> | undefined;
  if (!body || body.error !== TURNSTILE_ERROR_TAG) return null;

  return {
    message: body.message ?? error.message,
    errorCodes: body.errorCodes ?? [],
    isReplay: !!body.isReplay,
  };
}

/**
 * Detect a Turnstile failure carried through next-auth's `CredentialsSignin.code`
 * field. Use on the client side after `signIn('credentials', ...)` returns
 * `{ code: '...' }`.
 */
export function getTurnstileErrorFromSignInCode(
  code: string | null | undefined,
): TurnstileErrorInfo | null {
  if (!code || !code.startsWith(TURNSTILE_SIGNIN_CODE_PREFIX)) return null;
  return {
    message: code.slice(TURNSTILE_SIGNIN_CODE_PREFIX.length),
    errorCodes: [],
    isReplay: false,
  };
}

/**
 * Encode a Turnstile failure message into the sentinel-prefixed form used by
 * the credentials provider's `InvalidCredentials.code`.
 */
export function encodeTurnstileSignInCode(message: string): string {
  return `${TURNSTILE_SIGNIN_CODE_PREFIX}${message}`;
}
