import { registerAs } from '@nestjs/config';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
import { AppConfig } from './types/app.config.type';
import validateConfig from '../utils';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariablesValidator {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  APP_PORT: number;

  @IsUrl({ require_tld: false })
  @IsOptional()
  FRONTEND_DOMAIN: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  BACKEND_DOMAIN: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  ADMIN_FRONTEND_DOMAIN: string;

  @IsString()
  @IsOptional()
  MAIL_ENABLED: string;

  @IsString()
  @IsOptional()
  APP_FALLBACK_LANGUAGE: string;

  @IsString()
  @IsOptional()
  APP_HEADER_LANGUAGE: string;

  @IsString()
  JWT_SECRET_KEY: string;

  @IsString()
  JWT_REFRESH_SECRET_KEY: string;

  @IsString()
  @IsOptional()
  APP_SALT: string;

  @IsString()
  @IsOptional()
  ENCRYPTION_KEY: string;

  @IsString()
  @IsOptional()
  GOONG_API_KEY: string;

  @IsString()
  @IsOptional()
  GOONG_MAP_TILE_KEY: string;

  @IsString()
  @IsOptional()
  ADMIN_RESERVE_FUND_USER_ID: string;

  @IsString()
  @IsOptional()
  COMPANY_WALLET_USER_ID: string;

  @IsString()
  @IsOptional()
  TECHNICAL_ACTIVITY_API_KEY: string;
}

export default registerAs<AppConfig>('app', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    name: process.env.APP_NAME || 'app',
    workingDirectory: process.env.PWD || process.cwd(),
    frontendDomain: process.env.FRONTEND_DOMAIN,
    backendDomain: process.env.BACKEND_DOMAIN ?? 'http://localhost',
    adminFrontendDomain:
      process.env.ADMIN_FRONTEND_DOMAIN ?? 'http://localhost:3000',
    // Mail is OFF by default — must be explicitly enabled (prevents accidental
    // real sends when running locally).
    mailEnabled: process.env.MAIL_ENABLED === 'true',
    port: process.env.APP_PORT
      ? parseInt(process.env.APP_PORT, 10)
      : process.env.PORT
        ? parseInt(process.env.PORT, 10)
        : 4000,
    fallbackLanguage: process.env.APP_FALLBACK_LANGUAGE || 'en',
    headerLanguage: process.env.APP_HEADER_LANGUAGE || 'x-custom-lang',
    jwtSecretKey: process.env.JWT_SECRET_KEY,
    jwtRefreshSecretKey: process.env.JWT_REFRESH_SECRET_KEY,
    appSalt: process.env.APP_SALT,
    encryptionKey: process.env.ENCRYPTION_KEY,
    goongApiKey: process.env.GOONG_API_KEY,
    goongMapTileKey: process.env.GOONG_MAP_TILE_KEY,
    adminReserveFundUserId: process.env.ADMIN_RESERVE_FUND_USER_ID,
    companyWalletUserId: process.env.COMPANY_WALLET_USER_ID,
    technicalActivityApiKey: process.env.TECHNICAL_ACTIVITY_API_KEY,
  };
});
