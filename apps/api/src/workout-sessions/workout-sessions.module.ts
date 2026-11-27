import { Module } from '@nestjs/common';
import { ExercisesModule } from '../exercises/exercises.module.js';
import { GamificationModule } from '../gamification/gamification.module.js';
import { UsersModule } from '../users/users.module.js';
import { WorkoutPlansModule } from '../workout-plans/workout-plans.module.js';
import { WorkoutSessionsController } from './workout-sessions.controller.js';
import { WorkoutSessionsService } from './workout-sessions.service.js';

@Module({
  imports: [UsersModule, ExercisesModule, WorkoutPlansModule, GamificationModule],
  controllers: [WorkoutSessionsController],
  providers: [WorkoutSessionsService],
})
export class WorkoutSessionsModule {}
