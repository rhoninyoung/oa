// src/components/ganttView.js
// Gantt chart view — horizontal bars with dependency arrows

import { getState } from '../store.js';
import { addWorkDays } from '../domain/calendar.js';

/**
 * Show the Gantt chart view
 */
export function renderGanttView() {
  const container = document.getElementById('gantt-view-wrapper');
  if (!container) return;

  showView('gantt');
  container.innerHTML = '';

  const state = getState();
  const sched = state.schedules.find(
    s => s.iterationId === state.activeIterationId && s.groupId === state.activeGroupId
  );
  const tasks = sched
    ? state.tasks.filter(t => t.scheduleId === sched.id).sort((a, b) => a.orderIndex - b.orderIndex)
    : [];

  if (tasks.length === 0) {
    container.innerHTML = '<div style="padding:20px;color:var(--text-secondary)">当前迭代暂无任务</div>';
    return;
  }

  // Compute date range
  const allDates = tasks.flatMap(t => [t.startDate, t.endDate]).filter(Boolean);
  if (allDates.length === 0) {
    container.innerHTML = '<div style="padding:20px;color:var(--text-secondary)">任务无日期信息，无法显示甘特图</div>';
    return;
  }

  const minDate = new Date(Math.min(...allDates.map(d => new Date(d))));
  const maxDate = new Date(Math.max(...allDates.map(d => new Date(d))));
  // Pad range
  minDate.setDate(minDate.getDate() - 3);
  maxDate.setDate(maxDate.getDate() + 7);

  container.innerHTML = `
    <div class="gantt-container" id="gantt-container">
      <div class="gantt-left" id="gantt-left">
        <div class="gantt-labels-header">任务</div>
        ${tasks.map(t => `
          <div class="gantt-row-label" data-task="${t.id}">
            <span class="gantt-task-name">${t.name}</span>
            <span class="gantt-task-owner">${state.users.find(u=>u.id===t.ownerId)?.name ?? ''}</span>
          </div>`).join('')}
      </div>
      <div class="gantt-right" id="gantt-right">
        <div class="gantt-timeline-header" id="gantt-timeline-header"></div>
        <div class="gantt-rows" id="gantt-rows"></div>
      </div>
    </div>
    <svg id="gantt-arrows" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;"></svg>
  `;

  renderGanttTimeline(minDate, maxDate);
  renderGanttRows(tasks, minDate, maxDate, state);
}

function renderGanttTimeline(minDate, maxDate) {
  const header = document.getElementById('gantt-timeline-header');
  if (!header) return;

  const totalDays = Math.ceil((maxDate - minDate) / 86400000);
  const dayWidth = 32; // px per day

  let html = '';
  let cur = new Date(minDate);
  for (let i = 0; i <= totalDays; i++) {
    const isMonthStart = cur.getDate() === 1;
    const isWeekend = cur.getDay() === 0 || cur.getDay() === 6;
    const label = isMonthStart ? `${cur.getMonth() + 1}月` : (cur.getDay() === 1 ? `${cur.getDate()}日` : '');
    html += `<div class="gantt-tick ${isWeekend ? 'weekend' : ''} ${isMonthStart ? 'month-start' : ''}" style="width:${dayWidth}px;min-height:32px">
      ${label ? `<span class="gantt-tick-label">${label}</span>` : ''}
    </div>`;
    cur.setDate(cur.getDate() + 1);
  }
  header.innerHTML = html;
  header.style.width = `${totalDays * dayWidth}px`;
}

function renderGanttRows(tasks, minDate, maxDate, state) {
  const rows = document.getElementById('gantt-rows');
  if (!rows) return;

  const totalDays = Math.ceil((maxDate - minDate) / 86400000);
  const dayWidth = 32;
  const rowHeight = 32;

  let html = '';
  for (const task of tasks) {
    const startOffset = task.startDate
      ? Math.max(0, Math.floor((new Date(task.startDate) - minDate) / 86400000))
      : 0;
    const endOffset = task.endDate
      ? Math.min(totalDays, Math.floor((new Date(task.endDate) - minDate) / 86400000) + 1)
      : totalDays;
    const barWidth = Math.max(dayWidth, (endOffset - startOffset) * dayWidth);
    const groupId = state.schedules.find(s => s.id === task.scheduleId)?.groupId ?? '';
    const color = getGroupColor(groupId);

    html += `<div class="gantt-row" style="height:${rowHeight}px;position:relative;" data-task="${task.id}">
      <div class="gantt-bar ${task.source === 'MASTER' ? 'master-bar' : ''}"
        style="position:absolute;left:${startOffset * dayWidth}px;width:${barWidth}px;background:${color}33;border-left:4px solid ${color};height:24px;top:4px;border-radius:3px;">
        <span class="gantt-bar-label">${task.name}</span>
      </div>
    </div>`;
  }
  rows.innerHTML = html;

  // Store positioning for arrows
  rows.dataset.dayWidth = dayWidth;
  rows.dataset.rowHeight = rowHeight;
  rows.dataset.startOffset = minDate.getTime();

  drawDependencyArrows(tasks, rows, dayWidth, rowHeight, minDate.getTime());
}

function drawDependencyArrows(tasks, rowsContainer, dayWidth, rowHeight, startTime) {
  const svg = document.getElementById('gantt-arrows');
  if (!svg) return;
  svg.innerHTML = '';

  const taskIndexMap = new Map(tasks.map((t, i) => [t.id, i]));

  for (const task of tasks) {
    if (!task.dependencyTaskId) continue;
    const fromIdx = taskIndexMap.get(task.dependencyTaskId);
    const toIdx = taskIndexMap.get(task.id);
    if (fromIdx === undefined || toIdx === undefined) continue;

    const depTask = tasks.find(t => t.id === task.dependencyTaskId);
    if (!depTask?.endDate) continue;

    const x1 = (Math.floor((new Date(depTask.endDate) - new Date(startTime)) / 86400000) + 1) * dayWidth;
    const y1 = fromIdx * rowHeight + rowHeight / 2;
    const x2 = (Math.floor((new Date(task.startDate || task.endDate) - new Date(startTime)) / 86400000)) * dayWidth;
    const y2 = toIdx * rowHeight + rowHeight / 2;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const mx = x1 + 8;
    path.setAttribute('d', `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#9ca3af');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('marker-end', 'url(#arrowhead)');
    svg.appendChild(path);
  }

  // Arrow marker definition
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `<marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
    <polygon points="0 0, 8 3, 0 6" fill="#9ca3af"/>
  </marker>`;
  svg.appendChild(defs);
}

function getGroupColor(groupId) {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  let hash = 0;
  for (const c of (groupId ?? '')) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

function showView(view) {
  ['group-view-wrapper', 'master-view-wrapper', 'calendar-view-wrapper',
   'gantt-view-wrapper', 'kanban-view-wrapper', 'stats-view-wrapper'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const show = (view === 'wbs' && id === 'group-view-wrapper') ||
                  (view === 'gantt' && id === 'gantt-view-wrapper') ||
                  (view === 'calendar' && id === 'calendar-view-wrapper') ||
                  (view === 'kanban' && id === 'kanban-view-wrapper');
      el.classList.toggle('hidden', !show);
    }
  });
}
