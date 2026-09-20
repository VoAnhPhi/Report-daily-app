export interface AppConfig {
  nodeEnv: string;
  name: string;
  workingDirectory: string;
  frontendDomain?: string;
  backendDomain: string;
  adminFrontendDomain: string;
  mailEnabled: boolean;
  port: number;
  fallbackLanguage: string;
  headerLanguage: string;
  jwtSecretKey?: string;
  jwtRefreshSecretKey?: string;
  appSalt?: string;
  encryptionKey?: string;
  goongApiKey?: string;
  goongMapTileKey?: string;
  adminReserveFundUserId?: string;
  companyWalletUserId?: string;
  technicalActivityApiKey?: string;
}
