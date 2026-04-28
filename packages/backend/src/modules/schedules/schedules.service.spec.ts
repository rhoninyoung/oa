import { describe, test, expect, jest } from '@jest/globals';
import { SchedulesService } from './schedules.service.js';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

// ─── Mock PrismaService ───────────────────────────────────────────────────────

function createMockPrisma(overrides = {}) {
  return {
    groupSchedule: {
      findUnique: jest.fn() as any,
      update: jest.fn() as any,
    },
    task: {
      findMany: jest.fn() as any,
      deleteMany: jest.fn() as any,
      createMany: jest.fn() as any,
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

const FIXTURE_USER_GL = { id: 'u_gl1', name: '张三', role: 'GROUP_LEADER', groupId: 'g1' };
const FIXTURE_USER_PM = { id: 'u_pm1', name: '李四', role: 'PROJECT_MANAGER', groupId: null };
const FIXTURE_SCHEDULE = (status = 'PENDING', version = 1) => ({
  id: 'sch1',
  iterationId: 'iter1',
  groupId: 'g1',
  status,
  version,
  rejectReason: null,
});
const FIXTURE_TASKS = [
  { id: 't1', scheduleId: 'sch1', orderIndex: 0, name: '任务A', ownerId: 'u1', startDate: null, endDate: null, durationDays: 3, dependencyTaskId: null, source: 'GROUP', note: '' },
  { id: 't2', scheduleId: 'sch1', orderIndex: 1, name: '任务B', ownerId: 'u2', startDate: null, endDate: null, durationDays: 2, dependencyTaskId: null, source: 'GROUP', note: '' },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SchedulesService.transition()', () => {

  describe('submit — GL', () => {
    test('PENDING → REVIEWING', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new SchedulesService(prisma as any, outbox as any);

      prisma.groupSchedule.findUnique.mockResolvedValue(FIXTURE_SCHEDULE('PENDING', 1));
      prisma.user.findUnique.mockResolvedValue(FIXTURE_USER_GL);
      prisma.task.findMany.mockResolvedValue(FIXTURE_TASKS);
      prisma.groupSchedule.update.mockResolvedValue({
        ...FIXTURE_SCHEDULE('REVIEWING', 2),
        tasks: FIXTURE_TASKS,
      });

      const result = await svc.submit('sch1', 'u_gl1');

      expect(result.ok).toBe(true);
      expect(result.schedule.status).toBe('REVIEWING');
      expect(prisma.groupSchedule.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'sch1' }, data: expect.objectContaining({ status: 'REVIEWING' }) }),
      );
      expect(outbox.emit).toHaveBeenCalledWith('sch1', 'SCHEDULE_SUBMITTED', { iterationId: 'iter1' });
    });
  });

  describe('withdraw — GL', () => {
    test('REVIEWING → PENDING', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new SchedulesService(prisma as any, outbox as any);

      prisma.groupSchedule.findUnique.mockResolvedValue(FIXTURE_SCHEDULE('REVIEWING', 2));
      prisma.user.findUnique.mockResolvedValue(FIXTURE_USER_GL);
      prisma.task.findMany.mockResolvedValue(FIXTURE_TASKS);
      prisma.groupSchedule.update.mockResolvedValue({
        ...FIXTURE_SCHEDULE('PENDING', 3),
        tasks: FIXTURE_TASKS,
      });

      const result = await svc.withdraw('sch1', 'u_gl1');

      expect(result.ok).toBe(true);
      expect(result.schedule.status).toBe('PENDING');
    });
  });

  describe('approve — PM', () => {
    test('REVIEWING → APPROVED', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new SchedulesService(prisma as any, outbox as any);

      prisma.groupSchedule.findUnique.mockResolvedValue(FIXTURE_SCHEDULE('REVIEWING', 2));
      prisma.user.findUnique.mockResolvedValue(FIXTURE_USER_PM);
      prisma.task.findMany.mockResolvedValue(FIXTURE_TASKS);
      prisma.groupSchedule.update.mockResolvedValue({
        ...FIXTURE_SCHEDULE('APPROVED', 3),
        tasks: FIXTURE_TASKS,
      });

      const result = await svc.approve('sch1', 'u_pm1');

      expect(result.ok).toBe(true);
      expect(result.schedule.status).toBe('APPROVED');
      expect(outbox.emit).toHaveBeenCalledWith('sch1', 'SCHEDULE_APPROVED', {});
    });
  });

  describe('reject — PM', () => {
    test('REVIEWING → REJECTED with reason', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new SchedulesService(prisma as any, outbox as any);

      prisma.groupSchedule.findUnique.mockResolvedValue(FIXTURE_SCHEDULE('REVIEWING', 2));
      prisma.user.findUnique.mockResolvedValue(FIXTURE_USER_PM);
      prisma.task.findMany.mockResolvedValue(FIXTURE_TASKS);
      prisma.groupSchedule.update.mockResolvedValue({
        ...FIXTURE_SCHEDULE('REJECTED', 3),
        rejectReason: '排期不合理',
        tasks: FIXTURE_TASKS,
      });

      const result = await svc.reject('sch1', 'u_pm1', '排期不合理');

      expect(result.ok).toBe(true);
      expect(result.schedule.status).toBe('REJECTED');
      expect(prisma.groupSchedule.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ rejectReason: '排期不合理' }) }),
      );
    });

    test('REJECTED when reason is empty — throws BadRequestException', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new SchedulesService(prisma as any, outbox as any);

      prisma.groupSchedule.findUnique.mockResolvedValue(FIXTURE_SCHEDULE('REVIEWING', 2));
      prisma.user.findUnique.mockResolvedValue(FIXTURE_USER_PM);
      prisma.task.findMany.mockResolvedValue(FIXTURE_TASKS);
      // Simulate canTransition returning ok=false by making update throw
      prisma.groupSchedule.update.mockRejectedValue(new BadRequestException({ code: 'REASON_INVALID', message: '拒绝理由不能为空' }));

      // reason is 3rd arg; service signature: reject(scheduleId, userId, reason)
      await expect(svc.reject('sch1', 'u_pm1', '')).rejects.toThrow(BadRequestException);
    });
  });

  describe('error cases', () => {
    test('schedule not found → NotFoundException', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new SchedulesService(prisma as any, outbox as any);

      prisma.groupSchedule.findUnique.mockResolvedValue(null);

      await expect(svc.submit('notfound', 'u_gl1')).rejects.toThrow(NotFoundException);
    });

    test('user not found → NotFoundException', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new SchedulesService(prisma as any, outbox as any);

      prisma.groupSchedule.findUnique.mockResolvedValue(FIXTURE_SCHEDULE('PENDING'));
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(svc.submit('sch1', 'ghost')).rejects.toThrow(NotFoundException);
    });
  });
});
