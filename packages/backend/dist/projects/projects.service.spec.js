"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    it('UT-PRJ-01: PROJECT_MANAGER uses empty where clause (matches all)', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'u_pm', role: 'PROJECT_MANAGER' });
        mockPrisma.project.findMany.mockResolvedValue([]);
        await svc.findAll('u_pm', 'PROJECT_MANAGER');
        const [, callArgs] = mockPrisma.project.findMany.mock.calls[0];
        // { AND: [] } is truthy in Prisma – it matches all records
        expect(callArgs.where).toEqual({ AND: [] });
    });
    // ── UT-PRJ-02: GROUP_LEADER sees only their projects ─────────────────────────
    it('UT-PRJ-02: GROUP_LEADER filters by member id', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'u_gl', role: 'GROUP_LEADER' });
        mockPrisma.project.findMany.mockResolvedValue([]);
        await svc.findAll('u_gl', 'GROUP_LEADER');
        const [, callArgs] = mockPrisma.project.findMany.mock.calls[0];
        expect(callArgs.where).toEqual({ members: { some: { id: 'u_gl' } } });
    });
    // ── UT-PRJ-03: findAll includes iterations and schedule summary ───────────────
    it('UT-PRJ-03: findAll includes iterations and schedules in response', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ id: 'u_pm', role: 'PROJECT_MANAGER' });
        mockPrisma.project.findMany.mockResolvedValue([{ id: 'proj-1', name: 'OA', iterations: [] }]);
        const result = await svc.findAll('u_pm', 'PROJECT_MANAGER');
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