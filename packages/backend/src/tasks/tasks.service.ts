import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { detectCycle, buildGraph, setDependency } from '@oa-mvp/shared';
import type { Task } from '@oa-mvp/shared';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async findOne(taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async insertRow(scheduleId: string, afterIndex: number, userId: string) {
    // Renumber all tasks after `afterIndex`
    await this.prisma.task.updateMany({
      where: { scheduleId, orderIndex: { gt: afterIndex } },
      data: { orderIndex: { increment: 1 } },
    });
    return this.prisma.task.create({
      data: { scheduleId, orderIndex: afterIndex + 1, name: '', source: 'GROUP' },
    });
  }

  async deleteRow(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { schedule: { select: { status: true } } },
    });
    if (!task) throw new NotFoundException();

    // Only MASTER source rows can be freely deleted;
    // GROUP rows can only be deleted when schedule is PENDING/REJECTED
    if (task.source === 'GROUP' && !['PENDING', 'REJECTED'].includes(task.schedule.status)) {
      throw new BadRequestException({ code: 'SYNC_ROW_READONLY' });
    }

    await this.prisma.task.delete({ where: { id: taskId } });

    // Reindex remaining tasks
    const remaining = await this.prisma.task.findMany({
      where: { scheduleId: task.scheduleId },
      orderBy: { orderIndex: 'asc' },
    });
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].orderIndex !== i + 1) {
        await this.prisma.task.update({ where: { id: remaining[i].id }, data: { orderIndex: i + 1 } });
      }
    }

    return { deleted: true };
  }

  async setDependency(taskId: string, depId: string | null, userId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { scheduleId: (await this.prisma.task.findUnique({ where: { id: taskId } }))?.scheduleId ?? '' },
    });

    const result = setDependency(taskId, depId, tasks as Task[]);
    if (!result.ok) {
      const err: { code: string; cyclePath?: string[] } = { code: result.code };
      if (result.code === 'CYCLE') err.cyclePath = result.cyclePath;
      throw new BadRequestException(err);
    }

    await this.prisma.task.update({
      where: { id: taskId },
      data: { dependencyTaskId: depId },
    });

    return { ok: true };
  }

  async propagateFinishChange(taskId: string) {
    // Returns list of downstream tasks whose dates need updating
    const tasks = await this.prisma.task.findMany();
    const graph = buildGraph(tasks as Task[]);

    // Build downstream map: for each task, who depends on it?
    const downstream = new Map<string, string[]>();
    for (const [id, deps] of graph.entries()) {
      for (const depId of deps) {
        if (!downstream.has(depId)) downstream.set(depId, []);
        downstream.get(depId)!.push(id);
      }
    }

    const affected: string[] = [];
    const queue = downstream.get(taskId) ?? [];
    const visited = new Set<string>();
    while (queue.length) {
      const curr = queue.shift()!;
      if (visited.has(curr)) continue;
      visited.add(curr);
      affected.push(curr);
      for (const n of downstream.get(curr) ?? []) queue.push(n);
    }

    return { affectedTaskIds: affected };
  }
}
