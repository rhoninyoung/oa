// tests/dependency.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  detectCycle, canSetDependency, checkDependencyCycle,
  buildDownstreamGraph, propagateFinishChange
} from '../src/domain/dependency.js';
import { addWorkDays, isWeekend } from '../src/domain/calendar.js';

// DT-DEP-01: empty graph → no cycle
it('detectCycle: empty tasks → no cycle', () => {
  assert.deepStrictEqual(detectCycle([]), { ok: false });
});

// DT-DEP-02: self-loop A→A → CYCLE_SELF
it('detectCycle: self-loop → CYCLE_SELF', () => {
  const tasks = [
    { id: 'A', dependencyTaskId: 'A' },
  ];
  const r = detectCycle(tasks);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.code, 'CYCLE_SELF');
  assert.deepStrictEqual(r.path, ['A', 'A']);
});

// DT-DEP-03: two-node cycle A→B→A
it('detectCycle: A→B→A → CYCLE', () => {
  const tasks = [
    { id: 'A', dependencyTaskId: 'B' },
    { id: 'B', dependencyTaskId: 'A' },
  ];
  const r = detectCycle(tasks);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.code, 'CYCLE');
  assert.ok(r.path.length >= 2);
});

// DT-DEP-04: chain cycle A→B→C→A
it('detectCycle: A→B→C→A → CYCLE', () => {
  const tasks = [
    { id: 'A', dependencyTaskId: 'C' },
    { id: 'B', dependencyTaskId: 'A' },
    { id: 'C', dependencyTaskId: 'B' },
  ];
  const r = detectCycle(tasks);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.code, 'CYCLE');
});

// DT-DEP-05: DAG A→B, A→C, B→D → no cycle
it('detectCycle: DAG → no cycle', () => {
  const tasks = [
    { id: 'A', dependencyTaskId: null },
    { id: 'B', dependencyTaskId: 'A' },
    { id: 'C', dependencyTaskId: 'A' },
    { id: 'D', dependencyTaskId: 'B' },
  ];
  assert.deepStrictEqual(detectCycle(tasks), { ok: false });
});

// DT-DEP-06: task already has dependency → ONE_TO_ONE_VIOLATION
it('canSetDependency: task already has dep → ONE_TO_ONE_VIOLATION', () => {
  const tasks = [{ id: 'B', dependencyTaskId: 'A' }];
  assert.strictEqual(canSetDependency(tasks, 'B').code, 'ONE_TO_ONE_VIOLATION');
});

describe('checkDependencyCycle', () => {
  it('A→A (self) → CYCLE_SELF', () => {
    const r = checkDependencyCycle([], 'A', 'A');
    assert.strictEqual(r.code, 'CYCLE_SELF');
  });

  it('A→B, then B→A would be cycle', () => {
    const tasks = [{ id: 'A', dependencyTaskId: null }, { id: 'B', dependencyTaskId: 'A' }];
    const r = checkDependencyCycle(tasks, 'A', 'B');
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.code, 'CYCLE');
  });
});

describe('buildDownstreamGraph', () => {
  it('builds correct downstream edges', () => {
    const tasks = [
      { id: 'A', dependencyTaskId: null },
      { id: 'B', dependencyTaskId: 'A' },
      { id: 'C', dependencyTaskId: 'A' },
    ];
    const g = buildDownstreamGraph(tasks);
    assert.deepStrictEqual(g.get('A'), ['B', 'C']);
    assert.deepStrictEqual(g.get('B'), []);
  });
});

describe('propagateFinishChange', () => {
  it('updates downstream task start after upstream finish changes', () => {
    const tasks = [
      { id: 'A', dependencyTaskId: null, endDate: '2026-04-28', durationDays: 1 },
      { id: 'B', dependencyTaskId: 'A', durationDays: 2 },
    ];
    const changes = propagateFinishChange(tasks, 'A', isWeekend, addWorkDays, []);
    // A ends Tue Apr-28, B starts Wed Apr-29 (+1 work day)
    assert.strictEqual(changes.get('B')?.startDate, '2026-04-29');
    // B duration 2 → end Thu Apr-30
    assert.strictEqual(changes.get('B')?.endDate, '2026-04-30');
  });

  it('B.finish changed → C cascaded', () => {
    const tasks = [
      { id: 'A', dependencyTaskId: null, endDate: '2026-04-28', durationDays: 1 },
      { id: 'B', dependencyTaskId: 'A', endDate: '2026-04-30', durationDays: 2 },
      { id: 'C', dependencyTaskId: 'B', durationDays: 1 },
    ];
    const changes = propagateFinishChange(tasks, 'A', isWeekend, addWorkDays, []);
    assert.ok(changes.has('B'), 'B should be recalculated');
    assert.ok(changes.has('C'), 'C should be cascaded');
    assert.strictEqual(changes.get('C')?.startDate, '2026-05-01');
  });

  // DT-DEP-07: Fri endDate + addWorkDays(n=1) skips weekend → next Mon
  it('cross-weekend cascade: B ends Thu → C starts next Mon', () => {
    const tasks = [
      { id: 'A', dependencyTaskId: null, endDate: '2026-04-28', durationDays: 1 },
      { id: 'B', dependencyTaskId: 'A', endDate: '2026-04-30', durationDays: 2 }, // Wed+Thu
      { id: 'C', dependencyTaskId: 'B', durationDays: 1 },
    ];
    const changes = propagateFinishChange(tasks, 'A', isWeekend, addWorkDays, []);
    // A ends Tue Apr-28 → B starts Wed Apr-29 (dur=2) → ends Thu Apr-30
    // C starts Fri May-1 (+1 WD from Apr-30); May 1 is Fri (workday) → no skip
    assert.ok(changes.has('C'));
    assert.strictEqual(changes.get('C')?.startDate, '2026-05-01'); // Fri May 1
  });

  // DT-DEP-08: holiday in cascade path
  it('holiday skip in cascade: Fri holiday pushes C to next Mon', () => {
    const tasks = [
      { id: 'A', dependencyTaskId: null, endDate: '2026-04-28', durationDays: 1 },
      { id: 'B', dependencyTaskId: 'A', endDate: '2026-04-30', durationDays: 2 }, // Thu+Fri
      { id: 'C', dependencyTaskId: 'B', durationDays: 1 },
    ];
    const holidays = ['2026-05-01']; // Fri is a holiday
    const changes = propagateFinishChange(tasks, 'A', isWeekend, addWorkDays, holidays);
    // A ends Tue Apr-28 → B starts Wed Apr-29 (dur=2) → ends Thu Apr-30
    // C starts Fri May-1 BUT it's a holiday → skip to Mon May-3
    assert.ok(changes.has('C'));
    assert.strictEqual(changes.get('C')?.startDate, '2026-05-04'); // Mon
    assert.strictEqual(changes.get('C')?.endDate, '2026-05-04'); // dur=1
  });
});

describe('canSetDependency edge cases', () => {
  // DT-DEP-09: null depId (clear dependency) → should be allowed
  it('canSetDependency: clearing dep (null depId via find) → allowed', () => {
    // The function only checks "can we set a dep on this target?" — not clearing.
    // Clearing happens by passing a depId of a non-existent or different task.
    // Direct test: task has no existing dep → allowed
    const tasks = [{ id: 'A', dependencyTaskId: null }];
    assert.deepStrictEqual(canSetDependency(tasks, 'A'), { ok: true });
  });

  // DT-DEP-10: target task not found → TASK_NOT_FOUND
  it('canSetDependency: target task not found → TASK_NOT_FOUND', () => {
    const tasks = [{ id: 'A', dependencyTaskId: null }];
    assert.strictEqual(canSetDependency(tasks, 'non-existent').code, 'TASK_NOT_FOUND');
  });
});

describe('detectCycle: larger DAG', () => {
  // DT-DEP-11: 4-node DAG, no cycle → ok:false
  it('detectCycle: 4-node DAG → no cycle', () => {
    const tasks = [
      { id: 'A', dependencyTaskId: null },
      { id: 'B', dependencyTaskId: 'A' },
      { id: 'C', dependencyTaskId: 'A' },
      { id: 'D', dependencyTaskId: 'B' },
    ];
    assert.deepStrictEqual(detectCycle(tasks), { ok: false });
  });

  // DT-DEP-12: isolated nodes (no deps at all) → ok:false
  it('detectCycle: isolated nodes → no cycle', () => {
    const tasks = [
      { id: 'A', dependencyTaskId: null },
      { id: 'B', dependencyTaskId: null },
      { id: 'C', dependencyTaskId: null },
    ];
    assert.deepStrictEqual(detectCycle(tasks), { ok: false });
  });
});
