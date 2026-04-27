// packages/shared/src/dependency.ts
// 任务依赖：1-to-1 约束 + DFS 循环检测 + 时间联动

import type { Task } from './types.js';

export interface CycleResult {
  ok: false;
}

export interface CycleFoundResult {
  ok: true;
  code: 'CYCLE_SELF' | 'CYCLE';
  path: string[];
}

/**
 * Build downstream graph: taskId -> [downstream task IDs]
 * @param tasks - Array of tasks
 * @returns Map of task ID to downstream task IDs
 */
export function buildDownstreamGraph(tasks: Task[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const t of tasks) {
    graph.set(t.id, []);
  }
  for (const t of tasks) {
    if (t.dependencyTaskId) {
      const downstream = graph.get(t.dependencyTaskId);
      if (downstream) downstream.push(t.id);
    }
  }
  return graph;
}

/**
 * DFS cycle detection, returns cycle path or null
 * @param tasks - Array of tasks
 * @returns CycleResult or CycleFoundResult
 */
export function detectCycle(tasks: Task[]): CycleResult | CycleFoundResult {
  const graph = buildDownstreamGraph(tasks);
  const visited = new Set<string>();
  const stack: string[] = [];

  const dfs = (nodeId: string, path: string[]): string[] | null => {
    if (!nodeId) return null;
    if (path.includes(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      return [...path.slice(cycleStart), nodeId];
    }
    if (visited.has(nodeId)) return null;
    visited.add(nodeId);
    path.push(nodeId);
    const downstream = graph.get(nodeId) ?? [];
    for (const depId of downstream) {
      const cycle = dfs(depId, [...path]);
      if (cycle) return cycle;
    }
    return null;
  };

  for (const t of tasks) {
    if (!visited.has(t.id)) {
      const cycle = dfs(t.id, []);
      if (cycle) {
        if (cycle.length === 2 && cycle[0] === cycle[1]) {
          return { ok: true, code: 'CYCLE_SELF', path: cycle };
        }
        return { ok: true, code: 'CYCLE', path: cycle };
      }
    }
  }
  return { ok: false };
}

/**
 * Check 1-to-1 constraint: if target task already has a dependency
 * @param tasks - Array of tasks
 * @param targetTaskId - ID of task to set dependency on
 * @returns PermissionResult
 */
export function canSetDependency(
  tasks: Task[],
  targetTaskId: string,
): { ok: false; code: string; message?: string } | { ok: true } {
  const target = tasks.find(t => t.id === targetTaskId);
  if (!target) return { ok: false, code: 'TASK_NOT_FOUND' };
  if (target.dependencyTaskId) {
    return { ok: false, code: 'ONE_TO_ONE_VIOLATION', message: '该任务已有前置依赖' };
  }
  return { ok: true };
}

/**
 * Check if setting a dependency would create a cycle
 * @param tasks - Array of tasks
 * @param fromTaskId - Downstream task
 * @param toTaskId - Upstream task (dependency)
 * @returns CycleResult or CycleFoundResult
 */
export function checkDependencyCycle(
  tasks: Task[],
  fromTaskId: string,
  toTaskId: string,
): CycleResult | CycleFoundResult {
  if (fromTaskId === toTaskId) {
    return { ok: true, code: 'CYCLE_SELF', path: [fromTaskId, toTaskId] };
  }
  // Simulate adding the edge and check for cycle
  const simulated = tasks.map(t =>
    t.id === fromTaskId ? { ...t, dependencyTaskId: toTaskId } : t,
  );
  const result = detectCycle(simulated);
  return result;
}

export interface DateChange {
  startDate: string;
  endDate: string;
}

/**
 * Recalculate downstream task dates based on a changed task's finish date
 * @param tasks - Array of tasks
 * @param changedTaskId - ID of task that changed
 * @param isWorkDayFn - Function to check if a date is a work day
 * @param addWorkDaysFn - Function to add work days
 * @param holidays - Array of holiday dates
 * @returns Map of task ID to new dates
 */
export function propagateFinishChange(
  tasks: Task[],
  changedTaskId: string,
  isWorkDayFn: (dateStr: string, holidays?: string[]) => boolean,
  addWorkDaysFn: (dateStr: string, n: number, holidays?: string[]) => string,
  holidays: string[] = [],
): Map<string, DateChange> {
  const graph = buildDownstreamGraph(tasks);
  const result = new Map<string, DateChange>();
  const changed = tasks.find(t => t.id === changedTaskId);
  if (!changed) return result;

  const visit = (taskId: string) => {
    const deps = graph.get(taskId) ?? [];
    for (const depId of deps) {
      const depTask = tasks.find(t => t.id === depId);
      if (!depTask) continue;
      const upstream = tasks.find(t => t.id === depTask.dependencyTaskId);
      if (!upstream || !upstream.endDate) continue;

      const newStart = addWorkDaysFn(upstream.endDate as string, 1, holidays);
      const newEnd = addWorkDaysFn(newStart, (depTask.durationDays ?? 1) - 1, holidays);
      result.set(depId, { startDate: newStart, endDate: newEnd });
      visit(depId);
    }
  };
  visit(changedTaskId);
  return result;
}
