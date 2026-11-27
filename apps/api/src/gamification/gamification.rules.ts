import {
  addDays,
  setVolume,
  weekStart,
  type Achievement,
  type LevelProgress,
  type PersonalRecordEvent,
  type StreakInfo,
} from '@lifty/shared';
import type { HistorySession } from '../history/history.service.js';

// Regras de gamificação (D3, D4): tudo derivado do histórico, nada persistido.

export const XP = {
  set: 5,
  workout: 50,
  record: 25,
  consistentWeek: 100,
} as const;

/** XP para sair do nível `level` e chegar ao próximo: 200, 300, 400... */
export const xpToNextLevel = (level: number) => 200 + 100 * (level - 1);

export function levelFromXp(totalXp: number): LevelProgress {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpToNextLevel(level)) {
    remaining -= xpToNextLevel(level);
    level++;
  }
  return { level, totalXp, xpIntoLevel: remaining, xpForNextLevel: xpToNextLevel(level) };
}

interface WeekCompletion {
  week: string;
  /** Data do treino que atingiu a meta da semana. */
  reachedOn: string;
  /** Semanas consecutivas com meta atingida, incluindo esta. */
  run: number;
}

/** Streak semanal: semanas consecutivas atingindo a meta de treinos (D3). */
export function computeStreak(
  localDates: string[],
  weeklyGoal: number,
  today: string,
): StreakInfo & { completions: WeekCompletion[] } {
  const perWeek = new Map<string, string[]>();
  for (const date of [...localDates].sort()) {
    const week = weekStart(date);
    perWeek.set(week, [...(perWeek.get(week) ?? []), date]);
  }

  const completions: WeekCompletion[] = [];
  let previous: WeekCompletion | undefined;
  for (const [week, dates] of [...perWeek].sort(([a], [b]) => a.localeCompare(b))) {
    if (dates.length < weeklyGoal) continue;
    const run = previous && addDays(previous.week, 7) === week ? previous.run + 1 : 1;
    previous = { week, reachedOn: dates[weeklyGoal - 1]!, run };
    completions.push(previous);
  }

  // A semana atual, ainda em andamento, não quebra a sequência.
  const thisWeek = weekStart(today);
  const last = completions.at(-1);
  const currentWeeks =
    last && (last.week === thisWeek || last.week === addDays(thisWeek, -7)) ? last.run : 0;

  return {
    weeklyGoal,
    workoutsThisWeek: perWeek.get(thisWeek)?.length ?? 0,
    currentWeeks,
    bestWeeks: Math.max(0, ...completions.map((c) => c.run)),
    trainedDays: new Set(localDates).size,
    completions,
  };
}

type AchievementDef = Omit<Achievement, 'unlockedOn'>;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_workout', title: 'Primeiro treino', description: 'Concluiu o primeiro treino.' },
  { id: 'workouts_10', title: '10 treinos', description: 'Concluiu 10 treinos.' },
  { id: 'workouts_50', title: '50 treinos', description: 'Concluiu 50 treinos.' },
  { id: 'workouts_100', title: '100 treinos', description: 'Concluiu 100 treinos.' },
  {
    id: 'first_record',
    title: 'Primeiro recorde',
    description: 'Superou uma marca pessoal pela primeira vez.',
  },
  {
    id: 'streak_4',
    title: '4 semanas consistentes',
    description: 'Atingiu a meta semanal por 4 semanas seguidas.',
  },
  {
    id: 'streak_12',
    title: '12 semanas consistentes',
    description: 'Atingiu a meta semanal por 12 semanas seguidas.',
  },
  {
    id: 'streak_26',
    title: '26 semanas consistentes',
    description: 'Atingiu a meta semanal por 26 semanas seguidas.',
  },
  {
    id: 'load_100',
    title: 'Clube dos 100 kg',
    description: 'Completou uma série de trabalho com 100 kg ou mais.',
  },
];

const WORKOUT_MILESTONES: [number, string][] = [
  [1, 'first_workout'],
  [10, 'workouts_10'],
  [50, 'workouts_50'],
  [100, 'workouts_100'],
];
const STREAK_MILESTONES: [number, string][] = [
  [4, 'streak_4'],
  [12, 'streak_12'],
  [26, 'streak_26'],
];

export interface GamificationState {
  progress: LevelProgress;
  streak: StreakInfo;
  achievements: Achievement[];
}

export function computeGamification(
  sessions: HistorySession[],
  recordEvents: PersonalRecordEvent[],
  weeklyGoal: number,
  today: string,
): GamificationState {
  const { completions, ...streak } = computeStreak(
    sessions.map((s) => s.localDate),
    weeklyGoal,
    today,
  );

  const unlocked = new Map<string, string>();
  const unlock = (id: string, on: string) => {
    if (!unlocked.has(id)) unlocked.set(id, on);
  };

  let completedSets = 0;
  sessions.forEach((session, index) => {
    for (const [count, id] of WORKOUT_MILESTONES) {
      if (index + 1 >= count) unlock(id, session.localDate);
    }
    for (const ex of session.exercises) {
      completedSets += ex.sets.length;
      if (ex.sets.some((s) => (s.loadKg ?? 0) >= 100)) unlock('load_100', session.localDate);
    }
  });
  if (recordEvents[0]) unlock('first_record', recordEvents[0].localDate);
  for (const c of completions) {
    for (const [weeks, id] of STREAK_MILESTONES) {
      if (c.run >= weeks) unlock(id, c.reachedOn);
    }
  }

  const totalXp =
    completedSets * XP.set +
    sessions.length * XP.workout +
    recordEvents.length * XP.record +
    completions.length * XP.consistentWeek;

  return {
    progress: levelFromXp(totalXp),
    streak,
    achievements: ACHIEVEMENTS.map((a) => ({ ...a, unlockedOn: unlocked.get(a.id) ?? null })),
  };
}

/** Volume total das séries válidas de uma sessão do histórico. */
export function sessionVolume(session: HistorySession): number {
  return session.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + setVolume(set), 0),
    0,
  );
}
