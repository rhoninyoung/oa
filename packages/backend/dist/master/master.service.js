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
exports.MasterService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../prisma.service.js");
const outbox_service_js_1 = require("../outbox/outbox.service.js");
let MasterService = class MasterService {
    prisma;
    outbox;
    constructor(prisma, outbox) {
        this.prisma = prisma;
        this.outbox = outbox;
    }
    async getMasterView(iterationId, _userId) {
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
    async addMasterRow(iterationId, ownerId, userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.role !== 'PROJECT_MANAGER')
            throw new common_1.ForbiddenException({ code: 'ACTOR_NOT_PM' });
        const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
        if (!owner?.groupId)
            throw new common_1.NotFoundException('Owner not found');
        const schedule = await this.prisma.groupSchedule.findUnique({
            where: { iterationId_groupId: { iterationId, groupId: owner.groupId } },
        });
        if (!schedule)
            throw new common_1.NotFoundException('Schedule not found');
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
    async deleteMasterRow(taskId, userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.role !== 'PROJECT_MANAGER')
            throw new common_1.ForbiddenException({ code: 'ACTOR_NOT_PM' });
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task)
            throw new common_1.NotFoundException();
        if (task.source !== 'MASTER')
            throw new common_1.ForbiddenException({ code: 'SYNC_ROW_READONLY' });
        await this.prisma.task.delete({ where: { id: taskId } });
        return { deleted: true };
    }
};
exports.MasterService = MasterService;
exports.MasterService = MasterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        outbox_service_js_1.OutboxService])
], MasterService);
//# sourceMappingURL=master.service.js.map