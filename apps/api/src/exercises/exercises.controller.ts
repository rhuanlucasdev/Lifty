import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import {
  exerciseQuerySchema,
  exerciseSchema,
  idParamSchema,
  type ExerciseInput,
  type ExerciseQuery,
} from '@lifty/shared';
import { ExercisesService } from './exercises.service.js';

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get()
  list(@Query({ schema: exerciseQuerySchema }) query: ExerciseQuery) {
    return this.exercises.list(query);
  }

  @Get(':id')
  get(@Param('id', { schema: idParamSchema }) id: number) {
    return this.exercises.get(id);
  }

  @Post()
  create(@Body({ schema: exerciseSchema }) body: ExerciseInput) {
    return this.exercises.create(body);
  }

  @Put(':id')
  update(
    @Param('id', { schema: idParamSchema }) id: number,
    @Body({ schema: exerciseSchema }) body: ExerciseInput,
  ) {
    return this.exercises.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', { schema: idParamSchema }) id: number) {
    return this.exercises.remove(id);
  }
}
