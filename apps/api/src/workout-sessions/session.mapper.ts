import {
  setVolume,
  isValidSet,
  type PlanSnapshot,
  type SessionExerciseSnapshot,
  type SessionStatus,
  type WorkoutSessionSummary,
  type WorkoutSet,
} from '@lifty/shared';
import type { Prisma, WorkoutSet as SetRow } from '../generated/prisma/client.js';

export const sessionInclude = {
  exercises: {
    orderBy: { position: 'asc' },
    include: { sets: { orderBy: { setNumber: 'asc' } } },
  },
} satisfies Prisma.WorkoutSessionInclude;

export type SessionRow = Prisma.WorkoutSessionGetPayload<{ include: typeof sessionInclude }>;

// Snapshots JSON são gravados apenas por este módulo com os tipos de @lifty/shared.
export const planSnapshotOf = (row: { planSnapshot: Prisma.JsonValue }) =>
  row.planSnapshot as unknown as PlanSnapshot;
export const exerciseSnapshotOf = (row: { snapshot: Prisma.JsonValue }) =>
  row.snapshot as unknown as SessionExerciseSnapshot;

export function statusOf(row: { finishedAt: Date | null; pausedAt: Date | null }): SessionStatus {
  if (row.finishedAt) return 'finished';
  return row.pausedAt ? 'paused' : 'active';
}

const seconds = (from: Date, to: Date) => Math.max(0, Math.round((to.getTime() - from.getTime()) / 1000));

/** Tempo efetivo de treino: do início até o fim (ou agora), descontando pausas. */
export function durationSeconds(
  row: { startedAt: Date; finishedAt: Date | null; pausedAt: Date | null; pausedSeconds: number },
  now = new Date(),
): number {
  const end = row.finishedAt ?? row.pausedAt ?? now;
  return Math.max(0, seconds(row.startedAt, end) - row.pausedSeconds);
}

export function toSet(row: SetRow): WorkoutSet {
  return {
    id: row.id,
    setNumber: row.setNumber,
    loadKg: row.loadKg,
    reps: row.reps,
    rpe: row.rpe,
    isWarmup: row.isWarmup,
    notes: row.notes,
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export function toSummary(row: SessionRow): WorkoutSessionSummary {
  const validSets = row.exercises.flatMap((e) => e.sets.filter(isValidSet));
  return {
    id: row.id,
    plan: planSnapshotOf(row),
    startedAt: row.startedAt.toISOString(),
    finishedAt: (row.finishedAt ?? new Date()).toISOString(),
    localDate: row.localDate,
    durationSeconds: durationSeconds(row),
    exerciseCount: row.exercises.length,
    completedSets: validSets.length,
    totalVolumeKg: validSets.reduce((sum, s) => sum + setVolume(s), 0),
  };
}
