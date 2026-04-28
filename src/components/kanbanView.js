// src/components/kanbanView.js
// Kanban view — PENDING | REVIEWING | APPROVED | REJECTED columns with task cards

import { getState, setState } from '../store.js';
import { isAPIMode } from '../store.js';

const COLUMNS = [
  { key: 'PENDING', label: '待提交', color: '#f59e0b' },
  { key: 'REVIEWING', label: '审核中', color: '#3b82f6' },
  { key: 'APPROVED', label: '已批准', color: '#10b981' },
  { key: 'REJECTED', label: '已拒绝', color: '#ef4444' },
];

/**
 * Show the Kanban board view
 */
export function renderKanbanView() {
  const container = document.getElementById('kanban-view-wrapper');
  if (!container) return;

  showView('kanban');
  container.innerHTML = '';

  const state = getState();
  const iteration = state.iterations.find(i => i.id === state.activeIterationId);
  const schedules = state.schedules.filter(s => s.iterationId === state.activeIterationId);

  container.innerHTML = `
    <div class="kanban-board" id="kanban-board">
      ${COLUMNS.map(col => `
        <div class="kanban-col" data-status="${col.key}">
          <div class="kanban-col-header" style="border-top:4px solid ${col.color}">
            <span class="kanban-col-title">${col.label}</span>
            <span class="kanban-col-count" id="kanban-count-${col.key}">0</span>
          </div>
          <div class="kanban-col-body" id="kanban-body-${col.key}" data-status="${col.key}">
          </div>
        </div>`).join('')}
    </div>
  `;

  // Render tasks for each column
  for (const col of COLUMNS) {
    const body = document.getElementById(`kanban-body-${col.key}`);
    const colSchedules = schedules.filter(s => s.status === col.key);

    let cards = '';
    for (const sched of colSchedules) {
      const group = state.groups.find(g => g.id === sched.groupId);
      const tasks = state.tasks.filter(t => t.scheduleId === sched.id);

      cards += `<div class="kanban-schedule-card" data-sched="${sched.id}">
        <div class="kanban-sched-header">${group?.name ?? sched.groupId}</div>
        ${tasks.map(t => `
          <div class="kanban-task-card" draggable="true" data-task="${t.id}">
            <div class="kanban-task-name">${t.name}</div>
            <div class="kanban-task-meta">
              <span>${state.users.find(u=>u.id===t.ownerId)?.name ?? ''}</span>
              <span>${t.durationDays ?? 0}天</span>
            </div>
          </div>`).join('')}
      </div>`;
    }

    body.innerHTML = cards || '<div class="kanban-empty">暂无</div>';
    document.getElementById(`kanban-count-${col.key}`).textContent = colSchedules.length;
  }

  // Setup drag and drop between columns
  setupKanbanDragDrop(state);
}

function setupKanbanDragDrop(state) {
  const bodies = document.querySelectorAll('.kanban-col-body');
  let draggedTask = null;

  bodies.forEach(body => {
    body.addEventListener('dragstart', (e) => {
      const card = e.target.closest('[data-task]');
      if (!card) return;
      draggedTask = card.dataset.task;
      card.style.opacity = '0.5';
    });

    body.addEventListener('dragend', (e) => {
      const card = e.target.closest('[data-task]');
      if (card) card.style.opacity = '1';
      draggedTask = null;
    });

    body.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    body.addEventListener('drop', async (e) => {
      e.preventDefault();
      if (!draggedTask) return;

      const newStatus = body.dataset.status;
      const task = state.tasks.find(t => t.id === draggedTask);
      if (!task) return;

      const sched = state.schedules.find(s => s.id === task.scheduleId);
      if (!sched) return;

      // Only allow status changes if user is PM and from REVIEWING/REJECTED
      const user = state.users.find(u => u.id === state.currentUserId);
      if (user?.role !== 'PROJECT_MANAGER') {
        showToast('只有PM可以拖拽修改状态', 'warning');
        return;
      }

      if (newStatus === 'REVIEWING' && sched.status === 'PENDING') {
        // GL can submit
        if (isAPIMode()) {
          try {
            const resp = await fetch(`/api/schedules/${sched.id}/submit`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: state.currentUserId }),
            });
            if (resp.ok) showToast('已提交', 'success');
          } catch {
            showToast('提交失败', 'error');
          }
        } else {
          showToast('本地模式下请使用提交按钮', 'warning');
        }
      } else if (newStatus === 'APPROVED' && sched.status === 'REVIEWING') {
        if (isAPIMode()) {
          try {
            const resp = await fetch(`/api/schedules/${sched.id}/approve`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: state.currentUserId }),
            });
            if (resp.ok) showToast('已批准', 'success');
          } catch {
            showToast('批准失败', 'error');
          }
        } else {
          showToast('本地模式下请使用审批按钮', 'warning');
        }
      } else {
        showToast(`不支持从 ${sched.status} 直接拖拽到 ${newStatus}`, 'warning');
      }

      // Refresh the view
      setTimeout(() => renderKanbanView(), 300);
    });
  });
}

// Simple toast (reuse from toast component if available)
function showToast(msg, type = 'info') {
  if (window.__showToast) window.__showToast(msg, type);
  else alert(msg);
}

function showView(view) {
  ['group-view-wrapper', 'master-view-wrapper', 'calendar-view-wrapper',
   'gantt-view-wrapper', 'kanban-view-wrapper', 'stats-view-wrapper'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const show =
        (view === 'wbs' && id === 'group-view-wrapper') ||
        (view === 'gantt' && id === 'gantt-view-wrapper') ||
        (view === 'calendar' && id === 'calendar-view-wrapper') ||
        (view === 'kanban' && id === 'kanban-view-wrapper');
      el.classList.toggle('hidden', !show);
    }
  });
}
