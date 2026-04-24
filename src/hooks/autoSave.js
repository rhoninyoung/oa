// src/hooks/autoSave.js
// 30s 防抖自动保存 hook

import { getState, setState } from '../store.js';
import { addLogEntry } from '../components/activityLog.js';

const DEBOUNCE_MS = 30_000; // 30 seconds

let _timer = null;
let _lastSavedState = null;

/**
 * 启动/重启 30s 自动保存计时器
 * @param {()=>void} onSave  保存完成回调
 */
export function scheduleAutoSave(onSave) {
  cancelAutoSave();
  _timer = setTimeout(() => {
    triggerSave(onSave);
  }, DEBOUNCE_MS);
}

export function cancelAutoSave() {
  if (_timer !== null) {
    clearTimeout(_timer);
    _timer = null;
  }
}

function triggerSave(onSave) {
  const state = getState();
  // Only save if state actually changed
  const serialized = JSON.stringify(state);
  if (serialized === _lastSavedState) return;
  _lastSavedState = serialized;

  try {
    localStorage.setItem('oa.state.v1', serialized);
    addLogEntry('DRAFT_SAVED', 'system', '自动保存草稿');
    if (onSave) onSave();
  } catch (e) {
    console.error('[autoSave] failed:', e);
  }
  _timer = null;
}

/**
 * 检查距上次保存是否已超过 30s
 */
export function saveIfStale() {
  const now = Date.now();
  const state = getState();
  const lastSaved = state._lastAutoSaveAt ?? 0;
  if (now - lastSaved >= DEBOUNCE_MS) {
    triggerSave(() => {
      setState({ ...getState(), _lastAutoSaveAt: Date.now() });
    });
  }
}
