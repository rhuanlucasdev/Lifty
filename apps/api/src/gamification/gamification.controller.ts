import { Controller, Get } from '@nestjs/common';
import { GamificationService } from './gamification.service.js';

@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @Get('progress')
  progress() {
    return this.gamification.progress();
  }
}
