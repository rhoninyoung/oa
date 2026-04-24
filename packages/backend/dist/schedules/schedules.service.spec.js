"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schedules_service_js_1 = require("./schedules.service.js");
const shared_1 = require("@oa-mvp/shared");
jest.mock('@oa-mvp/shared', () => ({ canTransition: jest.fn() }));
jest.mock('../outbox/outbox.service.js');
const mockPrisma = {
    user: { findUnique: jest.fn() },
    groupSchedule: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
    },
    task: { deleteMany: jest.fn(), create: jest.fn() },
    approvalRecord: { create: jest.fn() },
};
describe('SchedulesService', () => {
    let svc;
    let mockOutbox;
    beforeEach(() => {
        mockOutbox = {
            emit: jest.fn(),
            dismissPendingForEvent: jest.fn(),
        };
        svc = new schedules_service_js_1.SchedulesService(mockPrisma, mockOutbox);
        jest.clearAllMocks();
        shared_1.canTransition.mockReturnValue({ ok: true });
    });
    // ── UT-SCH-01: findOne returns schedule with ordered tasks ───────────────────
    it('UT-SCH-01: findOne returns schedule with tasks ordered by orderIndex', async () => {
        const schedule = { id: 'sched-1', status: 'PENDING', tasks: [] };
        mockPrisma.groupSchedule.findUnique.mockResolvedValue(schedule);
        const result = await svc.findOne('sched-1', 'u1');
        expect(mockPrisma.groupSchedule.findUnique).toHaveBeenCalledWith({
            where: { id: 'sched-1' },
            include: { tasks: { orderBy: { orderIndex: 'asc' } } },
        });
        expect(result).toEqual(schedule);
    });
    // ── UT-SCH-02: findOne throws NotFoundException for unknown schedule ─────────
    it('UT-SCH-02: findOne throws NotFoundException when schedule does not exist', async () => {
        mockPrisma.groupSchedule.findUnique.mockResolvedValue(null);
        await expect(svc.findOne('nonexistent', 'u1')).rejects.toThrow('Schedule not found');
    });
    // ── UT-SCH-03: submit calls canTransition before updating status ───────────
    it('UT-SCH-03: submit checks canTransition(PENDING → REVIEWING, GROUP_LEADER)', async () => {
        mockPrisma.groupSchedule.findUnique.mockResolvedValue({
            id: 'sched-1',
            status: 'PENDING',
            groupId: 'g1',
            iterationId: 'iter-1',
            tasks: [{ name: 'task 1' }],
        });
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'GROUP_LEADER' });
        mockPrisma.groupSchedule.update.mockResolvedValue({
            id: 'sched-1',
            status: 'REVIEWING',
            version: 2,
        });
        await svc.submit('sched-1', 'u1');
        expect(shared_1.canTransition).toHaveBeenCalledWith('PENDING', 'REVIEWING', 'GROUP_LEADER', {
            tasksNonEmpty: true,
        });
    });
    // ── UT-SCH-04: submit blocks transition when canTransition returns ok:false ──
    it('UT-SCH-04: submit throws BadRequestException when canTransition rejects', async () => {
        shared_1.canTransition.mockReturnValue({ ok: false, code: 'CONTENT_EMPTY' });
        mockPrisma.groupSchedule.findUnique.mockResolvedValue({
            id: 'sched-1',
            status: 'PENDING',
            tasks: [],
        });
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'GROUP_LEADER' });
        await expect(svc.submit('sched-1', 'u1')).rejects.toMatchObject({
            response: { code: 'CONTENT_EMPTY' },
        });
    });
    // ── UT-SCH-05: submit emits SCHEDULE_SUBMITTED event ─────────────────────────
    it('UT-SCH-05: submit calls outbox.emit with SCHEDULE_SUBMITTED', async () => {
        mockPrisma.groupSchedule.findUnique.mockResolvedValue({
            id: 'sched-1',
            status: 'PENDING',
            groupId: 'g1',
            iterationId: 'iter-1',
            tasks: [{ name: 'task' }],
        });
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'GROUP_LEADER' });
        mockPrisma.groupSchedule.update.mockResolvedValue({
            id: 'sched-1',
            status: 'REVIEWING',
            version: 2,
        });
        await svc.submit('sched-1', 'u1');
        expect(mockOutbox.emit).toHaveBeenCalledWith('SCHEDULE_SUBMITTED', {
            scheduleId: 'sched-1',
            groupId: 'g1',
            iterationId: 'iter-1',
        });
    });
    // ── UT-SCH-06: withdraw calls dismissPendingForEvent ───────────────────────
    it('UT-SCH-06: withdraw calls outbox.dismissPendingForEvent to cancel pending notifications', async () => {
        mockPrisma.groupSchedule.findUnique.mockResolvedValue({
            id: 'sched-1',
            status: 'REVIEWING',
            groupId: 'g1',
            iterationId: 'iter-1',
        });
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'GROUP_LEADER' });
        mockPrisma.groupSchedule.update.mockResolvedValue({
            id: 'sched-1',
            status: 'PENDING',
            version: 2,
        });
        await svc.withdraw('sched-1', 'u1');
        expect(mockOutbox.dismissPendingForEvent).toHaveBeenCalledWith('SCHEDULE_SUBMITTED', 'sched-1');
    });
    // ── UT-SCH-07: reject throws when reason is empty ───────────────────────────
    it('UT-SCH-07: reject throws REASON_INVALID when reason is empty', async () => {
        await expect(svc.reject('sched-1', 'u1', '')).rejects.toMatchObject({
            response: { code: 'REASON_INVALID' },
        });
    });
    // ── UT-SCH-08: reject throws when reason exceeds 200 characters ──────────────
    it('UT-SCH-08: reject throws REASON_INVALID when reason exceeds 200 chars', async () => {
        const longReason = 'a'.repeat(201);
        await expect(svc.reject('sched-1', 'u1', longReason)).rejects.toMatchObject({
            response: { code: 'REASON_INVALID' },
        });
    });
    // ── UT-SCH-09: approve records approval and emits SCHEDULE_APPROVED ──────────
    it('UT-SCH-09: approve creates approvalRecord and emits SCHEDULE_APPROVED', async () => {
        mockPrisma.groupSchedule.findUnique.mockResolvedValue({
            id: 'sched-1',
            status: 'REVIEWING',
            groupId: 'g1',
            iterationId: 'iter-1',
            tasks: [],
        });
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'pm1', role: 'PROJECT_MANAGER' });
        mockPrisma.groupSchedule.update.mockResolvedValue({
            id: 'sched-1',
            status: 'APPROVED',
            version: 2,
        });
        mockPrisma.approvalRecord.create.mockResolvedValue({});
        await svc.approve('sched-1', 'pm1');
        expect(mockPrisma.approvalRecord.create).toHaveBeenCalledWith({
            data: { scheduleId: 'sched-1', reviewerId: 'pm1', action: 'APPROVE' },
        });
        expect(mockOutbox.emit).toHaveBeenCalledWith('SCHEDULE_APPROVED', {
            scheduleId: 'sched-1',
            iterationId: 'iter-1',
        });
    });
    // ── UT-SCH-10: reschedule transitions to REJECTED and emits RESCHEDULE ───────
    it('UT-SCH-10: reschedule transitions to REJECTED and emits RESCHEDULE event', async () => {
        mockPrisma.groupSchedule.findUnique.mockResolvedValue({
            id: 'sched-1',
            status: 'APPROVED',
            groupId: 'g1',
            iterationId: 'iter-1',
        });
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'pm1', role: 'PROJECT_MANAGER' });
        mockPrisma.groupSchedule.update.mockResolvedValue({
            id: 'sched-1',
            status: 'REJECTED',
            version: 2,
        });
        mockPrisma.approvalRecord.create.mockResolvedValue({});
        await svc.reschedule('sched-1', 'pm1');
        expect(shared_1.canTransition).toHaveBeenCalledWith('APPROVED', 'REJECTED', 'PROJECT_MANAGER', {});
        expect(mockOutbox.emit).toHaveBeenCalledWith('RESCHEDULE', {
            scheduleId: 'sched-1',
            groupId: 'g1',
            iterationId: 'iter-1',
        });
    });
});
//# sourceMappingURL=schedules.service.spec.js.map