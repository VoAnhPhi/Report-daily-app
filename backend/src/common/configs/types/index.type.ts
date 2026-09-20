import { AppConfig } from './app.config.type';
import { DatabaseConfig } from './database.config.type';
import { EmbeddingConfigType } from './embedding.config.type';
import { MinioConfigType } from './minio.config.type';
import { PaymentConfigType } from './payment.config.type';

export type AllConfigType = {
  app: AppConfig;
  database: DatabaseConfig;
  embedding: EmbeddingConfigType;
  minio: MinioConfigType;
  resend: {
    resendApiKey?: string;
  };
  mux: {
    muxTokenId?: string;
    muxTokenSecret?: string;
    muxWebhookSecret?: string;
  };
  redis: {
    redisUrl?: string;
  };
  livekit: {
    url?: string;
    apiKey?: string;
    apiSecret?: string;
  };
  pusher: {
    appId?: string;
    secret?: string;
    key?: string;
    cluster?: string;
  };
  mubert: {
    apiKey?: string;
    apiUrl?: string;
  };
  payment: PaymentConfigType;
};
