import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { canTransition } from '@oa-mvp/shared';
import type { Role } from '@oa-mvp/shared';

interface TaskInput {
  id?: string;
  name?: string;
  ownerId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  durationDays?: number | null;
  dependencyTaskId?: string | null;
  source?: 'GROUP' | 'MASTER';
}

@Injectable()
export class SchedulesService {
  constructor(
    private prisma: PrismaService,
    private outbox: OutboxService,
  ) {}

  // ── Read ─────────────────────────────────────────────────────────────────────

  async findOne(scheduleId: string, _userId: string) {
    const schedule = await this.prisma.groupSchedule.findUnique({
      where: { id: scheduleId },
      include: { tasks: { orderBy: { orderIndex: 'asc' } } },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');
    return schedule;
  }

  async findForIteration(iterationId: string, _userId: string, _userRole: Role) {
    return this.prisma.groupSchedule.findMany({
      where: { iterationId },
      include: { tasks: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  // ── Draft auto-save with optimistic lock ────────────────────────────────────

  async saveDraft(scheduleId: string, tasks: unknown[], version: number, _userId: string) {
    const schedule = await this.prisma.groupSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) throw new NotFoundException();

    if (schedule.version !== version) {
      throw new ConflictException({
        code: 'VERSION_CONFLICT',
        latestVersion: schedule.version,
      });
    }

    // Delete existing tasks and recreate
    await this.prisma.task.deleteMany({ where: { scheduleId } });
    await Promise.all(
      (tasks as TaskInput[]).map((t, i) =>
        this.prisma.task.create({
          data: {
            id: t.id || undefined,
            scheduleId,
            orderIndex: i,
            name: t.name ?? '',
            ownerId: t.ownerId ?? null,
            startDate: t.startDate ? new Date(t.startDate) : null,
            endDate: t.endDate ? new Date(t.endDate) : null,
            durationDays: t.durationDays ?? null,
            dependencyTaskId: t.dependencyTaskId ?? null,
            source: t.source ?? 'GROUP',
          },
        }),
      ),
    );

    const updated = await this.prisma.groupSchedule.update({
      where: { id: scheduleId },
      data: { version: { increment: 1 } },
      include: { tasks: { orderBy: { orderIndex: 'asc' } } },
    });

    return { ...updated, newVersion: updated.version };
  }

  // ── State transitions ───────────────────────────────────────────────────────

  private async getUser(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async submit(scheduleId: string, userId: string) {
    const [schedule, user] = await Promise.all([
      this.prisma.groupSchedule.findUnique({ where: { id: scheduleId }, include: { tasks: true } }),
      this.getUser(userId),
    ]);
    if (!schedule || !user) throw new NotFoundException();

    const tasksNonEmpty = schedule.tasks.some((t) => t.name.trim() !== '');
    const result = canTransition(schedule.status, 'REVIEWING', user.role as Role, {
      tasksNonEmpty,
    });
    if (!result.ok) throw new BadRequestException({ code: result.code });

    const updated = await this.prisma.groupSchedule.update({
      where: { id: scheduleId },
      data: { status: 'REVIEWING', version: { increment: 1 } },
    });

    await this.outbox.emit('SCHEDULE_SUBMITTED', {
      scheduleId,
      groupId: schedule.groupId,
      iterationId: schedule.iterationId,
    });

    return updated;
  }

  async withdraw(scheduleId: string, userId: string) {
    const [schedule, user] = await Promise.all([
      this.prisma.groupSchedule.findUnique({ where: { id: scheduleId } }),
      this.getUser(userId),
    ]);
    if (!schedule || !user) throw new NotFoundException();

    const result = canTransition(schedule.status, 'PENDING', user.role as Role, {});
    if (!result.ok) throw new BadRequestException({ code: result.code });

    const updated = await this.prisma.groupSchedule.update({
      where: { id: scheduleId },
      data: { status: 'PENDING', version: { increment: 1 } },
    });

    await this.outbox.dismissPendingForEvent('SCHEDULE_SUBMITTED', scheduleId);
    return updated;
  }

  async approve(scheduleId: string, userId: string) {
    const [schedule, user] = await Promise.all([
      this.prisma.groupSchedule.findUnique({ where: { id: scheduleId }, include: { tasks: true } }),
      this.getUser(userId),
    ]);
    if (!schedule || !user) throw new NotFoundException();

    const result = canTransition(schedule.status, 'APPROVED', user.role as Role, {});
    if (!result.ok) throw new ForbiddenException({ code: result.code });

    const updated = await this.prisma.groupSchedule.update({
      where: { id: scheduleId },
      data: { status: 'APPROVED', version: { increment: 1 } },
    });

    await this.prisma.approvalRecord.create({
      data: { scheduleId, reviewerId: userId, action: 'APPROVE' },
    });

    await this.outbox.emit('SCHEDULE_APPROVED', { scheduleId, iterationId: schedule.iterationId });

    return updated;
  }

  async reject(scheduleId: string, userId: string, reason: string) {
    if (!reason || reason.length > 200) {
      throw new BadRequestException({ code: 'REASON_INVALID' });
    }

    const [schedule, user] = await Promise.all([
      this.prisma.groupSchedule.findUnique({ where: { id: scheduleId } }),
      this.getUser(userId),
    ]);
    if (!schedule || !user) throw new NotFoundException();

    const result = canTransition(schedule.status, 'REJECTED', user.role as Role, {
      rejectReason: reason,
    });
    if (!result.ok) throw new ForbiddenException({ code: result.code });

    const updated = await this.prisma.groupSchedule.update({
      where: { id: scheduleId },
      data: { status: 'REJECTED', rejectReason: reason, version: { increment: 1 } },
    });

    await this.prisma.approvalRecord.create({
      data: { scheduleId, reviewerId: userId, action: 'REJECT', reason },
    });

    return updated;
  }

  async reschedule(scheduleId: string, userId: string) {
    const [schedule, user] = await Promise.all([
      this.prisma.groupSchedule.findUnique({ where: { id: scheduleId } }),
      this.getUser(userId),
    ]);
    if (!schedule || !user) throw new NotFoundException();

    const result = canTransition(schedule.status, 'REJECTED', user.role as Role, {});
    if (!result.ok) throw new ForbiddenException({ code: result.code });

    const updated = await this.prisma.groupSchedule.update({
      where: { id: scheduleId },
      data: { status: 'REJECTED', version: { increment: 1 } },
    });

    await this.prisma.approvalRecord.create({
      data: { scheduleId, reviewerId: userId, action: 'RESCHEDULE' },
    });

    await this.outbox.emit('RESCHEDULE', {
      scheduleId,
      groupId: schedule.groupId,
      iterationId: schedule.iterationId,
    });

    return updated;
  }
}
