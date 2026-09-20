import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createSlowQueryLoggerExtension } from './prisma-slow-query-logger.extension';
import { tempWarehouseFilterExtension } from './prisma-temp-warehouse-filter.extension';

// Create logger instance for slow query extension
const slowQueryLogger = new Logger('PrismaSlowQuery');

// Create Prisma client with slow query logging extension
const createPrismaClient = () => {
  const baseClient = new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' },
    ],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    errorFormat: 'pretty',
    // Lá chắn toàn cục: KHÔNG BAO GIỜ trả `passwordHash` ra khỏi truy vấn theo
    // mặc định. Chặn tại gốc lỗ hổng `GET /users/:id` (service trả bản ghi Prisma
    // thô — vi phạm MASTER RULE §1) và mọi truy vấn tương lai lỡ trả nguyên User.
    // Chỗ nào THẬT SỰ cần hash (xác minh/đổi mật khẩu) phải chủ động xin lại bằng
    // `omit: { passwordHash: false }`; `select: { passwordHash: true }` cũng vẫn nhận.
    omit: {
      user: {
        passwordHash: true,
      },
    },
  });

  // Event-based logging that captures ALL queries, including $queryRaw / $executeRaw
  baseClient.$on('query', (e) => {
    // Captures ALL queries, including $queryRaw / $executeRaw
    // e.duration is in ms; e.query is the SQL; e.params is JSON string
    const slowMs = Number(process.env.PRISMA_SLOW_QUERY_THRESHOLD_MS ?? 10_000);
    if (e.duration >= slowMs) {
      slowQueryLogger.warn(
        `🐌 SLOW SQL: ${e.duration}ms | ${e.query} | params=${e.params}`,
      );
    }
  });

  // Apply slow query logger extension
  const slowQueryThresholdMs = Number(
    process.env.PRISMA_SLOW_QUERY_THRESHOLD_MS ?? 10_000,
  );
  const highRowCountThreshold = Number(
    process.env.PRISMA_HIGH_ROW_COUNT_THRESHOLD ?? 10_000,
  );
  const logLevel = (process.env.PRISMA_SLOW_QUERY_LOG_LEVEL ?? 'warn') as
    | 'warn'
    | 'error';
  const includeStackTrace =
    process.env.PRISMA_SLOW_QUERY_INCLUDE_STACK === 'true';

    // Order matters: apply the temp-warehouse filter BEFORE the slow query
    // logger so logged queries reflect the actual SQL sent to Postgres
    // (with the injected `type = 'MAIN'` predicate).
    return baseClient
      .$extends(tempWarehouseFilterExtension)
      .$extends(
        createSlowQueryLoggerExtension(slowQueryLogger, {
          slowQueryThresholdMs,
          highRowCountThreshold,
          logLevel,
          includeStackTrace,
        }),
      );
};

// Global instance for development to avoid hot-reload issues
const globalForPrisma = global as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
  isConnected: boolean;
};

const prismaClientInstance = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaClientInstance;
}

// Initialize global connection state
if (globalForPrisma.isConnected === undefined) {
  globalForPrisma.isConnected = false;
}

// Export with simpler type to avoid serialization issues
export const prismaClient = prismaClientInstance as unknown as PrismaClient;

// Declaration merge: keep the PrismaService TYPE identical to PrismaClient
// (models, $transaction, $queryRaw, …) WITHOUT extending it at runtime. Extending
// forces `super()` = `new PrismaClient()` per DI instance, and this service is
// listed in ~158 feature-module `providers:` arrays → NestJS builds ~158 instances,
// each eagerly loading its own native Rust query engine (parsing the ~577KB
// datamodel) ≈ 2.2GB of LIVE native RSS. Every query already proxies to the single
// module-level `prismaClient`, so those per-instance engines were pure waste.
export interface PrismaService extends PrismaClient {}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  // Use global connection state to prevent multiple connection tests
  private get isConnected(): boolean {
    return globalForPrisma.isConnected;
  }
  private set isConnected(value: boolean) {
    globalForPrisma.isConnected = value;
  }

  // Connection pool configuration - increased for high concurrency
  private readonly maxConnections = parseInt(
    process.env.DATABASE_MAX_CONNECTIONS || '50',
  );
  private readonly connectionTimeout = parseInt(
    process.env.DATABASE_CONNECTION_TIMEOUT || '30000',
  );
  private readonly idleTimeout = parseInt(
    process.env.DATABASE_IDLE_TIMEOUT || '30000',
  );

  // Use the global prisma client
  private readonly _client = prismaClient;

  constructor() {
    // No `super()` — PrismaService does NOT extend PrismaClient at runtime (see
    // the class comment), so no wasted native engine is created per DI instance.
    // Proxy all model / $-method access to the single shared `prismaClient`.
    return new Proxy(this, {
      get(target, prop: string | symbol) {
        // Service-specific properties and methods
        if (
          prop === 'logger' ||
          prop === 'isConnected' ||
          prop === 'maxConnections' ||
          prop === 'connectionTimeout' ||
          prop === 'idleTimeout' ||
          prop === '_client' ||
          prop === 'onModuleInit' ||
          prop === 'onModuleDestroy' ||
          prop === 'registerProcessErrorHandlers' ||
          prop === 'healthCheck' ||
          prop === 'getConnectionStatus'
        ) {
          const value = target[prop as keyof typeof target];
          return typeof value === 'function' ? value.bind(target) : value;
        }

        // Delegate everything else to the global client (models, $transaction, etc.)
        const clientValue = (target._client as unknown as Record<string | symbol, unknown>)[prop];
        if (clientValue !== undefined) {
          return typeof clientValue === 'function'
            ? clientValue.bind(target._client)
            : clientValue;
        }

        return undefined;
      },
    }) as unknown as PrismaService;
  }

  async onModuleInit() {
    try {
      if (this.isConnected) {
        this.logger.warn('Database already connected, skipping connection');
        return;
      }

      await this._client.$connect();
      this.isConnected = true;

      this.logger.log(
        `Database connected successfully with pool settings: max=${this.maxConnections}, timeout=${this.connectionTimeout}ms`,
      );

      // Test the connection
      await this._client.$queryRaw`SELECT 1`;
      this.logger.log('Database connection test successful');

    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this._client.$disconnect();
      this.isConnected = false;
      this.logger.log('Database disconnected successfully');
    }
  }

  /**
   * ⚠ CHỈ CÒN BẮT LỖI TIẾN TRÌNH — KHÔNG còn đăng ký bộ bắt tín hiệu tắt máy.
   *
   * Bản trước tên là `enableShutdownHooks(app)` và tự đăng ký
   * `process.on('beforeExit' | 'SIGINT' | 'SIGTERM')`, mỗi cái gọi `cleanup()`
   * + `app.close()` + `process.exit(0)`. Cùng lúc đó `main.ts`/`main.worker.ts`
   * đăng ký bộ bắt tín hiệu CỦA RIÊNG chúng, và cả hai còn gọi
   * `app.enableShutdownHooks()` để Nest tự nghe tín hiệu nữa. Ba đường, một
   * tín hiệu.
   *
   * `NestApplicationContext.close()` KHÔNG có chốt chống vào lại — nó gọi thẳng
   * `callDestroyHook()` mỗi lượt. Nên MỘT SIGTERM mở BA lượt huỷ chồng nhau
   * trên cùng những thực thể, và `process.exit(0)` của đường về đích trước CẮT
   * NGANG hai đường còn lại. Đo được hậu quả trên dev 08/09/2026: cứ mỗi lượt
   * triển khai, `WarehouseDailyReportCron.onModuleDestroy` ném
   * `Cannot read properties of null (reading 'disconnect')` vì lượt sau đọc
   * trường mà lượt trước vừa đặt `null`.
   *
   * Nay quyền tắt máy thuộc về DUY NHẤT entrypoint (`main.ts` /
   * `main.worker.ts`): nó bắt tín hiệu, gọi `app.close()` đúng một lượt, và
   * `app.close()` tự chạy `callDestroyHook()` → `PrismaService.onModuleDestroy()`
   * → `$disconnect()`. Vì thế bỏ cả ba bộ bắt ở đây KHÔNG mất gì: `cleanup()`
   * và `onModuleDestroy()` làm đúng một việc như nhau.
   *
   * Hai bộ bắt còn lại dưới đây không liên quan tới tắt máy — chúng giữ cho
   * tiến trình sống qua lỗi không bắt được của Node 24+.
   */
  registerProcessErrorHandlers(): void {
    // Handle uncaught exceptions - log but don't exit unless critical
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception detected:', error);
      // Only exit for critical errors like EADDRINUSE, EACCES, etc.
      // Let NestJS exception filters handle application-level errors
      const criticalErrors = ['EADDRINUSE', 'EACCES', 'ENOTFOUND'];
      if (error['code'] && criticalErrors.includes(error['code'])) {
        this.logger.fatal('Critical error detected - shutting down');
        this.cleanup().then(() => process.exit(1));
      }
    });

    // Handle unhandled promise rejections - log but don't exit
    // In Node.js 24+, unhandled rejections terminate by default
    // We catch and log them to prevent server crashes for non-critical errors
    process.on('unhandledRejection', (reason: Error | unknown, promise) => {
      // Check if it's a NestJS HTTP exception (these should be handled by exception filters)
      const isHttpException =
        reason &&
        typeof reason === 'object' &&
        'response' in reason &&
        'status' in reason;

      if (isHttpException) {
        // Log HTTP exceptions at warn level - these are typically handled errors
        // that somehow escaped the request context
        this.logger.warn('Unhandled HTTP Exception in promise:', {
          message:
            reason instanceof Error ? reason.message : 'Unknown HTTP error',
          status: (reason as { status?: number }).status,
        });
      } else {
        // Log other unhandled rejections as errors
        this.logger.error('Unhandled Promise Rejection detected:', {
          reason:
            reason instanceof Error
              ? { message: reason.message, stack: reason.stack }
              : reason,
        });
      }

      // Prevent default termination behavior in Node.js 24+
      // by catching the promise rejection (this handler itself prevents termination)
      // The promise parameter can be used to add a catch handler to prevent
      // the default termination, but registering this event handler is sufficient
      promise.catch(() => {
        // Swallow the error to prevent unhandled rejection termination
        // The error has already been logged above
      });
    });
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.isConnected) {
        await this._client.$disconnect();
        this.isConnected = false;
        this.logger.log('Database cleanup completed');
      }
    } catch (error) {
      this.logger.error('Error during database cleanup:', error);
    }
  }

  // Health check method
  async healthCheck() {
    try {
      await this._client.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        connected: this.isConnected,
        maxConnections: this.maxConnections,
        connectionTimeout: this.connectionTimeout,
        idleTimeout: this.idleTimeout,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        connected: this.isConnected,
        maxConnections: this.maxConnections,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Method to get connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      maxConnections: this.maxConnections,
      connectionTimeout: this.connectionTimeout,
      idleTimeout: this.idleTimeout,
      timestamp: new Date().toISOString(),
    };
  }
}
