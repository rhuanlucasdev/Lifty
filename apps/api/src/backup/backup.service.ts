import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { databaseFilePath, timestamp, vacuumInto } from './sqlite.js';

const SQLITE_HEADER = Buffer.from('SQLite format 3\0', 'latin1');

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private restoring = false;

  constructor(private readonly prisma: PrismaService) {}

  /** Cópia completa do banco, pronta para download. */
  async export(): Promise<Buffer> {
    const dir = mkdtempSync(join(tmpdir(), 'lifty-'));
    const file = join(dir, 'backup.db');
    try {
      await vacuumInto(this.prisma, file);
      return readFileSync(file);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  /**
   * Substitui o banco pelo backup enviado. Antes: valida o arquivo (SQLite íntegro, mesma
   * versão de schema) e guarda uma cópia do banco atual em backups/pre-restore-*.db.
   */
  async restore(content: Buffer): Promise<{ safetyBackup: string }> {
    if (this.restoring) throw new ConflictException('Uma restauração já está em andamento');
    if (!content.subarray(0, SQLITE_HEADER.length).equals(SQLITE_HEADER)) {
      throw new BadRequestException('O arquivo não é um backup do Lifty (SQLite)');
    }

    this.restoring = true;
    const dir = mkdtempSync(join(tmpdir(), 'lifty-restore-'));
    const uploaded = join(dir, 'upload.db');
    try {
      writeFileSync(uploaded, content);
      await this.assertCompatible(uploaded);

      const backupsDir = resolve(process.env.BACKUP_DIR ?? 'backups');
      mkdirSync(backupsDir, { recursive: true });
      const safetyBackup = join(backupsDir, `pre-restore-${timestamp()}.db`);
      await vacuumInto(this.prisma, safetyBackup);

      const dbFile = databaseFilePath();
      await this.prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)');
      await this.prisma.$disconnect();
      try {
        for (const suffix of ['-wal', '-shm']) rmSync(dbFile + suffix, { force: true });
        copyFileSync(uploaded, dbFile);
      } finally {
        await this.prisma.onModuleInit(); // reconecta e reaplica os PRAGMAs
      }
      this.logger.log(`Banco restaurado. Cópia anterior: ${safetyBackup}`);
      return { safetyBackup };
    } finally {
      this.restoring = false;
      rmSync(dir, { recursive: true, force: true });
    }
  }

  /** O backup precisa estar íntegro e ter exatamente as migrations deste app. */
  private async assertCompatible(file: string): Promise<void> {
    const candidate = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${file}` }) });
    try {
      const integrity = await candidate.$queryRawUnsafe<{ integrity_check: string }[]>(
        'PRAGMA integrity_check',
      );
      if (integrity[0]?.integrity_check !== 'ok') {
        throw new BadRequestException('O backup está corrompido');
      }
      const [theirs, ours] = await Promise.all([migrations(candidate), migrations(this.prisma)]);
      if (theirs === null) throw new BadRequestException('O arquivo não é um backup do Lifty');
      if (theirs !== ours) {
        throw new BadRequestException(
          'O backup é de outra versão do Lifty. Restaure pelo terminal e rode `pnpm db:migrate`.',
        );
      }
    } finally {
      await candidate.$disconnect();
    }
  }
}

async function migrations(client: PrismaClient): Promise<string | null> {
  try {
    const rows = await client.$queryRawUnsafe<{ migration_name: string }[]>(
      'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name',
    );
    return rows.map((r) => r.migration_name).join(',');
  } catch {
    return null; // sem tabela de migrations: não é um banco do Lifty
  }
}
