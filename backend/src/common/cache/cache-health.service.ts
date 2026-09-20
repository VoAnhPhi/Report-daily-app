import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../configs/types/index.type';

@Injectable()
export class CacheHealthService implements OnModuleInit {
  private readonly logger = new Logger(CacheHealthService.name);
  private isRedisConnected = false;
  private redisInfo: Record<string, string | undefined> = {};

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async onModuleInit() {
    await this.validateRedisConnection();
  }

  /**
   * Validates that we're using Redis (not memory cache)
   * This runs on app startup to ensure proper configuration
   */
  async validateRedisConnection(): Promise<void> {
    try {
      // Verify REDIS_URL is configured in .env
      const redisUrl =
        this.configService.get<AllConfigType['redis']>('redis')?.redisUrl;
      const sanitizedUrl = redisUrl
        ? redisUrl.replace(/:[^:@]+@/, ':****@')
        : 'NOT SET';

      this.logger.debug(`Redis URL from .env: ${sanitizedUrl}`);

      if (!redisUrl) {
        throw new Error(
          'REDIS_URL is not configured in .env file. Please set REDIS_URL environment variable.',
        );
      }
      // Access Keyv store - NestJS + Keyv uses 'store' property for single store
      // or 'stores' array when using multiple stores
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cacheManager = this.cache as Record<string, any>;
      let store = cacheManager.store;

      // If using stores array pattern (NestJS + Keyv official pattern)
      if (!store && Array.isArray(cacheManager.stores)) {
        store = cacheManager.stores[0]; // Get first store (Keyv instance)
        this.logger.debug('Using stores array pattern (stores[0])');
      }

      // Debug: Log store structure
      this.logger.debug(`Store type: ${store?.constructor?.name || 'unknown'}`);
      this.logger.debug(
        `Store keys: ${store ? Object.keys(store).join(', ') : 'no store'}`,
      );

      // Find Redis client through various store structures
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let redis: Record<string, any> | null = null;

      // For Keyv store created with createKeyv: store.opts.store.redis
      if (store?.opts?.store?.redis) {
        redis = store.opts.store.redis;
        this.logger.debug(
          'Found Redis client via Keyv structure (opts.store.redis)',
        );
      }
      // For Keyv store: cache.store.opts.store.client
      else if (store?.opts?.store?.client) {
        redis = store.opts.store.client;
        this.logger.debug(
          'Found Redis client via Keyv structure (opts.store.client)',
        );
      }
      // Legacy paths for other Redis stores
      else if (store?.client) {
        redis = store.client;
        this.logger.debug('Found Redis client via store.client');
      } else if (typeof store?.getClient === 'function') {
        redis = await store.getClient();
        this.logger.debug('Found Redis client via store.getClient()');
      } else if (store?.redisClient) {
        redis = store.redisClient;
        this.logger.debug('Found Redis client via store.redisClient');
      } else if (store?.redis?.client) {
        redis = store.redis.client;
        this.logger.debug('Found Redis client via store.redis.client');
      } else if (store?.store?.client) {
        redis = store.store.client;
        this.logger.debug('Found Redis client via store.store.client');
      }

      if (!redis) {
        // Log detailed debug info for troubleshooting
        this.logger.error(
          `Store structure: ${JSON.stringify(
            {
              hasStore: !!store,
              hasStores: !!cacheManager.stores,
              storesLength: cacheManager.stores?.length,
              storeType: store?.constructor?.name,
              storeKeys: store ? Object.keys(store) : [],
              hasOpts: !!store?.opts,
              optsKeys: store?.opts ? Object.keys(store.opts) : [],
              hasOptsStore: !!store?.opts?.store,
              optsStoreKeys: store?.opts?.store
                ? Object.keys(store.opts.store)
                : [],
              cacheKeys: Object.keys(cacheManager),
            },
            null,
            2,
          )}`,
        );

        throw new Error(
          '❌ CRITICAL: Redis client not found! Cache is using memory store instead of Redis. Check REDIS_URL in .env',
        );
      }

      // Verify it's actually a Redis client (has redis-specific methods)
      if (typeof redis.ping !== 'function') {
        throw new Error(
          '❌ CRITICAL: Cache store is not Redis! Using local memory cache. VPS resources at risk!',
        );
      }

      // Check connection status (but don't manually connect)
      // createKeyv handles connection automatically, manual connect() can cause TLS issues
      const isConnected =
        redis.status === 'ready' ||
        redis.isOpen === true ||
        (typeof redis.isReady === 'function' && redis.isReady());

      if (!isConnected) {
        this.logger.debug(
          'Redis client not connected yet, waiting for automatic connection...',
        );
        // Wait for automatic connection (createKeyv handles this)
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else {
        this.logger.debug('Redis client is already connected');
      }

      // Test Redis connection
      let pingResult: string;
      try {
        pingResult = await redis.ping();
      } catch (pingError: unknown) {
        const pingErr = pingError instanceof Error ? pingError : new Error(String(pingError));
        if (
          pingErr.message === 'The client is closed' ||
          pingErr.message?.includes('client is closed')
        ) {
          // Client was closed - wait a bit for automatic reconnection
          this.logger.debug(
            'Redis client was closed, waiting for automatic reconnection...',
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          try {
            pingResult = await redis.ping();
          } catch (retryError: unknown) {
            const retryErr = retryError instanceof Error ? retryError.message : String(retryError);
            throw new Error(
              `❌ Redis client is closed and cannot reconnect: ${retryErr}. Check REDIS_URL connection and TLS configuration.`,
            );
          }
        } else {
          throw pingError;
        }
      }

      if (pingResult !== 'PONG') {
        throw new Error(
          `❌ Redis connection failed! Expected PONG, got: ${pingResult}`,
        );
      }

      // Get Redis server info
      let info: string;
      try {
        info = await redis.info('server');
      } catch (infoError: unknown) {
        const infoMsg = infoError instanceof Error ? infoError.message : String(infoError);
        throw new Error(
          `❌ Failed to get Redis server info: ${infoMsg}`,
        );
      }
      const redisVersion = info.match(/redis_version:([^\r\n]+)/)?.[1];
      const redisMode = info.match(/redis_mode:([^\r\n]+)/)?.[1];

      // Get connection info
      let clientInfo: { addr?: string } | undefined;
      try {
        if (typeof redis.clientInfo === 'function') {
          clientInfo = await redis.clientInfo();
        } else if (typeof redis.client === 'function') {
          clientInfo = await redis.client('INFO');
        }
      } catch (clientInfoError: unknown) {
        const clientInfoMsg = clientInfoError instanceof Error ? clientInfoError.message : String(clientInfoError);
        this.logger.debug(
          `Could not get client info: ${clientInfoMsg}`,
        );
      }
      const connectionName = clientInfo?.addr || 'unknown';

      this.isRedisConnected = true;
      this.redisInfo = {
        version: redisVersion,
        mode: redisMode,
        connection: connectionName,
        client: redis.constructor.name,
      };

      this.logger.log('✅ ============================================');
      this.logger.log('✅ REDIS CACHE VALIDATION SUCCESS');
      this.logger.log('✅ ============================================');
      this.logger.log(`✅ Redis Version: ${redisVersion}`);
      this.logger.log(`✅ Redis Mode: ${redisMode}`);
      this.logger.log(`✅ Connection: ${connectionName}`);
      this.logger.log(`✅ Client Type: ${redis.constructor.name}`);
      this.logger.log('✅ Cache is using REMOTE Redis - NOT local memory');
      this.logger.log('✅ VPS resources are safe ✓');
      this.logger.log('✅ ============================================');
    } catch (error) {
      this.isRedisConnected = false;
      this.logger.error('❌ ============================================');
      this.logger.error('❌ REDIS CACHE VALIDATION FAILED');
      this.logger.error('❌ ============================================');
      this.logger.error(`❌ Error: ${error.message}`);
      this.logger.error('❌ ============================================');
      this.logger.error('❌ ACTION REQUIRED:');
      this.logger.error('❌ 1. Check REDIS_URL in .env file');
      this.logger.error('❌ 2. Ensure Redis Cloud is accessible');
      this.logger.error('❌ 3. Verify network connectivity');
      this.logger.error('❌ 4. Check Redis Cloud credentials');
      this.logger.error('❌ ============================================');

      // Throw error to prevent app from starting with wrong cache
      throw new Error(
        `Redis validation failed: ${error.message}. App will not start to prevent using local memory cache.`,
      );
    }
  }

  /**
   * Get current cache health status
   */
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

    // Try multiple paths to find Redis client
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

  async getHealthStatus(): Promise<{
    status: string;
    redis: {
      connected: boolean;
      version?: string;
      mode?: string;
      connection?: string;
      client?: string;
    };
    statistics: {
      hits?: number;
      misses?: number;
      keys?: number;
      memory?: string;
    };
    validation: {
      usingRedis: boolean;
      usingMemory: boolean;
      connectionVerified: boolean;
    };
  }> {
    const redis = this.getRedisClient();

    if (!redis) {
      return {
        status: 'ERROR',
        redis: {
          connected: false,
        },
        statistics: {},
        validation: {
          usingRedis: false,
          usingMemory: true,
          connectionVerified: false,
        },
      };
    }

    try {
      // Get Redis stats
      const info = await redis.info('stats');
      const memory = await redis.info('memory');

      const stats = {
        hits: parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || '0'),
        misses: parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || '0'),
        keys: await redis.dbSize(),
        memory: memory.match(/used_memory_human:([^\r\n]+)/)?.[1] || 'unknown',
      };

      return {
        status: 'OK',
        redis: {
          connected: this.isRedisConnected,
          ...this.redisInfo,
        },
        statistics: stats,
        validation: {
          usingRedis: true,
          usingMemory: false,
          connectionVerified: this.isRedisConnected,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get Redis stats: ${error.message}`);
      return {
        status: 'ERROR',
        redis: {
          connected: false,
        },
        statistics: {},
        validation: {
          usingRedis: false,
          usingMemory: false,
          connectionVerified: false,
        },
      };
    }
  }

  /**
   * Test cache write/read to verify Redis is working
   */
  async testCacheOperation(): Promise<{
    success: boolean;
    latency: number;
    location: 'redis' | 'memory' | 'unknown';
    details: string;
  }> {
    const testKey = `cache-test:${Date.now()}`;
    const testValue = { test: true, timestamp: Date.now() };

    try {
      const startTime = Date.now();

      // Write to cache
      await this.cache.set(testKey, testValue, 5000); // 5 second TTL

      // Read from cache
      const retrieved = await this.cache.get(testKey);

      // Verify it went to Redis
      const redis = this.getRedisClient();
      if (!redis) {
        return {
          success: false,
          latency: 0,
          location: 'memory',
          details: 'No Redis client found - using memory cache',
        };
      }

      // Check if key exists in Redis
      const exists = await redis.exists(testKey);
      const latency = Date.now() - startTime;

      // Clean up
      await redis.del(testKey);

      if (exists && retrieved) {
        return {
          success: true,
          latency,
          location: 'redis',
          details: `Cache operation verified on Redis. Latency: ${latency}ms`,
        };
      } else {
        return {
          success: false,
          latency,
          location: 'unknown',
          details: 'Cache operation completed but verification failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        latency: 0,
        location: 'unknown',
        details: `Cache test failed: ${error.message}`,
      };
    }
  }

  /**
   * Get cache hit rate percentage
   */
  async getCacheHitRate(): Promise<{
    hitRate: number;
    hits: number;
    misses: number;
    total: number;
  }> {
    try {
      const redis = this.getRedisClient();
      if (!redis) {
        return { hitRate: 0, hits: 0, misses: 0, total: 0 };
      }

      const info = await redis.info('stats');
      const hits = parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || '0');
      const misses = parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || '0');
      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total) * 100 : 0;

      return {
        hitRate: Math.round(hitRate * 100) / 100,
        hits,
        misses,
        total,
      };
    } catch (error) {
      return { hitRate: 0, hits: 0, misses: 0, total: 0 };
    }
  }

  /**
   * Get Redis connection info to verify it's remote
   */
  async getConnectionInfo(): Promise<{
    isRemote: boolean;
    host: string;
    port: number;
    isLocal: boolean;
    warning?: string;
  }> {
    try {
      const redis = this.getRedisClient();
      if (!redis) {
        return {
          isRemote: false,
          host: 'unknown',
          port: 0,
          isLocal: false,
          warning: 'No Redis connection - using memory cache',
        };
      }

      const options = redis.options || {};
      const host = options.host || 'unknown';
      const port = options.port || 0;

      // Check if it's a local connection
      const isLocal =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host === '::1';

      return {
        isRemote: !isLocal,
        host,
        port,
        isLocal,
        warning: isLocal
          ? '⚠️  WARNING: Redis is running on localhost - this will use VPS resources!'
          : undefined,
      };
    } catch (error) {
      return {
        isRemote: false,
        host: 'error',
        port: 0,
        isLocal: false,
        warning: `Failed to get connection info: ${error.message}`,
      };
    }
  }
}
