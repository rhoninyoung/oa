import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Per-group workload statistics for an iteration
   * Returns: { groups: [{ id, name, totalTasks, totalDays }] }
   */
  async getWorkloadStats(iterationId: string) {
    const [groups, tasks, schedules] = await Promise.all([
      this.prisma.group.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.task.findMany({
        where: { schedule: { iterationId } },
      }),
      this.prisma.groupSchedule.findMany({
        where: { iterationId },
      }),
    ]);

    // Group tasks by groupId
    const scheduleGroupMap = new Map(schedules.map(s => [s.id, s.groupId]));

    const groupStats = groups.map(group => {
      const groupScheduleIds = schedules
        .filter(s => s.groupId === group.id)
        .map(s => s.id);

      const groupTasks = tasks.filter(
        t => groupScheduleIds.includes(t.scheduleId) && t.source === 'GROUP'
      );

      return {
        id: group.id,
        name: group.name,
        totalTasks: groupTasks.length,
        totalDays: groupTasks.reduce((sum, t) => sum + (t.durationDays ?? 0), 0),
      };
    });

    return { groups: groupStats };
  }

  /**
   * Per-iteration approval status counts for a project
   * Returns: { iterations: [{ id, name, pending, reviewing, approved, rejected }] }
   */
  async getProjectProgress(projectId: string) {
    const iterations = await this.prisma.iteration.findMany({
      where: { projectId },
      include: { schedules: true },
      orderBy: { name: 'asc' },
    });

    const iterationStats = iterations.map(iter => {
      const counts = { pending: 0, reviewing: 0, approved: 0, rejected: 0 };
      for (const sched of iter.schedules) {
        const key = sched.status.toLowerCase() as keyof typeof counts;
        if (key in counts) counts[key]++;
      }
      return {
        id: iter.id,
        name: iter.name,
        ...counts,
      };
    });

    return { iterations: iterationStats };
  }
}
