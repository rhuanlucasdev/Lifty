import { Injectable } from '@nestjs/common';
import { isValidSet, type ExerciseType, type SetValues } from '@lifty/shared';
import { PrismaService } from '../prisma/prisma.service.js';

export interface HistoryExercise {
  exerciseId: number;
  name: string;
  type: ExerciseType;
  /** Somente séries válidas (concluídas, sem aquecimento, com reps). */
  sets: SetValues[];
}

export interface HistorySession {
  id: number;
  localDate: string;
  finishedAt: Date;
  exercises: HistoryExercise[];
}

/**
 * Carrega o histórico de sessões finalizadas, base de todos os dados derivados
 * (recordes, XP, conquistas, streak). Ver D4.
 */
@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ponytail: carrega todo o histórico a cada chamada (~20 mil séries em anos de uso,
  // milissegundos no SQLite). Se ficar lento, cachear por usuário e invalidar na escrita.
  async load(userId: number, options: { excludeSessionId?: number } = {}): Promise<HistorySession[]> {
    const rows = await this.prisma.workoutSession.findMany({
      where: {
        userId,
        finishedAt: { not: null },
        id: options.excludeSessionId ? { not: options.excludeSessionId } : undefined,
      },
      orderBy: [{ finishedAt: 'asc' }, { id: 'asc' }],
      include: {
        exercises: {
          orderBy: { position: 'asc' },
          include: { exercise: true, sets: { orderBy: { setNumber: 'asc' } } },
        },
      },
    });

    return rows.map((s) => ({
      id: s.id,
      localDate: s.localDate,
      finishedAt: s.finishedAt!, // filtrado acima
      exercises: s.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        // Nome e tipo atuais do exercício: o histórico de evolução segue o exercício,
        // o snapshot preserva o que foi exibido na sessão.
        name: e.exercise.name,
        type: e.exercise.type as ExerciseType,
        sets: e.sets.filter(isValidSet).map(({ loadKg, reps }) => ({ loadKg, reps })),
      })),
    }));
  }
}
