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
      findMany: jest.fn() as any,
    },
    group: {
      findUnique: jest.fn() as any,
    },
    ...overrides,
  };
}

function createMockOutbox() {
  return { emit: jest.fn() as any };
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const FIXTURE_USER_GL = { id: 'u_gl1', name: '张三', role: 'GROUP_LEADER', groupId: 'g1', email: 'zhangsan@example.com' };
const FIXTURE_USER_PM = { id: 'u_pm1', name: '李四', role: 'PROJECT_MANAGER', groupId: null, email: 'lisi@example.com' };
const FIXTURE_GROUP = { id: 'g1', name: '前端组' };
const FIXTURE_ITERATION = { id: 'iter1', name: '迭代1', projectId: 'p1', project: { name: 'OA项目' } };
const FIXTURE_SCHEDULE = (status = 'PENDING', version = 1) => ({
  id: 'sch1',
  iterationId: 'iter1',
  groupId: 'g1',
  status,
  version,
  rejectReason: null,
  iteration: FIXTURE_ITERATION,
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
      prisma.group.findUnique.mockResolvedValue(FIXTURE_GROUP);
      prisma.user.findUnique.mockResolvedValue(FIXTURE_USER_GL);
      prisma.user.findMany.mockResolvedValue([FIXTURE_USER_PM]);
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
      // Submit emits EMAIL and DINGTALK notifications to PMs
      expect(outbox.emit).toHaveBeenCalled();
      const emitCalls = outbox.emit.mock.calls;
      expect(emitCalls.some((c: any[]) => c[1] === 'EMAIL')).toBe(true);
    });
  });

  describe('withdraw — GL', () => {
    test('REVIEWING → PENDING', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new SchedulesService(prisma as any, outbox as any);

      prisma.groupSchedule.findUnique.mockResolvedValue(FIXTURE_SCHEDULE('REVIEWING', 2));
      prisma.group.findUnique.mockResolvedValue(FIXTURE_GROUP);
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
      prisma.group.findUnique.mockResolvedValue(FIXTURE_GROUP);
      prisma.user.findUnique.mockResolvedValue(FIXTURE_USER_PM);
      prisma.user.findMany.mockResolvedValue([FIXTURE_USER_GL]);
      prisma.task.findMany.mockResolvedValue(FIXTURE_TASKS);
      prisma.groupSchedule.update.mockResolvedValue({
        ...FIXTURE_SCHEDULE('APPROVED', 3),
        tasks: FIXTURE_TASKS,
      });

      const result = await svc.approve('sch1', 'u_pm1');

      expect(result.ok).toBe(true);
      expect(result.schedule.status).toBe('APPROVED');
      // Approve emits EMAIL and DINGTALK notifications to GLs
      expect(outbox.emit).toHaveBeenCalled();
      const emitCalls = outbox.emit.mock.calls;
      expect(emitCalls.some((c: any[]) => c[1] === 'EMAIL')).toBe(true);
    });
  });

  describe('reject — PM', () => {
    test('REVIEWING → REJECTED with reason', async () => {
      const prisma = createMockPrisma();
      const outbox = createMockOutbox();
      const svc = new SchedulesService(prisma as any, outbox as any);

      prisma.groupSchedule.findUnique.mockResolvedValue(FIXTURE_SCHEDULE('REVIEWING', 2));
      prisma.group.findUnique.mockResolvedValue(FIXTURE_GROUP);
      prisma.user.findUnique.mockResolvedValue(FIXTURE_USER_PM);
      prisma.user.findMany.mockResolvedValue([FIXTURE_USER_GL]);
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
      prisma.group.findUnique.mockResolvedValue(FIXTURE_GROUP);
      prisma.user.findUnique.mockResolvedValue(FIXTURE_USER_PM);
      prisma.user.findMany.mockResolvedValue([FIXTURE_USER_GL]);
      prisma.task.findMany.mockResolvedValue(FIXTURE_TASKS);
      // Simulate canTransition returning ok=false by making update throw
      prisma.groupSchedule.update.mockRejectedValue(new BadRequestException({ code: 'REASON_INVALID', message: '拒绝理由不能为空' }));

      // reason is 3rd arg; service signature: reject(scheduleId, userId, reason)
      await expect(svc.reject('sch1', 'u_pm1', '')).rejects.toThrow(BadRequestException);
    });
  });

  // BUG-P8-04: submit → outbox.emit called with EMAIL to all PMs
  test('submit emits EMAIL + DINGTALK to PMs', async () => {
    const prisma = createMockPrisma();
    const outbox = createMockOutbox();
    const svc = new SchedulesService(prisma as any, outbox as any);

    prisma.groupSchedule.findUnique.mockResolvedValue(FIXTURE_SCHEDULE('PENDING', 1));
    prisma.group.findUnique.mockResolvedValue(FIXTURE_GROUP);
    prisma.user.findUnique.mockResolvedValue(FIXTURE_USER_GL);
    prisma.user.findMany.mockResolvedValue([FIXTURE_USER_PM]);
    prisma.task.findMany.mockResolvedValue(FIXTURE_TASKS);
    prisma.groupSchedule.update.mockResolvedValue({
      ...FIXTURE_SCHEDULE('REVIEWING', 2),
      tasks: FIXTURE_TASKS,
    });

    await svc.submit('sch1', 'u_gl1');

    const emitCalls = outbox.emit.mock.calls;
    const emailCalls = emitCalls.filter((c: any[]) => c[1] === 'EMAIL');
    const dingtalkCalls = emitCalls.filter((c: any[]) => c[1] === 'DINGTALK');
    expect(emailCalls.length).toBeGreaterThan(0);
    expect(dingtalkCalls.length).toBeGreaterThan(0);
    expect(emailCalls[0][2].to).toBe(FIXTURE_USER_PM.email);
  });

  // BUG-P8-05: approve → outbox.emit called with EMAIL to GL
  test('approve emits EMAIL + DINGTALK to GLs in own group', async () => {
    const prisma = createMockPrisma();
    const outbox = createMockOutbox();
    const svc = new SchedulesService(prisma as any, outbox as any);

    prisma.groupSchedule.findUnique.mockResolvedValue(FIXTURE_SCHEDULE('REVIEWING', 2));
    prisma.group.findUnique.mockResolvedValue(FIXTURE_GROUP);
    prisma.user.findUnique.mockResolvedValue(FIXTURE_USER_PM);
    prisma.user.findMany.mockResolvedValue([FIXTURE_USER_GL]);
    prisma.task.findMany.mockResolvedValue(FIXTURE_TASKS);
    prisma.groupSchedule.update.mockResolvedValue({
      ...FIXTURE_SCHEDULE('APPROVED', 3),
      tasks: FIXTURE_TASKS,
    });

    await svc.approve('sch1', 'u_pm1');

    const emitCalls = outbox.emit.mock.calls;
    const emailCalls = emitCalls.filter((c: any[]) => c[1] === 'EMAIL');
    expect(emailCalls.length).toBeGreaterThan(0);
    expect(emailCalls[0][2].to).toBe(FIXTURE_USER_GL.email);
  });

  // BUG-P8-06: reject → outbox.emit called with rejectReason
  test('reject emits EMAIL with rejectReason to GLs', async () => {
    const prisma = createMockPrisma();
    const outbox = createMockOutbox();
    const svc = new SchedulesService(prisma as any, outbox as any);

    prisma.groupSchedule.findUnique.mockResolvedValue(FIXTURE_SCHEDULE('REVIEWING', 2));
    prisma.group.findUnique.mockResolvedValue(FIXTURE_GROUP);
    prisma.user.findUnique.mockResolvedValue(FIXTURE_USER_PM);
    prisma.user.findMany.mockResolvedValue([FIXTURE_USER_GL]);
    prisma.task.findMany.mockResolvedValue(FIXTURE_TASKS);
    prisma.groupSchedule.update.mockResolvedValue({
      ...FIXTURE_SCHEDULE('REJECTED', 3),
      rejectReason: '排期不合理',
      tasks: FIXTURE_TASKS,
    });

    await svc.reject('sch1', 'u_pm1', '排期不合理');

    const emailCalls = outbox.emit.mock.calls.filter((c: any[]) => c[1] === 'EMAIL');
    expect(emailCalls[0][2].rejectReason).toBe('排期不合理');
  });

  // BUG-P8-07: No PMs in system → submit does not throw (no one to notify)
  test('submit with no PMs → no outbox emit, no throw', async () => {
    const prisma = createMockPrisma();
    const outbox = createMockOutbox();
    const svc = new SchedulesService(prisma as any, outbox as any);

    prisma.groupSchedule.findUnique.mockResolvedValue(FIXTURE_SCHEDULE('PENDING', 1));
    prisma.group.findUnique.mockResolvedValue(FIXTURE_GROUP);
    prisma.user.findUnique.mockResolvedValue(FIXTURE_USER_GL);
    prisma.user.findMany.mockResolvedValue([]); // no PMs
    prisma.task.findMany.mockResolvedValue(FIXTURE_TASKS);
    prisma.groupSchedule.update.mockResolvedValue({
      ...FIXTURE_SCHEDULE('REVIEWING', 2),
      tasks: FIXTURE_TASKS,
    });

    const result = await svc.submit('sch1', 'u_gl1');
    expect(result.ok).toBe(true);
    expect(outbox.emit).not.toHaveBeenCalled();
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
      prisma.group.findUnique.mockResolvedValue(FIXTURE_GROUP);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(svc.submit('sch1', 'ghost')).rejects.toThrow(NotFoundException);
    });
  });
});
