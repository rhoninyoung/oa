import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type { Prisma } from '@prisma/client';

@Injectable()
export class OutboxService {
  constructor(private prisma: PrismaService) {}

  /** Build a stable idempotency key from event context. */
  buildKey(type: string, scheduleId: string, action: string, version: number): string {
    return `${type}|${scheduleId}|${action}|${version}`;
  }

  /** Emit a notification event. */
  async emit(type: string, payload: Record<string, unknown>): Promise<void> {
    const version = (payload['version'] as number) ?? 1;
    const scheduleId = (payload['scheduleId'] as string) ?? '';
    const action = (payload['action'] as string) ?? type;
    const key = this.buildKey(type, scheduleId, action, version);
    // Upsert: keep only the latest undispatched entry per key
    const payloadJson = payload as Prisma.InputJsonValue;
    await this.prisma.notificationOutbox.upsert({
      where: { idempotencyKey: key },
      create: { idempotencyKey: key, type, payload: payloadJson },
      update: { payload: payloadJson, dispatchedAt: null },
    });

    console.log('[Outbox emit]', JSON.stringify({ type, payload, at: new Date().toISOString() }));
  }

  /** Dismiss pending notifications for a given event (e.g. on withdraw). */
  async dismissPendingForEvent(type: string, scheduleId: string): Promise<void> {
    await this.prisma.notificationOutbox.updateMany({
      where: { type, payload: { path: ['scheduleId'], equals: scheduleId }, dispatchedAt: null },
      data: { dispatchedAt: new Date() },
    });
  }

  /** Worker tick: mark dispatched. */
  async dispatchAll(): Promise<void> {
    const pending = await this.prisma.notificationOutbox.findMany({
      where: { dispatchedAt: null },
    });
    for (const entry of pending) {
      console.log(
        '[Outbox dispatch]',
        JSON.stringify({ type: entry.type, payload: entry.payload, at: new Date().toISOString() }),
      );
      await this.prisma.notificationOutbox.update({
        where: { id: entry.id },
        data: { dispatchedAt: new Date() },
      });
    }
  }
}
