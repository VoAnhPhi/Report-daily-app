import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * Service for managing cache invalidation patterns
 * Provides utilities for invalidating cache keys by pattern or specific keys
 */
@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private redis: Record<string, any> | undefined;

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    try {
      // Get Redis client from cache manager store
      // Type assertion needed as cache-manager types don't expose store
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cacheStore = (this.cacheManager as Record<string, any>).store;
      this.redis = cacheStore?.client;
    } catch (error) {
      this.logger.warn(
        'Redis client not available, cache invalidation will be limited',
      );
    }
  }

  /**
   * Invalidate cache keys matching one or more patterns
   * Uses Redis SCAN for safe iteration over large keyspaces
   *
   * @param patterns - Glob patterns to match (e.g., 'posts:feed:*', 'user:profile:*')
   * @returns Promise<number> - Total number of keys deleted
   *
   * @example
   * await invalidatePattern('posts:feed:*', 'posts:detail:*');
   */
  async invalidatePattern(...patterns: string[]): Promise<number> {
    if (!this.redis) {
      this.logger.warn('Redis not available, skipping pattern invalidation');
      return 0;
    }

    let totalDeleted = 0;

    try {
      for (const pattern of patterns) {
        const keys = await this.scanKeys(pattern);

        if (keys.length > 0) {
          // Delete in batches of 100 to avoid blocking Redis
          const batchSize = 100;
          for (let i = 0; i < keys.length; i += batchSize) {
            const batch = keys.slice(i, i + batchSize);
            await this.redis.del(...batch);
            totalDeleted += batch.length;
          }

          this.logger.log(
            `Invalidated ${keys.length} cache keys matching pattern: ${pattern}`,
          );
        }
      }

      return totalDeleted;
    } catch (error) {
      this.logger.error(
        `Failed to invalidate cache patterns: ${patterns.join(', ')}`,
        error,
      );
      return totalDeleted;
    }
  }

  /**
   * Invalidate specific cache keys
   * More efficient than pattern matching when you know exact keys
   *
   * @param keys - Exact cache keys to delete
   * @returns Promise<number> - Number of keys deleted
   *
   * @example
   * await invalidateKeys('user:profile:123', 'user:stats:123');
   */
  async invalidateKeys(...keys: string[]): Promise<number> {
    if (!this.redis) {
      this.logger.warn('Redis not available, skipping key invalidation');
      return 0;
    }

    if (keys.length === 0) {
      return 0;
    }

    try {
      const deleted = await this.redis.del(...keys);
      this.logger.log(`Invalidated ${deleted} cache keys`);
      return deleted;
    } catch (error) {
      this.logger.error(
        `Failed to invalidate cache keys: ${keys.join(', ')}`,
        error,
      );
      return 0;
    }
  }

  /**
   * Invalidate cache for a specific user
   * Convenience method to clear all user-related caches
   *
   * @param userId - User ID
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.invalidatePattern(
      `user:profile:${userId}`,
      `user:stats:${userId}`,
      `user:referrals:${userId}:*`,
      `user:kyc:${userId}`,
      `user:avatar:${userId}`,
      `gamification:dashboard:${userId}`,
      `gamification:rank:${userId}:*`,
      `stats:user-rank:${userId}:*`,
    );
  }

  /**
   * Invalidate cache for post-related data
   *
   * @param postId - Post ID
   */
  async invalidatePostCache(postId: string): Promise<void> {
    await this.invalidatePattern(
      `post:detail:${postId}`,
      `post:comments:${postId}:*`,
      `post:analytics:${postId}`,
    );
  }

  /**
   * Invalidate all statistics caches
   * Use this when engagement data changes significantly
   */
  async invalidateStatisticsCache(): Promise<void> {
    await this.invalidatePattern('stats:*', 'statistics:*');
  }

  /**
   * Invalidate all gamification caches
   * Use this when points, achievements, or tasks change
   */
  async invalidateGamificationCache(): Promise<void> {
    await this.invalidatePattern(
      'gamification:*',
      'leaderboard:*',
      'achievements:*',
      'tasks:*',
    );
  }

  /**
   * Invalidate all feed caches
   * Use this sparingly as it affects many users
   */
  async invalidateFeedCache(): Promise<void> {
    await this.invalidatePattern('posts:feed:*', 'post:list:*');
  }

  /**
   * Flush entire cache (USE WITH EXTREME CAUTION!)
   * This will clear ALL cache entries
   * Only use in emergencies or during maintenance
   */
  async flushAll(): Promise<void> {
    if (!this.redis) {
      this.logger.warn('Redis not available, skipping flush');
      return;
    }

    try {
      await this.redis.flushdb();
      this.logger.warn('⚠️  CACHE FLUSHED: All cache entries cleared');
    } catch (error) {
      this.logger.error('Failed to flush cache', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   * Useful for monitoring cache usage
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsed: string;
    hitRate?: number;
  }> {
    if (!this.redis) {
      return { totalKeys: 0, memoryUsed: '0' };
    }

    try {
      const [dbSize, info] = await Promise.all([
        this.redis.dbsize(),
        this.redis.info('stats'),
      ]);

      // Parse info string to get stats
      const stats = this.parseRedisInfo(info);

      const hits = Number(stats.keyspace_hits) || 0;
      const misses = Number(stats.keyspace_misses) || 0;
      return {
        totalKeys: dbSize,
        memoryUsed: String(stats.used_memory_human || '0'),
        hitRate: hits
          ? (hits / (hits + misses)) * 100
          : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats', error);
      return { totalKeys: 0, memoryUsed: '0' };
    }
  }

  /**
   * Scan Redis keys matching a pattern
   * Uses SCAN command for safe iteration
   *
   * @private
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, foundKeys] = await this.redis!.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );

      cursor = nextCursor;
      keys.push(...foundKeys);
    } while (cursor !== '0');

    return keys;
  }

  /**
   * Parse Redis INFO command output
   *
   * @private
   */
  private parseRedisInfo(info: string): Record<string, string | number> {
    const lines = info.split('\r\n');
    const stats: Record<string, string | number> = {};

    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          const numValue = Number(value);
          stats[key] = isNaN(numValue) ? value : numValue;
        }
      }
    }

    return stats;
  }
}
