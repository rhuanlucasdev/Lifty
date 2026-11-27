import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const DATABASE_URL = 'file:./data/test.db';

/** Recria o banco de testes: migrations + seed reais. */
export default function setup() {
  for (const suffix of ['', '-shm', '-wal', '-journal']) {
    rmSync(`data/test.db${suffix}`, { force: true });
  }
  const env = { ...process.env, DATABASE_URL };
  execSync('pnpm exec prisma migrate deploy', { env, stdio: 'ignore' });
  execSync('pnpm exec prisma db seed', { env, stdio: 'ignore' });
}
