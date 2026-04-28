// src/store.js
// 极简发布订阅状态管理 + localStorage 持久化

const STORAGE_KEY = 'oa.state.v1';
let _state = null;
const _subscribers = new Set();

/**
 * @param {object} state
 */
export function setState(state) {
  // Increment version counter so autoSave can skip serialisation when nothing changed
  _state._version = ((_state._version ?? 0) + 1);
  Object.assign(_state, state);
  _persist();
  _subscribers.forEach(fn => fn(_state));
}

export function getState() {
  if (_state === null) {
    _state = _load() || _createEmpty();
  }
  return _state;
}

export function subscribe(fn) {
  _subscribers.add(fn);
  return () => _subscribers.delete(fn);
}

function _persist() {
  if (!_state) return;
  try {
    const json = JSON.stringify(_state);
    localStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    console.error('[store] localStorage write failed:', e);
  }
}

function _load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('[store] localStorage read failed:', e);
    return null;
  }
}

function _createEmpty() {
  return {
    _version: 0,
    users: [],
    groups: [],
    projects: [],
    iterations: [],
    schedules: [],
    tasks: [],
    activityLog: [],
    currentUserId: null,
    activeIterationId: null,
    activeGroupId: null,
    viewMode: 'GROUP',  // 'GROUP' | 'MASTER'
    holidays: [],
  };
}

export function clearState() {
  _state = _createEmpty();
  _persist();
  _subscribers.forEach(fn => fn(_state));
}

/**
 * 检查是否启用了 API 模式
 * @returns {boolean}
 */
export function isAPIMode() {
  return !!localStorage.getItem('oa.api.baseUrl');
}

/**
 * API 模式初始化：从后端拉取数据，填充 in-memory store
 * 调用此函数后，getState() 返回包含完整 schedules + tasks 的 state
 * @param {object} ctx - { projects, fetchAllSchedulesWithTasks, buildSeed }
 *   projects: 后端 /api/projects 返回的嵌套结构
 *   fetchAllSchedulesWithTasks: 从 api/client.js 传入，用于批量获取 tasks
 *   buildSeed: 从 seed.js 传入，提供初始 users/groups
 */
export async function initFromAPI({ projects, fetchAllSchedulesWithTasks, buildSeed }) {
  // 基础数据来自 buildSeed（users, groups）
  const base = buildSeed();
  const state = {
    _version: 0,
    users: base.users,
    groups: base.groups,
    projects: [],
    iterations: [],
    schedules: [],
    tasks: [],
    activityLog: [],
    currentUserId: base.currentUserId,
    activeIterationId: base.activeIterationId,
    activeGroupId: base.activeGroupId,
    viewMode: 'GROUP',
    holidays: base.holidays,
  };

  // projects → iterations → schedules 扁平化
  const iterationMap = new Map();
  const scheduleList = [];
  for (const proj of (projects ?? [])) {
    state.projects.push({ id: proj.id, name: proj.name });
    for (const iter of (proj.iterations ?? [])) {
      state.iterations.push({
        id: iter.id,
        projectId: proj.id,
        name: iter.name,
        startDate: iter.startDate?.slice(0, 10),
        endDate: iter.endDate?.slice(0, 10),
      });
      iterationMap.set(iter.id, iter);
      for (const sched of (iter.schedules ?? [])) {
        scheduleList.push({ ...sched, iterationId: iter.id });
      }
    }
  }

  // 批量获取每个 schedule 的 tasks
  if (scheduleList.length > 0) {
    const { schedules: flatSchedules, tasks: flatTasks } = await fetchAllSchedulesWithTasks(scheduleList);
    state.schedules = flatSchedules;
    state.tasks = flatTasks;
  }

  _state = state;
  _subscribers.forEach(fn => fn(_state));
}

/**
 * 替换当前 schedules 和 tasks（用于 API 响应更新）
 * 保留其他 UI 状态（currentUserId, viewMode 等）
 * @param {object} partial - { schedules?, tasks? }
 */
export function mergeAPIData({ schedules, tasks }) {
  if (schedules) {
    // 替换匹配的 schedule（按 id）
    const existing = new Map(_state.schedules.map(s => [s.id, s]));
    for (const s of schedules) {
      existing.set(s.id, s);
    }
    _state.schedules = [...existing.values()];
  }
  if (tasks) {
    // 替换匹配的 tasks（按 id）
    const existing = new Map(_state.tasks.map(t => [t.id, t]));
    for (const t of tasks) {
      existing.set(t.id, t);
    }
    _state.tasks = [...existing.values()];
  }
  _state._version = ((_state._version ?? 0) + 1);
  _subscribers.forEach(fn => fn(_state));
}

export function exportState() {
  return JSON.stringify(getState(), null, 2);
}

export function importState(json) {
  try {
    const parsed = JSON.parse(json);
    parsed._version = ((_state?._version ?? 0) + 1);
    _state = parsed;
    _persist();
    _subscribers.forEach(fn => fn(_state));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
