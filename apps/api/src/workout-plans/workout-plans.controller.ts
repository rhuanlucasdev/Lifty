import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { idParamSchema, workoutPlanSchema, type WorkoutPlanInput } from '@lifty/shared';
import { WorkoutPlansService } from './workout-plans.service.js';

@Controller('workout-plans')
export class WorkoutPlansController {
  constructor(private readonly plans: WorkoutPlansService) {}

  @Get()
  list() {
    return this.plans.list();
  }

  @Get(':id')
  get(@Param('id', { schema: idParamSchema }) id: number) {
    return this.plans.get(id);
  }

  @Post()
  create(@Body({ schema: workoutPlanSchema }) body: WorkoutPlanInput) {
    return this.plans.create(body);
  }

  @Put(':id')
  update(
    @Param('id', { schema: idParamSchema }) id: number,
    @Body({ schema: workoutPlanSchema }) body: WorkoutPlanInput,
  ) {
    return this.plans.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', { schema: idParamSchema }) id: number) {
    return this.plans.remove(id);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id', { schema: idParamSchema }) id: number) {
    return this.plans.duplicate(id);
  }
}
