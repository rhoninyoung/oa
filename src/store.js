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
