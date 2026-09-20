/**
 * Prisma Slow Query Logger Extension
 *
 * This extension automatically logs queries that exceed performance thresholds:
 * - Queries taking longer than PRISMA_SLOW_QUERY_THRESHOLD_MS (default: 1000ms)
 * - Queries processing more rows than PRISMA_HIGH_ROW_COUNT_THRESHOLD (default: 1,000,000)
 *
 * Environment Variables:
 * - PRISMA_SLOW_QUERY_THRESHOLD_MS: Minimum query duration to log (default: 1000)
 * - PRISMA_HIGH_ROW_COUNT_THRESHOLD: Minimum row count to log (default: 1000000)
 * - PRISMA_SLOW_QUERY_LOG_LEVEL: Log level - 'warn' or 'error' (default: 'warn')
 * - PRISMA_SLOW_QUERY_INCLUDE_STACK: Include stack trace in logs - 'true' or 'false' (default: false)
 *
 * Example log output:
 * 🐌 SLOW QUERY DETECTED: activity_logs.findMany | ⏱️  Duration: 34914ms | 📊 Rows processed: 38.93B
 */

import { Prisma } from '@prisma/client';
import { Logger } from '@nestjs/common';

interface SlowQueryConfig {
  slowQueryThresholdMs?: number; // Log queries slower than this (default: 1000ms)
  highRowCountThreshold?: number; // Log queries processing more rows than this (default: 1,000,000)
  logLevel?: 'warn' | 'error';
  includeStackTrace?: boolean;
}

interface QueryMetrics {
  query: string;
  params: unknown;
  paramsSummary?: string;
  duration: number;
  rowsProcessed?: number;
  model?: string;
  action?: string;
  timestamp: Date;
  stackTrace?: string;
}

export function createSlowQueryLoggerExtension(
  logger: Logger,
  config: SlowQueryConfig = {},
) {
  const {
    slowQueryThresholdMs = 1000,
    highRowCountThreshold = 1_000_000,
    logLevel = 'warn',
    includeStackTrace = true,
  } = config;

  return Prisma.defineExtension({
    name: 'slow-query-logger',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const startTime = Date.now();
          let rowsProcessed: number | undefined;
          let error: Error | undefined;

          try {
            const result = await query(args);

            // Try to determine rows processed from result
            if (Array.isArray(result)) {
              rowsProcessed = result.length;
            } else if (result && typeof result === 'object') {
              // For count operations
              if ('count' in result && typeof result.count === 'number') {
                rowsProcessed = result.count;
              }
              // For aggregate operations
              if ('_count' in result && typeof result._count === 'number') {
                rowsProcessed = result._count;
              }
            }

            const duration = Date.now() - startTime;
            const shouldLog =
              duration >= slowQueryThresholdMs ||
              (rowsProcessed !== undefined &&
                rowsProcessed >= highRowCountThreshold);

            if (shouldLog) {
              const paramsSummary = sanitizeParams(args);
              const metrics: QueryMetrics = {
                query: `${model}.${operation}`,
                params: args,
                paramsSummary,
                duration,
                rowsProcessed,
                model,
                action: operation,
                timestamp: new Date(),
              };

              if (includeStackTrace) {
                const stack = new Error().stack;
                metrics.stackTrace = stack
                  ?.split('\n')
                  .slice(2, 10) // Skip extension and error creation frames
                  .join('\n');
              }

              const logMessage = formatSlowQueryLog(metrics, {
                slowQueryThresholdMs,
                highRowCountThreshold,
              });

              if (logLevel === 'error') {
                logger.error(logMessage);
              } else {
                logger.warn(logMessage);
              }
            }

            return result;
          } catch (err) {
            error = err instanceof Error ? err : new Error(String(err));
            const duration = Date.now() - startTime;

            // Log slow queries even if they fail
            if (duration >= slowQueryThresholdMs) {
              const paramsSummary = sanitizeParams(args);
              logger.error(
                `SLOW QUERY FAILED: ${model}.${operation} took ${duration}ms | ${paramsSummary}`,
                { error: error.message },
              );
            }

            throw err;
          }
        },
      },
    },
  });
}

function sanitizeParams(
  params: unknown,
  maxDepth = 3,
  maxArrayItems = 5,
): string {
  if (params === null || params === undefined) {
    return 'no params';
  }

  if (typeof params !== 'object') {
    return String(params);
  }

  if (Array.isArray(params)) {
    if (params.length === 0) {
      return '[]';
    }
    if (params.length <= maxArrayItems) {
      return `[${params.length} items]`;
    }
    return `[${params.length} items, showing first ${maxArrayItems}]`;
  }

  try {
    const obj = params as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return '{}';
    }

    const summary: string[] = [];
    for (const key of keys.slice(0, 10)) {
      // Limit to first 10 keys
      const value = obj[key];
      if (Array.isArray(value)) {
        if (value.length > maxArrayItems) {
          summary.push(`${key}: [${value.length} items]`);
        } else {
          summary.push(`${key}: [${value.length} items]`);
        }
      } else if (value && typeof value === 'object') {
        summary.push(`${key}: {...}`);
      } else {
        const strValue = String(value).substring(0, 50);
        summary.push(`${key}: ${strValue}`);
      }
    }
    if (keys.length > 10) {
      summary.push(`... and ${keys.length - 10} more keys`);
    }
    return `{${summary.join(', ')}}`;
  } catch {
    return '[object]';
  }
}

function formatSlowQueryLog(
  metrics: QueryMetrics,
  thresholds: { slowQueryThresholdMs: number; highRowCountThreshold: number },
): string {
  const parts: string[] = [];

  parts.push(`🐌 SLOW QUERY: ${metrics.query}`);

  if (metrics.duration >= thresholds.slowQueryThresholdMs) {
    parts.push(`⏱️  ${metrics.duration}ms`);
  }

  if (metrics.rowsProcessed !== undefined) {
    const rowsFormatted = formatLargeNumber(metrics.rowsProcessed);
    if (metrics.rowsProcessed >= thresholds.highRowCountThreshold) {
      parts.push(
        `📊 ${rowsFormatted} rows (⚠️  exceeds ${formatLargeNumber(thresholds.highRowCountThreshold)})`,
      );
    } else {
      parts.push(`📊 ${rowsFormatted} rows`);
    }
  }

  if (metrics.paramsSummary) {
    parts.push(`🔍 Params: ${metrics.paramsSummary}`);
  }

  return parts.join(' | ');
}

function formatLargeNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toString();
}
