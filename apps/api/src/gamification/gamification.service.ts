import { Injectable } from '@nestjs/common';
import { toLocalDate, type GamificationProgress } from '@lifty/shared';
import { HistoryService, type HistorySession } from '../history/history.service.js';
import { computeRecords } from '../history/records.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { computeGamification, type GamificationState } from './gamification.rules.js';

@Injectable()
export class GamificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly history: HistoryService,
  ) {}

  async progress(): Promise<GamificationProgress> {
    const userId = await this.users.localUserId();
    const state = await this.stateFor(userId, await this.history.load(userId));
    return { ...state.progress, streak: state.streak, achievements: state.achievements };
  }

  /** Estado de gamificação para um histórico já carregado. */
  async stateFor(userId: number, sessions: HistorySession[]): Promise<GamificationState> {
    const { weeklyGoal } = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { weeklyGoal: true },
    });
    const { events } = computeRecords(sessions);
    return computeGamification(sessions, events, weeklyGoal, toLocalDate(new Date()));
  }
}
