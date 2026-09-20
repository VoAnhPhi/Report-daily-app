/**
 * Phase-77 (77-06) — FE stable-device-identity util.
 *
 * Mints (lazily) and persists a per-browser `deviceId` so the watch-session
 * entry-gate can recognise the SAME browser across an F5 reload / a 2nd tab and
 * stop false-firing "Phát hiện phiên xem ở nơi khác" (D-04). The id is sent to
 * the backend ONLY as an opaque query param — never the body, never the token
 * options arg.
 *
 * Fail-safe contract (D-04): SSR (no window) OR blocked localStorage (private
 * mode) → `undefined`. An absent deviceId makes the server keep its existing
 * behaviour; the FE NEVER fabricates an id from UA / fingerprinting. The util
 * therefore never throws.
 *
 * Mirrors the inline sessionStorage `priorSessionId` try/catch pattern in
 * `hooks/queries/use-training-videos.ts`, but with a DURABLE, cross-tab
 * localStorage backing instead of per-tab sessionStorage.
 */

export const TRAINING_DEVICE_ID_KEY = 'acta:training-device-id';

/**
 * Returns the stable per-browser training deviceId, lazily creating + persisting
 * one on first call. Returns `undefined` on the server (SSR) or when
 * localStorage is unavailable/blocked (private mode) — never throws.
 */
export function getTrainingDeviceId(): string | undefined {
  // SSR — no window object. Never touch storage. [D-04]
  if (typeof window === 'undefined') return undefined;

  try {
    const existing = window.localStorage.getItem(TRAINING_DEVICE_ID_KEY);
    if (existing) return existing;
    const generated = crypto.randomUUID();
    window.localStorage.setItem(TRAINING_DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    // Blocked / private mode — fail safe to undefined so the server keeps its
    // existing behaviour. NEVER fabricate an id from UA/fingerprinting. [D-04]
    return undefined;
  }
}
