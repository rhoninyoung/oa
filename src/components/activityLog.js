// src/components/activityLog.js
import { getState, setState } from '../store.js';

let _logId = 0;
export const uid = () => String(++_logId);

const TYPE_LABELS = {
  INIT: '系统初始化',
  SUBMIT: '提交排期',
  WITHDRAW: '撤回排期',
  APPROVE: '同意',
  REJECT: '拒绝',
  RESCHED: '重新排期',
  DRAFT_SAVED: '自动保存',
  MASTER_ADD: '总表新增行',
  MASTER_DEL: '总表删除行',
  DEP_SET: '设置依赖',
  DEP_CYCLE_BLOCKED: '循环依赖拦截',
};

const TYPE_CLASSES = {
  SUBMIT: 'SUBMIT',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  RESCHED: 'RESCHED',
  DRAFT_SAVED: 'DRAFT_SAVED',
};

/**
 * @param {string} type
 * @param {string} actorId
 * @param {string} detail
 */
export function addLogEntry(type, actorId, detail) {
  const state = getState();
  const actor = state.users.find(u => u.id === actorId);
  const entry = {
    id: uid(),
    at: new Date().toISOString(),
    actorId,
    type,
    detail,
    actorName: actor?.name ?? actorId,
  };
  setState({ ...state, activityLog: [entry, ...state.activityLog] });
}

export function renderActivityLog(container) {
  const state = getState();
  const logs = (state.activityLog ?? []).slice(0, 100);

  container.innerHTML = logs.length === 0
    ? '<li class="log-entry text-muted">暂无日志</li>'
    : logs.map(log => {
        const cls = TYPE_CLASSES[log.type] ?? '';
        const label = TYPE_LABELS[log.type] ?? log.type;
        const time = new Date(log.at).toLocaleString('zh-CN', {
          month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
        return `
          <li class="log-entry ${cls}">
            <span class="log-time">${time}</span>
            <span class="log-actor">${log.actorName ?? log.actorId}</span>
            <span class="log-action">${label}</span>
            ${log.detail ? `<div style="font-size:11px;color:#6b7280;margin-left:20px">${log.detail}</div>` : ''}
          </li>`;
      }).join('');
}
