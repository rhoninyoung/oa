import { Module } from '@nestjs/common';
import { MasterController } from './master.controller.js';
import { MasterService } from './master.service.js';
import { PrismaService } from '../prisma.service.js';
import { OutboxModule } from '../outbox/outbox.module.js';

@Module({
  imports: [OutboxModule],
  controllers: [MasterController],
  providers: [MasterService, PrismaService],
  exports: [MasterService],
})
export class MasterModule {}
