/**
 * Query Keys Constants for React Query
 * These keys are used to identify and cache different types of queries
 */

// Base query keys for different domains
export const QUERY_KEYS = {
  // User-related queries
  USER: ['user'] as const,
  USERS: ['users'] as const,

  // Referral-related queries
  REFERRALS: ['referrals'] as const,

  // Posts-related queries
  POSTS: ['posts'] as const,

  // News-related queries
  NEWS: ['news'] as const,

  // Products-related queries
  PRODUCTS: ['products'] as const,

  // Analytics-related queries
  ANALYTICS: ['analytics'] as const,
} as const;

// TanStack Query keys and options
export const USER_QUERY_KEYS = {
  // User profile queries
  profile: (userId: string) => ['user', 'profile', userId],

  // User statistics queries
  statistics: (userId: string) => ['user', 'statistics', userId],

  // User avatar queries
  avatar: (userId: string) => ['user', 'avatar', userId],

  // User cover queries
  cover: (userId: string) => ['user', 'cover', userId],

  // Referral queries
  referrals: (userId: string, pagination: { page: number; limit: number }) => [
    'user',
    'referrals',
    userId,
    pagination,
  ],

  // All referrals for a user (for invalidation)
  referralsList: (userId: string) => ['user', 'referrals', userId],

  // Suggested users queries
  suggested: (userId: string) => ['user', 'suggested', userId],

  // New users queries
  new: () => ['user', 'new'],

  // All user queries (for invalidation)
  all: (userId: string) => ['user', userId],
};

// Query options constants
export const QUERY_OPTIONS = {
  // Stale time options
  SHORT_STALE_TIME: 2 * 60 * 1000, // 2 minutes
  DEFAULT_STALE_TIME: 5 * 60 * 1000, // 5 minutes
  LONG_STALE_TIME: 30 * 60 * 1000, // 30 minutes

  // Cache time options (garbage collection time)
  DEFAULT_CACHE_TIME: 10 * 60 * 1000, // 10 minutes
  LONG_CACHE_TIME: 60 * 60 * 1000, // 1 hour

  // Retry options
  DEFAULT_RETRY: 3,
  RETRY_DELAY: (attemptIndex: number) =>
    Math.min(1000 * 2 ** attemptIndex, 30000),
};

// Invalidation patterns for cache management
export const INVALIDATION_PATTERNS = {
  // Invalidate all user-related queries
  allUser: (userId: string) => [
    USER_QUERY_KEYS.profile(userId),
    USER_QUERY_KEYS.statistics('current'),
    USER_QUERY_KEYS.avatar('current'),
    USER_QUERY_KEYS.cover('current'),
    USER_QUERY_KEYS.referralsList(userId),
    USER_QUERY_KEYS.suggested('current'),
  ],

  // Invalidate all referral queries for a user
  allReferrals: (userId: string) => [
    USER_QUERY_KEYS.referralsList(userId),
    USER_QUERY_KEYS.statistics('current'),
  ],

  // Invalidate profile-related queries
  profile: (userId: string) => [
    USER_QUERY_KEYS.profile(userId),
    USER_QUERY_KEYS.statistics('current'),
  ],

  // Invalidate media queries for current user
  media: () => [
    USER_QUERY_KEYS.avatar('current'),
    USER_QUERY_KEYS.cover('current'),
  ],

  // Invalidate all post-related queries
  allPosts: () => [POST_QUERY_KEYS.all()],
};

// Export types for better type safety
export type UserQueryKeys = typeof USER_QUERY_KEYS;
export type QueryOptions = typeof QUERY_OPTIONS;
export type InvalidationPatterns = typeof INVALIDATION_PATTERNS;

// Post-specific query key builders
export const POST_QUERY_KEYS = {
  // All posts
  all: () => [...QUERY_KEYS.POSTS] as const,

  // Posts with pagination
  list: (pagination?: { page: number; limit: number }) =>
    [...QUERY_KEYS.POSTS, 'list', ...(pagination ? [pagination] : [])] as const,

  // Single post
  detail: (postId: string) => [...QUERY_KEYS.POSTS, 'detail', postId] as const,

  // Post comments
  comments: (postId: string) =>
    [...QUERY_KEYS.POSTS, 'comments', postId] as const,

  // User posts
  byUser: (userId: string) => [...QUERY_KEYS.POSTS, 'user', userId] as const,
} as const;

// News-specific query key builders
export const NEWS_QUERY_KEYS = {
  // All news
  all: () => [...QUERY_KEYS.NEWS] as const,

  // News with pagination
  list: (pagination?: { page: number; limit: number }) =>
    [...QUERY_KEYS.NEWS, 'list', ...(pagination ? [pagination] : [])] as const,

  // Single news
  detail: (newsId: string) => [...QUERY_KEYS.NEWS, 'detail', newsId] as const,
} as const;

// Product-specific query key builders
export const PRODUCT_QUERY_KEYS = {
  // All products
  all: () => [...QUERY_KEYS.PRODUCTS] as const,

  // Products with pagination
  list: (pagination?: { page: number; limit: number }) =>
    [
      ...QUERY_KEYS.PRODUCTS,
      'list',
      ...(pagination ? [pagination] : []),
    ] as const,

  // Single product
  detail: (productId: string) =>
    [...QUERY_KEYS.PRODUCTS, 'detail', productId] as const,

  // Products by category
  byCategory: (categoryId: string) =>
    [...QUERY_KEYS.PRODUCTS, 'category', categoryId] as const,
} as const;

// Analytics-specific query key builders
export const ANALYTICS_QUERY_KEYS = {
  // All analytics
  all: () => [...QUERY_KEYS.ANALYTICS] as const,

  // User analytics
  user: (userId: string) => [...QUERY_KEYS.ANALYTICS, 'user', userId] as const,

  // System analytics
  system: () => [...QUERY_KEYS.ANALYTICS, 'system'] as const,
} as const;

// Payment-specific query key builders
export const PAYMENT_QUERY_KEYS = {
  // Payment by ID
  detail: (paymentId: string) => ['payment', paymentId] as const,

  // Payment status
  status: (paymentId: string) => ['payment-status', paymentId] as const,

  // Order by ID
  order: (orderId: string) => ['order', orderId] as const,

  // Order payment
  orderPayment: (orderId: string) => ['order-payment', orderId] as const,
} as const;

// Rankings-specific query key builders
export const RANKINGS_QUERY_KEYS = {
  // All rankings
  all: () => ['rankings'] as const,

  // Rankings by view type
  byView: (view: string) => ['rankings', 'view', view] as const,

  // Leaderboard (top rankings)
  leaderboard: (view: string, searchQuery?: string) =>
    [
      'rankings',
      'leaderboard',
      view,
      ...(searchQuery ? [searchQuery] : []),
    ] as const,

  // Current user's rank
  myRank: (view: string) => ['rankings', 'my-rank', view] as const,
} as const;

// Type exports for better TypeScript support
export type QueryKey = readonly unknown[];
export type UserQueryKey = ReturnType<
  (typeof USER_QUERY_KEYS)[keyof typeof USER_QUERY_KEYS]
>;
export type PostQueryKey = ReturnType<
  (typeof POST_QUERY_KEYS)[keyof typeof POST_QUERY_KEYS]
>;
export type NewsQueryKey = ReturnType<
  (typeof NEWS_QUERY_KEYS)[keyof typeof NEWS_QUERY_KEYS]
>;
export type ProductQueryKey = ReturnType<
  (typeof PRODUCT_QUERY_KEYS)[keyof typeof PRODUCT_QUERY_KEYS]
>;
export type AnalyticsQueryKey = ReturnType<
  (typeof ANALYTICS_QUERY_KEYS)[keyof typeof ANALYTICS_QUERY_KEYS]
>;
export type PaymentQueryKey = ReturnType<
  (typeof PAYMENT_QUERY_KEYS)[keyof typeof PAYMENT_QUERY_KEYS]
>;
export type RankingQueryKey = ReturnType<
  (typeof RANKINGS_QUERY_KEYS)[keyof typeof RANKINGS_QUERY_KEYS]
>;
