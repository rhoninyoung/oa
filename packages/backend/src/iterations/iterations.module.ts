import { Module } from '@nestjs/common';
import { IterationsController } from './iterations.controller.js';
import { SchedulesModule } from '../schedules/schedules.module.js';

@Module({
  imports: [SchedulesModule],
  controllers: [IterationsController],
})
export class IterationsModule {}
