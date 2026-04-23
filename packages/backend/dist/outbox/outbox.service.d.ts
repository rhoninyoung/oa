import { PrismaService } from '../prisma.service.js';
export declare class OutboxService {
    private prisma;
    constructor(prisma: PrismaService);
    /** Build a stable idempotency key from event context. */
    buildKey(type: string, scheduleId: string, action: string, version: number): string;
    /** Emit a notification event. */
    emit(type: string, payload: Record<string, unknown>): Promise<void>;
    /** Dismiss pending notifications for a given event (e.g. on withdraw). */
    dismissPendingForEvent(type: string, scheduleId: string): Promise<void>;
    /** Worker tick: mark dispatched. */
    dispatchAll(): Promise<void>;
}
//# sourceMappingURL=outbox.service.d.ts.map