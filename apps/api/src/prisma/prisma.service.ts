import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';
import { databaseUrl } from './database-url.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: new PrismaBetterSqlite3({ url: databaseUrl() }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();

    //WAL: escrita mais segura contra corrupcao e leituras concorrentes.
    await this.$queryRawUnsafe('PRAGMA journal_mode = WAL');
    await this.$queryRawUnsafe('PRAGMA foreign_keys = ON');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
