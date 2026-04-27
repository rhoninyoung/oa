import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service.js';

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  async emit(scheduleId: string, type: string, payload: Record<string, unknown>): Promise<void> {
    const key = `${type}|${scheduleId}|${Date.now()}`;
    await this.prisma.notificationOutbox.upsert({
      where: { idempotencyKey: key },
      create: { idempotencyKey: key, type, payload: payload as Prisma.InputJsonValue },
      update: { payload: payload as Prisma.InputJsonValue, dispatchedAt: null },
    });
    console.log('[Outbox] Emitted:', { type, scheduleId, payload });
  }

  async dispatchAll(): Promise<void> {
    const pending = await this.prisma.notificationOutbox.findMany({
      where: { dispatchedAt: null },
    });
    for (const entry of pending) {
      console.log('[Outbox] Dispatching:', entry.type, entry.payload);
      await this.prisma.notificationOutbox.update({
        where: { id: entry.id },
        data: { dispatchedAt: new Date() },
      });
    }
  }
}
