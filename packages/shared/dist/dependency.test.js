"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dependency_js_1 = require("./dependency.js");
const makeTask = (id, scheduleId = 's1', depId = null) => ({
    id,
    scheduleId,
    orderIndex: 0,
    name: id,
    ownerId: null,
    startDate: null,
    endDate: null,
    durationDays: null,
    dependencyTaskId: depId,
    source: 'GROUP',
});
describe('detectCycle', () => {
    // ── DT-DEP-01: empty graph → no cycle ────────────────────────────────────────
    it('DT-DEP-01: empty graph → no cycle', () => {
        expect((0, dependency_js_1.detectCycle)(new Map())).toEqual({ hasCycle: false });
    });
    // ── DT-DEP-02: self-loop A→A ────────────────────────────────────────────────
    it('DT-DEP-02: self-loop A→A → CYCLE_SELF', () => {
        const graph = new Map([['A', new Set(['A'])]]);
        expect((0, dependency_js_1.detectCycle)(graph)).toMatchObject({
            hasCycle: true,
            type: 'CYCLE_SELF',
            path: ['A', 'A'],
        });
    });
    // ── DT-DEP-03: two-node A→B→A ───────────────────────────────────────────────
    it('DT-DEP-03: A→B→A → CYCLE', () => {
        const graph = new Map([
            ['A', new Set(['B'])],
            ['B', new Set(['A'])],
        ]);
        const result = (0, dependency_js_1.detectCycle)(graph);
        expect(result.hasCycle).toBe(true);
        expect(result.type).toBe('CYCLE');
        // path should contain the cycle (at minimum A and B)
        expect(result.path).toContain('A');
        expect(result.path).toContain('B');
    });
    // ── DT-DEP-04: chain A→B→C→A ───────────────────────────────────────────────
    it('DT-DEP-04: chain A→B→C→A → full cycle path', () => {
        const graph = new Map([
            ['A', new Set(['B'])],
            ['B', new Set(['C'])],
            ['C', new Set(['A'])],
        ]);
        const result = (0, dependency_js_1.detectCycle)(graph);
        expect(result.hasCycle).toBe(true);
        expect(result.type).toBe('CYCLE');
        // Should capture the full chain A→B→C→A
        expect(result.path.join('')).toMatch(/A.*B.*C.*A/);
    });
    // ── DT-DEP-05: DAG A→B, A→C, B→D ──────────────────────────────────────────
    it('DT-DEP-05: DAG → no cycle', () => {
        const graph = new Map([
            ['A', new Set(['B', 'C'])],
            ['B', new Set(['D'])],
            ['C', new Set([])],
            ['D', new Set([])],
        ]);
        expect((0, dependency_js_1.detectCycle)(graph)).toEqual({ hasCycle: false });
    });
});
describe('setDependency', () => {
    // ── DT-DEP-06: task with existing dep → ONE_TO_ONE_VIOLATION ─────────────────
    it('DT-DEP-06: task with existing dep → ONE_TO_ONE_VIOLATION', () => {
        const tasks = [
            makeTask('T1'),
            { ...makeTask('T2'), dependencyTaskId: 'T1' },
        ];
        const result = (0, dependency_js_1.setDependency)('T2', 'T3', tasks);
        expect(result).toMatchObject({ ok: false, code: 'ONE_TO_ONE_VIOLATION' });
    });
    it('DT-DEP-06b: task without dep can set one', () => {
        const tasks = [makeTask('T1'), makeTask('T2')];
        const result = (0, dependency_js_1.setDependency)('T2', 'T1', tasks);
        expect(result).toMatchObject({ ok: true });
        const updated = result.updatedTasks;
        const t2 = updated.find(t => t.id === 'T2');
        expect(t2?.dependencyTaskId).toBe('T1');
    });
    it('DT-DEP-06c: null dep clears existing dependency', () => {
        const tasks = [{ ...makeTask('T2'), dependencyTaskId: 'T1' }];
        const result = (0, dependency_js_1.setDependency)('T2', null, tasks);
        expect(result).toMatchObject({ ok: true });
        const updated = result.updatedTasks;
        expect(updated[0].dependencyTaskId).toBeNull();
    });
});
//# sourceMappingURL=dependency.test.js.map