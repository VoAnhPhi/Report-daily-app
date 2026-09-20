/**
 * Single source of truth for the remote image hosts `next/image` is allowed to
 * optimise.
 *
 * `next.config.ts` turns this list into `images.remotePatterns`; components use
 * `isOptimizableImageUrl()` to decide between `next/image` and a plain `<img>`.
 * Without that check a URL from a host that is not listed makes `/_next/image`
 * return a 400 and the picture disappears entirely — worse than shipping it
 * unoptimised. Post media is user-supplied, so the fallback is load-bearing.
 *
 * Patterns follow the `remotePatterns` hostname syntax: a leading `*.` matches
 * exactly one subdomain label, as Next does.
 */
export const IMAGE_HOST_PATTERNS = [
  '*.kiotviet.vn',
  '*.utfs.io',
  'utfs.io',
  '*.ufs.sh',
  'images.unsplash.com',
  'i.pravatar.cc',
  'oaidalleapiprodscus.blob.core.windows.net',
  'randomuser.me',
  'res.cloudinary.com',
  'img.icons8.com',
  'image.mux.com',
] as const;

function hostMatches(hostname: string, pattern: string): boolean {
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1); // '.example.com'
    const label = hostname.slice(0, hostname.length - suffix.length);
    return (
      hostname.endsWith(suffix) && label.length > 0 && !label.includes('.')
    );
  }
  return hostname === pattern;
}

/**
 * True when `next/image` can handle the URL: a local path, a data URI, or a
 * remote host present in `IMAGE_HOST_PATTERNS`.
 */
export function isOptimizableImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith('/') || url.startsWith('data:')) return true;

  try {
    const { hostname } = new URL(url);
    return IMAGE_HOST_PATTERNS.some((pattern) => hostMatches(hostname, pattern));
  } catch {
    return false;
  }
}
