// src/components/calendarView.js
// Calendar view — monthly grid showing tasks as colored bars

import { getState } from '../store.js';
import { isAPIMode } from '../store.js';

const DAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'];

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-indexed

/**
 * Show the calendar view
 */
export function renderCalendarView() {
  const container = document.getElementById('calendar-view-wrapper');
  if (!container) return;

  showView('calendar');
  container.innerHTML = '';

  const state = getState();
  const sched = state.schedules.find(
    s => s.iterationId === state.activeIterationId && s.groupId === state.activeGroupId
  );
  const tasks = sched ? state.tasks.filter(t => t.scheduleId === sched.id) : [];

  container.innerHTML = `
    <div class="cal-nav">
      <button id="cal-prev">◀</button>
      <span id="cal-title">${currentYear}年 ${MONTHS[currentMonth]}</span>
      <button id="cal-next">▶</button>
      <button id="cal-today" style="margin-left:8px">今天</button>
    </div>
    <div class="cal-grid" id="cal-grid"></div>
    <div class="cal-legend">
      ${state.groups.map(g => `<span class="cal-legend-item" data-group="${g.id}">
        <span class="cal-legend-color" style="background:${getGroupColor(g.id)}"></span>
        ${g.name}</span>`).join('')}
    </div>
  `;

  document.getElementById('cal-prev').onclick = () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendarGrid(container, tasks, state);
  };
  document.getElementById('cal-next').onclick = () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendarGrid(container, tasks, state);
  };
  document.getElementById('cal-today').onclick = () => {
    currentYear = new Date().getFullYear();
    currentMonth = new Date().getMonth();
    renderCalendarGrid(container, tasks, state);
  };

  renderCalendarGrid(container, tasks, state);
}

function renderCalendarGrid(container, tasks, state) {
  document.getElementById('cal-title').textContent = `${currentYear}年 ${MONTHS[currentMonth]}`;

  const grid = document.getElementById('cal-grid');
  if (!grid) return;

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  let html = `<div class="cal-header-row">${DAYS.map(d => `<div class="cal-header-cell">${d}</div>`).join('')}</div>`;
  html += '<div class="cal-body">';

  for (let i = 0; i < totalCells; i++) {
    const day = i - firstDay + 1;
    const isCurrentMonth = day >= 1 && day <= daysInMonth;
    const dateStr = isCurrentMonth
      ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : '';

    // Tasks that overlap this day
    const dayTasks = isCurrentMonth ? tasks.filter(t => {
      if (!t.startDate || !t.endDate) return false;
      return dateStr >= t.startDate && dateStr <= t.endDate;
    }) : [];

    html += `<div class="cal-cell ${!isCurrentMonth ? 'cal-other-month' : ''}" data-date="${dateStr}">
      ${isCurrentMonth ? `<span class="cal-day-num">${day}</span>` : ''}
      <div class="cal-tasks">${dayTasks.slice(0, 3).map(t => `
        <div class="cal-task" data-task="${t.id}" style="background:${getGroupColor(state.groups.find(g=>g.id === getGroupForTask(t, state))?.id)}20;border-left:3px solid ${getGroupColor(state.groups.find(g=>g.id === getGroupForTask(t, state))?.id)}">
          ${t.name}
        </div>`).join('')}
      ${dayTasks.length > 3 ? `<div class="cal-more">+${dayTasks.length - 3} more</div>` : ''}</div>
    </div>`;
  }

  html += '</div>';
  grid.innerHTML = html;

  // Click task to highlight
  grid.querySelectorAll('.cal-task').forEach(el => {
    el.onclick = (e) => {
      grid.querySelectorAll('.cal-task').forEach(t => t.classList.remove('cal-task-selected'));
      el.classList.add('cal-task-selected');
      e.stopPropagation();
    };
  });
}

function getGroupForTask(task, state) {
  // Find the group for this task's schedule
  const sched = state.schedules.find(s => s.id === task.scheduleId);
  return sched?.groupId ?? '';
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
    if (el) el.classList.toggle('hidden', !id.startsWith(view === 'wbs' ? 'group' : view));
  });
}
