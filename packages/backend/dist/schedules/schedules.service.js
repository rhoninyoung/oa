"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../prisma.service.js");
const outbox_service_js_1 = require("../outbox/outbox.service.js");
const shared_1 = require("@oa-mvp/shared");
let SchedulesService = class SchedulesService {
    prisma;
    outbox;
    constructor(prisma, outbox) {
        this.prisma = prisma;
        this.outbox = outbox;
    }
    // ── Read ─────────────────────────────────────────────────────────────────────
    async findOne(scheduleId, _userId) {
        const schedule = await this.prisma.groupSchedule.findUnique({
            where: { id: scheduleId },
            include: { tasks: { orderBy: { orderIndex: 'asc' } } },
        });
        if (!schedule)
            throw new common_1.NotFoundException('Schedule not found');
        return schedule;
    }
    async findForIteration(iterationId, _userId, _userRole) {
        return this.prisma.groupSchedule.findMany({
            where: { iterationId },
            include: { tasks: { orderBy: { orderIndex: 'asc' } } },
        });
    }
    // ── Draft auto-save with optimistic lock ────────────────────────────────────
    async saveDraft(scheduleId, tasks, version, _userId) {
        const schedule = await this.prisma.groupSchedule.findUnique({ where: { id: scheduleId } });
        if (!schedule)
            throw new common_1.NotFoundException();
        if (schedule.version !== version) {
            throw new common_1.ConflictException({
                code: 'VERSION_CONFLICT',
                latestVersion: schedule.version,
            });
        }
        // Delete existing tasks and recreate
        await this.prisma.task.deleteMany({ where: { scheduleId } });
        await Promise.all(tasks.map((t, i) => this.prisma.task.create({
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
        })));
        const updated = await this.prisma.groupSchedule.update({
            where: { id: scheduleId },
            data: { version: { increment: 1 } },
            include: { tasks: { orderBy: { orderIndex: 'asc' } } },
        });
        return { ...updated, newVersion: updated.version };
    }
    // ── State transitions ───────────────────────────────────────────────────────
    async getUser(userId) {
        return this.prisma.user.findUnique({ where: { id: userId } });
    }
    async submit(scheduleId, userId) {
        const [schedule, user] = await Promise.all([
            this.prisma.groupSchedule.findUnique({ where: { id: scheduleId }, include: { tasks: true } }),
            this.getUser(userId),
        ]);
        if (!schedule || !user)
            throw new common_1.NotFoundException();
        const tasksNonEmpty = schedule.tasks.some((t) => t.name.trim() !== '');
        const result = (0, shared_1.canTransition)(schedule.status, 'REVIEWING', user.role, {
            tasksNonEmpty,
        });
        if (!result.ok)
            throw new common_1.BadRequestException({ code: result.code });
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
    async withdraw(scheduleId, userId) {
        const [schedule, user] = await Promise.all([
            this.prisma.groupSchedule.findUnique({ where: { id: scheduleId } }),
            this.getUser(userId),
        ]);
        if (!schedule || !user)
            throw new common_1.NotFoundException();
        const result = (0, shared_1.canTransition)(schedule.status, 'PENDING', user.role, {});
        if (!result.ok)
            throw new common_1.BadRequestException({ code: result.code });
        const updated = await this.prisma.groupSchedule.update({
            where: { id: scheduleId },
            data: { status: 'PENDING', version: { increment: 1 } },
        });
        await this.outbox.dismissPendingForEvent('SCHEDULE_SUBMITTED', scheduleId);
        return updated;
    }
    async approve(scheduleId, userId) {
        const [schedule, user] = await Promise.all([
            this.prisma.groupSchedule.findUnique({ where: { id: scheduleId }, include: { tasks: true } }),
            this.getUser(userId),
        ]);
        if (!schedule || !user)
            throw new common_1.NotFoundException();
        const result = (0, shared_1.canTransition)(schedule.status, 'APPROVED', user.role, {});
        if (!result.ok)
            throw new common_1.ForbiddenException({ code: result.code });
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
    async reject(scheduleId, userId, reason) {
        if (!reason || reason.length > 200) {
            throw new common_1.BadRequestException({ code: 'REASON_INVALID' });
        }
        const [schedule, user] = await Promise.all([
            this.prisma.groupSchedule.findUnique({ where: { id: scheduleId } }),
            this.getUser(userId),
        ]);
        if (!schedule || !user)
            throw new common_1.NotFoundException();
        const result = (0, shared_1.canTransition)(schedule.status, 'REJECTED', user.role, {
            rejectReason: reason,
        });
        if (!result.ok)
            throw new common_1.ForbiddenException({ code: result.code });
        const updated = await this.prisma.groupSchedule.update({
            where: { id: scheduleId },
            data: { status: 'REJECTED', rejectReason: reason, version: { increment: 1 } },
        });
        await this.prisma.approvalRecord.create({
            data: { scheduleId, reviewerId: userId, action: 'REJECT', reason },
        });
        return updated;
    }
    async reschedule(scheduleId, userId) {
        const [schedule, user] = await Promise.all([
            this.prisma.groupSchedule.findUnique({ where: { id: scheduleId } }),
            this.getUser(userId),
        ]);
        if (!schedule || !user)
            throw new common_1.NotFoundException();
        const result = (0, shared_1.canTransition)(schedule.status, 'REJECTED', user.role, {});
        if (!result.ok)
            throw new common_1.ForbiddenException({ code: result.code });
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
};
exports.SchedulesService = SchedulesService;
exports.SchedulesService = SchedulesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        outbox_service_js_1.OutboxService])
], SchedulesService);
//# sourceMappingURL=schedules.service.js.map