import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  addSessionExerciseSchema,
  addSetSchema,
  finishSessionSchema,
  idParamSchema,
  sessionListQuerySchema,
  startSessionSchema,
  updateSetSchema,
  type AddSessionExerciseInput,
  type AddSetInput,
  type FinishSessionInput,
  type SessionListQuery,
  type StartSessionInput,
  type UpdateSetInput,
} from '@lifty/shared';
import { WorkoutSessionsService } from './workout-sessions.service.js';

const id = { schema: idParamSchema };

@Controller('workout-sessions')
export class WorkoutSessionsController {
  constructor(private readonly sessions: WorkoutSessionsService) {}

  @Post('start')
  start(@Body({ schema: startSessionSchema }) body: StartSessionInput) {
    return this.sessions.start(body.planId);
  }

  // Declarada antes de ':id' para não ser capturada pela rota com parâmetro.
  @Get('active')
  active() {
    return this.sessions.active();
  }

  @Get()
  list(@Query({ schema: sessionListQuerySchema }) query: SessionListQuery) {
    return this.sessions.list(query);
  }

  @Get(':id')
  get(@Param('id', id) sessionId: number) {
    return this.sessions.get(sessionId);
  }

  @Post(':id/pause')
  @HttpCode(200)
  pause(@Param('id', id) sessionId: number) {
    return this.sessions.pause(sessionId);
  }

  @Post(':id/resume')
  @HttpCode(200)
  resume(@Param('id', id) sessionId: number) {
    return this.sessions.resume(sessionId);
  }

  @Post(':id/finish')
  @HttpCode(200)
  finish(
    @Param('id', id) sessionId: number,
    @Body({ schema: finishSessionSchema }) body: FinishSessionInput,
  ) {
    return this.sessions.finish(sessionId, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', id) sessionId: number) {
    return this.sessions.remove(sessionId);
  }

  @Post(':id/exercises')
  addExercise(
    @Param('id', id) sessionId: number,
    @Body({ schema: addSessionExerciseSchema }) body: AddSessionExerciseInput,
  ) {
    return this.sessions.addExercise(sessionId, body);
  }

  @Delete(':id/exercises/:sessionExerciseId')
  @HttpCode(204)
  removeExercise(
    @Param('id', id) sessionId: number,
    @Param('sessionExerciseId', id) sessionExerciseId: number,
  ) {
    return this.sessions.removeExercise(sessionId, sessionExerciseId);
  }

  @Post(':id/sets')
  addSet(@Param('id', id) sessionId: number, @Body({ schema: addSetSchema }) body: AddSetInput) {
    return this.sessions.addSet(sessionId, body);
  }

  @Patch(':id/sets/:setId')
  updateSet(
    @Param('id', id) sessionId: number,
    @Param('setId', id) setId: number,
    @Body({ schema: updateSetSchema }) body: UpdateSetInput,
  ) {
    return this.sessions.updateSet(sessionId, setId, body);
  }

  @Delete(':id/sets/:setId')
  @HttpCode(204)
  removeSet(@Param('id', id) sessionId: number, @Param('setId', id) setId: number) {
    return this.sessions.removeSet(sessionId, setId);
  }
}
