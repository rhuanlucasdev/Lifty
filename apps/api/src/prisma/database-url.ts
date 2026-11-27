/** Caminho relativo a apps/api (cwd dos scripts pnpm). Função: lida após o carregamento do .env. */
export function databaseUrl(): string {
  return process.env.DATABASE_URL ?? 'file:./data/lifty.db';
}
