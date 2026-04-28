import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { canTransition, nextStatus } from '@oa-mvp/shared';

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async findOne(id: string) {
    return this.prisma.groupSchedule.findUnique({
      where: { id },
      include: {
        tasks: { orderBy: { orderIndex: 'asc' } },
        iteration: { include: { project: true } },
      },
    });
  }

  async saveDraft(scheduleId: string, tasks: unknown[], version: number, userId: string) {
    const schedule = await this.prisma.groupSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) return { ok: false, error: 'NOT_FOUND' };
    if (schedule.version !== version) {
      throw new ConflictException({
        code: 'VERSION_CONFLICT',
        latestVersion: schedule.version,
        message: `Version conflict: expected ${version}, found ${schedule.version}`,
      });
    }

    // Delete existing tasks and recreate
    await this.prisma.task.deleteMany({ where: { scheduleId } });
    await this.prisma.task.createMany({
      data: (tasks as Array<{
        name?: string; orderIndex?: number; ownerId?: string | null;
        startDate?: string | null; endDate?: string | null;
        durationDays?: number | null; dependencyTaskId?: string | null;
        source?: string; note?: string;
      }>).map(t => ({
        scheduleId,
        name: t.name ?? '新任务',
        orderIndex: t.orderIndex ?? 0,
        ownerId: t.ownerId ?? null,
        startDate: t.startDate ? new Date(t.startDate) : null,
        endDate: t.endDate ? new Date(t.endDate) : null,
        durationDays: t.durationDays ?? 1,
        dependencyTaskId: t.dependencyTaskId ?? null,
        source: (t.source as 'GROUP' | 'MASTER') ?? 'GROUP',
        note: t.note ?? '',
      })),
    });

    const updated = await this.prisma.groupSchedule.update({
      where: { id: scheduleId },
      data: { version: { increment: 1 } },
      include: { tasks: { orderBy: { orderIndex: 'asc' } } },
    });

    return { ok: true, schedule: updated, newVersion: updated.version };
  }

  async submit(scheduleId: string, userId: string) {
    return this.transition(scheduleId, userId, 'submit', {});
  }

  async withdraw(scheduleId: string, userId: string) {
    return this.transition(scheduleId, userId, 'withdraw', {});
  }

  async approve(scheduleId: string, userId: string) {
    return this.transition(scheduleId, userId, 'approve', {});
  }

  async reject(scheduleId: string, userId: string, reason: string) {
    return this.transition(scheduleId, userId, 'reject', { reason });
  }

  async reschedule(scheduleId: string, userId: string) {
    return this.transition(scheduleId, userId, 'reschedule', {});
  }

  private async transition(
    scheduleId: string,
    userId: string,
    action: 'submit' | 'withdraw' | 'approve' | 'reject' | 'reschedule',
    ctx: { reason?: string },
  ) {
    const schedule = await this.prisma.groupSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        iteration: { include: { project: true } },
      },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');

    const group = await this.prisma.group.findUnique({ where: { id: schedule.groupId } });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const tasks = await this.prisma.task.findMany({ where: { scheduleId } });

    const check = canTransition(schedule.status, action, user.role, { tasks, reason: ctx.reason });
    if (!check.ok) {
      throw new BadRequestException({ code: check.code, message: check.message });
    }

    const newStatus = nextStatus(schedule.status, action);
    if (!newStatus) {
      throw new BadRequestException({ code: 'INVALID_TRANSITION', message: `状态 ${schedule.status} 不允许执行 ${action}` });
    }
    const updated = await this.prisma.groupSchedule.update({
      where: { id: scheduleId },
      data: {
        status: newStatus,
        version: { increment: 1 },
        rejectReason: action === 'reject' ? (ctx.reason ?? '') : undefined,
      },
      include: { tasks: { orderBy: { orderIndex: 'asc' } } },
    });

    // Build notification payload
    const notificationPayload = {
      projectName: schedule.iteration.project.name,
      iterationName: schedule.iteration.name,
      groupName: group?.name ?? schedule.groupId,
      actorName: user.name,
      action,
      rejectReason: ctx.reason,
      timestamp: new Date().toISOString(),
    };

    // Emit outbox events for state transitions
    if (action === 'submit') {
      // Notify PMs that a schedule is submitted for review
      const pms = await this.prisma.user.findMany({ where: { role: 'PROJECT_MANAGER' } });
      for (const pm of pms) {
        await this.outbox.emit(scheduleId, 'EMAIL', {
          to: pm.email || `${pm.id}@example.com`,
          ...notificationPayload,
        });
        await this.outbox.emit(scheduleId, 'DINGTALK', {
          webhookUrl: process.env.DINGTALK_WEBHOOK_URL,
          ...notificationPayload,
        });
      }
    } else if (action === 'approve') {
      // Notify the GL who submitted
      const gls = await this.prisma.user.findMany({
        where: { role: 'GROUP_LEADER', groupId: schedule.groupId },
      });
      for (const gl of gls) {
        await this.outbox.emit(scheduleId, 'EMAIL', {
          to: gl.email || `${gl.id}@example.com`,
          ...notificationPayload,
        });
        await this.outbox.emit(scheduleId, 'DINGTALK', {
          webhookUrl: process.env.DINGTALK_WEBHOOK_URL,
          ...notificationPayload,
        });
      }
    } else if (action === 'reject') {
      // Notify the GL who submitted
      const gls = await this.prisma.user.findMany({
        where: { role: 'GROUP_LEADER', groupId: schedule.groupId },
      });
      for (const gl of gls) {
        await this.outbox.emit(scheduleId, 'EMAIL', {
          to: gl.email || `${gl.id}@example.com`,
          ...notificationPayload,
        });
        await this.outbox.emit(scheduleId, 'DINGTALK', {
          webhookUrl: process.env.DINGTALK_WEBHOOK_URL,
          ...notificationPayload,
        });
      }
    }

    return { ok: true, schedule: updated };
  }
}
