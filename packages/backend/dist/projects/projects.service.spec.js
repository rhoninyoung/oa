"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Jest: findMany/upsert 等单对象参数 —— mock.calls[0] 为 [一个对象]；用 const [x] 而非 const [,x]。
const projects_service_js_1 = require("./projects.service.js");
const mockPrisma = {
    user: { findUnique: jest.fn() },
    project: { findMany: jest.fn() },
};
describe('ProjectsService', () => {
    let svc;
    beforeEach(() => {
        svc = new projects_service_js_1.ProjectsService(mockPrisma);
        jest.clearAllMocks();
    });
    // ── UT-PRJ-01: PROJECT_MANAGER sees all projects ─────────────────────────────
    it('UT-PRJ-01: PROJECT_MANAGER has no where filter (matches all)', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'u_pm', role: 'PROJECT_MANAGER' });
        mockPrisma.project.findMany.mockResolvedValue([]);
        await svc.findAll('u_pm');
        const [callArgs] = mockPrisma.project.findMany.mock.calls[0];
        // PM path: no where clause, returns all projects
        expect(callArgs.where).toBeUndefined();
    });
    // ── UT-PRJ-02: GROUP_LEADER sees only their groups projects ─────────────────
    it('UT-PRJ-02: GROUP_LEADER filters by their groupId via schedules', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
            id: 'u_gl',
            role: 'GROUP_LEADER',
            groupId: 'g1',
        });
        mockPrisma.project.findMany.mockResolvedValue([]);
        await svc.findAll('u_gl');
        const [callArgs] = mockPrisma.project.findMany.mock.calls[0];
        expect(callArgs.where).toEqual({
            iterations: {
                some: {
                    schedules: {
                        some: { groupId: 'g1' },
                    },
                },
            },
        });
    });
    // ── UT-PRJ-03: findAll includes iterations and schedule summary ───────────────
    it('UT-PRJ-03: findAll includes iterations and schedules in response', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'u_pm', role: 'PROJECT_MANAGER' });
        mockPrisma.project.findMany.mockResolvedValue([{ id: 'proj-1', name: 'OA', iterations: [] }]);
        const result = await svc.findAll('u_pm');
        expect(result).toEqual([{ id: 'proj-1', name: 'OA', iterations: [] }]);
        expect(mockPrisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
            include: {
                iterations: {
                    include: {
                        schedules: { select: { groupId: true, status: true } },
                    },
                },
            },
        }));
    });
});
//# sourceMappingURL=projects.service.spec.js.map