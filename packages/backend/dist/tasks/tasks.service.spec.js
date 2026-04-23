"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tasks_service_js_1 = require("./tasks.service.js");
// Mock the entire shared module – only setDependency / buildGraph / detectCycle are used
jest.mock('@oa-mvp/shared', () => ({
    detectCycle: jest.fn(),
    buildGraph: jest.fn(),
    setDependency: jest.fn(),
}));
const mockPrisma = {
    task: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
    },
};
describe('TasksService', () => {
    let svc;
    beforeEach(() => {
        svc = new tasks_service_js_1.TasksService(mockPrisma);
        jest.clearAllMocks();
    });
    // ── UT-TSK-01: insertRow increments orderIndex of following tasks ───────────
    it('UT-TSK-01: insertRow bumps orderIndex of tasks after the insert position', async () => {
        mockPrisma.task.create.mockResolvedValue({ id: 'new-task', orderIndex: 3 });
        const result = await svc.insertRow('sched-1', 2, 'u1');
        expect(mockPrisma.task.updateMany).toHaveBeenCalledWith({
            where: { scheduleId: 'sched-1', orderIndex: { gt: 2 } },
            data: { orderIndex: { increment: 1 } },
        });
        expect(mockPrisma.task.create).toHaveBeenCalledWith({
            data: { scheduleId: 'sched-1', orderIndex: 3, name: '', source: 'GROUP' },
        });
        expect(result.orderIndex).toBe(3);
    });
    // ── UT-TSK-02: deleteRow throws NotFoundException when task not found ───────
    it('UT-TSK-02: deleteRow throws NotFoundException when task does not exist', async () => {
        mockPrisma.task.findUnique.mockResolvedValue(null);
        await expect(svc.deleteRow('nonexistent', 'u1')).rejects.toThrow('Task not found');
    });
    // ── UT-TSK-03: deleteRow allows MASTER rows regardless of schedule status ───
    it('UT-TSK-03: MASTER source rows can be deleted in any schedule status', async () => {
        mockPrisma.task.findUnique.mockResolvedValue({
            id: 't1',
            scheduleId: 'sched-1',
            source: 'MASTER',
            schedule: { status: 'APPROVED' },
        });
        mockPrisma.task.findMany.mockResolvedValue([]);
        mockPrisma.task.delete.mockResolvedValue({ id: 't1' });
        const result = await svc.deleteRow('t1', 'u1');
        expect(mockPrisma.task.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
        expect(result).toEqual({ deleted: true });
    });
    // ── UT-TSK-04: deleteRow blocks GROUP rows when schedule is APPROVED ─────────
    it('UT-TSK-04: GROUP rows throw SYNC_ROW_READONLY when schedule is APPROVED', async () => {
        mockPrisma.task.findUnique.mockResolvedValue({
            id: 't1',
            scheduleId: 'sched-1',
            source: 'GROUP',
            schedule: { status: 'APPROVED' },
        });
        await expect(svc.deleteRow('t1', 'u1')).rejects.toMatchObject({
            response: { code: 'SYNC_ROW_READONLY' },
        });
    });
    // ── UT-TSK-05: setDependency rejects a cycle ─────────────────────────────────
    it('UT-TSK-05: setDependency throws BadRequestException when cycle is detected', async () => {
        const { setDependency } = jest.requireMock('@oa-mvp/shared');
        setDependency.mockReturnValue({ ok: false, code: 'CYCLE_DETECTED', cyclePath: ['t1', 't2'] });
        mockPrisma.task.findUnique.mockResolvedValue({ id: 't1', scheduleId: 'sched-1' });
        mockPrisma.task.findMany.mockResolvedValue([]);
        await expect(svc.setDependency('t1', 't2', 'u1')).rejects.toMatchObject({
            response: { code: 'CYCLE_DETECTED', cyclePath: ['t1', 't2'] },
        });
    });
    // ── UT-TSK-06: propagateFinishChange returns downstream task ids ──────────────
    it('UT-TSK-06: propagateFinishChange returns all tasks downstream of the given task', async () => {
        const { buildGraph } = jest.requireMock('@oa-mvp/shared');
        buildGraph.mockReturnValue(new Map([['t1', ['t2', 't3']], ['t2', ['t4']], ['t3', []]]));
        mockPrisma.task.findMany.mockResolvedValue([
            { id: 't1' }, { id: 't2' }, { id: 't3' }, { id: 't4' },
        ]);
        const result = await svc.propagateFinishChange('t1');
        expect(result.affectedTaskIds).toEqual(expect.arrayContaining(['t2', 't3', 't4']));
    });
});
//# sourceMappingURL=tasks.service.spec.js.map