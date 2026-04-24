// src/components/projectTree.js
import { getState, setState } from '../store.js';

export function renderProjectTree(container) {
  const state = getState();
  const { projects, iterations, groups, schedules, tasks } = state;
  const activeIterId = state.activeIterationId;
  const activeGroupId = state.activeGroupId;
  const viewMode = state.viewMode;

  let html = '';

  for (const proj of projects) {
    const projIters = iterations.filter(i => i.projectId === proj.id);
    html += `<div class="project-tree-item"><strong>${proj.name}</strong></div>`;

    for (const iter of projIters) {
      const scheds = schedules.filter(s => s.iterationId === iter.id);
      const iterSchedules = scheds.map(sch => {
        const grp = groups.find(g => g.id === sch.groupId);
        const iterTasks = tasks.filter(t => {
          const sch2 = schedules.find(s => s.id === t.scheduleId);
          return sch2?.groupId === sch.groupId && sch2?.iterationId === iter.id;
        });
        const status = sch.status;
        const taskCount = iterTasks.length;
        const isActive = iter.id === activeIterId && viewMode === 'GROUP' && sch.groupId === activeGroupId;
        return `
          <div class="iteration-item ${isActive ? 'active' : ''}"
               data-iter-id="${iter.id}"
               data-group-id="${sch.groupId}">
            <span>${grp?.name ?? ''}</span>
            <span class="status-badge status-${status}">${statusLabel(status)}</span>
            <span class="group-summary">${taskCount} 任务</span>
          </div>`;
      }).join('');

      const iterActive = iter.id === activeIterId && viewMode === 'GROUP';
      html += `<div class="iterations">${iterSchedules}</div>`;
    }
  }

  // Master view toggle
  html += `
    <div class="project-tree-item ${viewMode === 'MASTER' ? 'active' : ''}" id="master-toggle">
      总表视图
    </div>
  `;

  container.innerHTML = html;

  // Attach click events
  container.querySelectorAll('.iteration-item').forEach(el => {
    el.addEventListener('click', () => {
      setState({
        ...getState(),
        activeIterationId: el.dataset.iterId,
        activeGroupId: el.dataset.groupId,
        viewMode: 'GROUP',
      });
    });
  });

  const masterEl = container.querySelector('#master-toggle');
  if (masterEl) {
    masterEl.addEventListener('click', () => {
      setState({ ...getState(), viewMode: 'MASTER' });
    });
  }
}

function statusLabel(s) {
  return { PENDING: '草稿', REVIEWING: '待审', APPROVED: '已批', REJECTED: '已拒' }[s] ?? s;
}
