import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { OutboxService } from '../outbox/outbox.service.js';

@Injectable()
export class MasterService {
  constructor(
    private prisma: PrismaService,
    private outbox: OutboxService,
  ) {}

  async getMasterView(iterationId: string, _userId: string) {
    const approved = await this.prisma.groupSchedule.findMany({
      where: { iterationId, status: 'APPROVED' },
      include: { tasks: { where: { source: 'GROUP' }, orderBy: { orderIndex: 'asc' } } },
    });
    const masterRows = await this.prisma.task.findMany({
      where: { schedule: { iterationId }, source: 'MASTER' },
      orderBy: { orderIndex: 'asc' },
    });
    return [...approved.flatMap((s) => s.tasks), ...masterRows];
  }

  async addMasterRow(iterationId: string, ownerId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'PROJECT_MANAGER')
      throw new ForbiddenException({ code: 'ACTOR_NOT_PM' });
    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner?.groupId) throw new NotFoundException('Owner not found');
    const schedule = await this.prisma.groupSchedule.findUnique({
      where: { iterationId_groupId: { iterationId, groupId: owner.groupId } },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');
    const maxIdx = await this.prisma.task.aggregate({
      where: { scheduleId: schedule.id },
      _max: { orderIndex: true },
    });
    const task = await this.prisma.task.create({
      data: {
        scheduleId: schedule.id,
        orderIndex: (maxIdx._max.orderIndex ?? 0) + 1,
        name: '',
        ownerId,
        source: 'MASTER',
      },
    });
    await this.outbox.emit('TASK_ASSIGNED', { taskId: task.id, ownerId, groupId: owner.groupId });
    return task;
  }

  async deleteMasterRow(taskId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'PROJECT_MANAGER')
      throw new ForbiddenException({ code: 'ACTOR_NOT_PM' });
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException();
    if (task.source !== 'MASTER') throw new ForbiddenException({ code: 'SYNC_ROW_READONLY' });
    await this.prisma.task.delete({ where: { id: taskId } });
    return { deleted: true };
  }
}
