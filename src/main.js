// src/main.js
import { getState, setState, subscribe, initState, mergeAPIData } from './store.js';
import { downloadJSON, pickJSONFile } from './io/importExport.js';
import { exportScheduleToExcel, exportMasterViewToExcel, importScheduleFromExcel } from './io/excel.js';
import { renderRoleSwitcher } from './components/roleSwitcher.js';
import { renderProjectTree } from './components/projectTree.js';
import { renderWBSTable, initTableKeyboard, isCellEditing } from './components/wbsTable.js';
import { renderActivityLog } from './components/activityLog.js';
import { renderStatsView } from './components/statsView.js';
import { renderCalendarView } from './components/calendarView.js';
import { renderGanttView } from './components/ganttView.js';
import { renderKanbanView } from './components/kanbanView.js';
import { renderDashboardView } from './components/dashboardView.js';
import { scheduleAutoSave } from './hooks/autoSave.js';
import {
  fetchInitData,
  fetchMasterView,
  flattenScheduleResult,
  saveDraft,
  submitSchedule,
  withdrawSchedule,
  approveSchedule,
  rejectSchedule,
  reschedule,
  addMasterRow,
  deleteMasterRow,
} from './api/client.js';

export {};

// ─── Bootstrap ─────────────────────────────────────────────────────────────

async function init() {
  try {
    // 从后端 /api/init 拉取全部初始化数据
    const data = await fetchInitData('u_gl1');
    initState(data);
  } catch (e) {
    console.error('[init]', e);
    showToast('连接后端失败，请检查服务是否启动', 'error');
    return;
  }

  render();
  setupGlobalEvents();
  subscribe(render);
}

// ─── Full re-render ─────────────────────────────────────────────────────────

function render() {
  try {
    const state = getState();
    renderRoleSwitcher(document.getElementById('role-switcher'));
    renderProjectTree(document.getElementById('project-tree'));

    if (state.viewMode === 'MASTER') {
      renderMasterView();
    } else {
      renderGroupView();
    }

    renderActivityLog(document.getElementById('activity-log-list'));
  } catch (e) {
    console.error('[render]', e);
    import('./components/toast.js').then(({ showToast }) => {
      showToast('页面渲染异常：' + e.message, 'error');
    });
  }
}

// ─── Group view (WBS table + approval panel) ────────────────────────────────

function renderGroupView() {
  const state = getState();
  const { activeIterationId, activeGroupId, schedules, tasks } = state;

  const sched = schedules.find(
    s => s.iterationId === activeIterationId && s.groupId === activeGroupId
  );
  const schedTasks = tasks.filter(t => t.scheduleId === sched?.id);

  const schedEl = document.getElementById('schedule-header');
  const iter = state.iterations.find(i => i.id === activeIterationId);
  const group = state.groups.find(g => g.id === activeGroupId);
  schedEl.innerHTML = `
    <h2>${group?.name ?? ''} — ${iter?.name ?? ''}</h2>
    <span class="status-badge status-${sched?.status ?? ''}">${statusLabel(sched?.status)}</span>
    <span style="margin-left:auto;font-size:12px;color:#6b7280">
      ${schedTasks.length} 个任务
    </span>
  `;

  renderApprovalPanel(sched);

  document.getElementById('approval-panel').className =
    sched?.status === 'REVIEWING' ? 'visible' : '';

  document.getElementById('group-view-wrapper').classList.remove('hidden');
  document.getElementById('master-view-wrapper').classList.add('hidden');
  renderWBSTable(sched, schedTasks);
}

// ─── Approval panel ─────────────────────────────────────────────────────────

function renderApprovalPanel(schedule) {
  const panel = document.getElementById('approval-panel');
  const state = getState();
  const user = state.users.find(u => u.id === state.currentUserId);
  const role = user?.role;

  if (!schedule) { panel.className = ''; return; }

  panel.className = 'visible';

  if (role === 'GROUP_LEADER') {
    const canWithdraw = schedule.status === 'REVIEWING';
    const canSubmit = ['PENDING', 'REJECTED', 'APPROVED'].includes(schedule.status);
    panel.innerHTML = `
      ${canSubmit ? `<button id="btn-submit" class="primary">提交</button>` : ''}
      ${canWithdraw ? `<button id="btn-withdraw" class="">撤回</button>` : ''}
    `;
    panel.querySelector('#btn-submit')?.addEventListener('click', () => handleSubmit());
    panel.querySelector('#btn-withdraw')?.addEventListener('click', () => handleWithdraw());
  } else if (role === 'PROJECT_MANAGER') {
    const canApprove = schedule.status === 'REVIEWING';
    const canResched = schedule.status === 'APPROVED';
    panel.innerHTML = `
      ${canApprove ? `
        <textarea id="reject-reason" placeholder="拒绝理由（1-200字）" maxlength="200" rows="2"></textarea>
        <span class="reason-hint"><span id="reason-len">0</span>/200</span>
        <button id="btn-approve" class="primary">同意</button>
        <button id="btn-reject" class="danger">拒绝</button>
      ` : ''}
      ${canResched ? `<button id="btn-resched" class="">重新排期</button>` : ''}
    `;
    const ta = panel.querySelector('#reject-reason');
    ta?.addEventListener('input', () => {
      panel.querySelector('#reason-len').textContent = ta.value.length;
    });
    panel.querySelector('#btn-approve')?.addEventListener('click', () => handleApprove());
    panel.querySelector('#btn-reject')?.addEventListener('click', () => handleReject(ta?.value ?? ''));
    panel.querySelector('#btn-resched')?.addEventListener('click', () => handleResched());
  }
}

// ─── Master view ─────────────────────────────────────────────────────────────

function renderMasterView() {
  const state = getState();
  const iter = state.iterations.find(i => i.id === state.activeIterationId);
  const scheds = state.schedules.filter(s => s.iterationId === iter?.id);
  const approvedTasks = state.tasks.filter(t => {
    const sch = state.schedules.find(s => s.id === t.scheduleId);
    return sch && ((sch.status === 'APPROVED' && t.source === 'GROUP') || t.source === 'MASTER');
  });

  document.getElementById('schedule-header').innerHTML = `
    <h2>总表 — ${iter?.name ?? ''}</h2>
    ${state.currentUserId && (state.users.find(u => u.id === state.currentUserId)?.role) === 'PROJECT_MANAGER'
      ? `<button id="btn-add-master-row" class="">+ 新增行</button>`
      : ''}
  `;

  document.getElementById('approval-panel').className = '';

  document.getElementById('group-view-wrapper').classList.add('hidden');
  document.getElementById('master-view-wrapper').classList.remove('hidden');
  renderMasterTable(approvedTasks);

  document.getElementById('btn-add-master-row')?.addEventListener('click', handleMasterAddRow);
}

function renderMasterTable(tasks) {
  const state = getState();
  const users = state.users;

  const rows = tasks.map(t => {
    const owner = users.find(u => u.id === t.ownerId);
    const source = t.source;
    return `
      <tr data-task-id="${t.id}">
        <td>${t.orderIndex + 1}</td>
        <td>${t.name}</td>
        <td>${owner?.name ?? '—'}</td>
        <td>${t.startDate ?? ''}</td>
        <td>${t.endDate ?? ''}</td>
        <td>${t.durationDays ?? ''}</td>
        <td><span class="source-badge ${source}">${source === 'GROUP' ? 'GL' : 'PM'}</span></td>
        <td>${t.note ?? ''}</td>
        <td>
          ${source === 'MASTER'
            ? `<button class="btn-del-master-row danger" data-task-id="${t.id}">删除</button>`
            : '<span class="text-muted">—</span>'}
        </td>
      </tr>`;
  }).join('');

  const wrapper = document.getElementById('master-view-wrapper');
  wrapper.innerHTML = `
    <table id="master-table">
      <thead>
        <tr>
          <th>#</th><th>任务名</th><th>负责人</th><th>开始</th><th>结束</th>
          <th>天数</th><th>来源</th><th>备注</th><th>操作</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  wrapper.querySelectorAll('.btn-del-master-row').forEach(btn => {
    btn.addEventListener('click', () => handleMasterDeleteRow(btn.dataset.taskId));
  });
}

// ─── State transition handlers (API only) ─────────────────────────────────────

import { canTransition } from './domain/stateMachine.js';
import { addLogEntry } from './components/activityLog.js';
import { showToast } from './components/toast.js';

function statusLabel(s) {
  return { PENDING: '草稿', REVIEWING: '待审', APPROVED: '已批', REJECTED: '已拒' }[s ?? ''] ?? s ?? '';
}

async function handleSubmit() {
  const state = getState();
  const sched = _currentSchedule();
  if (!sched) return;
  const tasks = state.tasks.filter(t => t.scheduleId === sched.id);
  const user = state.users.find(u => u.id === state.currentUserId);

  const check = canTransition(sched.status, 'submit', user.role, { tasks });
  if (!check.ok) { showToast(check.message ?? check.code, 'error'); return; }

  try {
    const result = await submitSchedule(sched.id, state.currentUserId);
    mergeAPIData(flattenScheduleResult(result.schedule));
    addLogEntry('SUBMIT', state.currentUserId, `${result.schedule.status} ← ${sched.status}`);
    showToast(`已提交，等待 PM 审批`, 'info');
  } catch (e) {
    showToast(`提交失败：${e.message ?? e.code ?? '网络错误'}`, 'error');
  }
}

async function handleWithdraw() {
  const state = getState();
  const sched = _currentSchedule();
  if (!sched) return;
  const user = state.users.find(u => u.id === state.currentUserId);

  const check = canTransition(sched.status, 'withdraw', user.role, {});
  if (!check.ok) { showToast(check.message ?? check.code, 'error'); return; }

  try {
    const result = await withdrawSchedule(sched.id, state.currentUserId);
    mergeAPIData(flattenScheduleResult(result.schedule));
    addLogEntry('WITHDRAW', state.currentUserId, `撤回至草稿`);
    showToast(`已撤回`, 'info');
  } catch (e) {
    showToast(`撤回失败：${e.message ?? e.code ?? '网络错误'}`, 'error');
  }
}

async function handleApprove() {
  const state = getState();
  const sched = _currentSchedule();
  if (!sched) return;
  const user = state.users.find(u => u.id === state.currentUserId);

  const check = canTransition(sched.status, 'approve', user.role, {});
  if (!check.ok) { showToast(check.message ?? check.code, 'error'); return; }

  try {
    const result = await approveSchedule(sched.id, state.currentUserId);
    mergeAPIData(flattenScheduleResult(result.schedule));
    addLogEntry('APPROVE', state.currentUserId, `已同意`);
    showToast(`已批准`, 'success');
  } catch (e) {
    showToast(`审批失败：${e.message ?? e.code ?? '网络错误'}`, 'error');
  }
}

async function handleReject(reason) {
  const state = getState();
  const sched = _currentSchedule();
  if (!sched) return;
  const user = state.users.find(u => u.id === state.currentUserId);

  const check = canTransition(sched.status, 'reject', user.role, { reason });
  if (!check.ok) { showToast(check.message ?? check.code, 'error'); return; }

  try {
    const result = await rejectSchedule(sched.id, reason, state.currentUserId);
    mergeAPIData(flattenScheduleResult(result.schedule));
    addLogEntry('REJECT', state.currentUserId, reason ? `理由：${reason}` : '已拒绝');
    showToast(`已拒绝：${reason}`, 'warning');
  } catch (e) {
    showToast(`拒绝失败：${e.message ?? e.code ?? '网络错误'}`, 'error');
  }
}

async function handleResched() {
  const state = getState();
  const sched = _currentSchedule();
  if (!sched) return;
  const user = state.users.find(u => u.id === state.currentUserId);

  const check = canTransition(sched.status, 'reschedule', user.role, {});
  if (!check.ok) { showToast(check.message ?? check.code, 'error'); return; }

  try {
    const result = await reschedule(sched.id, state.currentUserId);
    mergeAPIData(flattenScheduleResult(result.schedule));
    addLogEntry('RESCHED', state.currentUserId, `PM 发起重新排期`);
    showToast(`已发起重新排期，组长可重新编辑`, 'warning');
  } catch (e) {
    showToast(`重新排期失败：${e.message ?? e.code ?? '网络错误'}`, 'error');
  }
}

async function handleMasterAddRow() {
  const state = getState();
  const sched = _currentSchedule();
  if (!sched) return;

  const iter = state.iterations.find(i => i.id === state.activeIterationId);
  const taskData = {
    name: '新任务', ownerId: null,
    startDate: iter?.startDate ?? '', endDate: '', durationDays: 1,
  };

  try {
    const result = await addMasterRow(state.activeIterationId, sched.id, taskData, state.currentUserId);
    mergeAPIData(flattenScheduleResult(result.task));
    addLogEntry('MASTER_ADD', state.currentUserId, `新增总表行：${result.task.name}`);
    showToast(`已新增总表行`, 'success');
  } catch (e) {
    showToast(`新增行失败：${e.message ?? e.code ?? '网络错误'}`, 'error');
  }
}

async function handleMasterDeleteRow(taskId) {
  const state = getState();
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  if (task.source !== 'MASTER') {
    showToast('系统同步行不可删除', 'error'); return;
  }

  try {
    await deleteMasterRow(taskId, state.currentUserId);
    setState({ tasks: state.tasks.filter(t => t.id !== taskId) });
    addLogEntry('MASTER_DEL', state.currentUserId, `删除总表行：${task.name}`);
    showToast(`已删除`, 'info');
  } catch (e) {
    showToast(`删除失败：${e.message ?? e.code ?? '网络错误'}`, 'error');
  }
}

function _currentSchedule() {
  const state = getState();
  return state.schedules.find(
    s => s.iterationId === state.activeIterationId && s.groupId === state.activeGroupId
  );
}

// ─── Global events ──────────────────────────────────────────────────────────

function setupGlobalEvents() {
  // Export
  document.getElementById('btn-export').addEventListener('click', () => {
    const state = getState();
    downloadJSON(JSON.stringify(state, null, 2), `oa-backup-${Date.now()}.json`);
    showToast('已导出 JSON 备份', 'success');
  });

  // Import
  document.getElementById('btn-import').addEventListener('click', async () => {
    showToast('导入功能需刷新页面后重新加载数据', 'info');
  });

  // Excel Export
  document.getElementById('btn-export-excel').addEventListener('click', () => {
    const state = getState();
    if (state.viewMode === 'MASTER') {
      exportMasterViewToExcel();
    } else {
      exportScheduleToExcel();
    }
    showToast('已导出 Excel 文件', 'success');
  });

  // Excel Import
  document.getElementById('btn-import-excel').addEventListener('click', async () => {
    const input = document.getElementById('file-import-excel');
    const file = input.files?.[0];
    if (!file) { input.click(); return; }

    const buffer = await file.arrayBuffer();
    const result = importScheduleFromExcel(buffer);

    if (!result.ok) {
      showToast('导入失败：' + result.error, 'error');
      input.value = '';
      return;
    }

    const state = getState();
    const sched = state.schedules.find(
      s => s.iterationId === state.activeIterationId && s.groupId === state.activeGroupId
    );
    if (!sched) {
      showToast('当前无排期数据', 'error');
      input.value = '';
      return;
    }

    const otherTasks = state.tasks.filter(t => t.scheduleId !== sched.id);
    setState({ tasks: [...otherTasks, ...result.tasks] });
    showToast(`已导入 ${result.tasks.length} 条任务`, 'success');
    input.value = '';
  });

  // Statistics dashboard
  document.getElementById('btn-stats')?.addEventListener('click', () => {
    const state = getState();
    renderStatsView(state.activeIterationId);
  });

  // View tab switching
  function activateTab(tabId) {
    document.querySelectorAll('.view-tab').forEach(btn => {
      btn.classList.toggle('active', btn.id === tabId);
    });
  }

  document.getElementById('tab-wbs')?.addEventListener('click', () => {
    activateTab('tab-wbs');
    document.getElementById('group-view-wrapper')?.classList.remove('hidden');
    document.getElementById('master-view-wrapper')?.classList.add('hidden');
    document.getElementById('calendar-view-wrapper')?.classList.add('hidden');
    document.getElementById('gantt-view-wrapper')?.classList.add('hidden');
    document.getElementById('kanban-view-wrapper')?.classList.add('hidden');
    document.getElementById('stats-view-wrapper')?.classList.add('hidden');
  });

  document.getElementById('tab-calendar')?.addEventListener('click', () => {
    activateTab('tab-calendar');
    renderCalendarView();
  });

  document.getElementById('tab-gantt')?.addEventListener('click', () => {
    activateTab('tab-gantt');
    renderGanttView();
  });

  document.getElementById('tab-kanban')?.addEventListener('click', () => {
    activateTab('tab-kanban');
    renderKanbanView();
  });

  document.getElementById('tab-dashboard')?.addEventListener('click', () => {
    activateTab('tab-dashboard');
    document.getElementById('group-view-wrapper')?.classList.add('hidden');
    document.getElementById('master-view-wrapper')?.classList.add('hidden');
    document.getElementById('calendar-view-wrapper')?.classList.add('hidden');
    document.getElementById('gantt-view-wrapper')?.classList.add('hidden');
    document.getElementById('kanban-view-wrapper')?.classList.add('hidden');
    document.getElementById('stats-view-wrapper')?.classList.add('hidden');
    document.getElementById('dashboard-view-wrapper')?.classList.remove('hidden');
    renderDashboardView();
  });

  // Ctrl+S trigger
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      scheduleAutoSave(() => showToast('已保存 ' + new Date().toLocaleTimeString(), 'success'));
    }
  });
}

// ─── Start ─────────────────────────────────────────────────────────────────
init();
