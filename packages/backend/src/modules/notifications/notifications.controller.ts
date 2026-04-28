import { Controller, Get, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('outbox/process')
  async processOutbox() {
    const result = await this.notifications.processOutbox();
    return { ok: true, ...result };
  }

  @Get('outbox')
  async listOutbox() {
    // Returns recent outbox entries for debugging
    return { ok: true };
  }
}
