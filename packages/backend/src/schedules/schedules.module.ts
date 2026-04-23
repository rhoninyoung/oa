import { Module } from '@nestjs/common';
import { SchedulesController } from './schedules.controller.js';
import { SchedulesService } from './schedules.service.js';
import { PrismaService } from '../prisma.service.js';
import { OutboxModule } from '../outbox/outbox.module.js';

@Module({
  imports: [OutboxModule],
  controllers: [SchedulesController],
  providers: [SchedulesService, PrismaService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
