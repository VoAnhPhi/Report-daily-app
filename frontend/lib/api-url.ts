/**
 * Get API base URL based on runtime environment.
 * Server-side (window === undefined): uses INTERNAL_API_URL for Docker/internal networking.
 * Client-side: uses NEXT_PUBLIC_API_URL.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  }
  return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
}
