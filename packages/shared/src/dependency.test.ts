import { detectCycle, setDependency } from './dependency.js';
import type { Task } from './types.js';

const makeTask = (id: string, scheduleId = 's1', depId: string | null = null): Task => ({
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
    expect(detectCycle(new Map())).toEqual({ hasCycle: false });
  });

  // ── DT-DEP-02: self-loop A→A ────────────────────────────────────────────────
  it('DT-DEP-02: self-loop A→A → CYCLE_SELF', () => {
    const graph = new Map<string, Set<string>>([['A', new Set(['A'])]]);
    expect(detectCycle(graph)).toMatchObject({
      hasCycle: true,
      type: 'CYCLE_SELF',
      path: ['A', 'A'],
    });
  });

  // ── DT-DEP-03: two-node A→B→A ───────────────────────────────────────────────
  it('DT-DEP-03: A→B→A → CYCLE', () => {
    const graph = new Map<string, Set<string>>([
      ['A', new Set(['B'])],
      ['B', new Set(['A'])],
    ]);
    const result = detectCycle(graph);
    expect(result.hasCycle).toBe(true);
    expect((result as any).type).toBe('CYCLE');
    // path should contain the cycle (at minimum A and B)
    expect((result as any).path).toContain('A');
    expect((result as any).path).toContain('B');
  });

  // ── DT-DEP-04: chain A→B→C→A ───────────────────────────────────────────────
  it('DT-DEP-04: chain A→B→C→A → full cycle path', () => {
    const graph = new Map<string, Set<string>>([
      ['A', new Set(['B'])],
      ['B', new Set(['C'])],
      ['C', new Set(['A'])],
    ]);
    const result = detectCycle(graph);
    expect(result.hasCycle).toBe(true);
    expect((result as any).type).toBe('CYCLE');
    // Should capture the full chain A→B→C→A
    expect((result as any).path.join('')).toMatch(/A.*B.*C.*A/);
  });

  // ── DT-DEP-05: DAG A→B, A→C, B→D ──────────────────────────────────────────
  it('DT-DEP-05: DAG → no cycle', () => {
    const graph = new Map<string, Set<string>>([
      ['A', new Set(['B', 'C'])],
      ['B', new Set(['D'])],
      ['C', new Set([])],
      ['D', new Set([])],
    ]);
    expect(detectCycle(graph)).toEqual({ hasCycle: false });
  });
});

describe('setDependency', () => {
  // ── DT-DEP-06: task with existing dep → ONE_TO_ONE_VIOLATION ─────────────────
  it('DT-DEP-06: task with existing dep → ONE_TO_ONE_VIOLATION', () => {
    const tasks: Task[] = [
      makeTask('T1'),
      { ...makeTask('T2'), dependencyTaskId: 'T1' },
    ];
    const result = setDependency('T2', 'T3', tasks);
    expect(result).toMatchObject({ ok: false, code: 'ONE_TO_ONE_VIOLATION' });
  });

  it('DT-DEP-06b: task without dep can set one', () => {
    const tasks: Task[] = [makeTask('T1'), makeTask('T2')];
    const result = setDependency('T2', 'T1', tasks);
    expect(result).toMatchObject({ ok: true });
    const updated = (result as { ok: true; updatedTasks: Task[] }).updatedTasks;
    const t2 = updated.find(t => t.id === 'T2');
    expect(t2?.dependencyTaskId).toBe('T1');
  });

  it('DT-DEP-06c: null dep clears existing dependency', () => {
    const tasks: Task[] = [{ ...makeTask('T2'), dependencyTaskId: 'T1' }];
    const result = setDependency('T2', null, tasks);
    expect(result).toMatchObject({ ok: true });
    const updated = (result as { ok: true; updatedTasks: Task[] }).updatedTasks;
    expect(updated[0].dependencyTaskId).toBeNull();
  });
});
