import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Exercise, ExerciseInput, ExerciseQuery } from '@lifty/shared';
import type { Exercise as ExerciseRow } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { toExercise } from './exercise.mapper.js';

/** Minúsculas e sem acentos, para busca tolerante ("elevacao" encontra "Elevação"). */
const normalize = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

@Injectable()
export class ExercisesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async list(query: ExerciseQuery): Promise<Exercise[]> {
    const userId = await this.users.localUserId();
    const rows = await this.prisma.exercise.findMany({
      where: {
        archivedAt: null,
        OR: [{ userId: null }, { userId }],
        primaryMuscle: query.muscle,
        equipment: query.equipment,
      },
      orderBy: { name: 'asc' },
    });
    // Filtro em memória: a biblioteca tem centenas de itens no máximo, e o LIKE do
    // SQLite não ignora acentos.
    const term = query.search ? normalize(query.search) : '';
    return rows.filter((r) => !term || normalize(r.name).includes(term)).map(toExercise);
  }

  async get(id: number): Promise<Exercise> {
    return toExercise(await this.findVisible(id));
  }

  async create(input: ExerciseInput): Promise<Exercise> {
    const userId = await this.users.localUserId();
    return toExercise(await this.prisma.exercise.create({ data: { ...input, userId } }));
  }

  async update(id: number, input: ExerciseInput): Promise<Exercise> {
    await this.findCustom(id);
    return toExercise(await this.prisma.exercise.update({ where: { id }, data: input }));
  }

  /** D6: exercício já usado em fichas ou sessões é arquivado; senão é apagado. */
  async remove(id: number): Promise<void> {
    await this.findCustom(id);
    const [inPlans, inSessions] = await Promise.all([
      this.prisma.workoutPlanExercise.count({ where: { exerciseId: id } }),
      this.prisma.workoutSessionExercise.count({ where: { exerciseId: id } }),
    ]);
    if (inPlans || inSessions) {
      await this.prisma.exercise.update({ where: { id }, data: { archivedAt: new Date() } });
    } else {
      await this.prisma.exercise.delete({ where: { id } });
    }
  }

  /** Exercício do sistema ou do usuário local (arquivados incluídos: o histórico os referencia). */
  async findVisible(id: number): Promise<ExerciseRow> {
    const userId = await this.users.localUserId();
    const row = await this.prisma.exercise.findFirst({
      where: { id, OR: [{ userId: null }, { userId }] },
    });
    if (!row) throw new NotFoundException('Exercício não encontrado');
    return row;
  }

  private async findCustom(id: number): Promise<ExerciseRow> {
    const row = await this.findVisible(id);
    if (row.userId === null) {
      throw new ForbiddenException('Exercícios do sistema não podem ser alterados');
    }
    if (row.archivedAt) throw new NotFoundException('Exercício não encontrado');
    return row;
  }
}
