import { resolve } from 'node:path';
import type { PrismaClient } from '../generated/prisma/client.js';
import { databaseUrl } from '../prisma/database-url.js';

/** Caminho absoluto do arquivo SQLite a partir de DATABASE_URL (`file:./...`). */
export function databaseFilePath(): string {
  return resolve(databaseUrl().replace(/^file:/, ''));
}

/** Cópia consistente do banco (segura com a aplicação em uso). */
export async function vacuumInto(prisma: PrismaClient, target: string): Promise<void> {
  await prisma.$executeRawUnsafe(`VACUUM INTO '${target.replaceAll("'", "''")}'`);
}

export const timestamp = () => new Date().toISOString().slice(0, 19).replaceAll(':', '-');
