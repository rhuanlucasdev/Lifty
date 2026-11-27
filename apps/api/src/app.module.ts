import { Module } from '@nestjs/common';
import { BackupModule } from './backup/backup.module.js';
import { ExercisesModule } from './exercises/exercises.module.js';
import { GamificationModule } from './gamification/gamification.module.js';
import { HealthController } from './health/health.controller.js';
import { HistoryModule } from './history/history.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StatisticsModule } from './statistics/statistics.module.js';
import { UsersModule } from './users/users.module.js';
import { WorkoutPlansModule } from './workout-plans/workout-plans.module.js';
import { WorkoutSessionsModule } from './workout-sessions/workout-sessions.module.js';

@Module({
  imports: [
    PrismaModule,
    HistoryModule,
    UsersModule,
    ExercisesModule,
    WorkoutPlansModule,
    WorkoutSessionsModule,
    StatisticsModule,
    GamificationModule,
    BackupModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
