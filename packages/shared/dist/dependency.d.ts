import type { Task, CycleDetectionResult, SetDependencyResult } from './types.js';
/** Build adjacency list from task dependencyTaskId references. */
export declare function buildGraph(tasks: Task[]): Map<string, Set<string>>;
/** DFS cycle detection. Returns the cycle path if found. */
export declare function detectCycle(graph: Map<string, Set<string>>): CycleDetectionResult;
/** Set or clear a task's dependency, checking 1-to-1 and cycle rules. */
export declare function setDependency(taskId: string, depId: string | null, existingTasks: Task[]): SetDependencyResult;
//# sourceMappingURL=dependency.d.ts.map