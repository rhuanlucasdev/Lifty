import { Injectable } from '@nestjs/common';
import {
  addDays,
  estimateOneRepMax,
  round1,
  setVolume,
  toLocalDate,
  type DashboardStats,
  type ExerciseSessionPoint,
  type ExerciseStatistics,
  type RecordMark,
  type StatRange,
} from '@lifty/shared';
import { toExerciseRef } from '../exercises/exercise.mapper.js';
import { ExercisesService } from '../exercises/exercises.service.js';
import { sessionVolume } from '../gamification/gamification.rules.js';
import { GamificationService } from '../gamification/gamification.service.js';
import { HistoryService } from '../history/history.service.js';
import { computeRecords } from '../history/records.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { sessionInclude, toSummary } from '../workout-sessions/session.mapper.js';

const RANGE_DAYS: Record<StatRange, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '6m': 182,
  '1y': 365,
  all: null,
};

@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly exercises: ExercisesService,
    private readonly history: HistoryService,
    private readonly gamification: GamificationService,
  ) {}

  async dashboard(): Promise<DashboardStats> {
    const userId = await this.users.localUserId();
    const sessions = await this.history.load(userId);
    const state = await this.gamification.stateFor(userId, sessions);
    const since = addDays(toLocalDate(new Date()), -29);

    const recent = await this.prisma.workoutSession.findMany({
      where: { userId, finishedAt: { not: null } },
      orderBy: { startedAt: 'desc' },
      take: 5,
      include: sessionInclude,
    });

    return {
      progress: state.progress,
      streak: state.streak,
      totalWorkouts: sessions.length,
      volumeLast30DaysKg: sessions
        .filter((s) => s.localDate >= since)
        .reduce((sum, s) => sum + sessionVolume(s), 0),
      recentSessions: recent.map(toSummary),
      recentRecords: computeRecords(sessions).events.slice(-5).reverse(),
    };
  }

  async exercise(exerciseId: number, range: StatRange): Promise<ExerciseStatistics> {
    const exercise = toExerciseRef(await this.exercises.findVisible(exerciseId));
    const userId = await this.users.localUserId();
    const sessions = await this.history.load(userId);
    const { events, bests } = computeRecords(sessions);

    // Pontos de todo o histórico; o período filtra apenas o gráfico e a variação.
    const allPoints: ExerciseSessionPoint[] = sessions.flatMap((session) =>
      session.exercises
        .filter((e) => e.exerciseId === exerciseId && e.sets.length)
        .map((e) => {
          const loads = e.sets.map((s) => s.loadKg ?? 0);
          const reps = e.sets.map((s) => s.reps ?? 0);
          const oneRms = e.sets.map(estimateOneRepMax).filter((v): v is number => v !== null);
          return {
            sessionId: session.id,
            localDate: session.localDate,
            maxLoadKg: Math.max(...loads) > 0 ? Math.max(...loads) : null,
            maxReps: Math.max(...reps),
            totalReps: reps.reduce((a, b) => a + b, 0),
            volumeKg: e.sets.reduce((sum, s) => sum + setVolume(s), 0),
            estimated1RmKg: oneRms.length ? Math.max(...oneRms) : null,
          };
        }),
    );

    const days = RANGE_DAYS[range];
    const from = days === null ? null : addDays(toLocalDate(new Date()), -(days - 1));
    const points = from === null ? allPoints : allPoints.filter((p) => p.localDate >= from);

    let bestEstimated1Rm: RecordMark | null = null;
    for (const p of allPoints) {
      if (p.estimated1RmKg !== null && p.estimated1RmKg > (bestEstimated1Rm?.value ?? 0)) {
        bestEstimated1Rm = { value: p.estimated1RmKg, localDate: p.localDate, sessionId: p.sessionId };
      }
    }

    // Carga máxima para exercícios com carga; repetições máximas para peso corporal.
    const metric = (p: ExerciseSessionPoint) =>
      exercise.type === 'weighted' ? (p.maxLoadKg ?? 0) : p.maxReps;
    const first = points[0];
    const last = points.at(-1);
    const progressPercent =
      points.length >= 2 && first && last && metric(first) > 0
        ? round1(((metric(last) - metric(first)) / metric(first)) * 100)
        : null;

    return {
      exercise,
      points,
      maxLoad: bests.get(exerciseId)?.maxLoad ?? null,
      maxReps: bests.get(exerciseId)?.maxReps ?? null,
      bestEstimated1Rm,
      progressPercent,
      recordHistory: events.filter((e) => e.exerciseId === exerciseId),
    };
  }
}
