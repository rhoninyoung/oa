import { describe, test, expect, jest } from '@jest/globals';
import { MasterService } from './master.service.js';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

// ─── Mock PrismaService ───────────────────────────────────────────────────────

function createMockPrisma(overrides = {}) {
  return {
    groupSchedule: {
      findMany: jest.fn() as any,
      findUnique: jest.fn() as any,
    },
    task: {
      findMany: jest.fn() as any,
      findUnique: jest.fn() as any,
      create: jest.fn() as any,
      delete: jest.fn() as any,
    },
    user: {
      findUnique: jest.fn() as any,
    },
    ...overrides,
  };
}

function createMockOutbox() {
  return { emit: jest.fn() as any };
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const FIXTURE_USER_PM = { id: 'u_pm1', name: '李四', role: 'PROJECT_MANAGER', groupId: null };
const FIXTURE_USER_GL = { id: 'u_gl1', name: '张三', role: 'GROUP_LEADER', groupId: 'g1' };

const FIXTURE_TASK_GROUP = (id = 't1', source: 'GROUP' | 'MASTER' = 'GROUP') => ({
  id,
  scheduleId: 'sch1',
  orderIndex: 0,
  name: '任务A',
  ownerId: 'u1',
  startDate: null,
  endDate: null,
  durationDays: 3,
  dependencyTaskId: null,
  source,
  note: '',
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MasterService', () => {

  describe('getMasterView', () => {
    test('returns APPROVED GROUP tasks + all MASTER tasks', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new MasterService(prisma as any, outbox as any);

      const schedules = [
        {
          id: 'sch1',
          iterationId: 'iter1',
          groupId: 'g1',
          status: 'APPROVED',
          tasks: [
            { ...FIXTURE_TASK_GROUP('t1', 'GROUP'), scheduleStatus: 'APPROVED', groupId: 'g1' },
            { ...FIXTURE_TASK_GROUP('t2', 'MASTER'), scheduleStatus: 'APPROVED', groupId: 'g1' },
          ],
        },
        {
          id: 'sch2',
          iterationId: 'iter1',
          groupId: 'g2',
          status: 'REVIEWING',
          tasks: [
            { ...FIXTURE_TASK_GROUP('t3', 'GROUP'), scheduleStatus: 'REVIEWING', groupId: 'g2' },
            { ...FIXTURE_TASK_GROUP('t4', 'MASTER'), scheduleStatus: 'REVIEWING', groupId: 'g2' },
          ],
        },
        {
          id: 'sch3',
          iterationId: 'iter1',
          groupId: 'g3',
          status: 'APPROVED',
          tasks: [
            { ...FIXTURE_TASK_GROUP('t5', 'GROUP'), scheduleStatus: 'APPROVED', groupId: 'g3' },
          ],
        },
      ];
      prisma.groupSchedule.findMany.mockResolvedValue(schedules as any);

      const result = await svc.getMasterView('iter1');

      // sch1 APPROVED: t1 (GROUP, APPROVED) + t2 (MASTER) → included
      // sch2 REVIEWING: t3 (GROUP, REVIEWING) → excluded, t4 (MASTER) → included
      // sch3 APPROVED: t5 (GROUP, APPROVED) → included
      expect(result).toHaveLength(4);
      expect(result.map((t: any) => t.id)).toEqual(expect.arrayContaining(['t1', 't2', 't4', 't5']));
      expect(result.map((t: any) => t.id)).not.toContain('t3'); // REVIEWING GROUP excluded
    });

    test('returns empty array when no schedules', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new MasterService(prisma as any, outbox as any);

      prisma.groupSchedule.findMany.mockResolvedValue([]);

      const result = await svc.getMasterView('iter1');
      expect(result).toHaveLength(0);
    });
  });

  describe('addMasterRow — PM only', () => {
    test('PM creates source=MASTER task', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new MasterService(prisma as any, outbox as any);

      prisma.user.findUnique.mockResolvedValue(FIXTURE_USER_PM);
      prisma.groupSchedule.findUnique.mockResolvedValue({
        id: 'sch1', iterationId: 'iter1', groupId: 'g1', status: 'APPROVED', version: 1,
      });
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.create.mockResolvedValue({
        id: 't_new', scheduleId: 'sch1', name: '新总表任务', orderIndex: 0,
        ownerId: null, startDate: null, endDate: null, durationDays: 1, source: 'MASTER',
      });

      const result = await svc.addMasterRow('iter1', { scheduleId: 'sch1', name: '新总表任务' }, 'u_pm1');

      expect(result.ok).toBe(true);
      expect(result.task.source).toBe('MASTER');
      expect(prisma.task.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ source: 'MASTER' }) }));
    });

    test('GL throws ForbiddenException', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new MasterService(prisma as any, outbox as any);

      prisma.user.findUnique.mockResolvedValue(FIXTURE_USER_GL);

      await expect(svc.addMasterRow('iter1', { scheduleId: 'sch1', name: '新任务' }, 'u_gl1'))
        .rejects.toThrow(ForbiddenException);
    });

    test('throws NotFoundException when schedule not found', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new MasterService(prisma as any, outbox as any);

      prisma.user.findUnique.mockResolvedValue(FIXTURE_USER_PM);
      prisma.groupSchedule.findUnique.mockResolvedValue(null);

      await expect(svc.addMasterRow('iter1', { scheduleId: 'ghost', name: '任务' }, 'u_pm1'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteMasterRow', () => {
    test('deletes MASTER task', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new MasterService(prisma as any, outbox as any);

      prisma.task.findUnique.mockResolvedValue(FIXTURE_TASK_GROUP('t1', 'MASTER'));
      prisma.task.delete.mockResolvedValue(FIXTURE_TASK_GROUP('t1', 'MASTER'));

      const result = await svc.deleteMasterRow('t1', 'u_pm1');

      expect(result.ok).toBe(true);
      expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
    });

    test('throws when deleting GROUP task → SYNC_ROW_READONLY', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new MasterService(prisma as any, outbox as any);

      prisma.task.findUnique.mockResolvedValue(FIXTURE_TASK_GROUP('t1', 'GROUP'));

      await expect(svc.deleteMasterRow('t1', 'u_pm1')).rejects.toThrow(BadRequestException);
    });

    test('throws when task not found → NotFoundException', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new MasterService(prisma as any, outbox as any);

      prisma.task.findUnique.mockResolvedValue(null);

      await expect(svc.deleteMasterRow('ghost', 'u_pm1')).rejects.toThrow(NotFoundException);
    });
  });
});
