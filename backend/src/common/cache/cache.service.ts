import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { CACHE_TAG_PREFIX } from './cache.constants';

@Injectable()
export class AppCacheService {
  private readonly logger = new Logger(AppCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    const value = (await this.cache.get(key)) as T | undefined;
    return value;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    await this.cache.set(key, value, ttlMs);
  }

  async del(key: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.cache as Record<string, any>).del(key);
  }

  // Get Redis client using the same detection logic as cache-health.service.ts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getRedisClient(): Record<string, any> | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cacheManager = this.cache as Record<string, any>;
    let store = cacheManager.store;

    // If using stores array pattern
    if (!store && Array.isArray(cacheManager.stores)) {
      store = cacheManager.stores[0];
    }

    if (!store) return null;

    // Try multiple paths to find Redis client (same as health check)
    // For Keyv store structure (createKeyv pattern)
    let redis =
      store?.opts?.store?.redis || // Keyv -> KeyvRedis -> redis
      store?.opts?.store?.client || // Keyv -> KeyvRedis -> client
      store?.client || // Direct client
      store?.getClient?.() || // Method-based access
      store?.redisClient || // Legacy naming
      store?.redis?.client; // Nested structure

    // Check if it's a wrapped store
    if (!redis && store?.store) {
      redis =
        store.store?.redis ||
        store.store?.client ||
        store.store?.getClient?.() ||
        store.store;
    }

    return redis;
  }

  // Tagging: tag membership stored as Redis Set of keys
  async addTags(key: string, tags: string[]) {
    if (!tags?.length) return;

    const redis = this.getRedisClient();
    if (!redis) {
      this.logger.warn('Redis client not found - cannot add tags');
      return;
    }

    for (const tag of tags) {
      const tagKey = CACHE_TAG_PREFIX + tag;
      await redis.sAdd(tagKey, key);
    }
  }

  // Invalidate by tags
  async invalidateTags(tags: string[]) {
    const redis = this.getRedisClient();
    if (!redis) {
      this.logger.warn('Redis client not found - cannot invalidate tags');
      return;
    }

    for (const tag of tags) {
      const tagKey = CACHE_TAG_PREFIX + tag;
      const members: string[] = await redis.sMembers(tagKey);
      if (members && members.length) {
        // Pipeline deletions
        const pipeline = redis.multi();
        for (const k of members) pipeline.del(k);
        pipeline.del(tagKey);
        await pipeline.exec();
      } else {
        await redis.del(tagKey);
      }
    }
  }

  /**
   * Append a value to the end of a Redis list.
   * Returns the new list length, or null if Redis client unavailable.
   */
  async rpush(key: string, value: string): Promise<number | null> {
    const redis = this.getRedisClient();
    if (!redis) {
      this.logger.warn('Redis client not found - cannot rpush');
      return null;
    }
    return (redis.rPush(key, value) as Promise<number>);
  }

  /**
   * Get a range of elements from a Redis list.
   * start=0, stop=-1 returns all elements.
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const redis = this.getRedisClient();
    if (!redis) {
      this.logger.warn('Redis client not found - cannot lrange');
      return [];
    }
    return (redis.lRange(key, start, stop) as Promise<string[]>);
  }

  /**
   * Trim a Redis list to the specified range.
   * ltrim(key, -1000, -1) keeps only the last 1000 entries.
   */
  async ltrim(key: string, start: number, stop: number): Promise<void> {
    const redis = this.getRedisClient();
    if (!redis) {
      this.logger.warn('Redis client not found - cannot ltrim');
      return;
    }
    await (redis.lTrim(key, start, stop) as Promise<void>);
  }

  // Wrap pattern: get-or-set
  async wrap<T>(
    key: string,
    ttlMs: number,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) return cached;

    const value = await fetcher();
    await this.set(key, value, ttlMs);
    return value;
  }
}
