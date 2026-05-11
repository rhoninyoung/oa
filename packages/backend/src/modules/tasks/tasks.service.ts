import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { canSetDependency, checkDependencyCycle, propagateFinishChange } from '@oa-mvp/shared';
import { isWeekend, addWorkDays } from '@oa-mvp/shared';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async insertRow(scheduleId: string, afterIndex: number, userId: string) {
    const tasks = await this.prisma.task.findMany({ where: { scheduleId }, orderBy: { orderIndex: 'asc' } });

    // Shift orderIndex for all tasks at or after afterIndex
    await this.prisma.task.updateMany({
      where: { scheduleId, orderIndex: { gte: afterIndex } },
      data: { orderIndex: { increment: 1 } },
    });

    const newTask = await this.prisma.task.create({
      data: {
        scheduleId,
        name: '新任务',
        orderIndex: afterIndex,
        ownerId: null,
        durationDays: 1,
        source: 'GROUP',
      },
    });

    return { ok: true, task: newTask };
  }

  async deleteRow(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    if (task.source === 'MASTER') {
      throw new BadRequestException({ code: 'SYNC_ROW_READONLY', message: '系统同步行不可删除' });
    }

    const schedule = await this.prisma.groupSchedule.findUnique({ where: { id: task.scheduleId } });
    if (!schedule) throw new NotFoundException('Schedule not found');

    if (schedule.status !== 'PENDING' && schedule.status !== 'REJECTED') {
      throw new BadRequestException({ code: 'SYNC_ROW_READONLY', message: '当前状态不可删除行' });
    }

    await this.prisma.task.delete({ where: { id: taskId } });

    // Renumber remaining tasks
    const remaining = await this.prisma.task.findMany({
      where: { scheduleId: task.scheduleId },
      orderBy: { orderIndex: 'asc' },
    });
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].orderIndex !== i) {
        await this.prisma.task.update({ where: { id: remaining[i].id }, data: { orderIndex: i } });
      }
    }

    return { ok: true };
  }

  async setDependency(taskId: string, dependencyTaskId: string | null, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    const allTasks = await this.prisma.task.findMany({ where: { scheduleId: task.scheduleId } });

    if (dependencyTaskId === null) {
      await this.prisma.task.update({ where: { id: taskId }, data: { dependencyTaskId: null } });
      return { ok: true };
    }

    const check = canSetDependency(allTasks as any, taskId);
    if (!check.ok) {
      throw new BadRequestException({ code: check.code, message: check.message });
    }

    const cycleResult = checkDependencyCycle(allTasks as any, taskId, dependencyTaskId);
    if (cycleResult.ok) {
      throw new BadRequestException({ code: cycleResult.code, message: `不能设置依赖：${cycleResult.code === 'CYCLE_SELF' ? '自引用循环' : '循环依赖'}` });
    }

    await this.prisma.task.update({
      where: { id: taskId },
      data: { dependencyTaskId },
    });

    return { ok: true };
  }

  async propagate(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { schedule: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    const allTasks = await this.prisma.task.findMany({ where: { scheduleId: task.scheduleId } });
    const holidays: string[] = [];

    const changes = propagateFinishChange(
      allTasks as any,
      taskId,
      isWeekend,
      addWorkDays,
      holidays,
    );

    for (const [id, change] of changes.entries()) {
      await this.prisma.task.update({
        where: { id },
        data: {
          startDate: change.startDate ? new Date(change.startDate) : undefined,
          endDate: change.endDate ? new Date(change.endDate) : undefined,
        },
      });
    }

    return { ok: true, changes: Object.fromEntries(changes) };
  }

  async updateProgress(taskId: string, progress: number, userId: string) {
    if (progress < 0 || progress > 100) {
      throw new BadRequestException({ code: 'PROGRESS_OUT_OF_RANGE', message: '进度值必须在 0-100 之间' });
    }
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: { progressPercent: progress },
    });
    return { ok: true, task: updated };
  }

  async updateTask(taskId: string, data: Record<string, any>, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    // Filter allowed fields to prevent mass-assignment
    const allowedFields = ['name', 'ownerId', 'startDate', 'endDate', 'durationDays', 'note', 'progressPercent'];
    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in data) {
        updateData[field] = data[field];
      }
    }

    // Handle date fields - convert YYYY-MM-DD strings to Date objects
    if (updateData.startDate && typeof updateData.startDate === 'string') {
      updateData.startDate = new Date(updateData.startDate + 'T00:00:00');
    }
    if (updateData.endDate && typeof updateData.endDate === 'string') {
      updateData.endDate = new Date(updateData.endDate + 'T00:00:00');
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });
    return { ok: true, task: updated };
  }
}
