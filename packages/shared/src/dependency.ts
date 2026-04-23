import type { Task, CycleDetectionResult, SetDependencyResult } from './types.js';

/** Build adjacency list from task dependencyTaskId references. */
export function buildGraph(tasks: Task[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const t of tasks) {
    if (!graph.has(t.id)) graph.set(t.id, new Set());
    if (t.dependencyTaskId) {
      graph.get(t.id)!.add(t.dependencyTaskId);
    }
  }
  return graph;
}

/** DFS cycle detection. Returns the cycle path if found. */
export function detectCycle(graph: Map<string, Set<string>>): CycleDetectionResult {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const id of graph.keys()) color.set(id, WHITE);

  const path: string[] = [];

  function dfs(node: string): CycleDetectionResult | null {
    color.set(node, GRAY);
    path.push(node);

    for (const neighbor of graph.get(node) ?? []) {
      if (neighbor === node) {
        return { hasCycle: true, type: 'CYCLE_SELF', path: [node, node] };
      }
      const c = color.get(neighbor) ?? WHITE;
      if (c === GRAY) {
        const cycleStart = path.indexOf(neighbor);
        const cyclePath = [...path.slice(cycleStart), neighbor];
        return { hasCycle: true, type: 'CYCLE', path: cyclePath };
      }
      if (c === WHITE) {
        const result = dfs(neighbor);
        if (result) return result;
      }
    }

    path.pop();
    color.set(node, BLACK);
    return null;
  }

  for (const node of graph.keys()) {
    if ((color.get(node) ?? WHITE) === WHITE) {
      const result = dfs(node);
      if (result) return result;
    }
  }

  return { hasCycle: false };
}

/** Set or clear a task's dependency, checking 1-to-1 and cycle rules. */
export function setDependency(
  taskId: string,
  depId: string | null,
  existingTasks: Task[],
): SetDependencyResult {
  const task = existingTasks.find(t => t.id === taskId);
  if (!task) return { ok: false, code: 'CYCLE', cyclePath: [] };

  if (depId !== null) {
    // 1-to-1 violation
    if (task.dependencyTaskId !== null && task.dependencyTaskId !== depId) {
      return { ok: false, code: 'ONE_TO_ONE_VIOLATION' };
    }

    // Check self-loop
    if (depId === taskId) {
      return { ok: false, code: 'CYCLE', cyclePath: [taskId, taskId] };
    }

    // Cycle check
    const tempTasks: Task[] = existingTasks.map(t =>
      t.id === taskId ? { ...t, dependencyTaskId: depId } : t
    );
    const graph = buildGraph(tempTasks);
    const cycle = detectCycle(graph);
    if (cycle.hasCycle) {
      return { ok: false, code: 'CYCLE', cyclePath: cycle.path };
    }
  }

  const updatedTasks = existingTasks.map(t =>
    t.id === taskId ? { ...t, dependencyTaskId: depId } : t
  );

  return { ok: true, updatedTasks };
}
