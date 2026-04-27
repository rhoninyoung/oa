// src/hooks/autoSave.js
// 30s 防抖自动保存 hook — 只写 localStorage，不调 setState，不打扰用户编辑

import { getState } from '../store.js';

const DEBOUNCE_MS = 30_000; // 30 seconds

let _timer = null;
let _lastSavedVersion = -1; // -1 = never saved

/**
 * 启动/重启 30s 自动保存计时器
 * @param {()=>void} onSave  保存完成回调（可选，用于 Ctrl+S 手动保存）
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
  // Version check is O(1) — skip serialisation when nothing changed since last save
  if (state._version === _lastSavedVersion) return;
  _lastSavedVersion = state._version;

  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem('oa.state.v1', serialized);
    if (onSave) onSave();
  } catch (e) {
    console.error('[autoSave] failed:', e);
  }
  _timer = null;
}

