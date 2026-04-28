import { describe, test, expect, jest } from '@jest/globals';
import { StatisticsService } from './statistics.service.js';

function createMockPrisma(overrides = {}) {
  return {
    iteration: {
      findMany: jest.fn() as any,
    },
    groupSchedule: {
      findMany: jest.fn() as any,
    },
    task: {
      findMany: jest.fn() as any,
    },
    group: {
      findMany: jest.fn() as any,
    },
    ...overrides,
  };
}

describe('StatisticsService', () => {
  describe('getWorkloadStats', () => {
    test('returns per-group task count and total days', async () => {
      const prisma = createMockPrisma();
      const svc = new StatisticsService(prisma as any);

      prisma.group.findMany.mockResolvedValue([
        { id: 'g1', name: '前端组' },
        { id: 'g2', name: '后端组' },
      ]);
      prisma.task.findMany.mockResolvedValue([
        { id: 't1', scheduleId: 'sch1', durationDays: 3, source: 'GROUP' },
        { id: 't2', scheduleId: 'sch1', durationDays: 5, source: 'GROUP' },
        { id: 't3', scheduleId: 'sch2', durationDays: 2, source: 'GROUP' },
      ]);
      prisma.groupSchedule.findMany.mockResolvedValue([
        { id: 'sch1', groupId: 'g1', status: 'APPROVED' },
        { id: 'sch2', groupId: 'g2', status: 'REVIEWING' },
      ]);

      const result = await svc.getWorkloadStats('iter1');

      expect(result.groups).toHaveLength(2);
      const frontend = result.groups.find((g: any) => g.name === '前端组');
      expect(frontend?.totalTasks).toBe(2);
      expect(frontend?.totalDays).toBe(8);
    });

    test('counts MASTER source tasks separately', async () => {
      const prisma = createMockPrisma();
      const svc = new StatisticsService(prisma as any);

      prisma.group.findMany.mockResolvedValue([{ id: 'g1', name: '前端组' }]);
      prisma.task.findMany.mockResolvedValue([
        { id: 't1', scheduleId: 'sch1', durationDays: 3, source: 'GROUP' },
        { id: 't2', scheduleId: 'sch1', durationDays: 2, source: 'MASTER' },
      ]);
      prisma.groupSchedule.findMany.mockResolvedValue([
        { id: 'sch1', groupId: 'g1', status: 'APPROVED' },
      ]);

      const result = await svc.getWorkloadStats('iter1');
      // MASTER tasks are not counted in group workload
      expect(result.groups[0].totalTasks).toBe(1);
    });
  });

  describe('getProjectProgress', () => {
    test('returns per-iteration status counts', async () => {
      const prisma = createMockPrisma();
      const svc = new StatisticsService(prisma as any);

      prisma.iteration.findMany.mockResolvedValue([
        { id: 'iter1', name: '迭代1', projectId: 'p1', schedules: [
          { id: 'sch1', iterationId: 'iter1', status: 'PENDING' },
          { id: 'sch2', iterationId: 'iter1', status: 'REVIEWING' },
          { id: 'sch3', iterationId: 'iter1', status: 'APPROVED' },
        ]},
        { id: 'iter2', name: '迭代2', projectId: 'p1', schedules: [
          { id: 'sch4', iterationId: 'iter2', status: 'APPROVED' },
        ]},
      ]);

      const result = await svc.getProjectProgress('p1');

      expect(result.iterations).toHaveLength(2);
      const iter1 = result.iterations.find((i: any) => i.name === '迭代1')!;
      expect(iter1.pending).toBe(1);
      expect(iter1.reviewing).toBe(1);
      expect(iter1.approved).toBe(1);
    });
  });
});
