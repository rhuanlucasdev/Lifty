export interface SetValues {
  loadKg: number | null;
  reps: number | null;
}

/** Série válida para estatísticas: concluída, não aquecimento, com repetições (D7). */
export function isValidSet(set: {
  completedAt: Date | string | null;
  isWarmup: boolean;
  reps: number | null;
}): boolean {
  return set.completedAt !== null && !set.isWarmup && (set.reps ?? 0) > 0;
}

/** volume = carga × repetições. Sem carga (peso corporal) o volume é 0. */
export function setVolume({ loadKg, reps }: SetValues): number {
  return (loadKg ?? 0) * (reps ?? 0);
}

/**
 * 1RM estimado pela fórmula de Epley: carga × (1 + reps / 30).
 * Com 1 repetição a estimativa é a própria carga. Calculado sob demanda, nunca persistido.
 */
export function estimateOneRepMax({ loadKg, reps }: SetValues): number | null {
  if (!loadKg || !reps || loadKg <= 0 || reps <= 0) return null;
  if (reps === 1) return loadKg;
  return round1(loadKg * (1 + reps / 30));
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
