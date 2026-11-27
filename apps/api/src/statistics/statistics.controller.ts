import { Controller, Get, Param, Query } from '@nestjs/common';
import { idParamSchema, statRangeQuerySchema, type StatRangeQuery } from '@lifty/shared';
import { StatisticsService } from './statistics.service.js';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statistics: StatisticsService) {}

  @Get('dashboard')
  dashboard() {
    return this.statistics.dashboard();
  }

  @Get('exercises/:id')
  exercise(
    @Param('id', { schema: idParamSchema }) id: number,
    @Query({ schema: statRangeQuerySchema }) query: StatRangeQuery,
  ) {
    return this.statistics.exercise(id, query.range);
  }
}
