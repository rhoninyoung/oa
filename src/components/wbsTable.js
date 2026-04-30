// src/components/wbsTable.js
// WBS 表格：整表 diff 重绘 + 键盘/鼠标交互层

import { getState, setState } from '../store.js';
import { addLogEntry } from './activityLog.js';
import { showToast } from './toast.js';
import { pushUndo, popUndo, popRedo } from '../domain/tableOps.js';
import { canDeleteRow, getFieldPermissions } from '../domain/permissions.js';
import { checkDependencyCycle, propagateFinishChange } from '../domain/dependency.js';
import { isWeekend, addWorkDays } from '../domain/calendar.js';
import { renderSearchFilter } from './searchFilter.js';

async function apiUpdateProgress(taskId, progress, userId) {
  try {
    const res = await fetch(`/api/tasks/${taskId}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ progress }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  } catch (e) {
    console.error('[wbsTable] updateProgress failed:', e);
    return null;
  }
}

// ─── Column definitions ────────────────────────────────────────────────────

const COLUMNS = [
  { key: '_idx',       label: '#',          width: 36,  sticky: true,  editable: false },
  { key: 'name',       label: '任务名称',   width: 180, sticky: true,  editable: true  },
  { key: 'ownerId',    label: '负责人',     width: 90,  sticky: false, editable: true, type: 'select' },
  { key: 'startDate',  label: '开始日期',   width: 110, sticky: false, editable: true, type: 'date' },
  { key: 'endDate',    label: '结束日期',   width: 110, sticky: false, editable: true, type: 'date' },
  { key: 'durationDays', label: '天数',     width: 60,  sticky: false, editable: true, type: 'number' },
  { key: 'progressPercent', label: '进度',  width: 70,  sticky: false, editable: true, type: 'percent' },
  { key: 'dep',        label: '依赖',       width: 120, sticky: false, editable: false },
  { key: 'note',       label: '备注',        width: 160, sticky: false, editable: true, multiline: true },
];

const STICKY_COLS = 2; // # + 任务名称

// ─── Module state ─────────────────────────────────────────────────────────

let _undoHistory = { past: [], future: [] };
let _copyBuffer = null;

// True while a textarea/input is actively being edited (not yet committed or cancelled)
let _isEditing = false;

// Set to true during startEdit to prevent applyCellEdit from committing during edit initiation
let _ignoreApplyCellEdit = false;

// Current schedule context — updated at the start of each renderWBSTable call
// so event delegation handlers can read the fresh value without closure staleness
let _currentScheduleId = null;
let _currentCanEdit = false;

// ─── Event delegation state (singleton listeners on #wbs-table, set up once) ───

let _wbseListenersInitialized = false;

// ─── Public API ───────────────────────────────────────────────────────────

/** Returns true if the user is currently editing a cell (textarea/input visible). */
export function isCellEditing() {
  return _isEditing;
}

// ─── Render ───────────────────────────────────────────────────────────────

export function renderWBSTable(schedule, tasks) {
  // Update module-level context so event delegation handlers are never stale
  _currentScheduleId = schedule?.id ?? null;
  const state = getState();
  const users = state.users;
  const holidays = state.holidays ?? [];
  const currentUserId = state.currentUserId;
  const role = users.find(u => u.id === currentUserId)?.role;
  _currentCanEdit = (role === 'GROUP_LEADER' && schedule?.groupId === users.find(u => u.id === currentUserId)?.groupId);
  const canEdit = _currentCanEdit; // local alias for render closure

  initWBSEventListeners(); // idempotent — only attaches listeners once

  const sorted = [...tasks].sort((a, b) => a.orderIndex - b.orderIndex);

  // Filter bar
  const filterBar = document.getElementById('wbs-filter-bar') || (() => {
    const el = document.createElement('div');
    el.id = 'wbs-filter-bar';
    const table = document.getElementById('wbs-table');
    table?.parentNode?.insertBefore(el, table);
    return el;
  })();
  renderSearchFilter(filterBar);

  // Header
  const thead = document.getElementById('wbs-thead');
  thead.innerHTML = `<tr>${COLUMNS.map((col, ci) => {
    const sticky = ci < STICKY_COLS ? 'sticky' : '';
    return `<th class="${sticky}" style="width:${col.width}px;min-width:${col.width}px">${col.label}</th>`;
  }).join('')}</tr>`;

  // Body — skip if user is mid-edit to avoid destroying the live input
  const tbody = document.getElementById('wbs-tbody');
  if (_isEditing) return; // keep current DOM intact

  tbody.innerHTML = sorted.map((task, ri) => {
    const depTask = task.dependencyTaskId
      ? state.tasks.find(t => t.id === task.dependencyTaskId)
      : null;
    const depName = depTask ? depTask.name : '';
    const isMasterRow = task.source === 'MASTER';
    const user = users.find(u => u.id === currentUserId);

    // Compute field-level permissions
    const { readonlyFields } = getFieldPermissions(task, schedule, role, user) ?? {};
    const rowReadonly = !canEdit || isMasterRow;
    const isFieldReadonly = (field) => rowReadonly || (readonlyFields?.has(field) ?? false);

    return `<tr data-task-id="${task.id}" data-row-index="${ri}" draggable="true">${
      COLUMNS.map((col, ci) => {
        const sticky = ci < STICKY_COLS ? ' sticky' : '';
        const fieldRO = isFieldReadonly(col.key);
        const cls = fieldRO ? '' : 'cell-editable';
        const style = `width:${col.width}px;min-width:${col.width}px`;

        switch (col.key) {
          case '_idx':
            return `<td class="${sticky}" style="${style}">${task.orderIndex + 1}</td>`;
          case 'name':
            return `<td class="${sticky} ${cls}" data-col="name" style="${style}">${task.name ?? ''}</td>`;
          case 'ownerId': {
            const owner = users.find(u => u.id === task.ownerId);
            if (!fieldRO && col.type === 'select') {
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
              ${fieldRO
                ? (task.startDate ?? '')
                : `<input type="date" class="cell-input" data-col="startDate" data-task-id="${task.id}" value="${task.startDate ?? ''}" style="border:none;width:100%">`}
            </td>`;
          case 'endDate':
            return `<td class="${sticky} ${cls}" data-col="endDate" style="${style}">
              ${fieldRO
                ? (task.endDate ?? '')
                : `<input type="date" class="cell-input" data-col="endDate" data-task-id="${task.id}" value="${task.endDate ?? ''}" style="border:none;width:100%">`}
            </td>`;
          case 'durationDays':
            return `<td class="${sticky} ${cls}" data-col="durationDays" style="${style}">
              ${fieldRO
                ? (task.durationDays ?? '')
                : `<input type="number" min="0" class="cell-input" data-col="durationDays" data-task-id="${task.id}" value="${task.durationDays ?? 1}" style="border:none;width:100%">`}
            </td>`;
          case 'progressPercent':
            return `<td class="${sticky} ${cls}" data-col="progressPercent" style="${style}">
              ${fieldRO
                ? `<span>${task.progressPercent ?? 0}%</span>`
                : `<input type="number" min="0" max="100" class="cell-input" data-col="progressPercent" data-task-id="${task.id}" value="${task.progressPercent ?? 0}" style="border:none;width:calc(100% - 14px)">`}
            </td>`;
          case 'dep':
            return `<td class="${sticky}" data-col="dep" style="${style}">
              ${depName ? `<span class="dep-arrow">← ${depName}</span>` : '<span class="text-muted">—</span>'}
              ${!fieldRO ? `<button class="btn-pick-dep" data-task-id="${task.id}" style="margin-left:4px;font-size:11px;padding:1px 5px;cursor:pointer">选</button>` : ''}
            </td>`;
          case 'note':
            return `<td class="${sticky} ${cls}" data-col="note" style="${style}">${task.note?.replace(/\n/g, '<br>') ?? ''}</td>`;
          default:
            return `<td class="${sticky}" style="${style}"></td>`;
        }
      }).join('')
    }</tr>`;
  }).join('');

}

// ─── Event delegation initialiser (runs once, idempotent) ───────────────────

/**
 * Set up all WBS event listeners on #wbs-table using event delegation.
 * Called once at first render; all subsequent renders reuse the same listeners.
 * Handlers read _currentScheduleId / _currentCanEdit from module scope — these
 * are refreshed at the start of every renderWBSTable() call.
 */
function initWBSEventListeners() {
  if (_wbseListenersInitialized) return;
  _wbseListenersInitialized = true;

  // Create the singleton _ctxMenu element before attaching listeners that use it
  setupContextMenu();

  const table = document.getElementById('wbs-table');
  if (!table) return;

  // ── Cell dblclick → start edit ──────────────────────────────────────────
  table.addEventListener('dblclick', (e) => {
    const td = e.target.closest('td.cell-editable');
    if (!td) return;
    startEdit(td);
  });

  // ── Input/select change + blur ───────────────────────────────────────────
  table.addEventListener('change', (e) => {
    if (e.target.matches('.cell-input, .cell-select')) {
      applyCellEdit(e.target);
    }
  });

  table.addEventListener('blur', (e) => {
    // Use mousedown→preventDefault trick for blur-gating on inputs
    if (e.target.matches('.cell-input, .cell-textarea')) {
      if (e.target.dataset.committing === '1') return;
      e.target.dataset.committing = '1';
      _isEditing = false;
      applyCellEdit(e.target);
    }
  }, true); // capture phase to intercept before child

  // ── Document-level Enter/Escape fallback ──────────────────────────────────
  // Some environments (e.g. Playwright headless) dispatch keyboard events to
  // document/BODY rather than the focused element. This catches Enter/Escape
  // when the input-level handler misses.
  document.addEventListener('keydown', (e) => {
    if (!_isEditing) return;
    if (e.key !== 'Enter' && e.key !== 'Escape') return;
    const target = e.target;
    if (!target.matches('.cell-input, .cell-textarea')) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (target.dataset.committing === '1') return;
      target.dataset.committing = '1';
      const taskId = target.dataset.taskId;
      const col = target.dataset.col;
      const newVal = target.type === 'number' ? Number(target.value) : target.value;
      target.remove();
      _isEditing = false;
      applyEdit(taskId, col, newVal);
    } else if (e.key === 'Escape') {
      target.remove();
      _isEditing = false;
    }
  });

  // ── Dependency picker button ─────────────────────────────────────────────
  table.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-pick-dep');
    if (!btn) return;
    e.stopPropagation();
    const state = getState();
    const sched = state.schedules.find(s => s.id === _currentScheduleId);
    showDependencyPicker(btn.dataset.taskId, sched);
  });

  // ── Context menu ─────────────────────────────────────────────────────────
  table.addEventListener('contextmenu', (e) => {
    if (!_currentCanEdit) return;
    e.preventDefault();
    const td = e.target.closest('td');
    if (!td) return;
    const row = td.closest('tr');
    if (!row) return;
    const taskId = row.dataset.taskId;
    const ri = parseInt(row.dataset.rowIndex);
    if (isNaN(ri)) return;

    const state = getState();
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const sched = state.schedules.find(s => s.id === task.scheduleId);
    const canDel = canDeleteRow(task, sched);

    _ctxMenu.innerHTML = `
      <div class="ctx-item" data-action="insert-above" data-ri="${ri}">上方插入行</div>
      <div class="ctx-item" data-action="insert-below" data-ri="${ri}">下方插入行</div>
      <div class="ctx-sep"></div>
      <div class="ctx-item ${canDel.ok ? '' : 'text-muted'}" data-action="delete" data-task-id="${taskId}">删除当前行</div>
    `;
    _ctxMenu.classList.add('visible');
    const rect = td.getBoundingClientRect();
    _ctxMenu.style.top = rect.bottom + 'px';
    _ctxMenu.style.left = rect.left + 'px';
  });

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  table.addEventListener('keydown', (e) => {
    if (_isEditing) return;
    if (!_currentCanEdit) return;

    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'c': {
          e.preventDefault();
          const td = document.activeElement?.closest('td');
          if (!td) return;
          const taskId = td.closest('tr').dataset.taskId;
          const task = getState().tasks.find(t => t.id === taskId);
          if (!task) return;
          _copyBuffer = [[task.name ?? '', task.note ?? '']];
          showToast('已复制 ' + _copyBuffer.length + ' 个任务', 'info');
          break;
        }
        case 'v': {
          e.preventDefault();
          if (!_copyBuffer) return;
          const td = document.activeElement?.closest('td');
          if (!td) return;
          const targetTaskId = td.closest('tr').dataset.taskId;
          const state = getState();
          const targetTask = state.tasks.find(t => t.id === targetTaskId);
          if (!targetTask) return;
          _undoHistory = pushUndo(_undoHistory, JSON.parse(JSON.stringify(state.tasks)));
          const [name, note] = _copyBuffer[0] ?? [];
          const newTasks = state.tasks.map(t =>
            t.id === targetTaskId ? { ...t, name: name ?? t.name, note: note ?? t.note } : t
          );
          setState({ ...state, tasks: newTasks });
          showToast('已粘贴', 'info');
          break;
        }
        case 'z': {
          e.preventDefault();
          doUndo(); break;
        }
        case 'y': {
          e.preventDefault();
          doRedo(); break;
        }
      }
    }

    // ── Alt+Drag row reorder ─────────────────────────────────────────────────
    if (e.altKey && e.type === 'mousedown') {
      // Handled in mousedown below for drag detection
    }
  });

  // Alt + drag to reorder rows
  let draggedTaskId = null;

  table.addEventListener('mousedown', (e) => {
    if (!e.altKey) return;
    const row = e.target.closest('tr[data-task-id]');
    if (!row) return;
    draggedTaskId = row.dataset.taskId;
    row.style.opacity = '0.5';
  });

  table.addEventListener('mouseup', (e) => {
    if (!draggedTaskId) return;
    const targetRow = e.target.closest('tr[data-task-id]');
    if (targetRow && targetRow.dataset.taskId !== draggedTaskId) {
      const state = getState();
      const sched = state.schedules.find(s => s.id === _currentScheduleId);
      if (!sched) return;

      const taskId = draggedTaskId;
      const afterTaskId = targetRow.dataset.taskId;

      const taskList = state.tasks
        .filter(t => t.scheduleId === sched.id)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const fromIdx = taskList.findIndex(t => t.id === taskId);
      const toIdx = taskList.findIndex(t => t.id === afterTaskId);
      if (fromIdx === -1 || toIdx === -1) return;

      // Reorder: move task from fromIdx to toIdx
      const reordered = [...taskList];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);

      // Reassign orderIndex
      const updated = reordered.map((t, i) => ({ ...t, orderIndex: i }));
      const otherTasks = state.tasks.filter(t => t.scheduleId !== sched.id);
      setState({ ...state, tasks: [...otherTasks, ...updated] });
      showToast('已重排任务顺序', 'success');
    }

    // Reset opacity
    document.querySelectorAll('#wbs-tbody tr').forEach(r => r.style.opacity = '');
    draggedTaskId = null;
  });
}

// ─── Cell events ────────────────────────────────────────────────────────────

function startEdit(td) {
  if (_isEditing) return; // prevent re-entrant startEdit
  const col = td.dataset.col;
  const taskId = td.closest('tr').dataset.taskId;
  const task = getState().tasks.find(t => t.id === taskId);
  if (!task) return;

  _isEditing = true;
  _ignoreApplyCellEdit = true;

  let input;
  if (col === 'note' || col === 'name') {
    input = document.createElement('textarea');
    input.className = 'cell-textarea';
    input.value = task[col] ?? '';
    input.rows = 1;
    input.style.height = 'var(--row-height, 36px)';

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        _isEditing = false;
        input.remove();
      }
      if (e.key === 'Enter' && !e.altKey && !e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        _isEditing = false;
        commitTextarea(input, taskId, col);
      }
      if (e.key === 'Enter' && (e.altKey || e.ctrlKey)) {
        e.preventDefault();
        const v = input.value;
        const sel = { start: input.selectionStart, end: input.selectionEnd };
        input.value = v.slice(0, sel.start) + '\n' + v.slice(sel.end);
        input.selectionStart = input.selectionEnd = sel.start + 1;
      }
    });

    input.addEventListener('blur', () => {
      if (input.dataset.cancel === '1') return;
      // Prevent re-entrant blur (e.g. removing the input fires another blur)
      input.dataset.committing = '1';
    });

  } else {
    input = document.createElement('input');
    input.type = (col === 'durationDays' || col === 'progressPercent') ? 'number' : 'text';
    if (col === 'progressPercent') { input.min = '0'; input.max = '100'; }
    input.className = 'cell-input';
    input.value = task[col] ?? '';
    input.style.cssText = 'border:none;outline:2px solid #2563eb;width:100%;height:100%';

    // Use DOM0 handler as primary (more reliable in Playwright headless)
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const capturedVal = input.value;
        const capturedType = input.type;
        const capturedTaskId = taskId;
        const capturedCol = col;
        _isEditing = false;
        input.dataset.committing = '1';
        input.remove();
        applyEdit(capturedTaskId, capturedCol, capturedType === 'number' ? Number(capturedVal) : capturedVal);
        return;
      }
      if (e.key === 'Escape') {
        e.stopPropagation();
        _isEditing = false;
        input.remove();
      }
    };

    input.addEventListener('blur', () => {
      if (_ignoreApplyCellEdit) return;
      if (input.dataset.committing === '1') return;
      input.dataset.committing = '1';
      _isEditing = false;
      commitInput(input, taskId, col, schedule);
    });
  }

  td.innerHTML = '';
  td.appendChild(input);
  // Defer focus to the next microtask so Playwright headless can properly
  // focus the input before keyboard events (Enter/Escape) are dispatched.
  Promise.resolve().then(() => {
    input.focus();
    input.select();
  });
  _ignoreApplyCellEdit = false; // done with edit initiation
}

function commitTextarea(input, taskId, col) {
  const newVal = input.value;
  input.remove(); // synchronous — td is now empty, no second blur
  applyEdit(taskId, col, newVal);
}

function commitInput(input, taskId, col) {
  const newVal = input.type === 'number' ? Number(input.value) : input.value;
  input.remove();
  applyEdit(taskId, col, newVal);
}

function applyCellEdit(el) {
  if (_ignoreApplyCellEdit) return;
  if (el.dataset.committing === '1') return;
  const taskId = el.dataset.taskId;
  const col = el.dataset.col;
  const newVal = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? Number(el.value) : el.value);
  _isEditing = false;
  applyEdit(taskId, col, newVal);
}

function applyEdit(taskId, col, newVal) {
  const state = getState();
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) { return; }

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
    return; // setState → subscribe(render) handles re-render
  }

  const newTasks = state.tasks.map(t => t.id === taskId ? updated : t);
  setState({ ...state, tasks: newTasks });

  // Immediately persist progressPercent to API
  if (col === 'progressPercent') {
    apiUpdateProgress(taskId, newVal, state.currentUserId).then(result => {
      if (result?.task) {
        mergeAPIData({ tasks: [result.task] });
      }
    }).catch(() => {});
  }
  // setState → subscribe(render) handles re-render; do NOT call renderWBSTable here
}

// ─── Keyboard handling ─────────────────────────────────────────────────────

let _tbodyKeyHandler = null;

// Deprecated: keyboard handling is now via event delegation in initWBSEventListeners
export function initTableKeyboard() { /* noop */ }

function doUndo() {
  const result = popUndo(_undoHistory);
  if (!result.state) { showToast('无可撤销', 'info'); return; }
  _undoHistory = result.history;
  const state = getState();
  setState({ ...state, tasks: result.state });
  // setState → subscribe(render) handles re-render
}

function doRedo() {
  const result = popRedo(_undoHistory);
  if (!result.state) { showToast('无可重做', 'info'); return; }
  _undoHistory = result.history;
  const state = getState();
  setState({ ...state, tasks: result.state });
  // setState → subscribe(render) handles re-render
}

// ─── Context menu ───────────────────────────────────────────────────────────

let _ctxMenu = null;
let _ctxDocClickHandler = null;

function setupContextMenu() {
  // Singleton: only creates the _ctxMenu DOM element and document click-away
  // handler once. Contextmenu event is now handled via delegation in
  // initWBSEventListeners.
  if (!_ctxMenu) {
    _ctxMenu = document.createElement('div');
    _ctxMenu.id = 'ctx-menu';
    document.body.appendChild(_ctxMenu);
    _ctxDocClickHandler = () => _ctxMenu.classList.remove('visible');
    document.addEventListener('click', _ctxDocClickHandler);
  }
}

function handleInsertRow(rowIndex, offset) {
  const state = getState();
  const schedule = state.schedules.find(s => s.id === _currentScheduleId);
  if (!schedule) return;
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
}

function handleDeleteRow(taskId) {
  const state = getState();
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  const schedule = state.schedules.find(s => s.id === task.scheduleId);
  const check = canDeleteRow(task, schedule);
  if (!check.ok) { showToast(check.message ?? '不可删除', 'error'); return; }
  _undoHistory = pushUndo(_undoHistory, JSON.parse(JSON.stringify(state.tasks)));
  const remaining = state.tasks.filter(t => t.scheduleId !== task.scheduleId);
  const others = state.tasks.filter(t => t.id !== taskId && t.scheduleId === task.scheduleId);
  const newTasks = [...remaining, ...others.map(t => t.orderIndex > task.orderIndex ? { ...t, orderIndex: t.orderIndex - 1 } : t)];
  setState({ ...state, tasks: newTasks });
}

// ─── Dependency picker ──────────────────────────────────────────────────────

let _depOverlay = null;

export function showDependencyPicker(taskId) {
  const state = getState();
  const schedTasks = state.tasks.filter(t => t.scheduleId === _currentScheduleId);
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
      commitDependency(taskId, depId || null);
      _depOverlay.remove();
      _depOverlay = null;
    });
  });

  _depOverlay.querySelector('#dep-cancel').addEventListener('click', () => {
    _depOverlay.remove();
    _depOverlay = null;
  });
}

function commitDependency(taskId, depTaskId) {
  const state = getState();
  const allTasks = state.tasks;

  if (depTaskId) {
    const cycleResult = checkDependencyCycle(allTasks, taskId, depTaskId);
    if (cycleResult.ok) {
      showToast(`循环依赖：${cycleResult.path.join(' → ')}`, 'error');
      addLogEntry('DEP_CYCLE_BLOCKED', state.currentUserId, cycleResult.path.join(' → '));
      return;
    }
    const existingDep = allTasks.find(t => t.dependencyTaskId === depTaskId);
    if (existingDep && existingDep.id !== taskId) {
      showToast('该任务已被其他任务依赖', 'error'); return;
    }
  }

  _undoHistory = pushUndo(_undoHistory, JSON.parse(JSON.stringify(allTasks)));
  const updatedTask = { ...allTasks.find(t => t.id === taskId), dependencyTaskId: depTaskId || null };

  const holidays = state.holidays ?? [];
  const allWithNew = allTasks.map(t => t.id === taskId ? updatedTask : t);
  const changes = depTaskId ? propagateFinishChange(allWithNew, depTaskId, isWeekend, addWorkDays, holidays) : new Map();
  const finalTasks = allWithNew.map(t => {
    const ch = changes.get(t.id);
    return ch ? { ...t, ...ch } : t;
  });

  setState({ ...state, tasks: finalTasks });
  addLogEntry('DEP_SET', state.currentUserId, `设置依赖：${updatedTask.name} → ${finalTasks.find(t=>t.id===depTaskId)?.name ?? '无'}`);
  // setState → subscribe(render) handles re-render
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function statusLabel(s) {
  return { PENDING: '草稿', REVIEWING: '待审', APPROVED: '已批', REJECTED: '已拒' }[s ?? ''] ?? s ?? '';
}
