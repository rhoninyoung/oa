import { Module, Global } from '@nestjs/common';
import { OutboxService } from './outbox.service.js';

@Global()
@Module({
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}
