// src/domain/dependency.js
// 任务依赖：1-to-1 约束 + DFS 循环检测 + 时间联动

/**
 * @typedef {{id: string, scheduleId: string, orderIndex: number, name: string,
 *   startDate?: string, endDate?: string, durationDays?: number,
 *   dependencyTaskId?: string|null, source: string}} Task
 */

/**
 * 构建任务图：taskId -> [下游任务 IDs]
 * @param {Task[]} tasks
 * @returns {Map<string, string[]>}
 */
export function buildDownstreamGraph(tasks) {
  const graph = new Map();
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
 * DFS 检测循环，返回回路路径或 null
 * @param {Task[]} tasks
 * @returns {{ok: false}|{ok: true, code: 'CYCLE_SELF', path: string[]}|{ok: true, code: 'CYCLE', path: string[]}}
 */
export function detectCycle(tasks) {
  const graph = buildDownstreamGraph(tasks);
  const visited = new Set();
  const stack = [];

  const dfs = (nodeId, path) => {
    if (!nodeId) return;
    if (path.includes(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      return [...path.slice(cycleStart), nodeId];
    }
    if (visited.has(nodeId)) return;
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
 * 检查 1-to-1 约束：目标任务是否已有前置依赖
 * @param {Task[]} tasks
 * @param {string} targetTaskId
 * @returns {{ok: boolean, code?: string}}
 */
export function canSetDependency(tasks, targetTaskId) {
  const target = tasks.find(t => t.id === targetTaskId);
  if (!target) return { ok: false, code: 'TASK_NOT_FOUND' };
  if (target.dependencyTaskId) {
    return { ok: false, code: 'ONE_TO_ONE_VIOLATION', message: '该任务已有前置依赖' };
  }
  return { ok: true };
}

/**
 * 检查设置依赖是否会导致循环
 * @param {Task[]} tasks
 * @param {string} fromTaskId  - 下游任务
 * @param {string} toTaskId   - 前置任务
 * @returns {{ok: false}|{ok: true, code: 'CYCLE'| 'CYCLE_SELF', path: string[]}}
 */
export function checkDependencyCycle(tasks, fromTaskId, toTaskId) {
  if (fromTaskId === toTaskId) {
    return { ok: true, code: 'CYCLE_SELF', path: [fromTaskId, toTaskId] };
  }
  // 模拟加入这条边后检测
  const simulated = tasks.map(t =>
    t.id === fromTaskId ? { ...t, dependencyTaskId: toTaskId } : t
  );
  const result = detectCycle(simulated);
  return result;
}

/**
 * 按拓扑顺序（深度优先）重算下游任务的开始/结束日期
 * @param {Task[]} tasks
 * @param {string} changedTaskId
 * @param {import('./calendar.js').isWorkDay} isWorkDayFn
 * @param {import('./calendar.js').addWorkDays} addWorkDaysFn
 * @param {string[]} holidays
 * @returns {Map<string, {startDate: string, endDate: string}>}
 */
export function propagateFinishChange(tasks, changedTaskId, isWorkDayFn, addWorkDaysFn, holidays = []) {
  const graph = buildDownstreamGraph(tasks);
  const result = new Map();
  const changed = tasks.find(t => t.id === changedTaskId);
  if (!changed) return result;

  const visit = (taskId) => {
    const deps = graph.get(taskId) ?? [];
    for (const depId of deps) {
      const depTask = tasks.find(t => t.id === depId);
      if (!depTask) continue;
      const upstream = tasks.find(t => t.id === depTask.dependencyTaskId);
      if (!upstream || !upstream.endDate) continue;

      const newStart = addWorkDaysFn(upstream.endDate, 1, holidays);
      const newEnd = addWorkDaysFn(newStart, (depTask.durationDays ?? 1) - 1, holidays);
      result.set(depId, { startDate: newStart, endDate: newEnd });
      visit(depId);
    }
  };
  visit(changedTaskId);
  return result;
}
