import { defineConfig } from 'drizzle-kit';

import type { MigrationConfig } from 'drizzle-orm/migrator';

const migrationConfig: MigrationConfig = {
  migrationsFolder: './src/db/migrations',
};

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: 'postgres://postgres:T4r4_nv!@localhost:5432/chirpy?sslmode=disable',
  },
});
