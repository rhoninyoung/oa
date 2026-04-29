import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';

@Injectable()
export class InitService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the full flat state needed by the frontend store.
   * Called once on app bootstrap via GET /api/init?userId=xxx
   */
  async getInitData(userId: string) {
    const [users, groups, projects, iterations, schedules, tasks] = await Promise.all([
      this.prisma.user.findMany(),
      this.prisma.group.findMany(),
      this.prisma.project.findMany(),
      this.prisma.iteration.findMany(),
      this.prisma.groupSchedule.findMany(),
      this.prisma.task.findMany(),
    ]);

    const holidayRecords = await this.prisma.holiday.findMany({
      orderBy: { date: 'asc' },
    });
    // Frontend expects string[]: ['YYYY-MM-DD', ...]
    const holidays = holidayRecords.map(h => h.date);

    const currentUser = users.find(u => u.id === userId) ?? users[0] ?? null;
    const firstIter = iterations[0] ?? null;

    return {
      users,
      groups,
      projects,
      iterations,
      schedules,
      tasks,
      holidays,
      currentUser,
      currentUserId: currentUser?.id ?? null,
      activeIterationId: firstIter?.id ?? null,
      activeGroupId: currentUser?.groupId ?? null,
    };
  }
}
