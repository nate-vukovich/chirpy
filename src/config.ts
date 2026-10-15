process.loadEnvFile();

import type { MigrationConfig } from 'drizzle-orm/migrator';

type APIConfig = {
  fileserverHits: number;
  port: string;
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
  },
  db: {
    url: process.env.DB_URL || '',
    migrationConfig: migrationConfig,
  },
};
