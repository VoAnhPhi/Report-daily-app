import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';
import { IMAGE_HOST_PATTERNS } from './lib/image-hosts';

const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: 'standalone',
  devIndicators: false,
  productionBrowserSourceMaps: false,
  reactStrictMode: false,
  compiler: {
    // `console.log` from debugging sessions was shipping to production
    // (gamification widget, social provider, session sync). Errors and warnings
    // are kept so real problems still surface in the browser console.
    removeConsole: isProduction ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    // These packages export hundreds of modules from a single entry point;
    // without this the whole barrel lands in the client bundle.
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'date-fns',
      '@tanstack/react-query',
    ],
  },
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ['image/avif', 'image/webp'],
    // Cache optimised variants for a day instead of the 60s default — post
    // media never changes URL once uploaded.
    minimumCacheTTL: 60 * 60 * 24,
    localPatterns: [
      // Local public assets referenced without a query string (Next's default).
      { search: '' },
      // The static placeholder is referenced as `/placeholder.svg?height=&width=`
      // in many cards; allow it with any query string (search omitted = any).
      { pathname: '/placeholder.svg' },
    ],
    // Kept in sync with `isOptimizableImageUrl()` by sharing one list — a host
    // missing here makes `/_next/image` reject the URL.
    remotePatterns: IMAGE_HOST_PATTERNS.map((hostname) => ({
      protocol: 'https' as const,
      hostname,
    })),
  },
};

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');
export default withNextIntl(nextConfig);
