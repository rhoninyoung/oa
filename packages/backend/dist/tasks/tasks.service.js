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
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../prisma.service.js");
const shared_1 = require("@oa-mvp/shared");
let TasksService = class TasksService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findOne(taskId) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        return task;
    }
    async updateTask(taskId, data, _userId) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        return this.prisma.task.update({
            where: { id: taskId },
            data: {
                name: data.name ?? task.name,
                ownerId: data.ownerId ?? task.ownerId,
                startDate: data.startDate ? new Date(data.startDate) : task.startDate,
                endDate: data.endDate ? new Date(data.endDate) : task.endDate,
                durationDays: data.durationDays ?? task.durationDays,
                dependencyTaskId: data.dependencyTaskId ?? task.dependencyTaskId,
            },
        });
    }
    async insertRow(scheduleId, afterIndex, _userId) {
        // Renumber all tasks after `afterIndex`
        await this.prisma.task.updateMany({
            where: { scheduleId, orderIndex: { gt: afterIndex } },
            data: { orderIndex: { increment: 1 } },
        });
        return this.prisma.task.create({
            data: { scheduleId, orderIndex: afterIndex + 1, name: '', source: 'GROUP' },
        });
    }
    async deleteRow(taskId, _userId) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { schedule: { select: { status: true } } },
        });
        if (!task)
            throw new common_1.NotFoundException();
        // Only MASTER source rows can be freely deleted;
        // GROUP rows can only be deleted when schedule is PENDING/REJECTED
        if (task.source === 'GROUP' && !['PENDING', 'REJECTED'].includes(task.schedule.status)) {
            throw new common_1.BadRequestException({ code: 'SYNC_ROW_READONLY' });
        }
        await this.prisma.task.delete({ where: { id: taskId } });
        // Reindex remaining tasks
        const remaining = await this.prisma.task.findMany({
            where: { scheduleId: task.scheduleId },
            orderBy: { orderIndex: 'asc' },
        });
        for (let i = 0; i < remaining.length; i++) {
            if (remaining[i].orderIndex !== i + 1) {
                await this.prisma.task.update({
                    where: { id: remaining[i].id },
                    data: { orderIndex: i + 1 },
                });
            }
        }
        return { deleted: true };
    }
    async setDependency(taskId, depId, _userId) {
        const tasks = await this.prisma.task.findMany({
            where: {
                scheduleId: (await this.prisma.task.findUnique({ where: { id: taskId } }))?.scheduleId ?? '',
            },
        });
        const result = (0, shared_1.setDependency)(taskId, depId, tasks);
        if (!result.ok) {
            const err = { code: result.code };
            if (result.code === 'CYCLE')
                err.cyclePath = result.cyclePath;
            throw new common_1.BadRequestException(err);
        }
        await this.prisma.task.update({
            where: { id: taskId },
            data: { dependencyTaskId: depId },
        });
        return { ok: true };
    }
    async propagateFinishChange(taskId) {
        // Returns list of downstream tasks whose dates need updating
        const tasks = await this.prisma.task.findMany();
        const graph = (0, shared_1.buildGraph)(tasks);
        // Build downstream map: for each task, who depends on it?
        const downstream = new Map();
        for (const [id, deps] of graph.entries()) {
            for (const depId of deps) {
                if (!downstream.has(depId))
                    downstream.set(depId, []);
                downstream.get(depId).push(id);
            }
        }
        const affected = [];
        const queue = downstream.get(taskId) ?? [];
        const visited = new Set();
        while (queue.length) {
            const curr = queue.shift();
            if (visited.has(curr))
                continue;
            visited.add(curr);
            affected.push(curr);
            for (const n of downstream.get(curr) ?? [])
                queue.push(n);
        }
        return { affectedTaskIds: affected };
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map