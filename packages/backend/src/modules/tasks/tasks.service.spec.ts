import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { TasksService } from './tasks.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// ─── Mock PrismaService ───────────────────────────────────────────────────────

function createMockPrisma(overrides = {}) {
  return {
    task: {
      findUnique: jest.fn() as any,
      findMany: jest.fn() as any,
      create: jest.fn() as any,
      update: jest.fn() as any,
      updateMany: jest.fn() as any,
      delete: jest.fn() as any,
    },
    groupSchedule: {
      findUnique: jest.fn() as any,
    },
    ...overrides,
  };
}

function createMockOutbox() {
  return { emit: jest.fn() as any };
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const FIXTURE_TASK_GROUP = (id = 't1', scheduleId = 'sch1') => ({
  id,
  scheduleId,
  orderIndex: 0,
  name: '任务A',
  ownerId: 'u1',
  startDate: null,
  endDate: null,
  durationDays: 3,
  dependencyTaskId: null,
  source: 'GROUP',
  note: '',
});

const FIXTURE_TASK_MASTER = (id = 't2', scheduleId = 'sch1') => ({
  id,
  scheduleId,
  orderIndex: 1,
  name: 'PM任务',
  ownerId: null,
  startDate: null,
  endDate: null,
  durationDays: 1,
  dependencyTaskId: null,
  source: 'MASTER',
  note: '',
});

const FIXTURE_SCHEDULE = (id = 'sch1', status = 'PENDING') => ({
  id,
  iterationId: 'iter1',
  groupId: 'g1',
  status,
  version: 1,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TasksService', () => {

  describe('insertRow', () => {
    test('inserts at afterIndex and increments subsequent orderIndex', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new TasksService(prisma as any, outbox as any);

      const existingTasks = [
        { id: 't1', scheduleId: 'sch1', orderIndex: 0, name: 'A', ownerId: null, startDate: null, endDate: null, durationDays: 1, dependencyTaskId: null, source: 'GROUP', note: '' },
        { id: 't2', scheduleId: 'sch1', orderIndex: 1, name: 'B', ownerId: null, startDate: null, endDate: null, durationDays: 1, dependencyTaskId: null, source: 'GROUP', note: '' },
      ];
      prisma.task.findMany.mockResolvedValue(existingTasks);
      prisma.task.updateMany.mockResolvedValue({ count: 2 } as any);
      prisma.task.create.mockResolvedValue({ id: 't_new', scheduleId: 'sch1', orderIndex: 0, name: '新任务', ownerId: null, durationDays: 1, source: 'GROUP' });

      const result = await svc.insertRow('sch1', 0, 'u_gl1');

      expect(result.ok).toBe(true);
      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { scheduleId: 'sch1', orderIndex: { gte: 0 } },
        data: { orderIndex: { increment: 1 } },
      });
      expect(prisma.task.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ scheduleId: 'sch1', orderIndex: 0, name: '新任务' }) }));
    });
  });

  describe('deleteRow', () => {
    test('deletes GROUP task when status=PENDING', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new TasksService(prisma as any, outbox as any);

      prisma.task.findUnique.mockResolvedValue(FIXTURE_TASK_GROUP());
      prisma.groupSchedule.findUnique.mockResolvedValue(FIXTURE_SCHEDULE('sch1', 'PENDING'));
      prisma.task.delete.mockResolvedValue(FIXTURE_TASK_GROUP());
      prisma.task.findMany.mockResolvedValue([]);

      const result = await svc.deleteRow('t1', 'u_gl1');

      expect(result.ok).toBe(true);
      expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
    });

    test('deletes GROUP task when status=REJECTED', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new TasksService(prisma as any, outbox as any);

      prisma.task.findUnique.mockResolvedValue(FIXTURE_TASK_GROUP());
      prisma.groupSchedule.findUnique.mockResolvedValue(FIXTURE_SCHEDULE('sch1', 'REJECTED'));
      prisma.task.delete.mockResolvedValue(FIXTURE_TASK_GROUP());
      prisma.task.findMany.mockResolvedValue([]);

      const result = await svc.deleteRow('t1', 'u_gl1');

      expect(result.ok).toBe(true);
    });

    test('throws when deleting MASTER task → SYNC_ROW_READONLY', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new TasksService(prisma as any, outbox as any);

      prisma.task.findUnique.mockResolvedValue(FIXTURE_TASK_MASTER());

      await expect(svc.deleteRow('t2', 'u_gl1')).rejects.toThrow(BadRequestException);
    });

    test('throws when deleting GROUP task in REVIEWING status → SYNC_ROW_READONLY', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new TasksService(prisma as any, outbox as any);

      prisma.task.findUnique.mockResolvedValue(FIXTURE_TASK_GROUP());
      prisma.groupSchedule.findUnique.mockResolvedValue(FIXTURE_SCHEDULE('sch1', 'REVIEWING'));

      await expect(svc.deleteRow('t1', 'u_gl1')).rejects.toThrow(BadRequestException);
    });

    test('throws when task not found → NotFoundException', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new TasksService(prisma as any, outbox as any);

      prisma.task.findUnique.mockResolvedValue(null);

      await expect(svc.deleteRow('ghost', 'u_gl1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('setDependency', () => {
    test('setting null dependency clears dependencyTaskId', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new TasksService(prisma as any, outbox as any);

      prisma.task.findUnique.mockResolvedValue(FIXTURE_TASK_GROUP());
      prisma.task.findMany.mockResolvedValue([FIXTURE_TASK_GROUP()]);
      prisma.task.update.mockResolvedValue({ ...FIXTURE_TASK_GROUP(), dependencyTaskId: null });

      const result = await svc.setDependency('t1', null, 'u_gl1');

      expect(result.ok).toBe(true);
      expect(prisma.task.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { dependencyTaskId: null } });
    });

    test('throws when task not found → NotFoundException', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new TasksService(prisma as any, outbox as any);

      prisma.task.findUnique.mockResolvedValue(null);

      await expect(svc.setDependency('ghost', 't2', 'u_gl1')).rejects.toThrow(NotFoundException);
    });

    test('throws when setting self-dependency → CYCLE_SELF', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new TasksService(prisma as any, outbox as any);

      prisma.task.findUnique.mockResolvedValue(FIXTURE_TASK_GROUP('t1'));
      prisma.task.findMany.mockResolvedValue([FIXTURE_TASK_GROUP('t1')]);

      await expect(svc.setDependency('t1', 't1', 'u_gl1')).rejects.toThrow(BadRequestException);
    });

    test('throws when cycle detected → CYCLE', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new TasksService(prisma as any, outbox as any);

      // t2 → t1, trying to set t1 → t2 would create t1 → t2 → t1 cycle
      prisma.task.findUnique.mockResolvedValue(FIXTURE_TASK_GROUP('t1'));
      prisma.task.findMany.mockResolvedValue([
        { ...FIXTURE_TASK_GROUP('t1'), dependencyTaskId: 't2' },
        { ...FIXTURE_TASK_GROUP('t2') },
      ]);

      await expect(svc.setDependency('t1', 't2', 'u_gl1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('propagate', () => {
    test('propagates finish date change to dependent task', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new TasksService(prisma as any, outbox as any);

      const taskWithDep = { ...FIXTURE_TASK_GROUP('t1'), endDate: new Date('2026-05-10'), dependencyTaskId: 't2' };
      prisma.task.findUnique.mockResolvedValue({ ...taskWithDep, schedule: FIXTURE_SCHEDULE() });
      prisma.task.findMany.mockResolvedValue([
        taskWithDep,
        { ...FIXTURE_TASK_GROUP('t2'), startDate: new Date('2026-05-11'), dependencyTaskId: null },
      ]);
      prisma.task.update.mockResolvedValue({} as any);

      const result = await svc.propagate('t1', 'u_gl1');

      expect(result.ok).toBe(true);
    });
  });
});
