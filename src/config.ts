process.loadEnvFile();

import type { MigrationConfig } from 'drizzle-orm/migrator';

type APIConfig = {
  fileserverHits: number;
  port: string;
  platform: string;
  jwtSecret: string;
  polkaApiKey: string;
};

type DBConfig = {
  url: string;
  migrationConfig: MigrationConfig;
};

const migrationConfig: MigrationConfig = {
  migrationsFolder: './src/db/migrations',
};

export const config: { api: APIConfig; db: DBConfig } = {
  api: {
    fileserverHits: 0,
    port: process.env.PORT || '5432',
    platform: process.env.PLATFORM || 'dev',
    jwtSecret: process.env.JWT_SECRET || '',
    polkaApiKey: process.env.POLKA_KEY || '',
  },
  db: {
    url: process.env.DB_URL || '',
    migrationConfig: migrationConfig,
  },
};
