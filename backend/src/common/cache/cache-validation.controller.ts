import { Controller, Get, UseGuards } from '@nestjs/common';
import { CacheHealthService } from './cache-health.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

@Controller('cache-validation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CacheValidationController {
  constructor(private readonly cacheHealth: CacheHealthService) {}

  @Get('health')
  @Roles(Role.ADMIN)
  async getHealthStatus() {
    const health = await this.cacheHealth.getHealthStatus();
    const connectionInfo = await this.cacheHealth.getConnectionInfo();
    const hitRate = await this.cacheHealth.getCacheHitRate();

    return {
      timestamp: new Date().toISOString(),
      ...health,
      connection: connectionInfo,
      performance: {
        hitRate: `${hitRate.hitRate}%`,
        hits: hitRate.hits,
        misses: hitRate.misses,
        total: hitRate.total,
      },
      warnings: [
        !connectionInfo.isRemote &&
          '⚠️  Redis is running locally - VPS resources at risk!',
        !health.validation.usingRedis &&
          '⚠️  Not using Redis - using memory cache instead!',
      ].filter(Boolean),
    };
  }

  @Get('test')
  @Roles(Role.ADMIN)
  async testCacheOperation() {
    const result = await this.cacheHealth.testCacheOperation();

    return {
      timestamp: new Date().toISOString(),
      ...result,
      verdict:
        result.location === 'redis'
          ? '✅ Cache is using Redis Cloud correctly'
          : '❌ Cache is NOT using Redis - using local storage',
    };
  }

  @Get('connection-info')
  @Roles(Role.ADMIN)
  async getConnectionInfo() {
    const info = await this.cacheHealth.getConnectionInfo();

    return {
      timestamp: new Date().toISOString(),
      ...info,
      verdict: info.isRemote
        ? '✅ Using remote Redis Cloud - VPS resources safe'
        : '❌ Using local Redis - consuming VPS CPU and memory',
      recommendation: info.isRemote
        ? 'Configuration is correct. Continue monitoring.'
        : 'URGENT: Update REDIS_URL in .env to use Redis Cloud endpoint',
    };
  }

  @Get('hit-rate')
  @Roles(Role.ADMIN)
  async getCacheHitRate() {
    const hitRate = await this.cacheHealth.getCacheHitRate();

    let performance: string;
    if (hitRate.hitRate >= 70) {
      performance = '🟢 Excellent';
    } else if (hitRate.hitRate >= 50) {
      performance = '🟡 Good';
    } else if (hitRate.hitRate >= 30) {
      performance = '🟠 Fair';
    } else {
      performance = '🔴 Poor';
    }

    return {
      timestamp: new Date().toISOString(),
      ...hitRate,
      performance,
      interpretation: {
        excellent: 'Hit rate >= 70% - Cache is working optimally',
        good: 'Hit rate 50-70% - Cache is effective',
        fair: 'Hit rate 30-50% - Consider tuning TTLs',
        poor: 'Hit rate < 30% - Review caching strategy',
      },
    };
  }

  @Get('stats')
  @Roles(Role.ADMIN)
  async getComprehensiveStats() {
    const [health, connectionInfo, hitRate, testResult] = await Promise.all([
      this.cacheHealth.getHealthStatus(),
      this.cacheHealth.getConnectionInfo(),
      this.cacheHealth.getCacheHitRate(),
      this.cacheHealth.testCacheOperation(),
    ]);

    const allGood =
      health.validation.usingRedis &&
      connectionInfo.isRemote &&
      testResult.success;

    return {
      timestamp: new Date().toISOString(),
      overallStatus: allGood ? '✅ HEALTHY' : '❌ ISSUES DETECTED',
      redis: health.redis,
      validation: health.validation,
      connection: connectionInfo,
      performance: {
        hitRate: `${hitRate.hitRate}%`,
        hits: hitRate.hits,
        misses: hitRate.misses,
        total: hitRate.total,
      },
      test: testResult,
      statistics: health.statistics,
      checklist: {
        '✅ Using Redis (not memory)': health.validation.usingRedis,
        '✅ Connection verified': health.validation.connectionVerified,
        '✅ Using remote Redis': connectionInfo.isRemote,
        '✅ Cache operations working': testResult.success,
        '✅ VPS resources safe': !connectionInfo.isLocal,
      },
      recommendations: this.generateRecommendations(
        health,
        connectionInfo,
        hitRate,
        testResult,
      ),
    };
  }

  private generateRecommendations(
    health: Awaited<ReturnType<CacheHealthService['getHealthStatus']>>,
    connectionInfo: Awaited<
      ReturnType<CacheHealthService['getConnectionInfo']>
    >,
    hitRate: Awaited<ReturnType<CacheHealthService['getCacheHitRate']>>,
    testResult: Awaited<ReturnType<CacheHealthService['testCacheOperation']>>,
  ): string[] {
    const recommendations: string[] = [];

    if (!health.validation.usingRedis) {
      recommendations.push(
        '🔴 CRITICAL: Not using Redis! Update cache-config.service.ts',
      );
    }

    if (connectionInfo.isLocal) {
      recommendations.push(
        '🔴 CRITICAL: Using local Redis! Update REDIS_URL to Redis Cloud endpoint',
      );
    }

    if (!testResult.success) {
      recommendations.push(
        '🔴 Cache operations failing. Check Redis connectivity',
      );
    }

    if (hitRate.hitRate < 30 && hitRate.total > 100) {
      recommendations.push(
        '🟠 Low hit rate. Consider increasing TTLs on frequently accessed endpoints',
      );
    }

    if (hitRate.hitRate > 80 && hitRate.total > 1000) {
      recommendations.push(
        '🟢 Excellent cache performance. Current configuration is optimal',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('🟢 All checks passed. System is healthy');
    }

    return recommendations;
  }
}

