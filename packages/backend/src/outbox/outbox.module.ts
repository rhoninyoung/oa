import { Module, Global } from '@nestjs/common';
import { OutboxService } from './outbox.service.js';
import { PrismaService } from '../prisma.service.js';

@Global()
@Module({
  providers: [OutboxService, PrismaService],
  exports: [OutboxService],
})
export class OutboxModule {}
