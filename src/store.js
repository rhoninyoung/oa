// src/store.js
// 极简发布订阅状态管理 — 纯 API 模式，无 localStorage

let _state = null;
const _subscribers = new Set();

export function getState() {
  if (_state === null) {
    throw new Error('Store not initialized — call initState() first');
  }
  return _state;
}

export function setState(state) {
  _state._version = ((_state._version ?? 0) + 1);
  Object.assign(_state, state);
  _subscribers.forEach(fn => fn(_state));
}

export function subscribe(fn) {
  _subscribers.add(fn);
  return () => _subscribers.delete(fn);
}

/**
 * 用后端 /api/init 返回的数据初始化 store
 * @param {object} data - { users, groups, projects, iterations, schedules, tasks, holidays, currentUserId, activeIterationId, activeGroupId }
 */
export function initState(data) {
  _state = {
    _version: 0,
    users: [],
    groups: [],
    projects: [],
    iterations: [],
    schedules: [],
    tasks: [],
    activityLog: [],
    holidays: [],
    ...data,
  };
  _subscribers.forEach(fn => fn(_state));
}

/**
 * Normalize Prisma DateTime to YYYY-MM-DD string
 */
function normalizeDate(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal === 'string') {
    return dateVal.includes('T') ? dateVal.slice(0, 10) : dateVal;
  }
  if (dateVal instanceof Date) {
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, '0');
    const d = String(dateVal.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return dateVal;
}

function normalizeTask(t) {
  return {
    ...t,
    startDate: normalizeDate(t.startDate),
    endDate: normalizeDate(t.endDate),
  };
}

function normalizeIteration(i) {
  return {
    ...i,
    startDate: normalizeDate(i.startDate),
    endDate: normalizeDate(i.endDate),
  };
}

/**
 * 替换匹配的 schedules / tasks（用于 API 响应更新）
 */
export function mergeAPIData({ schedules, tasks }) {
  if (schedules) {
    const existing = new Map((_state?.schedules ?? []).map(s => [s.id, s]));
    for (const s of schedules) existing.set(s.id, s);
    _state.schedules = [...existing.values()];
  }
  if (tasks) {
    const existing = new Map((_state?.tasks ?? []).map(t => [t.id, t]));
    for (const t of tasks) existing.set(t.id, normalizeTask(t));
    _state.tasks = [...existing.values()];
  }
  _state._version = ((_state._version ?? 0) + 1);
  _subscribers.forEach(fn => fn(_state));
}
