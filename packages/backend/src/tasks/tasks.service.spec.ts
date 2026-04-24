// Jest: Prisma/共享库 mock 与实现一致（如 SetDependencyResult 的 code 与 cyclePath 分支；buildGraph 边方向=任务→依赖前驱）。
import { TasksService } from './tasks.service.js';

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
  let svc: TasksService;

  beforeEach(() => {
    svc = new TasksService(mockPrisma as any);
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

    await expect(svc.deleteRow('nonexistent', 'u1')).rejects.toThrow('Not Found');
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
    setDependency.mockReturnValue({ ok: false, code: 'CYCLE', cyclePath: ['t1', 't2'] });
    mockPrisma.task.findUnique.mockResolvedValue({ id: 't1', scheduleId: 'sched-1' });
    mockPrisma.task.findMany.mockResolvedValue([]);

    await expect(svc.setDependency('t1', 't2', 'u1')).rejects.toMatchObject({
      response: { code: 'CYCLE', cyclePath: ['t1', 't2'] },
    });
  });

  // ── UT-TSK-07: ONE_TO_ONE_VIOLATION must NOT include cyclePath ──────────────
  // REGRESSION: previously the code accessed result.cyclePath unconditionally,
  // triggering TS2339 because ONE_TO_ONE_VIOLATION has no cyclePath property.
  it('UT-TSK-07: ONE_TO_ONE_VIOLATION throws without cyclePath in error object', async () => {
    const { setDependency } = jest.requireMock('@oa-mvp/shared');
    // Return type has .code but NOT .cyclePath — this is the exact shape that caused TS2339
    setDependency.mockReturnValue({ ok: false, code: 'ONE_TO_ONE_VIOLATION' });
    mockPrisma.task.findUnique.mockResolvedValue({ id: 't1', scheduleId: 'sched-1' });
    mockPrisma.task.findMany.mockResolvedValue([]);

    // Must throw BadRequestException with only code — no cyclePath key allowed
    await expect(svc.setDependency('t1', 't3', 'u1')).rejects.toMatchObject({
      response: { code: 'ONE_TO_ONE_VIOLATION' },
    });
    // Verify cyclePath is absent from the thrown error
    const err = await svc.setDependency('t1', 't3', 'u1').catch((e) => e.getResponse());
    expect(err).not.toMatchObject({ cyclePath: expect.anything() });
  });

  // ── UT-TSK-08: setDependency success → updates task.dependencyTaskId ──────────
  it('UT-TSK-08: setDependency succeeds and persists new dependency', async () => {
    const { setDependency } = jest.requireMock('@oa-mvp/shared');
    setDependency.mockReturnValue({ ok: true, updatedTasks: [] });
    mockPrisma.task.findUnique.mockResolvedValue({ id: 't1', scheduleId: 'sched-1' });
    mockPrisma.task.findMany.mockResolvedValue([]);
    mockPrisma.task.update.mockResolvedValue({});

    const result = await svc.setDependency('t1', 't2', 'u1');

    expect(result).toEqual({ ok: true });
    expect(mockPrisma.task.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { dependencyTaskId: 't2' },
    });
  });

  // ── UT-TSK-06: propagateFinishChange returns downstream task ids ──────────────
  it('UT-TSK-06: propagateFinishChange returns all tasks downstream of the given task', async () => {
    const { buildGraph } = jest.requireMock('@oa-mvp/shared');
    buildGraph.mockReturnValue(
      new Map([
        ['t1', []],
        ['t2', ['t1']],
        ['t3', ['t1']],
        ['t4', ['t2']],
      ]),
    );
    mockPrisma.task.findMany.mockResolvedValue([
      { id: 't1' },
      { id: 't2' },
      { id: 't3' },
      { id: 't4' },
    ]);

    const result = await svc.propagateFinishChange('t1');

    expect(result.affectedTaskIds).toEqual(expect.arrayContaining(['t2', 't3', 't4']));
  });
});
