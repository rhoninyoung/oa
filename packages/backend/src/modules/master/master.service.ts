import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';
import { OutboxService } from '../outbox/outbox.service.js';

@Injectable()
export class MasterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async getMasterView(iterationId: string) {
    // All APPROVED group schedules' tasks + all MASTER source tasks for this iteration
    const schedules = await this.prisma.groupSchedule.findMany({
      where: { iterationId },
      include: {
        tasks: { orderBy: { orderIndex: 'asc' } },
      },
    });

    const allTasks = schedules.flatMap(s =>
      s.tasks
        .filter(t => t.source === 'MASTER' || (t.source === 'GROUP' && s.status === 'APPROVED'))
        .map(t => ({ ...t, scheduleStatus: s.status, groupId: s.groupId })),
    );

    return allTasks;
  }

  async addMasterRow(iterationId: string, data: {
    scheduleId: string; name: string; ownerId?: string;
    startDate?: string; endDate?: string; durationDays?: number;
  }, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'PROJECT_MANAGER') {
      throw new ForbiddenException('Only PM can add master rows');
    }

    const schedule = await this.prisma.groupSchedule.findUnique({ where: { id: data.scheduleId } });
    if (!schedule) throw new NotFoundException('Schedule not found');

    const existingTasks = await this.prisma.task.findMany({ where: { scheduleId: data.scheduleId } });

    const newTask = await this.prisma.task.create({
      data: {
        scheduleId: data.scheduleId,
        name: data.name,
        orderIndex: existingTasks.length,
        ownerId: data.ownerId ?? null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        durationDays: data.durationDays ?? 1,
        source: 'MASTER',
      },
    });

    await this.outbox.emit(data.scheduleId, 'TASK_ASSIGNED', { taskId: newTask.id });
    return { ok: true, task: newTask };
  }

  async deleteMasterRow(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.source !== 'MASTER') {
      throw new BadRequestException({ code: 'SYNC_ROW_READONLY', message: '系统同步行不可删除' });
    }

    await this.prisma.task.delete({ where: { id: taskId } });
    return { ok: true };
  }
}
