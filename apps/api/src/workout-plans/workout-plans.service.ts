import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { WorkoutPlan, WorkoutPlanInput } from '@lifty/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { toExerciseRef } from '../exercises/exercise.mapper.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';

const planInclude = {
  exercises: { orderBy: { position: 'asc' }, include: { exercise: true } },
} satisfies Prisma.WorkoutPlanInclude;

type PlanRow = Prisma.WorkoutPlanGetPayload<{ include: typeof planInclude }>;

function toPlan(row: PlanRow): WorkoutPlan {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    updatedAt: row.updatedAt.toISOString(),
    exercises: row.exercises.map((item) => ({
      id: item.id,
      position: item.position,
      exercise: toExerciseRef(item.exercise),
      sets: item.sets,
      repMin: item.repMin,
      repMax: item.repMax,
      restSeconds: item.restSeconds,
      notes: item.notes,
    })),
  };
}

function itemsData(exercises: WorkoutPlanInput['exercises']) {
  return exercises.map((e, position) => ({ ...e, position }));
}

@Injectable()
export class WorkoutPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async list(): Promise<WorkoutPlan[]> {
    const userId = await this.users.localUserId();
    const rows = await this.prisma.workoutPlan.findMany({
      where: { userId },
      include: planInclude,
      orderBy: { name: 'asc' },
    });
    return rows.map(toPlan);
  }

  async get(id: number): Promise<WorkoutPlan> {
    return toPlan(await this.findOwned(id));
  }

  async create(input: WorkoutPlanInput): Promise<WorkoutPlan> {
    const userId = await this.users.localUserId();
    await this.assertExercisesUsable(input.exercises.map((e) => e.exerciseId), userId);
    const { exercises, ...plan } = input;
    const row = await this.prisma.workoutPlan.create({
      data: { ...plan, userId, exercises: { create: itemsData(exercises) } },
      include: planInclude,
    });
    return toPlan(row);
  }

  /** Substitui a ficha inteira (dados, exercícios e ordem) numa transação. */
  async update(id: number, input: WorkoutPlanInput): Promise<WorkoutPlan> {
    const current = await this.findOwned(id);
    // Exercícios que já estavam na ficha continuam aceitos mesmo se arquivados.
    const kept = new Set(current.exercises.map((e) => e.exerciseId));
    await this.assertExercisesUsable(
      input.exercises.map((e) => e.exerciseId).filter((exerciseId) => !kept.has(exerciseId)),
      current.userId,
    );
    const { exercises, ...plan } = input;
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.workoutPlanExercise.deleteMany({ where: { planId: id } });
      return tx.workoutPlan.update({
        where: { id },
        data: { ...plan, exercises: { create: itemsData(exercises) } },
        include: planInclude,
      });
    });
    return toPlan(row);
  }

  /** Sessões já realizadas mantêm o snapshot; a referência à ficha vira nula. */
  async remove(id: number): Promise<void> {
    await this.findOwned(id);
    await this.prisma.workoutPlan.delete({ where: { id } });
  }

  async duplicate(id: number): Promise<WorkoutPlan> {
    const source = await this.findOwned(id);
    const row = await this.prisma.workoutPlan.create({
      data: {
        userId: source.userId,
        name: `${source.name} (cópia)`.slice(0, 60),
        description: source.description,
        color: source.color,
        exercises: {
          create: source.exercises.map(({ exerciseId, position, sets, repMin, repMax, restSeconds, notes }) => ({
            exerciseId, position, sets, repMin, repMax, restSeconds, notes,
          })),
        },
      },
      include: planInclude,
    });
    return toPlan(row);
  }

  async findOwned(id: number): Promise<PlanRow> {
    const userId = await this.users.localUserId();
    const row = await this.prisma.workoutPlan.findFirst({ where: { id, userId }, include: planInclude });
    if (!row) throw new NotFoundException('Ficha não encontrada');
    return row;
  }

  private async assertExercisesUsable(ids: number[], userId: number): Promise<void> {
    const unique = [...new Set(ids)];
    if (!unique.length) return;
    const found = await this.prisma.exercise.count({
      where: { id: { in: unique }, archivedAt: null, OR: [{ userId: null }, { userId }] },
    });
    if (found !== unique.length) throw new BadRequestException('Exercício inválido ou arquivado na ficha');
  }
}
