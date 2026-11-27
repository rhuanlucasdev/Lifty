import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    // Banco próprio dos testes, recriado a cada execução (test/global-setup.ts).
    env: { DATABASE_URL: 'file:./data/test.db', BACKUP_DIR: join(tmpdir(), 'lifty-test-backups') },
    globalSetup: ['test/global-setup.ts'],
    fileParallelism: false,
    hookTimeout: 60_000,
  },
});
