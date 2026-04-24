// src/components/wbsTable.js
// WBS 表格：整表 diff 重绘 + 键盘/鼠标交互层

import { getState, setState } from '../store.js';
import { addLogEntry } from './activityLog.js';
import { showToast } from './toast.js';
import { pushUndo, popUndo, popRedo, cellsToTSV, tsvToCells, mapPaste, normalizeRange } from '../domain/tableOps.js';
import { canDeleteRow } from '../domain/permissions.js';
import { checkDependencyCycle, propagateFinishChange } from '../domain/dependency.js';
import { isWeekend, addWorkDays } from '../domain/calendar.js';

// ─── Column definitions ────────────────────────────────────────────────────

const COLUMNS = [
  { key: '_idx',       label: '#',          width: 36,  sticky: true,  editable: false },
  { key: 'name',       label: '任务名称',   width: 180, sticky: true,  editable: true  },
  { key: 'ownerId',    label: '负责人',     width: 90,  sticky: false, editable: true, type: 'select' },
  { key: 'startDate',  label: '开始日期',   width: 110, sticky: false, editable: true, type: 'date' },
  { key: 'endDate',     label: '结束日期',   width: 110, sticky: false, editable: true, type: 'date' },
  { key: 'durationDays', label: '天数',     width: 60,  sticky: false, editable: true, type: 'number' },
  { key: 'dep',        label: '依赖',        width: 120, sticky: false, editable: false },
  { key: 'note',       label: '备注',        width: 160, sticky: false, editable: true, multiline: true },
];

const STICKY_COLS = 2; // # + 任务名称

// ─── State for undo/redo ───────────────────────────────────────────────────

let _undoHistory = { past: [], future: [] };
let _selection = null; // { row, col }
let _copyBuffer = null;

// ─── Public: render ───────────────────────────────────────────────────────

export function renderWBSTable(schedule, tasks) {
  const state = getState();
  const users = state.users;
  const holidays = state.holidays ?? [];
  const currentUserId = state.currentUserId;
  const role = users.find(u => u.id === currentUserId)?.role;
  const canEdit = (role === 'GROUP_LEADER' && schedule?.groupId === users.find(u => u.id === currentUserId)?.groupId);

  const sorted = [...tasks].sort((a, b) => a.orderIndex - b.orderIndex);

  // Header
  const thead = document.getElementById('wbs-thead');
  thead.innerHTML = `<tr>${COLUMNS.map((col, ci) => {
    const sticky = ci < STICKY_COLS ? 'sticky' : '';
    return `<th class="${sticky}" style="width:${col.width}px;min-width:${col.width}px">${col.label}</th>`;
  }).join('')}</tr>`;

  // Body
  const tbody = document.getElementById('wbs-tbody');
  tbody.innerHTML = sorted.map((task, ri) => {
    const depTask = task.dependencyTaskId
      ? state.tasks.find(t => t.id === task.dependencyTaskId)
      : null;
    const depName = depTask ? depTask.name : '';
    const isMasterRow = task.source === 'MASTER';
    const readonly = !canEdit || isMasterRow;

    return `<tr data-task-id="${task.id}" data-row-index="${ri}">${
      COLUMNS.map((col, ci) => {
        const sticky = ci < STICKY_COLS ? ' sticky' : '';
        const cls = readonly ? '' : 'cell-editable';
        const style = `width:${col.width}px;min-width:${col.width}px`;

        switch (col.key) {
          case '_idx':
            return `<td class="${sticky}" style="${style}">${task.orderIndex + 1}</td>`;
          case 'name':
            return `<td class="${sticky} ${cls}" data-col="name" style="${style}">${task.name ?? ''}</td>`;
          case 'ownerId': {
            const owner = users.find(u => u.id === task.ownerId);
            if (!readonly && col.type === 'select') {
              return `<td class="${sticky} ${cls}" data-col="ownerId" style="${style}">
                <select class="cell-select" data-task-id="${task.id}" style="border:none;width:100%;background:transparent;font-size:13px">
                  <option value="">—</option>
                  ${users.map(u => `<option value="${u.id}" ${u.id === task.ownerId ? 'selected' : ''}>${u.name}</option>`).join('')}
                </select></td>`;
            }
            return `<td class="${sticky}" style="${style}">${owner?.name ?? '—'}</td>`;
          }
          case 'startDate':
            return `<td class="${sticky} ${cls}" data-col="startDate" style="${style}">
              ${readonly
                ? (task.startDate ?? '')
                : `<input type="date" class="cell-input" data-col="startDate" data-task-id="${task.id}" value="${task.startDate ?? ''}" style="border:none;width:100%">`}
            </td>`;
          case 'endDate':
            return `<td class="${sticky} ${cls}" data-col="endDate" style="${style}">
              ${readonly
                ? (task.endDate ?? '')
                : `<input type="date" class="cell-input" data-col="endDate" data-task-id="${task.id}" value="${task.endDate ?? ''}" style="border:none;width:100%">`}
            </td>`;
          case 'durationDays':
            return `<td class="${sticky} ${cls}" data-col="durationDays" style="${style}">
              ${readonly
                ? (task.durationDays ?? '')
                : `<input type="number" min="0" class="cell-input" data-col="durationDays" data-task-id="${task.id}" value="${task.durationDays ?? 1}" style="border:none;width:100%">`}
            </td>`;
          case 'dep':
            return `<td class="${sticky}" data-col="dep" style="${style}">
              ${depName ? `<span class="dep-arrow">← ${depName}</span>` : '<span class="text-muted">—</span>'}
              ${!readonly ? `<button class="btn-pick-dep" data-task-id="${task.id}" style="margin-left:4px;font-size:11px;padding:1px 5px;cursor:pointer">选</button>` : ''}
            </td>`;
          case 'note':
            return `<td class="${sticky} ${cls}" data-col="note" style="${style}">${task.note?.replace(/\n/g, '<br>') ?? ''}</td>`;
          default:
            return `<td class="${sticky}" style="${style}"></td>`;
        }
      }).join('')
    }</tr>`;
  }).join('');

  // Attach events
  attachCellEvents(tbody, schedule, canEdit);
  setupContextMenu(tbody, schedule, canEdit);
  initTableKeyboard(tbody, schedule, canEdit);
}

// ─── Cell events ────────────────────────────────────────────────────────────

function attachCellEvents(tbody, schedule, canEdit) {
  if (!canEdit) return;

  // Double-click to edit (for text cells)
  tbody.querySelectorAll('td.cell-editable').forEach(td => {
    td.addEventListener('dblclick', () => startEdit(td, schedule));
  });

  // Change events for inputs/selects
  tbody.querySelectorAll('.cell-input, .cell-select').forEach(el => {
    el.addEventListener('change', () => {
      applyCellEdit(el, schedule);
    });
    el.addEventListener('blur', () => {
      applyCellEdit(el, schedule);
    });
  });

  // Pick dependency button
  tbody.querySelectorAll('.btn-pick-dep').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showDependencyPicker(btn.dataset.taskId, schedule);
    });
  });
}

function startEdit(td, schedule) {
  if (td.querySelector('input, select, textarea')) return;
  const col = td.dataset.col;
  const taskId = td.closest('tr').dataset.taskId;
  const task = getState().tasks.find(t => t.id === taskId);
  if (!task) return;

  let input;
  if (col === 'note' || col === 'name') {
    input = document.createElement('textarea');
    input.className = 'cell-textarea';
    input.value = task[col] ?? '';
    // Ctrl+Enter or Escape to commit
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { input.remove(); }
      if (e.key === 'Enter' && !e.altKey && !e.ctrlKey) { e.preventDefault(); commitTextarea(input, taskId, col, schedule); }
      if (e.key === 'Enter' && (e.altKey || e.ctrlKey)) {
        e.preventDefault();
        const v = input.value;
        const sel = { start: input.selectionStart, end: input.selectionEnd };
        input.value = v.slice(0, sel.start) + '\n' + v.slice(sel.end);
        input.selectionStart = input.selectionEnd = sel.start + 1;
      }
    });
  } else {
    input = document.createElement('input');
    input.type = col === 'durationDays' ? 'number' : 'text';
    input.className = 'cell-input';
    input.value = task[col] ?? '';
    input.style.cssText = 'border:none;outline:2px solid #2563eb;width:100%;height:100%';
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { commitInput(input, taskId, col, schedule); }
      if (e.key === 'Escape') { input.remove(); }
    });
  }

  td.innerHTML = '';
  td.appendChild(input);
  input.focus();
}

function commitTextarea(input, taskId, col, schedule) {
  const newVal = input.value;
  applyEdit(taskId, col, newVal, schedule);
  input.remove();
}

function commitInput(input, taskId, col, schedule) {
  const newVal = input.type === 'number' ? Number(input.value) : input.value;
  applyEdit(taskId, col, newVal, schedule);
  input.remove();
}

function applyCellEdit(el, schedule) {
  const taskId = el.dataset.taskId;
  const col = el.dataset.col;
  const newVal = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? Number(el.value) : el.value);
  applyEdit(taskId, col, newVal, schedule);
}

function applyEdit(taskId, col, newVal, schedule) {
  const state = getState();
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  // Push to undo
  _undoHistory = pushUndo(_undoHistory, JSON.parse(JSON.stringify(state.tasks)));

  let updated = { ...task, [col]: newVal };

  // Duration/startDate/endDate linkage
  if (col === 'durationDays' || col === 'startDate') {
    const dur = col === 'durationDays' ? newVal : (updated.durationDays ?? 1);
    const start = col === 'startDate' ? newVal : (updated.startDate ?? '');
    if (start && dur > 0) {
      updated.endDate = addWorkDays(start, dur - 1, state.holidays ?? []);
    }
  }
  if (col === 'endDate' && updated.startDate && newVal) {
    // Recalc duration
    const s = new Date(updated.startDate + 'T00:00:00');
    const e = new Date(newVal + 'T00:00:00');
    updated.durationDays = Math.round((e - s) / 86400000) + 1;
  }

  // Time propagation for dependency
  if (updated.dependencyTaskId && (col === 'endDate' || col === 'durationDays')) {
    const allTasks = state.tasks.map(t => t.id === taskId ? updated : t);
    const holidays = state.holidays ?? [];
    const changes = propagateFinishChange(allTasks, taskId, isWeekend, addWorkDays, holidays);
    const newTasks = allTasks.map(t => {
      const ch = changes.get(t.id);
      return ch ? { ...t, ...ch } : t;
    });
    setState({ ...state, tasks: newTasks });
    renderWBSTable(schedule, getState().tasks.filter(t => t.scheduleId === schedule.id));
    return;
  }

  const newTasks = state.tasks.map(t => t.id === taskId ? updated : t);
  setState({ ...state, tasks: newTasks });
  renderWBSTable(schedule, getState().tasks.filter(t => t.scheduleId === schedule.id));
}

// ─── Keyboard handling ─────────────────────────────────────────────────────

export function initTableKeyboard(tbody, schedule, canEdit) {
  if (!canEdit) return;

  tbody.addEventListener('keydown', (e) => {
    const cell = document.activeElement;
    if (!cell) return;

    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'c': { // Copy
          e.preventDefault();
          const td = cell.closest('td');
          if (!td) return;
          const tr = td.closest('tr');
          const taskId = tr.dataset.taskId;
          const task = getState().tasks.find(t => t.id === taskId);
          if (!task) return;
          _copyBuffer = [[task.name ?? '', task.note ?? '']];
          showToast('已复制 ' + _copyBuffer.length + ' 个任务', 'info');
          break;
        }
        case 'v': { // Paste
          e.preventDefault();
          if (!_copyBuffer) return;
          const td = cell.closest('td');
          if (!td) return;
          const tr = td.closest('tr');
          const targetTaskId = tr.dataset.taskId;
          const state = getState();
          const targetTask = state.tasks.find(t => t.id === targetTaskId);
          if (!targetTask) return;
          _undoHistory = pushUndo(_undoHistory, JSON.parse(JSON.stringify(state.tasks)));
          const [name, note] = _copyBuffer[0] ?? [];
          const newTasks = state.tasks.map(t =>
            t.id === targetTaskId ? { ...t, name: name ?? t.name, note: note ?? t.note } : t
          );
          setState({ ...state, tasks: newTasks });
          renderWBSTable(schedule, getState().tasks.filter(t => t.scheduleId === schedule.id));
          showToast('已粘贴', 'info');
          break;
        }
        case 'z': { // Undo
          e.preventDefault();
          doUndo(schedule); break;
        }
        case 'y': { // Redo
          e.preventDefault();
          doRedo(schedule); break;
        }
      }
    }
  });
}

function doUndo(schedule) {
  const result = popUndo(_undoHistory);
  if (!result.state) { showToast('无可撤销', 'info'); return; }
  _undoHistory = result.history;
  const state = getState();
  setState({ ...state, tasks: result.state });
  renderWBSTable(schedule, result.state.filter(t => t.scheduleId === schedule.id));
}

function doRedo(schedule) {
  const result = popRedo(_undoHistory);
  if (!result.state) { showToast('无可重做', 'info'); return; }
  _undoHistory = result.history;
  const state = getState();
  setState({ ...state, tasks: result.state });
  renderWBSTable(schedule, result.state.filter(t => t.scheduleId === schedule.id));
}

// ─── Context menu ───────────────────────────────────────────────────────────

let _ctxMenu = null;

function setupContextMenu(tbody, schedule, canEdit) {
  if (_ctxMenu) _ctxMenu.remove();

  _ctxMenu = document.createElement('div');
  _ctxMenu.id = 'ctx-menu';
  document.body.appendChild(_ctxMenu);

  document.addEventListener('click', () => _ctxMenu.classList.remove('visible'));

  tbody.addEventListener('contextmenu', (e) => {
    if (!canEdit) return;
    e.preventDefault();
    const td = e.target.closest('td');
    if (!td) return;
    const row = td.closest('tr');
    const taskId = row.dataset.taskId;
    const ri = parseInt(row.dataset.rowIndex);

    const state = getState();
    const task = state.tasks.find(t => t.id === taskId);
    const canDel = canDeleteRow(task, state.schedules.find(s => s.id === task.scheduleId));

    _ctxMenu.innerHTML = `
      <div class="ctx-item" data-action="insert-above" data-ri="${ri}">上方插入行</div>
      <div class="ctx-item" data-action="insert-below" data-ri="${ri}">下方插入行</div>
      <div class="ctx-sep"></div>
      <div class="ctx-item ${canDel.ok ? '' : 'text-muted'}" data-action="delete" data-task-id="${taskId}">删除当前行</div>
    `;
    _ctxMenu.classList.add('visible');
    const rect = e.target.getBoundingClientRect();
    _ctxMenu.style.top = rect.bottom + 'px';
    _ctxMenu.style.left = rect.left + 'px';
  });

  _ctxMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.ctx-item');
    if (!item) return;
    const action = item.dataset.action;
    if (action === 'delete') handleDeleteRow(item.dataset.taskId, schedule);
    if (action === 'insert-above') handleInsertRow(parseInt(item.dataset.ri), 0, schedule);
    if (action === 'insert-below') handleInsertRow(parseInt(item.dataset.ri), 1, schedule);
    _ctxMenu.classList.remove('visible');
  });
}

function handleInsertRow(rowIndex, offset, schedule) {
  const state = getState();
  _undoHistory = pushUndo(_undoHistory, JSON.parse(JSON.stringify(state.tasks)));
  const schedTasks = state.tasks.filter(t => t.scheduleId === schedule.id);
  const insertAt = rowIndex + offset;
  const newTask = {
    id: 't_' + Date.now(),
    scheduleId: schedule.id,
    orderIndex: insertAt,
    name: '新任务',
    ownerId: null,
    startDate: '',
    endDate: '',
    durationDays: 1,
    dependencyTaskId: null,
    source: 'GROUP',
    note: '',
  };
  const rest = schedTasks.map(t => t.orderIndex >= insertAt ? { ...t, orderIndex: t.orderIndex + 1 } : t);
  const newTasks = [...state.tasks.filter(t => t.scheduleId !== schedule.id), ...rest, newTask];
  setState({ ...state, tasks: newTasks });
  renderWBSTable(schedule, getState().tasks.filter(t => t.scheduleId === schedule.id));
}

function handleDeleteRow(taskId, schedule) {
  const state = getState();
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  const check = canDeleteRow(task, state.schedules.find(s => s.id === task.scheduleId));
  if (!check.ok) { showToast(check.message ?? '不可删除', 'error'); return; }
  _undoHistory = pushUndo(_undoHistory, JSON.parse(JSON.stringify(state.tasks)));
  const remaining = state.tasks.filter(t => t.scheduleId !== schedule.id);
  const others = state.tasks.filter(t => t.id !== taskId && t.scheduleId === schedule.id);
  const newTasks = [...remaining, ...others.map(t => t.orderIndex > task.orderIndex ? { ...t, orderIndex: t.orderIndex - 1 } : t)];
  setState({ ...state, tasks: newTasks });
  renderWBSTable(schedule, getState().tasks.filter(t => t.scheduleId === schedule.id));
}

// ─── Dependency picker ──────────────────────────────────────────────────────

let _depOverlay = null;

export function showDependencyPicker(taskId, schedule) {
  const state = getState();
  const schedTasks = state.tasks.filter(t => t.scheduleId === schedule.id);
  const currentTask = schedTasks.find(t => t.id === taskId);
  if (!currentTask) return;

  if (_depOverlay) _depOverlay.remove();
  _depOverlay = document.createElement('div');
  _depOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:250;display:flex;align-items:center;justify-content:center';

  _depOverlay.innerHTML = `
    <div style="background:#fff;border-radius:8px;padding:20px;min-width:340px;max-width:480px;box-shadow:0 8px 24px rgba(0,0,0,0.15)">
      <h3 style="margin-bottom:12px;font-size:14px">选择前置依赖任务</h3>
      <ul style="list-style:none;max-height:300px;overflow-y:auto">
        <li class="ctx-item" data-dep-task-id="" style="color:#6b7280">无依赖</li>
        ${schedTasks.filter(t => t.id !== taskId).map(t => `
          <li class="ctx-item ${t.dependencyTaskId === taskId ? 'text-danger' : ''}"
              data-dep-task-id="${t.id}"
              style="cursor:pointer;padding:6px 8px;border-bottom:1px solid #f3f4f6">
            ${t.orderIndex + 1}. ${t.name}
            ${t.dependencyTaskId ? `<span style="font-size:11px;color:#6b7280;margin-left:6px">← ${schedTasks.find(x=>x.id===t.dependencyTaskId)?.name ?? ''}</span>` : ''}
          </li>`).join('')}
      </ul>
      <div style="margin-top:12px;display:flex;justify-content:flex-end">
        <button id="dep-cancel" style="padding:6px 16px;cursor:pointer">取消</button>
      </div>
    </div>`;

  document.body.appendChild(_depOverlay);

  _depOverlay.querySelectorAll('li[data-dep-task-id]').forEach(li => {
    li.addEventListener('click', () => {
      const depId = li.dataset.depTaskId;
      commitDependency(taskId, depId || null, schedule);
      _depOverlay.remove();
      _depOverlay = null;
    });
  });

  _depOverlay.querySelector('#dep-cancel').addEventListener('click', () => {
    _depOverlay.remove();
    _depOverlay = null;
  });
}

function commitDependency(taskId, depTaskId, schedule) {
  const state = getState();
  const allTasks = state.tasks;

  if (depTaskId) {
    // Cycle check
    const cycleResult = checkDependencyCycle(allTasks, taskId, depTaskId);
    if (cycleResult.ok) {
      showToast(`循环依赖：${cycleResult.path.join(' → ')}`, 'error');
      addLogEntry('DEP_CYCLE_BLOCKED', state.currentUserId, cycleResult.path.join(' → '));
      return;
    }
    // 1-to-1 check
    const existingDep = allTasks.find(t => t.dependencyTaskId === depTaskId);
    if (existingDep && existingDep.id !== taskId) {
      showToast('该任务已被其他任务依赖', 'error'); return;
    }
  }

  _undoHistory = pushUndo(_undoHistory, JSON.parse(JSON.stringify(allTasks)));
  const updatedTask = { ...allTasks.find(t => t.id === taskId), dependencyTaskId: depTaskId || null };

  // Recompute downstream
  const holidays = state.holidays ?? [];
  const allWithNew = allTasks.map(t => t.id === taskId ? updatedTask : t);
  const changes = depTaskId ? propagateFinishChange(allWithNew, depTaskId, isWeekend, addWorkDays, holidays) : new Map();
  const finalTasks = allWithNew.map(t => {
    const ch = changes.get(t.id);
    return ch ? { ...t, ...ch } : t;
  });

  setState({ ...state, tasks: finalTasks });
  addLogEntry('DEP_SET', state.currentUserId, `设置依赖：${updatedTask.name} → ${finalTasks.find(t=>t.id===depTaskId)?.name ?? '无'}`);
  renderWBSTable(schedule, getState().tasks.filter(t => t.scheduleId === schedule.id));
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function statusLabel(s) {
  return { PENDING: '草稿', REVIEWING: '待审', APPROVED: '已批', REJECTED: '已拒' }[s ?? ''] ?? s ?? '';
}
