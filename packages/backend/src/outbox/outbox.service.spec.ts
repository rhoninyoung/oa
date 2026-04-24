// Jest: prisma.*.upsert/findMany 等均为「单对象实参」——取 mock 用 const [args] = calls[0]，勿拆成多位置参数。
import { OutboxService } from './outbox.service.js';

const mockPrisma = {
  notificationOutbox: {
    upsert: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

describe('OutboxService', () => {
  let svc: OutboxService;

  beforeEach(() => {
    svc = new OutboxService(mockPrisma as any);
    jest.clearAllMocks();
  });

  // ── UT-OBX-01: buildKey format ─────────────────────────────────────────────
  it('UT-OBX-01: buildKey returns type|scheduleId|action|version', () => {
    expect(svc.buildKey('SCHEDULE_SUBMITTED', 'sched-1', 'submit', 3)).toBe(
      'SCHEDULE_SUBMITTED|sched-1|submit|3',
    );
  });

  it('UT-OBX-02: buildKey handles empty strings', () => {
    expect(svc.buildKey('', '', '', 0)).toBe('|||0');
  });

  // ── UT-OBX-03: emit calls upsert with correct create arguments ──────────────
  it('UT-OBX-03: emit upserts with correct idempotency key and payload', async () => {
    const payload = { scheduleId: 's1', version: 2, action: 'submit' } as Record<string, unknown>;
    await svc.emit('SCHEDULE_SUBMITTED', payload);

    expect(mockPrisma.notificationOutbox.upsert).toHaveBeenCalledTimes(1);
    const [args] = mockPrisma.notificationOutbox.upsert.mock.calls[0];
    expect(args.where).toEqual({ idempotencyKey: 'SCHEDULE_SUBMITTED|s1|submit|2' });
    expect(args.create).toMatchObject({
      idempotencyKey: 'SCHEDULE_SUBMITTED|s1|submit|2',
      type: 'SCHEDULE_SUBMITTED',
    });
    // payload is cast to any – just verify it's passed through
    expect((args.create as any).payload).toBe(payload);
  });

  // ── UT-OBX-04: emit upserts update payload with null dispatchedAt ───────────
  it('UT-OBX-04: emit upserts update resets dispatchedAt to null', async () => {
    await svc.emit('SCHEDULE_SUBMITTED', { scheduleId: 's1', version: 1 } as Record<
      string,
      unknown
    >);
    const [args] = mockPrisma.notificationOutbox.upsert.mock.calls[0];
    expect(args.update).toMatchObject({ dispatchedAt: null });
  });

  // ── UT-OBX-05: dismissPendingForEvent calls updateMany ─────────────────────
  it('UT-OBX-05: dismissPendingForEvent calls updateMany with correct where', async () => {
    await svc.dismissPendingForEvent('SCHEDULE_SUBMITTED', 'sched-1');
    expect(mockPrisma.notificationOutbox.updateMany).toHaveBeenCalledTimes(1);
    const [{ where }] = mockPrisma.notificationOutbox.updateMany.mock.calls[0];
    expect(where).toMatchObject({
      type: 'SCHEDULE_SUBMITTED',
      dispatchedAt: null,
    });
    expect((where as any).payload).toMatchObject({ path: ['scheduleId'], equals: 'sched-1' });
  });

  // ── UT-OBX-06: dispatchAll finds pending and updates dispatchedAt ──────────
  it('UT-OBX-06: dispatchAll finds undispatched entries and marks them dispatched', async () => {
    const entry = { id: 'entry-1', type: 'SCHEDULE_SUBMITTED', payload: {}, dispatchedAt: null };
    mockPrisma.notificationOutbox.findMany.mockResolvedValue([entry]);

    await svc.dispatchAll();

    expect(mockPrisma.notificationOutbox.findMany).toHaveBeenCalledWith({
      where: { dispatchedAt: null },
    });
    expect(mockPrisma.notificationOutbox.update).toHaveBeenCalledWith({
      where: { id: 'entry-1' },
      data: { dispatchedAt: expect.any(Date) },
    });
  });
});
