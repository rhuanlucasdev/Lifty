// Cópia consistente do banco (VACUUM INTO), segura com a API rodando.
// Uso: pnpm backup  →  apps/api/backups/lifty-AAAA-MM-DDTHH-MM-SS.db
// Restaurar: pela interface (Perfil → Backup) ou parando a API e substituindo data/lifty.db.
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { timestamp, vacuumInto } from '../src/backup/sqlite.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { databaseUrl } from '../src/prisma/database-url.js';

if (existsSync('.env')) process.loadEnvFile();

const dir = resolve(process.env.BACKUP_DIR ?? 'backups');
mkdirSync(dir, { recursive: true });
const target = resolve(dir, `lifty-${timestamp()}.db`);

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databaseUrl() }) });
try {
  await vacuumInto(prisma, target);
  console.log(`Backup criado: ${target}`);
} finally {
  await prisma.$disconnect();
}
