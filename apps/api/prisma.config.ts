import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';
import { databaseUrl } from './src/prisma/database-url.js';

if (existsSync('.env')) process.loadEnvFile();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: databaseUrl() },
});
