// src/components/searchFilter.js
// Advanced search and filter for WBS table

import { getState } from '../store.js';

/**
 * Render the filter bar above the WBS table
 * Returns the filter state and DOM reference
 */
export function renderSearchFilter(container, onFilterChange) {
  const state = getState();

  container.innerHTML = `
    <div id="search-filter-bar" style="display:flex;gap:8px;align-items:center;padding:6px 0;flex-wrap:wrap;">
      <input id="filter-name" type="text" placeholder="搜索任务名称..."
        style="flex:1;min-width:120px;padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:13px" />
      <select id="filter-owner" style="padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:13px">
        <option value="">全部负责人</option>
        ${state.users.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
      </select>
      <select id="filter-status" style="padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:13px">
        <option value="">全部来源</option>
        <option value="GROUP">小组行</option>
        <option value="MASTER">总表行</option>
      </select>
      <input id="filter-date-from" type="date"
        style="padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:13px" />
      <span style="color:var(--text-secondary);font-size:12px">至</span>
      <input id="filter-date-to" type="date"
        style="padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:13px" />
      <button id="filter-clear" style="padding:4px 10px;border:1px solid var(--border);border-radius:4px;background:var(--surface);cursor:pointer;font-size:12px">清除</button>
      <span id="filter-result-count" style="font-size:12px;color:var(--text-secondary);margin-left:auto"></span>
    </div>
  `;

  // Apply dimming (grey out non-matching rows)
  function applyFilter() {
    const nameQ = document.getElementById('filter-name')?.value.toLowerCase() ?? '';
    const ownerId = document.getElementById('filter-owner')?.value ?? '';
    const source = document.getElementById('filter-status')?.value ?? '';
    const dateFrom = document.getElementById('filter-date-from')?.value ?? '';
    const dateTo = document.getElementById('filter-date-to')?.value ?? '';

    const rows = document.querySelectorAll('#wbs-tbody tr[data-task-id]');
    let visibleCount = 0;

    rows.forEach(row => {
      const taskId = row.dataset.taskId;
      const task = getState().tasks.find(t => t.id === taskId);
      if (!task) return;

      const nameMatch = !nameQ || (task.name ?? '').toLowerCase().includes(nameQ);
      const ownerMatch = !ownerId || task.ownerId === ownerId;
      const sourceMatch = !source || task.source === source;
      const dateMatch = (!dateFrom || (task.endDate && task.endDate >= dateFrom)) &&
                        (!dateTo || (task.startDate && task.startDate <= dateTo));

      const visible = nameMatch && ownerMatch && sourceMatch && dateMatch;
      row.style.opacity = visible ? '' : '0.25';
      if (visible) visibleCount++;
    });

    const countEl = document.getElementById('filter-result-count');
    if (countEl) countEl.textContent = `显示 ${visibleCount} / ${rows.length} 条`;

    if (onFilterChange) onFilterChange({ visibleCount, totalCount: rows.length });
  }

  // Wire up events
  ['filter-name', 'filter-owner', 'filter-status', 'filter-date-from', 'filter-date-to'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', applyFilter);
    document.getElementById(id)?.addEventListener('change', applyFilter);
  });

  document.getElementById('filter-clear')?.addEventListener('click', () => {
    document.getElementById('filter-name').value = '';
    document.getElementById('filter-owner').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    applyFilter();
  });

  return { applyFilter };
}

/**
 * Highlight rows matching the filter text
 * Call this after table renders
 */
export function highlightFilterMatches(nameQ) {
  if (!nameQ) {
    document.querySelectorAll('#wbs-tbody tr').forEach(r => r.style.opacity = '');
    return;
  }
  document.querySelectorAll('#wbs-tbody tr[data-task-id]').forEach(row => {
    const taskId = row.dataset.taskId;
    const task = getState().tasks.find(t => t.id === taskId);
    const match = task && (task.name ?? '').toLowerCase().includes(nameQ.toLowerCase());
    row.style.opacity = match ? '' : '0.2';
  });
}
