import type { PersonalRecordEvent, RecordMark } from '@lifty/shared';
import type { HistorySession } from './history.service.js';

export interface ExerciseBestMarks {
  maxLoad: RecordMark | null;
  maxReps: RecordMark | null;
}

/**
 * Recordes reais (carga e repetições) derivados do histórico em ordem cronológica.
 * A primeira execução de um exercício define a linha de base e não conta como recorde.
 * Carga só é considerada quando > 0 (peso corporal sem lastro não gera recorde de carga).
 */
export function computeRecords(sessions: HistorySession[]): {
  events: PersonalRecordEvent[];
  bests: Map<number, ExerciseBestMarks>;
} {
  const events: PersonalRecordEvent[] = [];
  const bests = new Map<number, ExerciseBestMarks>();

  for (const session of sessions) {
    for (const ex of session.exercises) {
      if (!ex.sets.length) continue;
      const best = bests.get(ex.exerciseId) ?? { maxLoad: null, maxReps: null };
      const mark = (value: number): RecordMark => ({
        value,
        localDate: session.localDate,
        sessionId: session.id,
      });

      const load = Math.max(0, ...ex.sets.map((s) => s.loadKg ?? 0));
      const reps = Math.max(0, ...ex.sets.map((s) => s.reps ?? 0));

      for (const [type, value, key] of [
        ['load', load, 'maxLoad'],
        ['reps', reps, 'maxReps'],
      ] as const) {
        if (value <= 0) continue;
        const previous = best[key];
        if (previous && value > previous.value) {
          events.push({
            exerciseId: ex.exerciseId,
            exerciseName: ex.name,
            type,
            value,
            previous: previous.value,
            sessionId: session.id,
            localDate: session.localDate,
          });
        }
        if (!previous || value > previous.value) best[key] = mark(value);
      }
      bests.set(ex.exerciseId, best);
    }
  }
  return { events, bests };
}
