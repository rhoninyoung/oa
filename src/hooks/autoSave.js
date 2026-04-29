// src/hooks/autoSave.js
// 30s 防抖自动保存 hook — 纯 API 模式

import { getState, mergeAPIData } from '../store.js';
import { saveDraft, flattenScheduleResult } from '../api/client.js';

const DEBOUNCE_MS = 30_000; // 30 seconds

let _timer = null;
let _lastSavedVersion = -1; // -1 = never saved

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
  if (state._version === _lastSavedVersion) return;
  _lastSavedVersion = state._version;

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
    console.error('[autoSave] failed:', e);
  }
  _timer = null;
}
