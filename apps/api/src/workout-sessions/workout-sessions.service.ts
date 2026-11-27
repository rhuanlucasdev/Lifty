import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  estimateOneRepMax,
  isValidSet,
  toLocalDate,
  type ActiveSessionResponse,
  type AddSessionExerciseInput,
  type AddSetInput,
  type ExerciseBests,
  type FinishSessionInput,
  type FinishSessionResult,
  type PreviousExecution,
  type SessionExerciseSnapshot,
  type SessionListQuery,
  type UpdateSetInput,
  type WorkoutSession,
  type WorkoutSessionSummary,
  type WorkoutSet,
} from '@lifty/shared';
import { ExercisesService } from '../exercises/exercises.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { GamificationService } from '../gamification/gamification.service.js';
import { HistoryService } from '../history/history.service.js';
import { computeRecords } from '../history/records.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { WorkoutPlansService } from '../workout-plans/workout-plans.service.js';
import {
  durationSeconds,
  exerciseSnapshotOf,
  planSnapshotOf,
  sessionInclude,
  statusOf,
  toSet,
  toSummary,
  type SessionRow,
} from './session.mapper.js';

const pendingSets = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ setNumber: i + 1 }));

@Injectable()
export class WorkoutSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly plans: WorkoutPlansService,
    private readonly exercises: ExercisesService,
    private readonly history: HistoryService,
    private readonly gamification: GamificationService,
  ) {}

  // Ciclo de vida ---------------------------------------------------------------

  /** Cria a sessão com snapshots e todas as séries planejadas (pendentes) numa transação. */
  async start(planId: number): Promise<WorkoutSession> {
    const plan = await this.plans.findOwned(planId);
    const active = await this.findInProgress(plan.userId);
    if (active) throw new ConflictException(`Já existe uma sessão em andamento (#${active.id})`);

    const now = new Date();
    try {
      const row = await this.prisma.workoutSession.create({
        data: {
          userId: plan.userId,
          planId: plan.id,
          startedAt: now,
          localDate: toLocalDate(now),
          planSnapshot: { name: plan.name, description: plan.description, color: plan.color },
          exercises: {
            create: plan.exercises.map((item) => ({
              exerciseId: item.exerciseId,
              position: item.position,
              snapshot: {
                name: item.exercise.name,
                primaryMuscle: item.exercise.primaryMuscle,
                equipment: item.exercise.equipment,
                type: item.exercise.type,
                plannedSets: item.sets,
                repMin: item.repMin,
                repMax: item.repMax,
                restSeconds: item.restSeconds,
                notes: item.notes,
              } satisfies Record<keyof SessionExerciseSnapshot, unknown>,
              sets: { create: pendingSets(item.sets) },
            })),
          },
        },
        include: sessionInclude,
      });
      return this.toSession(row);
    } catch (e) {
      // Corrida entre duas requisições: o índice único parcial barra a segunda.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Já existe uma sessão em andamento');
      }
      throw e;
    }
  }

  async active(): Promise<ActiveSessionResponse> {
    const userId = await this.users.localUserId();
    const row = await this.findInProgress(userId);
    return { session: row ? await this.toSession(row) : null };
  }

  async get(id: number): Promise<WorkoutSession> {
    return this.toSession(await this.findOwned(id));
  }

  async list(query: SessionListQuery): Promise<WorkoutSessionSummary[]> {
    const userId = await this.users.localUserId();
    const rows = await this.prisma.workoutSession.findMany({
      where: {
        userId,
        finishedAt: { not: null },
        localDate: { gte: query.from, lte: query.to },
      },
      orderBy: { startedAt: 'desc' },
      include: sessionInclude,
    });
    return rows.map(toSummary);
  }

  async pause(id: number): Promise<WorkoutSession> {
    const row = await this.findOwned(id);
    if (statusOf(row) !== 'active') throw new ConflictException('A sessão não está em andamento');
    await this.prisma.workoutSession.update({ where: { id }, data: { pausedAt: new Date() } });
    return this.get(id);
  }

  async resume(id: number): Promise<WorkoutSession> {
    const row = await this.findOwned(id);
    if (statusOf(row) !== 'paused' || !row.pausedAt) {
      throw new ConflictException('A sessão não está pausada');
    }
    await this.prisma.workoutSession.update({
      where: { id },
      data: { pausedAt: null, pausedSeconds: row.pausedSeconds + this.pausedSince(row.pausedAt) },
    });
    return this.get(id);
  }

  async finish(id: number, input: FinishSessionInput): Promise<FinishSessionResult> {
    const row = await this.findOwned(id);
    if (row.finishedAt) throw new ConflictException('A sessão já foi finalizada');
    if (!row.exercises.some((e) => e.sets.some(isValidSet))) {
      throw new BadRequestException('Conclua ao menos uma série ou cancele a sessão');
    }

    const finished = await this.prisma.workoutSession.update({
      where: { id },
      data: {
        finishedAt: new Date(),
        pausedAt: null,
        pausedSeconds: row.pausedSeconds + (row.pausedAt ? this.pausedSince(row.pausedAt) : 0),
        notes: input.notes,
      },
      include: sessionInclude,
    });

    // Gamificação derivada (D4): compara o estado com e sem esta sessão.
    const [before, after] = await Promise.all([
      this.history.load(row.userId, { excludeSessionId: id }),
      this.history.load(row.userId),
    ]);
    const [stateBefore, stateAfter] = await Promise.all([
      this.gamification.stateFor(row.userId, before),
      this.gamification.stateFor(row.userId, after),
    ]);
    const unlockedBefore = new Set(
      stateBefore.achievements.filter((a) => a.unlockedOn).map((a) => a.id),
    );

    return {
      summary: toSummary(finished),
      records: computeRecords(after).events.filter((e) => e.sessionId === id),
      xpGained: stateAfter.progress.totalXp - stateBefore.progress.totalXp,
      levelBefore: stateBefore.progress.level,
      levelAfter: stateAfter.progress.level,
      newAchievements: stateAfter.achievements.filter(
        (a) => a.unlockedOn && !unlockedBefore.has(a.id),
      ),
    };
  }

  /** Cancelar (sessão em andamento) ou excluir (do histórico). D8: sem status "cancelada". */
  async remove(id: number): Promise<void> {
    await this.findOwned(id);
    await this.prisma.workoutSession.delete({ where: { id } });
  }

  // Exercícios da sessão -----------------------------------------------------------

  async addExercise(id: number, input: AddSessionExerciseInput): Promise<WorkoutSession> {
    const session = await this.findOwned(id);
    const exercise = await this.exercises.findVisible(input.exerciseId);
    if (exercise.archivedAt) throw new BadRequestException('Exercício arquivado');

    await this.prisma.workoutSessionExercise.create({
      data: {
        sessionId: id,
        exerciseId: exercise.id,
        position: Math.max(-1, ...session.exercises.map((e) => e.position)) + 1,
        snapshot: {
          name: exercise.name,
          primaryMuscle: exercise.primaryMuscle,
          equipment: exercise.equipment,
          type: exercise.type,
          plannedSets: input.sets,
          repMin: null,
          repMax: null,
          restSeconds: null,
          notes: '',
        } satisfies Record<keyof SessionExerciseSnapshot, unknown>,
        sets: { create: pendingSets(input.sets) },
      },
    });
    return this.get(id);
  }

  async removeExercise(id: number, sessionExerciseId: number): Promise<void> {
    const session = await this.findOwned(id);
    if (!session.exercises.some((e) => e.id === sessionExerciseId)) {
      throw new NotFoundException('Exercício não encontrado nesta sessão');
    }
    await this.prisma.workoutSessionExercise.delete({ where: { id: sessionExerciseId } });
  }

  // Séries ------------------------------------------------------------------------

  async addSet(id: number, input: AddSetInput): Promise<WorkoutSet> {
    const session = await this.findOwned(id);
    const exercise = session.exercises.find((e) => e.id === input.sessionExerciseId);
    if (!exercise) throw new NotFoundException('Exercício não encontrado nesta sessão');

    const { sessionExerciseId, ...values } = input;
    const row = await this.prisma.workoutSet.create({
      data: {
        ...values,
        sessionExerciseId,
        setNumber: Math.max(0, ...exercise.sets.map((s) => s.setNumber)) + 1,
      },
    });
    return toSet(row);
  }

  /** Salvo a cada alteração, inclusive em sessões finalizadas (correções). */
  async updateSet(id: number, setId: number, input: UpdateSetInput): Promise<WorkoutSet> {
    const set = await this.findSet(id, setId);
    const { completed, ...values } = input;
    const completedAt =
      completed === undefined ? undefined : completed ? (set.completedAt ?? new Date()) : null;
    const row = await this.prisma.workoutSet.update({
      where: { id: setId },
      data: { ...values, completedAt },
    });
    return toSet(row);
  }

  /** Remove a série e renumera as seguintes, numa transação. */
  async removeSet(id: number, setId: number): Promise<void> {
    const set = await this.findSet(id, setId);
    await this.prisma.$transaction([
      this.prisma.workoutSet.delete({ where: { id: setId } }),
      this.prisma.workoutSet.updateMany({
        where: { sessionExerciseId: set.sessionExerciseId, setNumber: { gt: set.setNumber } },
        data: { setNumber: { decrement: 1 } },
      }),
    ]);
  }

  // Auxiliares --------------------------------------------------------------------

  private findInProgress(userId: number): Promise<SessionRow | null> {
    return this.prisma.workoutSession.findFirst({
      where: { userId, finishedAt: null },
      include: sessionInclude,
    });
  }

  private async findOwned(id: number): Promise<SessionRow> {
    const userId = await this.users.localUserId();
    const row = await this.prisma.workoutSession.findFirst({
      where: { id, userId },
      include: sessionInclude,
    });
    if (!row) throw new NotFoundException('Sessão não encontrada');
    return row;
  }

  private async findSet(id: number, setId: number) {
    const session = await this.findOwned(id);
    const set = session.exercises.flatMap((e) => e.sets).find((s) => s.id === setId);
    if (!set) throw new NotFoundException('Série não encontrada nesta sessão');
    return set;
  }

  private pausedSince(pausedAt: Date): number {
    return Math.max(0, Math.round((Date.now() - pausedAt.getTime()) / 1000));
  }

  private async toSession(row: SessionRow): Promise<WorkoutSession> {
    const context = await this.priorContext(row);
    return {
      id: row.id,
      planId: row.planId,
      plan: planSnapshotOf(row),
      status: statusOf(row),
      startedAt: row.startedAt.toISOString(),
      pausedAt: row.pausedAt?.toISOString() ?? null,
      pausedSeconds: row.pausedSeconds,
      finishedAt: row.finishedAt?.toISOString() ?? null,
      durationSeconds: durationSeconds(row),
      localDate: row.localDate,
      notes: row.notes,
      exercises: row.exercises.map((e) => ({
        id: e.id,
        exerciseId: e.exerciseId,
        position: e.position,
        snapshot: exerciseSnapshotOf(e),
        sets: e.sets.map(toSet),
        previous: context.get(e.exerciseId)?.previous ?? null,
        bestsBefore: context.get(e.exerciseId)?.bests ?? {
          maxLoadKg: null,
          maxReps: null,
          bestEstimated1RmKg: null,
        },
      })),
    };
  }

  /**
   * Para cada exercício da sessão: a última execução anterior (referência) e as
   * melhores marcas antes desta sessão (feedback de superação).
   */
  private async priorContext(
    row: SessionRow,
  ): Promise<Map<number, { previous: PreviousExecution | null; bests: ExerciseBests }>> {
    const prior = await this.prisma.workoutSessionExercise.findMany({
      where: {
        exerciseId: { in: row.exercises.map((e) => e.exerciseId) },
        session: { userId: row.userId, finishedAt: { not: null }, startedAt: { lt: row.startedAt } },
      },
      include: {
        session: { select: { id: true, localDate: true } },
        sets: { orderBy: { setNumber: 'asc' } },
      },
      orderBy: [{ session: { startedAt: 'asc' } }, { position: 'asc' }],
    });

    const result = new Map<number, { previous: PreviousExecution | null; bests: ExerciseBests }>();
    for (const item of prior) {
      const sets = item.sets.filter(isValidSet);
      if (!sets.length) continue;
      const entry = result.get(item.exerciseId) ?? {
        previous: null,
        bests: { maxLoadKg: null, maxReps: null, bestEstimated1RmKg: null },
      };
      entry.previous = {
        sessionId: item.session.id,
        localDate: item.session.localDate,
        sets: sets.map(({ setNumber, loadKg, reps }) => ({ setNumber, loadKg, reps })),
      };
      const max = (a: number | null, b: number | null) =>
        b === null || b <= 0 ? a : a === null ? b : Math.max(a, b);
      for (const s of sets) {
        entry.bests.maxLoadKg = max(entry.bests.maxLoadKg, s.loadKg);
        entry.bests.maxReps = max(entry.bests.maxReps, s.reps);
        entry.bests.bestEstimated1RmKg = max(entry.bests.bestEstimated1RmKg, estimateOneRepMax(s));
      }
      result.set(item.exerciseId, entry);
    }
    return result;
  }
}
