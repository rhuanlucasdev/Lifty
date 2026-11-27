import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { GamificationController } from './gamification.controller.js';
import { GamificationService } from './gamification.service.js';

@Module({
  imports: [UsersModule],
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
