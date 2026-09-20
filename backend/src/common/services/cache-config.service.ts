import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createKeyv } from '@keyv/redis';
import { AllConfigType } from '../configs/types/index.type';

export class CacheConfigService {
  static register() {
    return CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService<AllConfigType>) => {
        const redisUrl =
          configService.get<AllConfigType['redis']>('redis')?.redisUrl;

        if (!redisUrl) {
          throw new Error('REDIS_URL is not configured in .env');
        }

        // Parse Redis URL to configure options
        const url = new URL(redisUrl);
        const isSSL = url.protocol === 'rediss:';

        // Build Redis connection options for Keyv Redis
        // @keyv/redis v5+ uses node-redis v4+
        interface RedisSocketOptions {
          tls?: boolean;
          rejectUnauthorized?: boolean;
          checkServerIdentity?: () => undefined;
        }
        interface KeyvRedisOptions {
          ttl: number;
          useUnlink: boolean;
          socket?: RedisSocketOptions;
        }
        const redisOptions: KeyvRedisOptions = {
          ttl: 60 * 1000 * 2, // 2 minutes in milliseconds
          useUnlink: true, // Use UNLINK instead of DEL for better performance
        };

        // Only configure TLS if using SSL (rediss://)
        // For non-TLS connections (redis://), no TLS configuration needed
        if (isSSL) {
          // For node-redis v4+, TLS configuration in socket object
          // @keyv/redis passes these options to the underlying Redis client
          redisOptions.socket = {
            tls: true,
            // Disable certificate validation for Redis Cloud
            // Redis Cloud uses self-signed certificates by default
            rejectUnauthorized: false,
            // Skip hostname verification for Redis Cloud
            checkServerIdentity: () => {
              return undefined;
            },
          };
        }
        // For redis:// (non-TLS), createKeyv will handle connection automatically
        // No additional configuration needed

        // Use official createKeyv function (recommended by Keyv documentation)
        // See: https://keyv.org/docs/storage-adapters/redis/#using-with-nestjs
        // Note: createKeyv automatically detects protocol (redis:// or rediss://)
        // For rediss://, it enables TLS; for redis://, it uses plain TCP
        const keyv = createKeyv(redisUrl, redisOptions);

        // Log Redis URL for debugging (without password)
        const urlForLog = redisUrl.replace(/:[^:@]+@/, ':****@');
        console.log(`🔗 Initializing Redis cache connection: ${urlForLog}`);

        // Force connection initialization by setting a test key
        // This ensures Redis is connected before the app starts
        try {
          await keyv.set('__cache_init__', 'ready', 1000);
          await keyv.delete('__cache_init__');
          console.log('✅ Redis cache connection initialized successfully');
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error(
            '❌ Failed to initialize Redis cache connection:',
            message,
          );
          throw new Error(
            `Redis cache initialization failed: ${message}. Please check REDIS_URL in .env file.`,
          );
        }

        return {
          stores: [keyv], // Use 'stores' array as per NestJS + Keyv documentation
        };
      },
      inject: [ConfigService],
    });
  }
}
