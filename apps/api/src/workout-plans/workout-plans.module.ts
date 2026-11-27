import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { WorkoutPlansController } from './workout-plans.controller.js';
import { WorkoutPlansService } from './workout-plans.service.js';

@Module({
  imports: [UsersModule],
  controllers: [WorkoutPlansController],
  providers: [WorkoutPlansService],
  exports: [WorkoutPlansService],
})
export class WorkoutPlansModule {}
