import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from 'src/common/services/prisma.service';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AllConfigType } from 'src/common/configs/types/index.type';

/**
 * Authentication infrastructure needed by the extracted task/report API.
 * Login and token issuing remain owned by the host application; this module
 * only validates the Bearer token and exposes the guards used by the feature
 * controllers.
 */
@Global()
@Module({
  imports: [
    CacheModule.register({ isGlobal: true }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AllConfigType>) => ({
        secret: config.get('app.jwtSecretKey', { infer: true }),
      }),
      global: true,
    }),
  ],
  providers: [
    PrismaService,
    JwtStrategy,
    JwtAuthGuard,
    PermissionsGuard,
    RolesGuard,
  ],
  exports: [
    PrismaService,
    JwtModule,
    PassportModule,
    JwtAuthGuard,
    PermissionsGuard,
    RolesGuard,
  ],
})
export class FeatureAuthModule {}
