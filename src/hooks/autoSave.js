// src/hooks/autoSave.js
// 30s 防抖自动保存 hook — localStorage 或 API 模式

import { getState, isAPIMode, mergeAPIData } from '../store.js';
import { saveDraft, flattenScheduleResult } from '../api/client.js';

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

async function triggerSave(onSave) {
  const state = getState();
  // Version check is O(1) — skip serialisation when nothing changed since last save
  if (state._version === _lastSavedVersion) return;
  _lastSavedVersion = state._version;

  if (isAPIMode()) {
    const sched = state.schedules.find(
      s => s.iterationId === state.activeIterationId && s.groupId === state.activeGroupId
    );
    if (!sched) return;
    const schedTasks = state.tasks.filter(t => t.scheduleId === sched.id);
    try {
      const result = await saveDraft(sched.id, schedTasks, sched.version, state.currentUserId);
      if (result.ok) {
        mergeAPIData(flattenScheduleResult(result.schedule));
        onSave?.();
      }
    } catch (e) {
      console.error('[autoSave] API failed:', e);
    }
  } else {
    // localStorage 模式
    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem('oa.state.v1', serialized);
      if (onSave) onSave();
    } catch (e) {
      console.error('[autoSave] failed:', e);
    }
  }
  _timer = null;
}

